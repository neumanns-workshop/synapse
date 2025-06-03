import json
import os
import sys
import time
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
DAILY_CHALLENGES_PATH = PROJECT_ROOT / "src" / "data" / "daily_challenges.json"
GRAPH_PATH = PROJECT_ROOT / "client" / "public" / "data" / "graph.json"
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
MERGED_RESULTS_PATH = RESULTS_DIR / "merged_results.json"
MERGED_PROGRESS_PATH = RESULTS_DIR / "merged_progress.json"

# Batch processing settings
BATCH_SIZE = 60
BATCH_DELAY = 60

# API Configuration
OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_API_KEY = "ollama"
OLLAMA_MODEL = "cogito:14b"  # Changed to phi4-reasoning:plus
OPENAI_MODELS = ["gpt-4o-mini"]

# --- Game Models ---
class GameState(BaseModel):
    current_word: str
    target_word: str
    path_so_far: List[str]
    neighbors: List[str]  # k=6 nearest neighbors
    steps_taken: int
    optimal_path: List[str]
    suggested_path: List[str]
    next_move: Optional[str] = None
    prev_moves_left: Optional[int] = None
    invalid_moves: List[str] = []
    path_suggested_moves: List[str] = []  # Track only the next suggested move at each step

class GameResponse(BaseModel):
    next_move: str

# --- Helper Functions ---
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
            'llmPath', 'stepsTaken', 'status', 'reason', 'model'
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
            'model': str(item['model'])
        }
        
        # Add optional fields if they exist
        if 'backtrackAttempts' in item:
            normalized['backtrackAttempts'] = int(item['backtrackAttempts'])
            
        normalized_data.append(normalized)
    
    # If file exists, load existing data and merge
    if path.exists():
        try:
            with open(path, 'r') as f:
                existing_data = json.load(f)
                if isinstance(existing_data, list):
                    # Create a map of existing results by ID
                    existing_map = {item.get('id'): item for item in existing_data}
                    # Add new solutions
                    for item in normalized_data:
                        if item['id'] not in existing_map:
                            existing_map[item['id']] = item
                            print(f"  Added new solution for puzzle {item['id']}")
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

