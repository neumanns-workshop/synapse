import json
import os
import sys
import time
import argparse
from datetime import datetime
from openai import OpenAI
from pathlib import Path
from pydantic import BaseModel
from typing import List, Dict, Optional, Set, Tuple
import heapq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PLAYTEST_PAIRS_PATH = PROJECT_ROOT / "src" / "data" / "playtest_pairs.json"
GRAPH_PATH = PROJECT_ROOT / "client" / "public" / "data" / "graph.json"
RESULTS_DIR = PROJECT_ROOT / "scripts" / "ab_test_results"
MERGED_RESULTS_PATH = RESULTS_DIR / "merged_results.json"
MERGED_PROGRESS_PATH = RESULTS_DIR / "merged_progress.json"

# Test configuration
MAX_RETRIES_PER_MOVE = 10
MAX_STEPS_PER_PUZZLE = 30

# API Configuration
OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_API_KEY = "ollama"

# Available models for testing
AVAILABLE_MODELS = [
    "phi4-reasoning:plus",
    "llama3.2:3b", 
    "granite3.3:8b",
    "cogito:14b"
]

# A/B Test variants - simplified to just one enhanced variant
TEST_VARIANTS = ["enhanced"]

# --- Game Models ---
class GameState(BaseModel):
    current_word: str
    target_word: str
    path_so_far: List[str]
    neighbors: List[str]  # k=6 nearest neighbors
    steps_taken: int
    optimal_path: List[str]
    suggested_path: List[str]  # Current shortest path from position
    test_variant: str
    previous_distances: List[int]  # Dijkstra distance to target at each step
    rationales: List[str]  # All rationales so far
    invalid_moves: List[str]  # Track rejected moves
    # Backtracking support
    checkpoints: List[Dict]  # Available backtrack points: {"word": str, "index": int, "type": str, "used": bool}
    backtrack_history: List[Dict]  # Track backtrack events: {"from": str, "to": str}
    backtrack_attempts: int = 0  # Count of backtrack attempts

class GameResponse(BaseModel):
    next_move: str
    rationale: str  # LLM's reasoning for the move

# --- Helper Functions ---
def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Enhanced LLM Testing for Playtest Pairs with optimal move guidance")
    parser.add_argument(
        "--model", 
        type=str, 
        required=True,
        choices=AVAILABLE_MODELS,
        help=f"Model to test. Available options: {', '.join(AVAILABLE_MODELS)}"
    )
    return parser.parse_args()

def load_json_file(path: Path) -> Dict:
    """Loads a JSON file."""
    if not path.exists():
        print(f"Error: File not found at {path}")
        sys.exit(1)
    with open(path, 'r') as f:
        return json.load(f)

