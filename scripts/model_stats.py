import json
from pathlib import Path
from collections import defaultdict

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "scripts" / "llm_test_results"
MERGED_RESULTS_PATH = RESULTS_DIR / "merged_results.json"

def print_model_stats():
    print("Loading merged results file...")
    with open(MERGED_RESULTS_PATH, 'r') as f:
        results = json.load(f)
    
    # Initialize stats
    model_stats = defaultdict(lambda: {'total': 0, 'solved': 0, 'failed': 0, 'skipped': 0})
    
    # Collect stats
    for result in results:
        model = result.get('model', 'unknown')
        status = result.get('status', 'unknown')
        model_stats[model]['total'] += 1
        model_stats[model][status] += 1
    
    # Print stats
    print("\nModel Statistics:")
    print("-" * 80)
    print(f"{'Model':<20} {'Total':>8} {'Solved':>8} {'Failed':>8} {'Skipped':>8} {'Success %':>10}")
    print("-" * 80)
    
    for model, stats in sorted(model_stats.items()):
        success_rate = (stats['solved'] / stats['total'] * 100) if stats['total'] > 0 else 0
        print(f"{model:<20} {stats['total']:>8} {stats['solved']:>8} {stats['failed']:>8} {stats['skipped']:>8} {success_rate:>9.1f}%")
    
    print("-" * 80)
    
    # Print path length distribution for each model
    print("\nPath Length Distribution by Model:")
    print("-" * 80)
    
    for model in sorted(model_stats.keys()):
        path_lengths = defaultdict(int)
        for result in results:
            if result.get('model') == model and result.get('status') == 'solved':
                path_length = result.get('optimalPathLength', 0)
                path_lengths[path_length] += 1
        
        print(f"\n{model}:")
        for length in sorted(path_lengths.keys()):
            print(f"  {length} steps: {path_lengths[length]} puzzles")
    
    # Analyze 6-step puzzles
    print("\n=== 6-Step Puzzle Analysis ===")
    print("-" * 80)
    
    puzzles = [r for r in results if r.get('optimalPathLength') == 6]
    print(f"Total 6-step puzzles: {len(puzzles)}")
    
    # Group by steps taken
    steps_taken = defaultdict(list)
    for puzzle in puzzles:
        if puzzle.get('status') == 'solved':
            steps = puzzle.get('stepsTaken', 0)
            steps_taken[steps].append(puzzle)
    
    print("\nSteps taken distribution:")
    for steps in sorted(steps_taken.keys()):
        puzzles = steps_taken[steps]
        print(f"  {steps} steps: {len(puzzles)} puzzles")
        if steps == 5:  # Show details for optimal solutions (5 steps for path length 6)
            print(f"\n  Optimal solutions (5 steps):")
            for puzzle in sorted(puzzles, key=lambda x: x['id']):
                print(f"    {puzzle['id']}: {puzzle['startWord']} -> {puzzle['endWord']} ({puzzle['model']})")

if __name__ == "__main__":
    print_model_stats() 