def format_game_state(state: GameState, graph_nodes: Dict, invalid_move: Optional[Dict] = None) -> str:
    """Format the current game state for the LLM."""
    state_str = ""
    if invalid_move:
        msg = invalid_move.get('msg', '')
        move = invalid_move.get('move', '')
        state_str += f'Previous move was invalid: "{move}". {msg}\n'

    # Calculate moves left based on remaining steps in suggested path
    current_moves_left = max(len(state.suggested_path) - 1, 0)
    
    # Format path with O/S labels
    path_with_labels = []
    for i, word in enumerate(state.path_so_far):
        label = ""
        if word in state.optimal_path:
            label += " (O)"
        if i < len(state.path_suggested_moves) and word == state.path_suggested_moves[i]:
            label += " (S)"
        path_with_labels.append(f"{word}{label}")
    
    state_str += f"""
Current Word: {state.current_word}
Target Word: {state.target_word}
Moves left: {current_moves_left} (previous: {state.prev_moves_left if state.prev_moves_left is not None else current_moves_left})
Path So Far: {' -> '.join(path_with_labels)}

Available Moves (k=6 nearest neighbors):
"""
    for word in state.neighbors:
        if word in graph_nodes:
            state_str += f"- {word}\n"
    
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
                if 'solved_results' not in data:
                    data['solved_results'] = []
                if 'attempted_indices' not in data:
                    data['attempted_indices'] = []
                if 'models_used' not in data:
                    data['models_used'] = []
                    
                # Ensure correct types
                if not isinstance(data['solved_results'], list):
                    data['solved_results'] = []
                if not isinstance(data['attempted_indices'], list):
                    data['attempted_indices'] = []
                if not isinstance(data['models_used'], list):
                    data['models_used'] = []
                    
                # Convert to sets for easier operations
                data['solved_results'] = set(data['solved_results'])
                data['attempted_indices'] = set(data['attempted_indices'])
                data['models_used'] = set(data['models_used'])
                
                # Check merged_results.json for any solved puzzles not in progress
                merged_results_path = RESULTS_DIR / "merged_results.json"
                if merged_results_path.exists():
                    try:
                        with open(merged_results_path, 'r') as f:
                            results_data = json.load(f)
                            if isinstance(results_data, list):
                                # Find any solved puzzles not in progress
                                found_new_solved = False
                                for result in results_data:
                                    if result.get('status') == 'solved':
                                        puzzle_id = result.get('id')
                                        if puzzle_id and puzzle_id not in data['solved_results']:
                                            print(f"Found solved puzzle {puzzle_id} in results but not in progress")
                                            data['solved_results'].add(puzzle_id)
                                            data['attempted_indices'].add(puzzle_id)
                                            found_new_solved = True
                                
                                # If we found any new solved puzzles, save the progress file immediately
                                if found_new_solved:
                                    print("\nSaving updated progress file with newly found solved puzzles...")
                                    save_progress(progress_path, {
                                        'solved_results': sorted(list(data['solved_results'])),
                                        'attempted_indices': sorted(list(data['attempted_indices'])),
                                        'models_used': sorted(list(data['models_used']))
                                    })
                    except Exception as e:
                        print(f"Error checking merged results: {e}")
                
                print(f"Loaded {len(data['solved_results'])} solved puzzles and {len(data['attempted_indices'])} attempted puzzles")
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
        
    required_fields = {'solved_results', 'attempted_indices', 'models_used'}
    if not all(field in data for field in required_fields):
        print("Error: Progress data missing required fields")
        return
    
    # Ensure all fields are lists and sorted
    data_to_save = {
        'solved_results': sorted(list(data['solved_results'])),
        'attempted_indices': sorted(list(data['attempted_indices'])),
        'models_used': sorted(list(data['models_used'])),
        'timestamp': datetime.now().isoformat()
    }
    
    # Validate that solved puzzles are also in attempted
    solved_not_attempted = set(data_to_save['solved_results']) - set(data_to_save['attempted_indices'])
    if solved_not_attempted:
        print(f"WARNING: Found {len(solved_not_attempted)} solved puzzles not in attempted list:")
        for puzzle_id in sorted(solved_not_attempted):
            print(f"  {puzzle_id}")
        # Fix the data
        data_to_save['attempted_indices'].extend(sorted(solved_not_attempted))
        data_to_save['attempted_indices'] = sorted(data_to_save['attempted_indices'])
    
    print(f"Solved puzzles: {len(data_to_save['solved_results'])}")
    print(f"Attempted puzzles: {len(data_to_save['attempted_indices'])}")
    print(f"Models used: {', '.join(data_to_save['models_used'])}")
    
    # Print the actual solved puzzles for verification
    print("\nSolved puzzles:")
    for puzzle_id in data_to_save['solved_results']:
        print(f"  {puzzle_id}")
    
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(progress_path, 'w') as f:
            json.dump(data_to_save, f, indent=2)
        print(f"Successfully saved progress to {progress_path}")
    except Exception as e:
        print(f"Error saving progress: {e}")

def find_latest_progress() -> Optional[Path]:
    """Find the most recent progress file."""
    if not RESULTS_DIR.exists():
        return None
    
    progress_files = list(RESULTS_DIR.glob("progress_*.json"))
    if not progress_files:
        return None
    
    # Sort by modification time, newest first
    return max(progress_files, key=lambda p: p.stat().st_mtime)

def find_last_optimal_word(path_so_far: List[str], optimal_path: List[str], suggested_path: List[str]) -> Optional[int]:
    """Find the index of the last word in path_so_far that appears in either optimal_path or suggested_path."""
    for i in range(len(path_so_far) - 1, -1, -1):
        word = path_so_far[i]
        if word in optimal_path or word in suggested_path:
            return i
    return None

def get_client() -> OpenAI:
    """Initialize the appropriate client based on the model."""
    if OLLAMA_MODEL in OPENAI_MODELS:
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError(f"OpenAI API key required for model {OLLAMA_MODEL}")
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return OpenAI(base_url=OLLAMA_BASE_URL, api_key=OLLAMA_API_KEY)