def save_json_file(data: List[Dict], path: Path) -> None:
    """Saves data to a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Normalize and validate each result
    normalized_data = []
    for item in data:
        if not isinstance(item, dict):
            continue
            
        # Ensure all required fields exist
        required_fields = {
            'id', 'startWord', 'endWord', 'optimalPathLength',
            'llmPath', 'stepsTaken', 'status', 'reason', 'model', 'testVariant'
        }
        if not all(field in item for field in required_fields):
            continue
            
        # Normalize the result
        normalized = {
            'id': str(item['id']),
            'startWord': str(item['startWord']),
            'endWord': str(item['endWord']),
            'optimalPathLength': int(item['optimalPathLength']),
            'llmPath': [str(word) for word in item['llmPath']],
            'stepsTaken': int(item['stepsTaken']),
            'status': str(item['status']),
            'reason': str(item['reason']),
            'model': str(item['model']),
            'testVariant': str(item['testVariant'])
        }
        
        # Add optional fields if they exist
        if 'rationales' in item:
            normalized['rationales'] = item['rationales']
            
        normalized_data.append(normalized)
    
    # If file exists, load existing data and merge
    if path.exists():
        try:
            with open(path, 'r') as f:
                existing_data = json.load(f)
                if isinstance(existing_data, list):
                    # Create a map of existing results by unique key (id + model + variant)
                    existing_map = {}
                    for item in existing_data:
                        key = f"{item.get('id')}_{item.get('model')}_{item.get('testVariant')}"
                        existing_map[key] = item
                    
                    # Add new solutions
                    for item in normalized_data:
                        key = f"{item['id']}_{item['model']}_{item['testVariant']}"
                        if key not in existing_map:
                            existing_map[key] = item
                            print(f"  Added new solution for puzzle {item['id']} ({item['model']}, {item['testVariant']})")
                    
                    # Convert back to list
                    normalized_data = list(existing_map.values())
                    print(f"  Merged with existing file: {len(existing_data)} existing, {len(normalized_data)} total")
        except Exception as e:
            print(f"Warning: Could not merge with existing file {path}: {e}")
    
    # Save the data
    with open(path, 'w') as f:
        json.dump(normalized_data, f, indent=2)
    print(f"Results saved to {path}")

def get_word_neighbors(graph_nodes: Dict, current_word: str) -> List[str]:
    """Get the top k=6 nearest neighbors of the current word."""
    if current_word not in graph_nodes:
        return []
    node_data = graph_nodes[current_word]
    return [neighbor for neighbor in node_data.get("edges", {}) if neighbor in graph_nodes]

def normalize_word(word: str) -> str:
    """Normalize a word to lowercase for comparison."""
    return word.lower()

def find_shortest_path(graph: Dict, start: str, end: str) -> List[str]:
    """Find shortest path between two words using Dijkstra's algorithm."""
    if start not in graph or end not in graph:
        print(f"find_shortest_path: Invalid graph data or start/end words (start={start}, end={end})")
        return []
    
    # Initialize distances and previous nodes
    distances = {word: float('infinity') for word in graph}
    previous = {word: None for word in graph}
    visited = set()
    unvisited = set(graph.keys())
    distances[start] = 0
    
    while unvisited:
        # Find unvisited node with smallest distance
        current = min(unvisited, key=lambda x: distances[x], default=None)
        if current is None or distances[current] == float('infinity') or current == end:
            break
            
        unvisited.remove(current)
        visited.add(current)
        
        # Update distances for neighbors
        edges = graph[current].get("edges", {})
        for neighbor, similarity in edges.items():
            if neighbor in visited:
                continue
                
            cost = 1 - similarity
            distance_through_current = distances[current] + cost
            
            if distance_through_current < distances[neighbor]:
                distances[neighbor] = distance_through_current
                previous[neighbor] = current
    
    # Reconstruct path if end is reachable
    if distances[end] == float('infinity'):
        print(f"No path found from {start} to {end}")
        return []
        
    # Trace back from end to start
    path = []
    current = end
    while current is not None:
        path.insert(0, current)
        current = previous[current]
        if current == start:
            path.insert(0, start)
            break
    
    return path

def format_game_state_enhanced(state: GameState, graph_nodes: Dict, invalid_move_msg: Optional[str] = None) -> str:
    """Format the current game state with enhanced context including distances and optimal move tagging."""
    state_str = ""
    if invalid_move_msg:
        state_str += f"Previous move was invalid: {invalid_move_msg}\n\n"
    
    # Calculate current distance to target
    current_path = find_shortest_path(graph_nodes, state.current_word, state.target_word)
    current_distance = len(current_path) - 1 if current_path else "∞"
    
    # Show progress information
    progress_info = f"Distance to target: {current_distance} steps"
    if len(state.previous_distances) > 1:
        prev_distance = state.previous_distances[-2]  # Distance before last move
        if current_distance != "∞" and prev_distance != "∞":
            if current_distance < prev_distance:
                progress_info += f" (↓ from {prev_distance}, good progress!)"
            elif current_distance > prev_distance:
                progress_info += f" (↑ from {prev_distance}, moved away)"
            else:
                progress_info += f" (same as {prev_distance})"
        else:
            progress_info += f" (previous: {prev_distance})"
    
    # Get previous rationale if available
    previous_rationale = ""
    if len(state.rationales) > 0:
        previous_rationale = f"\nPrevious move rationale: {state.rationales[-1]}"
    
    # Format path with G/L labels for previous moves (learning context)
    path_with_labels = []
    for i, word in enumerate(state.path_so_far):
        label = ""
        if word in state.optimal_path:
            label += " (G)"
        if word in state.suggested_path:
            label += " (L)"
        path_with_labels.append(f"{word}{label}")
    
    state_str += f"""Current Word: {state.current_word}
Target Word: {state.target_word}
{progress_info}{previous_rationale}

Path So Far: {' -> '.join(path_with_labels)}
Steps Taken: {state.steps_taken}

Available Moves (k=6 nearest neighbors):"""
    
    # Show available moves without giving away the optimal choices
    for word in state.neighbors:
        state_str += f"\n- {word}"
    
    return state_str

