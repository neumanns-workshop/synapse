import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
import random

# Import the heuristic solver
from heuristic_solver import HeuristicSolver

# --- Configuration ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DAILY_CHALLENGES_PATH = PROJECT_ROOT / "src" / "data" / "daily_challenges.json"
GRAPH_PATH = PROJECT_ROOT / "client" / "public" / "data" / "graph.json"
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
MERGED_RESULTS_PATH = RESULTS_DIR / "merged_results.json"
MERGED_PROGRESS_PATH = RESULTS_DIR / "merged_progress.json"

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
        if 'strategy_log' in item:
            normalized['strategy_log'] = item['strategy_log']
        if 'heuristic_score' in item:
            normalized['heuristic_score'] = float(item['heuristic_score'])
            
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
    
    print(f"Solved puzzles: {len(data_to_save['solved_results'])}")
    print(f"Attempted puzzles: {len(data_to_save['attempted_indices'])}")
    print(f"Models used: {', '.join(data_to_save['models_used'])}")
    
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(progress_path, 'w') as f:
            json.dump(data_to_save, f, indent=2)
        print(f"Successfully saved progress to {progress_path}")
    except Exception as e:
        print(f"Error saving progress: {e}")

def solve_with_heuristic_batch(challenges: List[Dict], solver: HeuristicSolver, 
                              solved_challenges: Set[str], batch_size: int = 50) -> Tuple[List[Dict], int, int, int]:
    """Solve a batch of challenges using the heuristic solver."""
    batch_results = []
    batch_solved = 0
    batch_failed = 0
    batch_skipped = 0
    
    print(f"\nProcessing batch of {len(challenges)} challenges with heuristic solver...")
    
    for i, challenge in enumerate(challenges):
        challenge_id = challenge.get("id")
        
        # Skip if already solved
        if challenge_id in solved_challenges:
            print(f"--- Challenge {challenge_id}: SKIPPED (Already solved) ---")
            batch_results.append({
                "id": challenge_id,
                "status": "skipped",
                "reason": "Already solved",
                "model": "heuristic_solver"
            })
            batch_skipped += 1
            continue
            
        start_word = challenge.get("startWord")
        end_word = challenge.get("targetWord")
        optimal_path_length = challenge.get("pathLength", "N/A")

        if not start_word or not end_word:
            print(f"--- Challenge {challenge_id}: SKIPPED (Missing startWord or endWord) ---")
            batch_results.append({
                "id": challenge_id,
                "status": "skipped",
                "reason": "Missing start or end word",
                "model": "heuristic_solver"
            })
            batch_skipped += 1
            continue

        print(f"--- Challenge {i+1}/{len(challenges)}: {challenge_id} ---")
        print(f"Solving: {start_word} -> {end_word} (Optimal: {optimal_path_length} steps)")

        # Solve with heuristic solver
        result = solver.solve_puzzle(start_word, end_word)
        
        # Format result for consistency
        challenge_result = {
            "id": challenge_id,
            "startWord": start_word,
            "endWord": end_word,
            "optimalPathLength": optimal_path_length,
            "llmPath": result["path"],
            "stepsTaken": result["steps"],
            "status": result["status"],
            "reason": result["reason"],
            "model": "heuristic_solver",
            "strategy_log": result.get("strategy_log", []),
            "heuristic_score": result["steps"] / optimal_path_length if result["status"] == "solved" else float('inf')
        }
        
        batch_results.append(challenge_result)
        
        # Update batch counters and print results
        if result["status"] == "solved":
            batch_solved += 1
            efficiency = result["steps"] / optimal_path_length
            print(f"  ✓ SOLVED in {result['steps']} steps (efficiency: {efficiency:.2f}x optimal)")
            print(f"  Path: {' -> '.join(result['path'])}")
        else:
            batch_failed += 1
            print(f"  ✗ FAILED: {result['reason']}")
            if result["path"]:
                print(f"  Partial path: {' -> '.join(result['path'])}")

    return batch_results, batch_solved, batch_failed, batch_skipped

def main():
    print("Starting Heuristic Solver for Daily Challenges...")
    print("This solver uses rule-based heuristics instead of LLMs for faster solving.")
    
    # Create results directory if it doesn't exist
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

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

    # Initialize heuristic solver
    print(f"\nInitializing heuristic solver...")
    solver = HeuristicSolver(graph_nodes)
    print(f"Solver initialized with {len(graph_nodes)} words")
    print(f"Identified {len(solver.hub_words)} hub words")

    # Filter out already solved challenges
    unsolved_challenges = [c for c in daily_challenges if c.get("id") not in solved_challenges]
    print(f"\nUnsolved challenges: {len(unsolved_challenges)}")
    
    if not unsolved_challenges:
        print("All challenges are already solved!")
        return

    # Ask user how many to solve
    max_to_solve = min(50, len(unsolved_challenges))  # Default to 50 or remaining
    print(f"\nHow many challenges would you like to solve? (max: {len(unsolved_challenges)}, default: {max_to_solve})")
    try:
        user_input = input("Enter number (or press Enter for default): ").strip()
        if user_input:
            num_to_solve = min(int(user_input), len(unsolved_challenges))
        else:
            num_to_solve = max_to_solve
    except ValueError:
        print("Invalid input, using default.")
        num_to_solve = max_to_solve

    print(f"Will attempt to solve {num_to_solve} challenges")

    # Shuffle for random selection
    random.seed(42)  # For reproducibility
    random.shuffle(unsolved_challenges)
    challenges_to_solve = unsolved_challenges[:num_to_solve]

    # Solve challenges
    batch_results, batch_solved, batch_failed, batch_skipped = solve_with_heuristic_batch(
        challenges_to_solve, solver, solved_challenges
    )
    
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
        attempted_indices.add(puzzle_id)
        models_used.add(result['model'])
    
    if batch_solved_ids:
        print(f"\nNewly solved puzzles: {sorted(batch_solved_ids)}")
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
    
    # Always save progress
    progress_data = {
        'solved_results': sorted(list(solved_challenges)),
        'attempted_indices': sorted(list(attempted_indices)),
        'models_used': sorted(list(models_used))
    }
    save_progress(MERGED_PROGRESS_PATH, progress_data)
    
    # Final Summary
    success_rate = (batch_solved / num_to_solve) * 100 if num_to_solve > 0 else 0
    print(f"\n--- Heuristic Solver Summary ---")
    print(f"Attempted: {num_to_solve}")
    print(f"Solved: {batch_solved}")
    print(f"Failed: {batch_failed}")
    print(f"Skipped: {batch_skipped}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if batch_solved > 0:
        solved_results = [r for r in batch_results if r["status"] == "solved"]
        avg_efficiency = sum(r["heuristic_score"] for r in solved_results) / len(solved_results)
        print(f"Average Efficiency: {avg_efficiency:.2f}x optimal")
    
    print(f"\nOverall Progress:")
    print(f"Total solved: {len(solved_challenges)}")
    print(f"Total attempted: {len(attempted_indices)}")
    print(f"Remaining unsolved: {len(daily_challenges) - len(solved_challenges)}")

    print("--- End of Heuristic Solving ---")

if __name__ == "__main__":
    main() 