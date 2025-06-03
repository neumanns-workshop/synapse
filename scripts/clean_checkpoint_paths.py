import json
import os
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DAILY_CHALLENGES_PATH = PROJECT_ROOT / "src" / "data" / "daily_challenges.json"
CHECKPOINT_PATH = PROJECT_ROOT / "scripts" / "llm_test_results" / "llm_test_results_20250528_000000.json"

def load_json_file(path):
    """Loads a JSON file."""
    with open(path, 'r') as f:
        return json.load(f)

def save_json_file(data, path):
    """Saves data to a JSON file."""
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Results saved to {path}")

def main():
    print("Loading files...")
    daily_challenges = load_json_file(DAILY_CHALLENGES_PATH)
    checkpoint_results = load_json_file(CHECKPOINT_PATH)
    
    # Create a lookup dictionary for original path lengths
    original_lengths = {challenge['day']: challenge['pathLength'] for challenge in daily_challenges}
    
    # Track changes
    changes_made = 0
    
    # Update path lengths in checkpoint
    for result in checkpoint_results:
        day = result['day']
        if day in original_lengths:
            original_length = original_lengths[day]
            if result['optimalPathLength'] != original_length:
                print(f"Day {day}: Updating path length from {result['optimalPathLength']} to {original_length}")
                result['optimalPathLength'] = original_length
                changes_made += 1
    
    if changes_made > 0:
        print(f"\nMade {changes_made} changes to path lengths")
        save_json_file(checkpoint_results, CHECKPOINT_PATH)
    else:
        print("\nNo changes needed - all path lengths already match")

if __name__ == "__main__":
    main() 