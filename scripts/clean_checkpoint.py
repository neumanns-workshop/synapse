import json
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
TIMESTAMP = "20250528_000000"
RESULTS_PATH = RESULTS_DIR / f"llm_test_results_{TIMESTAMP}.json"

def clean_checkpoint():
    """Clean the results file by removing results where stepsTaken <= optimalPathLength."""
    print(f"Loading results from {RESULTS_PATH}...")
    
    try:
        with open(RESULTS_PATH, 'r') as f:
            results = json.load(f)
    except FileNotFoundError:
        print(f"Error: Results file not found at {RESULTS_PATH}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {RESULTS_PATH}")
        return

    if not isinstance(results, list):
        print("Error: Invalid results format")
        return

    original_count = len(results)
    print(f"Found {original_count} results")

    # Filter out results where stepsTaken <= optimalPathLength
    cleaned_results = [
        result for result in results
        if result['stepsTaken'] > result['optimalPathLength']
    ]

    removed_count = original_count - len(cleaned_results)
    print(f"Removed {removed_count} results where stepsTaken <= optimalPathLength")
    print(f"Remaining results: {len(cleaned_results)}")

    # Save cleaned results
    with open(RESULTS_PATH, 'w') as f:
        json.dump(cleaned_results, f, indent=2)
    print(f"Saved cleaned results to {RESULTS_PATH}")

if __name__ == "__main__":
    clean_checkpoint() 