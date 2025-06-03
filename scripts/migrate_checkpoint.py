import json
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
OLD_TIMESTAMP = "20250527_172759"
NEW_TIMESTAMP = "20240327_000000"
MODEL = "gemma3:27b"  # Add model information

def load_json_file(path):
    """Loads a JSON file."""
    with open(path, 'r') as f:
        return json.load(f)

def save_json_file(data, path):
    """Saves data to a JSON file."""
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved to {path}")

def simplify_challenge_result(result):
    """Simplify a challenge result to only include essential data."""
    return {
        "day": result["day"],
        "startWord": result["startWord"],
        "endWord": result["endWord"],
        "optimalPathLength": result["optimalPathLength"],
        "llmPath": result["llmPath"],
        "stepsTaken": result["stepsTaken"],
        "status": result["status"],
        "reason": result["reason"],
        "reasoningHistory": result.get("reasoningHistory", []),  # Keep reasoning history for analysis
        "model": MODEL  # Add model information
    }

def main():
    # Load old checkpoint
    old_checkpoint_path = RESULTS_DIR / f"checkpoint_{OLD_TIMESTAMP}.json"
    old_results_path = RESULTS_DIR / f"llm_test_results_{OLD_TIMESTAMP}.json"
    
    if not old_checkpoint_path.exists():
        print(f"Old checkpoint file not found: {old_checkpoint_path}")
        return
    
    print(f"Loading old checkpoint from {old_checkpoint_path}")
    checkpoint_data = load_json_file(old_checkpoint_path)
    
    # Simplify checkpoint data and add model information
    if 'results' in checkpoint_data:
        checkpoint_data['results'] = [simplify_challenge_result(r) for r in checkpoint_data['results']]
    checkpoint_data['model'] = MODEL  # Add model to checkpoint metadata
    
    # Create new checkpoint with simplified data
    new_checkpoint_path = RESULTS_DIR / f"checkpoint_{NEW_TIMESTAMP}.json"
    new_results_path = RESULTS_DIR / f"llm_test_results_{NEW_TIMESTAMP}.json"
    
    print(f"Migrating checkpoint to {new_checkpoint_path}")
    save_json_file(checkpoint_data, new_checkpoint_path)
    
    # Also migrate and simplify results file if it exists
    if old_results_path.exists():
        print(f"Loading old results from {old_results_path}")
        results_data = load_json_file(old_results_path)
        # Simplify results data and add model information
        if isinstance(results_data, list):
            results_data = [simplify_challenge_result(r) for r in results_data]
        print(f"Migrating results to {new_results_path}")
        save_json_file(results_data, new_results_path)
    
    print("Migration complete!")

if __name__ == "__main__":
    main() 