def process_batch(challenges: List[Dict], start_idx: int, batch_size: int, graph_nodes: Dict, 
                 client: OpenAI, system_prompt: str, solved_challenges: Set[str]) -> Tuple[List[Dict], int, int, int]:
    """Process a batch of challenges."""
    batch_results = []
    batch_solved = 0
    batch_failed = 0
    batch_skipped = 0
    
    end_idx = min(start_idx + batch_size, len(challenges))
    print(f"\nProcessing batch {start_idx//batch_size + 1} (challenges {start_idx+1}-{end_idx})...")
    
    for i in range(start_idx, end_idx):
        challenge = challenges[i]
        challenge_id = challenge.get("id")
        
        # Skip if already solved
        if challenge_id in solved_challenges:
            print(f"--- Challenge {challenge_id}: SKIPPED (Already solved) ---")
            batch_results.append({
                "id": challenge_id,
                "status": "skipped",
                "reason": "Already solved",
                "model": OLLAMA_MODEL
            })
            batch_skipped += 1
            continue
            
        start_word = challenge.get("startWord")
        end_word = challenge.get("targetWord")
        original_path_len = challenge.get("pathLength", "N/A")

        if not start_word or not end_word:
            print(f"--- Challenge {challenge_id}: SKIPPED (Missing startWord or endWord) ---")
            batch_results.append({
                "id": challenge_id,
                "status": "skipped",
                "reason": "Missing start or end word",
                "model": OLLAMA_MODEL
            })
            batch_skipped += 1
            continue

        print(f"--- Challenge {challenge_id}: {start_word} -> {end_word} (Optimal: {original_path_len} steps) ---")

        # Find optimal path for display purposes only
        optimal_path = find_shortest_path(graph_nodes, start_word, end_word)
        recalculated_length = len(optimal_path) - 1 if optimal_path else float('inf')
        assert recalculated_length == original_path_len, f"Path length mismatch for {start_word} -> {end_word}: original={original_path_len}, recalculated={recalculated_length}"
        
        # Initialize game state
        current_state = GameState(
            current_word=start_word,
            target_word=end_word,
            path_so_far=[start_word],
            neighbors=get_word_neighbors(graph_nodes, start_word),
            steps_taken=0,
            optimal_path=optimal_path,
            suggested_path=optimal_path,
            prev_moves_left=original_path_len
        )

        game_history = []
        solved = False
        failed = False
        backtrack_attempts = 0
        max_backtrack_attempts = 3
        last_backtrack_word = None

        while not solved and not failed:
            invalid_move = None
            if len(game_history) > 0 and 'invalid_move' in game_history[-1]:
                invalid_move = game_history[-1]['invalid_move']
            
            if last_backtrack_word:
                invalid_move = {
                    'msg': f'Backtracked to "{last_backtrack_word}" as it was a known good position in the path. Please try a different move from here.',
                    'move': last_backtrack_word
                }
                last_backtrack_word = None
            
            state_prompt = format_game_state(current_state, graph_nodes, invalid_move)
            
            try:
                max_retries = 5
                retry_count = 0
                next_word = None

                while retry_count < max_retries:
                    try:
                        completion = client.beta.chat.completions.parse(
                            model=OLLAMA_MODEL,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": state_prompt}
                            ],
                            temperature=0.9,
                            response_format=GameResponse
                        )

                        if completion.choices[0].message.parsed:
                            next_word = completion.choices[0].message.parsed.next_move
                            print(f"  LLM chose: {next_word}")
                            next_word_normalized = normalize_word(next_word)
                            
                            # Log if move is optimal or suggested
                            label = ""
                            if next_word_normalized in [normalize_word(w) for w in current_state.optimal_path]:
                                label += "O"
                            if next_word_normalized in [normalize_word(w) for w in current_state.suggested_path]:
                                label += "S"
                            if label:
                                print(f"    (Optimal/Suggested: {label})")
                            
                            # Log moves left
                            current_moves = max(len(current_state.suggested_path) - 1, 0)
                            print(f"    Moves left: {current_moves} (previous: {current_state.prev_moves_left if current_state.prev_moves_left is not None else current_moves})")
                            
                            # Validate move
                            if next_word_normalized in current_state.invalid_moves:
                                if next_word_normalized == normalize_word(current_state.target_word):
                                    if next_word_normalized in [normalize_word(n) for n in current_state.neighbors]:
                                        solved = True
                                        print(f"  SUCCESS! Reached target in {current_state.steps_taken + 1} steps")
                                        break
                                print(f"  INVALID MOVE: {next_word} was previously rejected")
                                retry_count += 1
                                continue

                            if next_word_normalized == normalize_word(current_state.target_word):
                                if next_word_normalized in [normalize_word(n) for n in current_state.neighbors]:
                                    solved = True
                                    print(f"  SUCCESS! Reached target in {current_state.steps_taken + 1} steps")
                                    break
                                else:
                                    print(f"  INVALID MOVE: Cannot reach target {next_word} from current word")
                                    current_state.invalid_moves.append(next_word_normalized)
                                    retry_count += 1
                                    continue

                            neighbors_normalized = [normalize_word(n) for n in current_state.neighbors]
                            if next_word_normalized in neighbors_normalized:
                                actual_word = next(neighbor for neighbor in current_state.neighbors 
                                                if normalize_word(neighbor) == next_word_normalized)
                                
                                # Check for cycles
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
                                        print(f"  INVALID MOVE: Detected cycle {cycle_words}")
                                        current_state.invalid_moves.append(next_word_normalized)
                                        retry_count += 1
                                        continue
                                
                                # Update game state for valid moves
                                current_state.path_so_far.append(actual_word)
                                current_state.current_word = actual_word
                                current_state.steps_taken += 1
                                current_state.neighbors = get_word_neighbors(graph_nodes, actual_word)
                                current_state.prev_moves_left = max(len(current_state.suggested_path) - 1, 0)
                                current_state.suggested_path = find_shortest_path(graph_nodes, actual_word, end_word)
                                if current_state.suggested_path and len(current_state.suggested_path) > 1:
                                    next_suggested = current_state.suggested_path[1]
                                    current_state.path_suggested_moves.append(next_suggested)
                                break
                            else:
                                print(f"  INVALID MOVE: {next_word}")
                                current_state.invalid_moves.append(next_word_normalized)
                                retry_count += 1
                                continue
                        else:
                            print(f"  LLM refused to provide a move")
                            retry_count += 1
                            continue

                    except Exception as e:
                        print(f"  Retry {retry_count + 1}/{max_retries}: {str(e)}")
                        retry_count += 1
                        continue

                if not next_word or retry_count >= max_retries:
                    print(f"  LLM failed to provide a valid move after {max_retries} retries")
                    
                    if backtrack_attempts < max_backtrack_attempts:
                        last_optimal_idx = find_last_optimal_word(
                            current_state.path_so_far,
                            current_state.optimal_path,
                            current_state.suggested_path
                        )
                        
                        if last_optimal_idx is not None and last_optimal_idx > 0:
                            backtrack_attempts += 1
                            print(f"  Attempting backtrack to last optimal/suggested word (attempt {backtrack_attempts}/{max_backtrack_attempts})")
                            
                            backtrack_word = current_state.path_so_far[last_optimal_idx]
                            current_state.path_so_far = current_state.path_so_far[:last_optimal_idx + 1]
                            current_state.current_word = backtrack_word
                            current_state.steps_taken = last_optimal_idx
                            current_state.neighbors = get_word_neighbors(graph_nodes, backtrack_word)
                            current_state.suggested_path = find_shortest_path(graph_nodes, backtrack_word, end_word)
                            current_state.prev_moves_left = max(len(current_state.suggested_path) - 1, 0)
                            current_state.path_suggested_moves = current_state.path_suggested_moves[:last_optimal_idx]
                            current_state.invalid_moves = []
                            
                            print(f"  Backtracked to: {backtrack_word}")
                            last_backtrack_word = backtrack_word
                            continue
                    
                    failed = True
                    break

                if current_state.steps_taken >= 30:
                    print(f"  FAILED: Exceeded maximum steps ({current_state.steps_taken})")
                    failed = True
                    break

            except Exception as e:
                print(f"  ERROR during LLM interaction: {e}")
                failed = True
                break

        # Record results
        challenge_result = {
            "id": challenge_id,
            "startWord": start_word,
            "endWord": end_word,
            "optimalPathLength": original_path_len,
            "llmPath": current_state.path_so_far,
            "stepsTaken": len(current_state.path_so_far) - 1,
            "status": "solved" if solved else "failed",
            "reason": f"Found path in {len(current_state.path_so_far) - 1} moves" if solved else "Invalid move or exceeded step limit",
            "model": OLLAMA_MODEL,
            "backtrackAttempts": backtrack_attempts
        }
        batch_results.append(challenge_result)
        
        # Update batch counters
        if solved:
            batch_solved += 1
            print(f"  Added solved puzzle {challenge_id} to batch results")
            print(f"  Path: {' -> '.join(current_state.path_so_far)}")
        elif failed:
            batch_failed += 1
            print(f"  Added failed puzzle {challenge_id} to batch results")

    return batch_results, batch_solved, batch_failed, batch_skipped

