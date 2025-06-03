import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Set

# --- Configuration ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
MERGED_RESULTS_PATH = RESULTS_DIR / "merged_results.json"
MERGED_PROGRESS_PATH = RESULTS_DIR / "merged_progress.json"

def load_json_file(path: Path) -> Any:
    """Load data from a JSON file."""
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return None

def save_json_file(data: Any, path: Path) -> None:
    """Save data to a JSON file."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved {len(data) if isinstance(data, list) else 1} items to {path}")
    except Exception as e:
        print(f"Error saving to {path}: {e}")

def validate_result(result: Dict) -> bool:
    """Validate a result has all required fields."""
    required_fields = {
        'id', 'startWord', 'endWord', 'optimalPathLength',
        'llmPath', 'stepsTaken', 'status', 'model'
    }
    return all(field in result for field in required_fields)

def normalize_result(result: Dict) -> Dict:
    """Normalize a result to ensure consistent format."""
    return {
        'id': str(result['id']),
        'startWord': str(result['startWord']),
        'endWord': str(result['endWord']),
        'optimalPathLength': int(result['optimalPathLength']),
        'llmPath': [str(word) for word in result['llmPath']],
        'stepsTaken': int(result['stepsTaken']),
        'status': str(result['status']),
        'model': str(result['model'])
    }

def main():
    print("Starting progress and results merge...")
    
    # Get all results files
    results_files = sorted(
        RESULTS_DIR.glob("llm_test_results_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )
    
    # Get all progress files
    progress_files = sorted(
        RESULTS_DIR.glob("progress_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )
    
    print(f"\nFound {len(results_files)} results files and {len(progress_files)} progress files")
    
    # Track solved puzzles and their solutions
    solved_puzzles: Dict[str, List[Dict[str, Any]]] = {}
    attempted_indices: Set[str] = set()
    models_used: Set[str] = set()
    
    # Process results files
    print("\nProcessing results files...")
    for file_path in results_files:
        print(f"\nProcessing {file_path.name}...")
        data = load_json_file(file_path)
        if not data:
            continue
            
        for result in data:
            if not validate_result(result):
                continue
                
            result = normalize_result(result)
            puzzle_id = result['id']
            attempted_indices.add(puzzle_id)
            models_used.add(result['model'])
            
            if result['status'] == 'solved':
                if puzzle_id not in solved_puzzles:
                    solved_puzzles[puzzle_id] = []
                solved_puzzles[puzzle_id].append(result)
    
    # Process progress files
    print("\nProcessing progress files...")
    for file_path in progress_files:
        print(f"\nProcessing {file_path.name}...")
        data = load_json_file(file_path)
        if not data or not isinstance(data, dict):
            continue
            
        # Add attempted indices
        if 'attempted_indices' in data:
            attempted_indices.update(str(idx) for idx in data['attempted_indices'])
            
        # Add model used
        if 'model' in data:
            models_used.add(data['model'])
    
    # Keep only the best solution for each puzzle
    best_solutions = []
    for puzzle_id, solutions in solved_puzzles.items():
        # Sort by steps taken and keep the shortest solution
        best_solution = min(solutions, key=lambda x: x['stepsTaken'])
        best_solutions.append(best_solution)
    
    # Save merged results
    save_json_file(best_solutions, MERGED_RESULTS_PATH)
    
    # Save merged progress
    progress_data = {
        'solved_results': sorted([p['id'] for p in best_solutions]),
        'attempted_indices': sorted(attempted_indices),
        'models_used': sorted(models_used),
        'timestamp': datetime.now().isoformat()
    }
    save_json_file(progress_data, MERGED_PROGRESS_PATH)
    
    # Print summary
    print(f"\nMerge complete!")
    print(f"Total solved puzzles: {len(best_solutions)}")
    print(f"Total attempted puzzles: {len(attempted_indices)}")
    print(f"Models used: {', '.join(sorted(models_used))}")
    print(f"\nResults saved to: {MERGED_RESULTS_PATH}")
    print(f"Progress saved to: {MERGED_PROGRESS_PATH}")

if __name__ == "__main__":
    main() 