import json
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
MERGED_RESULTS_PATH = RESULTS_DIR / "merged_results.json"

def fix_model_names():
    print("Loading merged results file...")
    with open(MERGED_RESULTS_PATH, 'r') as f:
        results = json.load(f)
    
    # Sort by path length
    results.sort(key=lambda x: x.get('optimalPathLength', float('inf')))
    
    # Count entries before
    phi_count = sum(1 for r in results if r.get('model') == 'phi4-reasoning:plus')
    granite_count = sum(1 for r in results if r.get('model') == 'granite3.3:8b')
    print(f"\nInitial counts:")
    print(f"phi4-reasoning:plus: {phi_count}")
    print(f"granite3.3:8b: {granite_count}")
    
    # Count first 120 solved puzzles
    solved_count = 0
    changed_count = 0
    for result in results:
        if result.get('status') == 'solved':
            solved_count += 1
            if solved_count > 120 and result.get('model') == 'phi4-reasoning:plus':
                result['model'] = 'granite3.3:8b'
                changed_count += 1
    
    print(f"\nAfter changes:")
    print(f"Total solved puzzles: {solved_count}")
    print(f"Changed {changed_count} entries from phi4-reasoning:plus to granite3.3:8b")
    
    # Final counts
    phi_count = sum(1 for r in results if r.get('model') == 'phi4-reasoning:plus')
    granite_count = sum(1 for r in results if r.get('model') == 'granite3.3:8b')
    print(f"\nFinal counts:")
    print(f"phi4-reasoning:plus: {phi_count}")
    print(f"granite3.3:8b: {granite_count}")
    
    # Save back to file
    print("\nSaving updated results...")
    with open(MERGED_RESULTS_PATH, 'w') as f:
        json.dump(results, f, indent=2)
    print("Done!")

if __name__ == "__main__":
    fix_model_names() 