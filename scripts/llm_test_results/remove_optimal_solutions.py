import json
from pathlib import Path
from collections import defaultdict

def load_json_file(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def save_json_file(data, file_path):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    # Load both files
    progress_file = Path('scripts/llm_test_results/merged_progress.json')
    results_file = Path('scripts/llm_test_results/merged_results.json')
    
    progress_data = load_json_file(progress_file)
    results_data = load_json_file(results_file)
    
    # Analyze data before removal
    print("=== BEFORE REMOVAL ===")
    print(f"Total puzzles in results: {len(results_data)}")
    print(f"Total solved puzzles in progress: {len(progress_data['solved_results'])}")
    
    # Check for inconsistencies
    results_ids = {puzzle['id'] for puzzle in results_data}
    progress_solved_ids = set(progress_data['solved_results'])
    
    # Find puzzles in progress but not in results
    missing_in_results = progress_solved_ids - results_ids
    if missing_in_results:
        print(f"\nWARNING: Found {len(missing_in_results)} solved puzzles in progress file that are missing from results file:")
        for puzzle_id in sorted(missing_in_results):
            print(f"  {puzzle_id}")
    
    # Find puzzles in results but not marked as solved in progress
    solved_in_results = {puzzle['id'] for puzzle in results_data if puzzle['status'] == 'solved'}
    missing_in_progress = solved_in_results - progress_solved_ids
    if missing_in_progress:
        print(f"\nWARNING: Found {len(missing_in_progress)} solved puzzles in results file that are not marked as solved in progress:")
        for puzzle_id in sorted(missing_in_progress):
            print(f"  {puzzle_id}")
    
    # Analyze by path length and model
    path_length_stats = defaultdict(lambda: {'total': 0, 'solved': 0, 'optimal': 0, 'too_long': 0})
    model_stats = defaultdict(lambda: {'total': 0, 'solved': 0, 'optimal': 0, 'too_long': 0})
    status_counts = defaultdict(int)
    
    puzzles_to_remove = set()
    
    # Define step thresholds for each path length
    step_thresholds = {
        4: 20,  # Remove if steps > 20 for path length 4
        5: 25,  # Remove if steps > 25 for path length 5
        6: 30   # Remove if steps > 30 for path length 6
    }
    
    for puzzle in results_data:
        path_len = puzzle['optimalPathLength']
        model = puzzle['model']
        status = puzzle['status']
        
        # Update counters
        path_length_stats[path_len]['total'] += 1
        model_stats[model]['total'] += 1
        status_counts[status] += 1
        
        if status == 'solved':
            path_length_stats[path_len]['solved'] += 1
            model_stats[model]['solved'] += 1
            
            # Check if optimally solved
            if puzzle['stepsTaken'] == puzzle['optimalPathLength'] - 1:
                puzzles_to_remove.add(puzzle['id'])
                path_length_stats[path_len]['optimal'] += 1
                model_stats[model]['optimal'] += 1
            
            # Check if too many steps
            if path_len in step_thresholds and puzzle['stepsTaken'] > step_thresholds[path_len]:
                puzzles_to_remove.add(puzzle['id'])
                path_length_stats[path_len]['too_long'] += 1
                model_stats[model]['too_long'] += 1
    
    print(f"\nStatus breakdown:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")
    
    print(f"\nPath length breakdown:")
    for path_len in sorted(path_length_stats.keys()):
        stats = path_length_stats[path_len]
        solve_rate = (stats['solved'] / stats['total'] * 100) if stats['total'] > 0 else 0
        optimal_rate = (stats['optimal'] / stats['solved'] * 100) if stats['solved'] > 0 else 0
        too_long_rate = (stats['too_long'] / stats['solved'] * 100) if stats['solved'] > 0 else 0
        print(f"  Length {path_len}:")
        print(f"    Total: {stats['total']}")
        print(f"    Solved: {stats['solved']} ({solve_rate:.1f}%)")
        print(f"    Optimal: {stats['optimal']} ({optimal_rate:.1f}%)")
        print(f"    Too long: {stats['too_long']} ({too_long_rate:.1f}%)")
    
    print(f"\nModel performance:")
    for model in sorted(model_stats.keys()):
        stats = model_stats[model]
        solve_rate = (stats['solved'] / stats['total'] * 100) if stats['total'] > 0 else 0
        optimal_rate = (stats['optimal'] / stats['solved'] * 100) if stats['solved'] > 0 else 0
        too_long_rate = (stats['too_long'] / stats['solved'] * 100) if stats['solved'] > 0 else 0
        print(f"  {model}:")
        print(f"    Total: {stats['total']}")
        print(f"    Solved: {stats['solved']} ({solve_rate:.1f}%)")
        print(f"    Optimal: {stats['optimal']} ({optimal_rate:.1f}%)")
        print(f"    Too long: {stats['too_long']} ({too_long_rate:.1f}%)")
    
    print(f"\nPuzzles to remove: {len(puzzles_to_remove)}")
    
    # Remove puzzles from results file
    original_results_count = len(results_data)
    results_data = [
        puzzle for puzzle in results_data
        if puzzle['id'] not in puzzles_to_remove
    ]
    removed_results_count = original_results_count - len(results_data)
    
    # Remove puzzles from solved_results
    original_progress_count = len(progress_data['solved_results'])
    progress_data['solved_results'] = [
        puzzle_id for puzzle_id in progress_data['solved_results']
        if puzzle_id not in puzzles_to_remove
    ]
    removed_progress_count = original_progress_count - len(progress_data['solved_results'])
    
    # Fix inconsistencies by removing puzzles that are in progress but not in results
    if missing_in_results:
        print(f"\nRemoving {len(missing_in_results)} solved puzzles from progress file that are missing from results file")
        progress_data['solved_results'] = [
            puzzle_id for puzzle_id in progress_data['solved_results']
            if puzzle_id not in missing_in_results
        ]
    
    # Save both updated files
    save_json_file(progress_data, progress_file)
    save_json_file(results_data, results_file)
    
    print(f"\n=== AFTER REMOVAL ===")
    print(f"Removed {removed_results_count} puzzles from results file")
    print(f"Removed {removed_progress_count} puzzles from progress file")
    print(f"Remaining puzzles in results: {len(results_data)}")
    print(f"Remaining solved puzzles in progress: {len(progress_data['solved_results'])}")
    
    # Calculate final stats
    if len(results_data) > 0:
        remaining_solved = len([p for p in results_data if p['status'] == 'solved'])
        remaining_solve_rate = (remaining_solved / len(results_data) * 100)
        print(f"Remaining solve rate: {remaining_solve_rate:.1f}% ({remaining_solved}/{len(results_data)})")

if __name__ == "__main__":
    main() 