def find_latest_results() -> Optional[Path]:
    """Find the most recent results file."""
    if not RESULTS_DIR.exists():
        return None
    
    results_files = list(RESULTS_DIR.glob("llm_test_results_*.json"))
    if not results_files:
        return None
    
    # Sort by modification time, newest first
    return max(results_files, key=lambda p: p.stat().st_mtime)

def load_all_results() -> List[Dict]:
    """Load results from merged files only."""
    if not RESULTS_DIR.exists():
        return []
    
    # Track all results by ID
    results_by_id: Dict[str, Dict] = {}
    
    # First try to load from merged results file
    merged_results_path = RESULTS_DIR / "merged_results.json"
    if merged_results_path.exists():
        try:
            results_data = load_json_file(merged_results_path)
            if isinstance(results_data, list):
                for result in results_data:
                    puzzle_id = result.get('id')
                    if not puzzle_id:
                        continue
                    results_by_id[puzzle_id] = result
                print(f"\nLoaded {len(results_data)} results from merged_results.json")
        except Exception as e:
            print(f"Error loading merged results file: {e}")
    
    # Convert back to list
    all_results = list(results_by_id.values())
    return all_results

def main():
    print("Starting LLM game simulation...")
    print(f"Using model: {OLLAMA_MODEL}")
    
    # Create results directory if it doesn't exist
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        client = get_client()
    except Exception as e:
        print(f"Failed to initialize client: {e}")
        sys.exit(1)

    # Load game data
    print("Loading game data...")
    daily_challenges_data = load_json_file(DAILY_CHALLENGES_PATH)
    daily_challenges = daily_challenges_data["challenges"]
    graph_data = load_json_file(GRAPH_PATH)
    graph_nodes = graph_data["nodes"]

    # Sort challenges by path length and filter for length 6
    daily_challenges = sorted(daily_challenges, key=lambda x: x['pathLength'])
    daily_challenges = [c for c in daily_challenges if c['pathLength'] == 6]
    print(f"Processing {len(daily_challenges)} challenges with path length 6")

    # Load progress from merged progress file
    progress = load_progress(MERGED_PROGRESS_PATH)
    if progress:
        print(f"\nFound progress file: {MERGED_PROGRESS_PATH}")
        print(f"Progress from {progress.get('timestamp', 'unknown time')}")
        
        # Get solved and attempted from progress file
        solved_challenges = set(progress['solved_results'])
        attempted_indices = set(progress['attempted_indices'])
        models_used = set(progress['models_used'])
        
        print(f"\nProgress summary:")
        print(f"Total solved puzzles: {len(solved_challenges)}")
        print(f"Total attempted puzzles: {len(attempted_indices)}")
        print(f"Models used: {', '.join(sorted(models_used))}")
    else:
        print("No progress file found, starting fresh.")
        solved_challenges = set()
        attempted_indices = set()
        models_used = set()
    
    # System prompt for the LLM
    system_prompt = """You are an AI playing a semantic word navigation game.
Goal: Reach the Target Word from the Current Word using only the top k=6 nearest neighbors at each step.

Game Information:
-   (O) = Globally optimal path move (overall shortest path).
-   (S) = Locally optimal path move (currently shortest path).

Strategies:
-   Your PRIMARY goal is to reach the target word. Choose moves that get you closer to it. You CANNOT simply choose the target word without playing the game.
-   Watch the 'moves left' count - it should decrease with each move toward the target.
-   Semantic similarity is just a means to connect words - don't stay close to the start word.
-   Consider hub words (polysemous/well-connected) that might bridge to the target.
-   Pay attention to the path so far and try to avoid cycles and repeated words.

Let's think step by step.
"""

    # Process challenges in batches
    start_idx = 0
    total_solved = len(solved_challenges)  # Start with previously solved challenges
    total_failed = 0
    total_skipped = 0
    
    while start_idx < len(daily_challenges):
        # Skip only solved challenges, retry failed ones
        while start_idx < len(daily_challenges) and daily_challenges[start_idx].get("id") in solved_challenges:
            start_idx += 1
        
        if start_idx >= len(daily_challenges):
            break

        batch_results, batch_solved, batch_failed, batch_skipped = process_batch(
            daily_challenges, start_idx, BATCH_SIZE, graph_nodes, client, system_prompt, solved_challenges
        )
        
        # Update totals
        total_solved += batch_solved
        total_failed += batch_failed
        total_skipped += batch_skipped
        
        # Update progress
        new_solved = False
        batch_solved_ids = set()
        for result in batch_results:
            puzzle_id = result['id']
            if result['status'] == 'solved':
                if puzzle_id not in solved_challenges:  # Only add if not already solved
                    solved_challenges.add(puzzle_id)
                    new_solved = True
                    batch_solved_ids.add(puzzle_id)
                    print(f"  Marked puzzle {puzzle_id} as solved")
                else:
                    print(f"  Puzzle {puzzle_id} was already solved")
            attempted_indices.add(puzzle_id)
            models_used.add(result['model'])
        
        if batch_solved_ids:
            print(f"\nNewly solved puzzles in this batch: {sorted(batch_solved_ids)}")
            print(f"Total solved puzzles now: {len(solved_challenges)}")
        
        # Save solved results if we have new ones
        if new_solved:
            # Save only the new solved results
            new_results = [r for r in batch_results if r['status'] == 'solved' and r['id'] in batch_solved_ids]
            if new_results:
                print("\nSaving new solutions:")
                for result in new_results:
                    print(f"  Saving solution for puzzle {result['id']}")
                save_json_file(new_results, MERGED_RESULTS_PATH)
                print(f"\nAdded {len(new_results)} new solutions to {MERGED_RESULTS_PATH}")
        
        # Always save progress after each batch
        progress_data = {
            'solved_results': sorted(list(solved_challenges)),  # Convert to sorted list for consistency
            'attempted_indices': sorted(list(attempted_indices)),
            'models_used': sorted(list(models_used))
        }
        save_progress(MERGED_PROGRESS_PATH, progress_data)
        print(f"Updated progress file with {len(solved_challenges)} solved puzzles and {len(attempted_indices)} attempted puzzles")
        
        # Print batch summary
        print(f"\nBatch Summary:")
        print(f"Solved in this batch: {batch_solved}")
        print(f"Failed in this batch: {batch_failed}")
        print(f"Skipped in this batch: {batch_skipped}")
        print(f"\nOverall Progress:")
        print(f"Total solved: {len(solved_challenges)}")
        print(f"Total failed: {total_failed}")
        print(f"Total skipped: {total_skipped}")
        print(f"Total attempted: {len(attempted_indices)}")
        print(f"Remaining unsolved: {len(daily_challenges) - len(solved_challenges)}")
        
        # Update start index for next batch
        start_idx += BATCH_SIZE
        
        # Take a break between batches if not the last batch
        if start_idx < len(daily_challenges):
            print(f"\nTaking a {BATCH_DELAY//60} minute break before the next batch...")
            time.sleep(BATCH_DELAY)

    # Final Summary
    print("\n--- Game Simulation Summary ---")
    print(f"Total Challenges: {len(daily_challenges)}")
    print(f"Solved: {total_solved}")
    print(f"Failed: {total_failed}")
    print(f"Skipped: {total_skipped}")
    print(f"Attempted: {len(attempted_indices)}")
    print(f"Remaining: {len(daily_challenges) - len(attempted_indices)}")
    
    if len(attempted_indices) > 0:
        success_rate = (total_solved / len(attempted_indices)) * 100
        print(f"Success Rate: {success_rate:.2f}%")

    print("--- End of Simulation ---")

if __name__ == "__main__":
    main() 