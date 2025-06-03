import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Configuration
RESULTS_DIR = Path("scripts/llm_test_results")
CLEAN_RESULTS_PATH = RESULTS_DIR / "clean_results.json"
PROGRESS_SAVE_PATH = RESULTS_DIR / "progress.json"

def load_json_file(file_path: Path) -> Any:
    """Load and parse a JSON file."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

def save_json_file(file_path: Path, data: Any) -> None:
    """Save data to a JSON file."""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved to {file_path}")
    except Exception as e:
        print(f"Error saving to {file_path}: {e}")

def validate_result(result: Dict[str, Any]) -> bool:
    """Validate that a result has all required fields."""
    required_fields = ['id', 'startWord', 'endWord', 'optimalPathLength', 'llmPath', 'stepsTaken', 'status', 'reason', 'model']
    return all(field in result for field in required_fields)

def normalize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a result to ensure consistent format."""
    return {
        'id': result['id'],
        'startWord': result['startWord'],
        'endWord': result['endWord'],
        'optimalPathLength': result['optimalPathLength'],
        'llmPath': result['llmPath'],
        'stepsTaken': result['stepsTaken'],
        'status': result['status'],
        'reason': result['reason'],
        'model': result['model'],
        'backtrackAttempts': result.get('backtrackAttempts', 0)
    }

def main():
    # Find all results files
    results_files = sorted(RESULTS_DIR.glob("llm_test_results_*.json"))
    if not results_files:
        print("No results files found!")
        return

    # Track solved puzzles and their solutions
    solved_puzzles: Dict[str, List[Dict[str, Any]]] = {}
    multiple_solutions: Dict[str, List[Dict[str, Any]]] = {}

    # Process each file
    for file_path in results_files:
        print(f"\nProcessing {file_path.name}...")
        data = load_json_file(file_path)
        if not data:
            continue

        # Process each result
        for result in data:
            if not validate_result(result):
                continue

            result = normalize_result(result)
            puzzle_id = result['id']

            if result['status'] == 'solved':
                if puzzle_id not in solved_puzzles:
                    solved_puzzles[puzzle_id] = []
                solved_puzzles[puzzle_id].append(result)

    # Find puzzles with multiple solutions
    for puzzle_id, solutions in solved_puzzles.items():
        if len(solutions) > 1:
            multiple_solutions[puzzle_id] = solutions

    # Keep only the best solution for each puzzle
    best_solutions = []
    for puzzle_id, solutions in solved_puzzles.items():
        # Sort by steps taken and keep the shortest solution
        best_solution = min(solutions, key=lambda x: x['stepsTaken'])
        best_solutions.append(best_solution)

    # Save clean results
    save_json_file(CLEAN_RESULTS_PATH, best_solutions)
    print(f"\nSaved {len(best_solutions)} solved puzzles to {CLEAN_RESULTS_PATH}")

    # Update progress file
    progress_data = {
        'solved_results': sorted([p['id'] for p in best_solutions]),
        'attempted_indices': [],  # We don't track failed attempts
        'model': 'phi4-reasoning:plus',  # Default model
        'timestamp': datetime.now().isoformat()
    }
    save_json_file(PROGRESS_SAVE_PATH, progress_data)
    print(f"Updated progress file with {len(best_solutions)} solved puzzles")

    # Print summary
    print("\nCleanup Summary:")
    print(f"Total solved puzzles: {len(best_solutions)}")
    print(f"Solved puzzle IDs: {progress_data['solved_results']}")

    # Print information about puzzles with multiple solutions
    if multiple_solutions:
        print("\nPuzzles with multiple solutions:")
        for puzzle_id, solutions in multiple_solutions.items():
            print(f"\nPuzzle {puzzle_id}:")
            for solution in solutions:
                print(f"  {solution['stepsTaken']} steps: {solution['llmPath']}")
                print(f"  Model: {solution['model']}")
                print(f"  Reason: {solution['reason']}")

if __name__ == "__main__":
    main() 