def load_progress(progress_path: Path) -> Optional[Dict]:
    """Load progress from progress save file."""
    try:
        if progress_path.exists():
            print(f"\nLoading progress from {progress_path}")
            with open(progress_path, 'r') as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    print("Invalid progress format: not a dictionary")
                    return None
                    
                # Ensure all required fields exist
                if 'completed_combinations' not in data:
                    data['completed_combinations'] = []
                if 'models_used' not in data:
                    data['models_used'] = []
                    
                # Ensure correct types
                if not isinstance(data['completed_combinations'], list):
                    data['completed_combinations'] = []
                if not isinstance(data['models_used'], list):
                    data['models_used'] = []
                    
                # Convert to sets for easier operations
                data['completed_combinations'] = set(data['completed_combinations'])
                data['models_used'] = set(data['models_used'])
                
                print(f"Loaded {len(data['completed_combinations'])} completed combinations")
                print(f"Models used: {', '.join(sorted(data['models_used']))}")
                return data
    except json.JSONDecodeError:
        print(f"Error: Progress file {progress_path} is not valid JSON")
    except Exception as e:
        print(f"Error loading progress: {e}")
    return None

def save_progress(progress_path: Path, data: Dict) -> None:
    """Save progress to progress save file."""
    print(f"\nSaving progress to {progress_path}")
    
    # Validate data structure
    if not isinstance(data, dict):
        print("Error: Progress data must be a dictionary")
        return
        
    required_fields = {'completed_combinations', 'models_used'}
    if not all(field in data for field in required_fields):
        print("Error: Progress data missing required fields")
        return
    
    # Ensure all fields are lists and sorted
    data_to_save = {
        'completed_combinations': sorted(list(data['completed_combinations'])),
        'models_used': sorted(list(data['models_used'])),
        'timestamp': datetime.now().isoformat()
    }
    
    print(f"Completed combinations: {len(data_to_save['completed_combinations'])}")
    print(f"Models used: {', '.join(data_to_save['models_used'])}")
    
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(progress_path, 'w') as f:
            json.dump(data_to_save, f, indent=2)
        print(f"Successfully saved progress to {progress_path}")
    except Exception as e:
        print(f"Error saving progress: {e}")

def get_client() -> OpenAI:
    """Initialize the Ollama client."""
    return OpenAI(base_url=OLLAMA_BASE_URL, api_key=OLLAMA_API_KEY)

def solve_puzzle(pair: Dict, variant: str, graph_nodes: Dict, client: OpenAI, system_prompt: str, model: str) -> Dict:
    """Solve a single puzzle with the given variant."""
    pair_id = f"{pair['startWord']}_{pair['targetWord']}"
    start_word = pair["startWord"]
    end_word = pair["targetWord"]
    optimal_path_length = pair["pathLength"]
    
    print(f"--- Solving {pair_id} with {variant} (Optimal: {optimal_path_length} steps) ---")
    
    # Find optimal path for reference
    optimal_path = find_shortest_path(graph_nodes, start_word, end_word)
    if not optimal_path:
        return {
            "id": pair_id,
            "startWord": start_word,
            "endWord": end_word,
            "optimalPathLength": optimal_path_length,
            "llmPath": [start_word],
            "stepsTaken": 0,
            "status": "failed",
            "reason": "No optimal path found",
            "model": model,
            "testVariant": variant,
            "rationales": [],
            "distances": [],
            "backtrackAttempts": 0,
            "checkpoints": [],
            "backtrackHistory": []
        }
    
    # Initialize game state
    initial_distance = len(find_shortest_path(graph_nodes, start_word, end_word)) - 1
    current_state = GameState(
        current_word=start_word,
        target_word=end_word,
        path_so_far=[start_word],
        neighbors=get_word_neighbors(graph_nodes, start_word),
        steps_taken=0,
        optimal_path=optimal_path,
        suggested_path=optimal_path,  # Start with optimal path as suggested
        test_variant=variant,
        previous_distances=[initial_distance],
        rationales=[],
        invalid_moves=[],
        checkpoints=[],
        backtrack_history=[],
    )
    
    solved = False
    failed = False
    invalid_move_msg = None  # Track invalid move messages
    
    while not solved and not failed:
        # Format state with enhanced context
        state_prompt = format_game_state_enhanced(current_state, graph_nodes, invalid_move_msg)
        
        retry_count = 0
        next_word = None
        rationale = ""
        invalid_move_msg = None  # Reset for this turn
        
        while retry_count < MAX_RETRIES_PER_MOVE:
            try:
                completion = client.beta.chat.completions.parse(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": state_prompt}
                    ],
                    temperature=0.9,
                    response_format=GameResponse
                )
                
                if completion.choices[0].message.parsed:
                    response = completion.choices[0].message.parsed
                    next_word = response.next_move
                    rationale = response.rationale
                    print(f"  LLM chose: {next_word}")
                    
                    # Log what tags this move had
                    tags = []
                    if next_word in current_state.optimal_path:
                        tags.append("G")
                    if next_word in current_state.suggested_path:
                        tags.append("L")
                    if tags:
                        print(f"    Tags: [{', '.join(tags)}]")
                    
                    print(f"  Rationale: {rationale}")
                    
                    next_word_normalized = normalize_word(next_word)
                    
                    # Check if move was previously rejected
                    if next_word_normalized in current_state.invalid_moves:
                        invalid_move_msg = f"'{next_word}' was previously rejected. Choose a different word."
                        print(f"  INVALID MOVE: {next_word} was previously rejected")
                        retry_count += 1
                        continue
                    
                    # Check if target reached
                    if next_word_normalized == normalize_word(current_state.target_word):
                        if next_word_normalized in [normalize_word(n) for n in current_state.neighbors]:
                            solved = True
                            current_state.path_so_far.append(next_word)
                            current_state.steps_taken += 1
                            current_state.previous_distances.append(0)  # Distance to target is 0
                            current_state.rationales.append(rationale)
                            print(f"  SUCCESS! Reached target in {current_state.steps_taken} steps")
                            break
                        else:
                            invalid_move_msg = f"'{next_word}' is not reachable from current word. Choose from the available neighbors."
                            current_state.invalid_moves.append(next_word_normalized)
                            print(f"  INVALID MOVE: Cannot reach target {next_word} from current word")
                            retry_count += 1
                            continue
                    
                    # Check if valid neighbor
                    neighbors_normalized = [normalize_word(n) for n in current_state.neighbors]
                    if next_word_normalized in neighbors_normalized:
                        actual_word = next(neighbor for neighbor in current_state.neighbors 
                                        if normalize_word(neighbor) == next_word_normalized)
                        
                        # Enhanced cycle detection from original script
                        path_normalized = [normalize_word(w) for w in current_state.path_so_far] + [next_word_normalized]
                        cycle_detected = False
                        cycle_words = None
                        cycle_count = 0
                        
                        for cycle_length in range(2, min(7, len(path_normalized) // 2 + 1)):
                            last_sequence = path_normalized[-cycle_length:]
                            for i in range(len(path_normalized) - cycle_length):
                                if path_normalized[i:i + cycle_length] == last_sequence:
                                    cycle_count += 1
                                    if cycle_count >= 2:
                                        cycle_words = ' -> '.join(last_sequence)
                                        print(f"  Detected cycle of length {cycle_length} (appeared {cycle_count} times): {cycle_words}")
                                        cycle_detected = True
                                        break
                            if cycle_detected:
                                break
                        
                        if cycle_detected:
                            # Don't reject if it's an optimal or suggested move
                            is_optimal = next_word_normalized in [normalize_word(w) for w in current_state.optimal_path]
                            is_suggested = next_word_normalized in [normalize_word(w) for w in current_state.suggested_path]
                            
                            if is_optimal or is_suggested:
                                print(f"  Allowing cycle for optimal/suggested move: {next_word}")
                            else:
                                invalid_move_msg = f"Detected cycle {cycle_words}. Choose a different word to avoid repeating patterns."
                                current_state.invalid_moves.append(next_word_normalized)
                                print(f"  INVALID MOVE: Detected cycle {cycle_words}")
                                retry_count += 1
                                continue
                        
                        # Valid move - update game state
                        current_state.path_so_far.append(actual_word)
                        current_state.current_word = actual_word
                        current_state.steps_taken += 1
                        # Calculate new distance to target
                        new_distance = len(find_shortest_path(graph_nodes, actual_word, current_state.target_word)) - 1
                        current_state.previous_distances.append(new_distance)
                        current_state.neighbors = get_word_neighbors(graph_nodes, actual_word)
                        current_state.rationales.append(rationale)
                        # Update suggested path and log the change
                        old_suggested_path = current_state.suggested_path
                        current_state.suggested_path = find_shortest_path(graph_nodes, actual_word, end_word)
                        
                        # Log suggested path update
                        if current_state.suggested_path != old_suggested_path:
                            old_length = len(old_suggested_path) - 1 if old_suggested_path else "∞"
                            new_length = len(current_state.suggested_path) - 1 if current_state.suggested_path else "∞"
                            print(f"    Local path updated: {old_length} → {new_length} steps")
                            if current_state.suggested_path and len(current_state.suggested_path) > 1:
                                print(f"    New local path: {' -> '.join(current_state.suggested_path)}")
                        
                        # Update checkpoints for this move (using old suggested path for comparison)
                        update_checkpoints(current_state, old_suggested_path)
                        
                        # Clear invalid moves for next turn
                        current_state.invalid_moves = []
                        break
                    else:
                        invalid_move_msg = f"'{next_word}' is not in the available neighbors. Choose from: {', '.join(current_state.neighbors)}"
                        current_state.invalid_moves.append(next_word_normalized)
                        print(f"  INVALID MOVE: {next_word} not in neighbors")
                        retry_count += 1
                        continue
                else:
                    invalid_move_msg = "No move provided. Please choose one of the available neighbors."
                    print(f"  LLM refused to provide a move")
                    retry_count += 1
                    continue
                    
            except Exception as e:
                print(f"  Retry {retry_count + 1}/{MAX_RETRIES_PER_MOVE}: {str(e)}")
                retry_count += 1
                continue
        
        if retry_count >= MAX_RETRIES_PER_MOVE:
            # Check if backtracking is available before failing
            available_backtracks = get_available_backtrack_options(current_state)
            if available_backtracks and current_state.backtrack_attempts < 3:  # Max 3 backtracks
                # Choose the most recent available checkpoint
                best_checkpoint = max(available_backtracks, key=lambda x: x["index"])
                print(f"  BACKTRACKING: No valid moves found, using checkpoint {best_checkpoint['word']} [{best_checkpoint['type']}]")
                backtrack_message = backtrack_to_checkpoint(current_state, best_checkpoint, graph_nodes, end_word)
                invalid_move_msg = backtrack_message
                # Reset retry count and continue from backtrack position
                retry_count = 0
                next_word = None
                continue  # Continue the game loop from backtrack position
            else:
                print(f"  FAILED: Could not get valid move after {MAX_RETRIES_PER_MOVE} retries and no backtrack options available")
                failed = True
                break
        
        if current_state.steps_taken >= MAX_STEPS_PER_PUZZLE:
            print(f"  FAILED: Exceeded maximum steps ({current_state.steps_taken})")
            failed = True
            break
    
    # Return result
    result = {
        "id": pair_id,
        "startWord": start_word,
        "endWord": end_word,
        "optimalPathLength": optimal_path_length,
        "llmPath": current_state.path_so_far,
        "stepsTaken": len(current_state.path_so_far) - 1,
        "status": "solved" if solved else "failed",
        "reason": f"Found path in {len(current_state.path_so_far) - 1} moves" if solved else "Failed to find valid path",
        "model": model,
        "testVariant": variant,
        "rationales": current_state.rationales,
        "distances": current_state.previous_distances,
        "backtrackAttempts": current_state.backtrack_attempts,
        "checkpoints": current_state.checkpoints,
        "backtrackHistory": current_state.backtrack_history
    }
    
    if solved:
        print(f"  Path: {' -> '.join(current_state.path_so_far)}")
    
    return result

def update_checkpoints(state: GameState, old_suggested_path: List[str]) -> None:
    """Update checkpoints list when a new move is made."""
    if len(state.path_so_far) < 2:
        return  # Need at least 2 words to have a move
    
    current_word = state.path_so_far[-1]
    current_index = len(state.path_so_far) - 1
    
    # Check if this move was globally or locally optimal
    is_global = current_word in state.optimal_path
    # For local optimality, check if the move was on the PREVIOUS suggested path
    is_local = current_word in old_suggested_path if old_suggested_path else False
    
    if is_global or is_local:
        checkpoint_type = []
        if is_global:
            checkpoint_type.append("G")
        if is_local:
            checkpoint_type.append("L")
        
        # Add as checkpoint (not used yet)
        checkpoint = {
            "word": current_word,
            "index": current_index,
            "type": ",".join(checkpoint_type),
            "used": False
        }
        state.checkpoints.append(checkpoint)
        print(f"    Added checkpoint: {current_word} [{','.join(checkpoint_type)}] at index {current_index}")
    else:
        print(f"    No checkpoint: {current_word} was not on optimal paths (G: {current_word in state.optimal_path}, L: {current_word in old_suggested_path if old_suggested_path else False})")

def backtrack_to_checkpoint(state: GameState, checkpoint: Dict, graph_nodes: Dict, end_word: str) -> str:
    """Backtrack to a specific checkpoint, resetting game state. Returns message about failed path."""
    target_index = checkpoint["index"]
    target_word = checkpoint["word"]
    
    # Capture the failed path from checkpoint to current position
    failed_path = state.path_so_far[target_index:]
    failed_path_str = " -> ".join(failed_path) if len(failed_path) > 1 else failed_path[0]
    
    print(f"    BACKTRACKING from {state.current_word} to {target_word} (index {target_index})")
    print(f"    Failed path was: {failed_path_str}")
    
    # Record backtrack event with failed path info
    backtrack_event = {
        "from": state.current_word,
        "to": target_word,
        "failed_path": failed_path
    }
    state.backtrack_history.append(backtrack_event)
    state.backtrack_attempts += 1
    
    # Mark checkpoint as used
    for cp in state.checkpoints:
        if cp["word"] == target_word and cp["index"] == target_index:
            cp["used"] = True
            break
    
    # Reset game state to checkpoint
    state.path_so_far = state.path_so_far[:target_index + 1]
    state.current_word = target_word
    state.steps_taken = target_index
    state.neighbors = get_word_neighbors(graph_nodes, target_word)
    state.suggested_path = find_shortest_path(graph_nodes, target_word, end_word)
    
    # Truncate other tracking arrays
    state.previous_distances = state.previous_distances[:target_index + 1]
    state.rationales = state.rationales[:target_index]
    
    # Clear invalid moves for fresh start
    state.invalid_moves = []
    
    print(f"    Reset to: {target_word}, path length: {len(state.path_so_far)}")
    
    # Return detailed message about what went wrong
    if len(failed_path) > 1:
        return f"Backtracked to {target_word} (a previous {checkpoint['type']} move). Your path from here was: {failed_path_str} - this led to a dead end. Try a different approach from {target_word}."
    else:
        return f"Backtracked to {target_word} (a previous {checkpoint['type']} move). Try a different approach from here."

def get_available_backtrack_options(state: GameState) -> List[Dict]:
    """Get available backtrack options (unused checkpoints)."""
    available = []
    for checkpoint in state.checkpoints:
        if not checkpoint["used"]:
            # Check if we've already backtracked to this word
            already_used = any(
                event["to"] == checkpoint["word"] 
                for event in state.backtrack_history
            )
            if not already_used:
                available.append(checkpoint)
    return available

def main():
    # Parse command line arguments
    args = parse_arguments()
    
    print("Starting Enhanced LLM Testing for Playtest Pairs...")
    print(f"Using model: {args.model}")
    print(f"Enhanced features: Distance tracking, optimal move tagging, rationale continuity")
    
    # We only test the enhanced variant
    variants_to_test = ["enhanced"]
    
    # Create results directory if it doesn't exist
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        client = get_client()
    except Exception as e:
        print(f"Failed to initialize client: {e}")
        sys.exit(1)
    
    # Load game data
    print("Loading game data...")
    playtest_data = load_json_file(PLAYTEST_PAIRS_PATH)
    pairs = playtest_data["pairs"]
    graph_data = load_json_file(GRAPH_PATH)
    graph_nodes = graph_data["nodes"]
    
    print(f"Loaded {len(pairs)} playtest pairs")
    
    # Load progress
    progress = load_progress(MERGED_PROGRESS_PATH)
    if progress:
        completed_combinations = set(progress['completed_combinations'])
        models_used = set(progress['models_used'])
    else:
        print("No progress file found, starting fresh.")
        completed_combinations = set()
        models_used = set()
    
    # Enhanced system prompt - LLM learns from path history, not given current answers
    system_prompt = """You are an AI playing a semantic word navigation game with enhanced guidance.

Goal: Reach the Target Word from the Current Word using only the top k=6 nearest neighbors at each step.

Game Information:
- (G) = Previous move was on the original optimal path (globally optimal)
- (L) = Previous move was on current shortest path from that position (locally optimal)
- Previous rationale = Your reasoning from the last move for context continuity
- Distance to target = Minimum steps needed from current position (with progress feedback)
- Backtracking = If you get stuck, you may be automatically backtracked to a previous G or L position

Strategies:
- Your PRIMARY goal is to reach the target word. Choose moves that get you closer to it.
- Watch the distance to target - it should decrease with good moves toward the target.
- Learn from your path history - see which previous moves were (G) or (L) optimal.
- Use your previous rationale to maintain consistent reasoning.
- If you see a backtrack message, you've been returned to a strategic position - try a different approach.
- Semantic similarity is just a means to connect words - don't stay close to the start word.
- Consider hub words (polysemous/well-connected) that might bridge to the target.
- Pay attention to the path so far and try to avoid cycles and repeated words.
- Sometimes strategic repositioning (even increasing distance) can open better paths.

Let's think step by step and explain your reasoning clearly."""
    
    # Process each pair with each variant
    all_results = []
    total_combinations = len(pairs) * len(variants_to_test)
    completed_count = len([c for c in completed_combinations if args.model in c])
    
    print(f"\nTotal combinations to test for {args.model}: {total_combinations}")
    print(f"Already completed for {args.model}: {completed_count}")
    print(f"Remaining for {args.model}: {total_combinations - completed_count}")
    
    for pair in pairs:
        pair_id = f"{pair['startWord']}_{pair['targetWord']}"
        
        for variant in variants_to_test:
            combination_key = f"{pair_id}_{args.model}_{variant}"
            
            # Skip if already completed
            if combination_key in completed_combinations:
                print(f"SKIPPING: {combination_key} (already completed)")
                continue
            
            # Solve the puzzle
            result = solve_puzzle(pair, variant, graph_nodes, client, system_prompt, args.model)
            all_results.append(result)
            
            # Update progress
            completed_combinations.add(combination_key)
            models_used.add(args.model)
            
            # Save results incrementally
            if result['status'] == 'solved' or len(all_results) % 5 == 0:  # Save every 5 results or when solved
                if all_results:
                    save_json_file(all_results, MERGED_RESULTS_PATH)
                    all_results = []  # Clear to avoid duplicates
                
                # Save progress
                progress_data = {
                    'completed_combinations': completed_combinations,
                    'models_used': models_used
                }
                save_progress(MERGED_PROGRESS_PATH, progress_data)
            
            # Small delay between puzzles
            time.sleep(1)
    
    # Save any remaining results
    if all_results:
        save_json_file(all_results, MERGED_RESULTS_PATH)
    
    # Final progress save
    progress_data = {
        'completed_combinations': completed_combinations,
        'models_used': models_used
    }
    save_progress(MERGED_PROGRESS_PATH, progress_data)
    
    # Final Summary
    print("\n--- Enhanced LLM Test Summary ---")
    print(f"Model: {args.model}")
    print(f"Total pairs: {len(pairs)}")
    print(f"Enhanced variant with optimal guidance")
    print(f"Total combinations completed: {len([c for c in completed_combinations if args.model in c])}")
    print(f"Models tested: {', '.join(sorted(models_used))}")
    print("--- End of Test ---")

if __name__ == "__main__":
    main() 