import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
import heapq
from collections import defaultdict
import random

# --- Configuration ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DAILY_CHALLENGES_PATH = PROJECT_ROOT / "src" / "data" / "daily_challenges.json"
GRAPH_PATH = PROJECT_ROOT / "client" / "public" / "data" / "graph.json"

class HeuristicSolver:
    """A rule-based heuristic solver for word navigation puzzles."""
    
    def __init__(self, graph_nodes: Dict):
        self.graph_nodes = graph_nodes
        self.word_degrees = self._calculate_word_degrees()
        self.hub_words = self._identify_hub_words()
        
    def _calculate_word_degrees(self) -> Dict[str, int]:
        """Calculate the degree (number of connections) for each word."""
        degrees = {}
        for word, data in self.graph_nodes.items():
            degrees[word] = len(data.get("edges", {}))
        return degrees
    
    def _identify_hub_words(self, top_percentile: float = 0.1) -> Set[str]:
        """Identify hub words (highly connected words) in the top percentile."""
        if not self.word_degrees:
            return set()
        
        sorted_words = sorted(self.word_degrees.items(), key=lambda x: x[1], reverse=True)
        num_hubs = max(1, int(len(sorted_words) * top_percentile))
        return {word for word, _ in sorted_words[:num_hubs]}
    
    def get_word_neighbors(self, word: str) -> List[str]:
        """Get neighbors of a word, sorted by similarity (highest first)."""
        if word not in self.graph_nodes:
            return []
        
        edges = self.graph_nodes[word].get("edges", {})
        # Sort by similarity (descending)
        sorted_neighbors = sorted(edges.items(), key=lambda x: x[1], reverse=True)
        return [neighbor for neighbor, _ in sorted_neighbors]
    
    def find_shortest_path(self, start: str, end: str) -> List[str]:
        """Find shortest path using Dijkstra's algorithm."""
        if start not in self.graph_nodes or end not in self.graph_nodes:
            return []
        
        if start == end:
            return [start]
        
        distances = {word: float('infinity') for word in self.graph_nodes}
        previous = {word: None for word in self.graph_nodes}
        distances[start] = 0
        
        # Priority queue: (distance, word)
        pq = [(0, start)]
        visited = set()
        
        while pq:
            current_dist, current = heapq.heappop(pq)
            
            if current in visited:
                continue
                
            visited.add(current)
            
            if current == end:
                break
            
            edges = self.graph_nodes[current].get("edges", {})
            for neighbor, similarity in edges.items():
                if neighbor in visited:
                    continue
                
                # Convert similarity to distance (cost)
                cost = 1 - similarity
                distance = current_dist + cost
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current
                    heapq.heappush(pq, (distance, neighbor))
        
        # Reconstruct path
        if distances[end] == float('infinity'):
            return []
        
        path = []
        current = end
        while current is not None:
            path.insert(0, current)
            current = previous[current]
        
        return path
    
    def calculate_heuristic_score(self, word: str, target: str, current_path: List[str]) -> float:
        """Calculate a heuristic score for choosing a word."""
        if word == target:
            return float('inf')  # Always choose target if available
        
        score = 0.0
        
        # 1. Distance to target (most important)
        path_to_target = self.find_shortest_path(word, target)
        if path_to_target:
            # Shorter path to target = higher score
            distance_to_target = len(path_to_target) - 1
            score += 1000 / (distance_to_target + 1)
        
        # 2. Hub word bonus (helps with connectivity)
        if word in self.hub_words:
            score += 50
        
        # 3. Avoid cycles (penalize words already in path)
        if word in current_path:
            score -= 200
        
        # 4. Degree bonus (more connected words are often better)
        degree = self.word_degrees.get(word, 0)
        score += degree * 2
        
        # 5. Direct similarity to target
        if target in self.graph_nodes.get(word, {}).get("edges", {}):
            similarity_to_target = self.graph_nodes[word]["edges"][target]
            score += similarity_to_target * 100
        
        return score
    
    def solve_puzzle(self, start_word: str, target_word: str, max_steps: int = 30, max_retries: int = 50) -> Dict:
        """
        Solve a puzzle using heuristic strategies with multiple retries.
        
        Args:
            start_word: Starting word
            target_word: Target word to reach
            max_steps: Maximum steps per attempt
            max_retries: Maximum number of retry attempts
        
        Returns:
            Dict with solution information including path, status, and reasoning
        """
        if start_word not in self.graph_nodes or target_word not in self.graph_nodes:
            return {
                "path": [start_word],
                "steps": 0,
                "status": "failed",
                "reason": "Start or target word not in graph",
                "strategy_used": "none"
            }
        
        if start_word == target_word:
            return {
                "path": [start_word],
                "steps": 0,
                "status": "solved",
                "reason": "Start equals target",
                "strategy_used": "trivial"
            }
        
        # Find optimal path for reference
        optimal_path = self.find_shortest_path(start_word, target_word)
        optimal_length = len(optimal_path) - 1 if optimal_path else float('inf')
        
        best_result = None
        attempts = []
        
        for attempt in range(max_retries):
            # Much more aggressive randomness increase per attempt
            randomness_factor = 0.15 + (attempt * 0.05)  # Increases faster: 0.15, 0.20, 0.25, 0.30...
            avoid_optimal = attempt > 0  # After first attempt, actively avoid optimal paths
            
            # Cap randomness at 0.9 to still maintain some heuristic guidance
            randomness_factor = min(0.9, randomness_factor)
            
            result = self._solve_single_attempt(
                start_word, target_word, max_steps, optimal_length, 
                randomness_factor, avoid_optimal, attempt + 1
            )
            
            attempts.append({
                "attempt": attempt + 1,
                "result": result,
                "randomness_factor": randomness_factor
            })
            
            # If we found a solution, check if it's acceptable
            if result["status"] == "solved":
                steps_taken = result["steps"]
                efficiency = steps_taken / optimal_length if optimal_length > 0 else float('inf')
                
                # Reject optimal solutions AND solutions that are just one step longer
                # Only accept if at least 2 steps longer than optimal OR it's our very last attempt
                if steps_taken > optimal_length + 1:
                    result["attempts"] = attempts
                    result["efficiency"] = efficiency
                    result["optimal_length"] = optimal_length
                    return result
                elif attempt == max_retries - 1:
                    # On last attempt, accept whatever we have
                    result["attempts"] = attempts
                    result["efficiency"] = efficiency
                    result["optimal_length"] = optimal_length
                    return result
                else:
                    # Try again with more randomness
                    print(f"  Rejecting solution (steps: {steps_taken}, optimal: {optimal_length}) - retrying with more randomness")
                    continue
        
        # If we couldn't find a non-optimal solution, return the best one we found
        if best_result is not None:
            best_result["attempts"] = attempts
            best_result["final_attempt"] = max_retries
            best_result["reason"] += " (best of multiple attempts)"
            return best_result
        
        # If no solution found in any attempt, return the last attempt
        last_result = attempts[-1]["result"]
        last_result["attempts"] = attempts
        last_result["final_attempt"] = max_retries
        last_result["reason"] += f" (failed after {max_retries} attempts)"
        return last_result
    
    def _solve_single_attempt(self, start_word: str, target_word: str, max_steps: int, 
                            optimal_length: int, randomness_factor: float, avoid_optimal: bool, 
                            attempt_num: int) -> Dict:
        """
        Single attempt at solving the puzzle.
        """
        current_word = start_word
        path = [start_word]
        steps = 0
        strategy_log = []
        
        # Add some initial randomness to avoid always taking the same first step
        if attempt_num > 1:
            strategy_log.append(f"Attempt {attempt_num}: Using randomness factor {randomness_factor:.2f}")
        
        while steps < max_steps and current_word != target_word:
            neighbors = self.get_word_neighbors(current_word)
            
            if not neighbors:
                return {
                    "path": path,
                    "steps": steps,
                    "status": "failed",
                    "reason": "No neighbors available",
                    "strategy_used": "heuristic",
                    "strategy_log": strategy_log,
                    "optimal_length": optimal_length
                }
            
            # Check if target is directly reachable
            if target_word in neighbors:
                # If we're avoiding optimal paths and this would create an optimal solution, 
                # sometimes take a detour instead
                if avoid_optimal and len(path) == optimal_length:
                    # 90% chance to take a detour instead of going directly to target (much more aggressive)
                    if random.random() < 0.9:
                        # Remove target from neighbors and continue with heuristic
                        neighbors = [n for n in neighbors if n != target_word]
                        strategy_log.append(f"Step {steps + 1}: Avoiding direct target to prevent optimal solution")
                    else:
                        path.append(target_word)
                        steps += 1
                        strategy_log.append(f"Step {steps}: Chose {target_word} (direct target, override avoidance)")
                        return {
                            "path": path,
                            "steps": steps,
                            "status": "solved",
                            "reason": f"Reached target in {steps} steps",
                            "strategy_used": "heuristic",
                            "strategy_log": strategy_log,
                            "optimal_length": optimal_length
                        }
                # Also avoid if we're getting close to optimal (within 1 step)
                elif avoid_optimal and len(path) >= optimal_length - 1:
                    # 70% chance to take a detour when close to optimal
                    if random.random() < 0.7:
                        neighbors = [n for n in neighbors if n != target_word]
                        strategy_log.append(f"Step {steps + 1}: Avoiding direct target (close to optimal length)")
                    else:
                        path.append(target_word)
                        steps += 1
                        strategy_log.append(f"Step {steps}: Chose {target_word} (direct target, close to optimal)")
                        return {
                            "path": path,
                            "steps": steps,
                            "status": "solved",
                            "reason": f"Reached target in {steps} steps",
                            "strategy_used": "heuristic",
                            "strategy_log": strategy_log,
                            "optimal_length": optimal_length
                        }
                else:
                    path.append(target_word)
                    steps += 1
                    strategy_log.append(f"Step {steps}: Chose {target_word} (direct target)")
                    return {
                        "path": path,
                        "steps": steps,
                        "status": "solved",
                        "reason": f"Reached target in {steps} steps",
                        "strategy_used": "heuristic",
                        "strategy_log": strategy_log,
                        "optimal_length": optimal_length
                    }
            
            # If no neighbors left after filtering, we're stuck
            if not neighbors:
                return {
                    "path": path,
                    "steps": steps,
                    "status": "failed",
                    "reason": "No valid neighbors after filtering",
                    "strategy_used": "heuristic",
                    "strategy_log": strategy_log,
                    "optimal_length": optimal_length
                }
            
            # Calculate heuristic scores for all neighbors
            neighbor_scores = []
            for neighbor in neighbors:
                score = self.calculate_heuristic_score(neighbor, target_word, path)
                neighbor_scores.append((score, neighbor))
            
            # Sort by score (highest first)
            neighbor_scores.sort(reverse=True)
            
            # Choose neighbor with increased randomness
            if len(neighbor_scores) > 1 and random.random() < randomness_factor:
                # Choose from top N options with higher randomness
                top_n = min(5, len(neighbor_scores))
                top_choices = neighbor_scores[:top_n]
                best_score, best_neighbor = random.choice(top_choices)
                strategy_log.append(f"Step {steps + 1}: Random choice from top {top_n}: {best_neighbor}")
            else:
                best_score, best_neighbor = neighbor_scores[0]
                strategy_log.append(f"Step {steps + 1}: Best heuristic choice: {best_neighbor} (score: {best_score:.2f})")
            
            path.append(best_neighbor)
            current_word = best_neighbor
            steps += 1
            
            # Check for potential infinite loops
            if len(path) > 10:
                recent_words = path[-5:]
                if len(set(recent_words)) <= 2:  # Cycling between few words
                    # Try a different strategy: choose a hub word
                    hub_neighbors = [n for n in neighbors if n in self.hub_words and n not in path[-3:]]
                    if hub_neighbors:
                        current_word = random.choice(hub_neighbors)  # Add randomness to hub choice
                        path.append(current_word)
                        steps += 1
                        strategy_log.append(f"Step {steps}: Anti-cycle hub choice: {current_word}")
                        continue
        
        # Check final status
        if current_word == target_word:
            return {
                "path": path,
                "steps": steps,
                "status": "solved",
                "reason": f"Reached target in {steps} steps",
                "strategy_used": "heuristic",
                "strategy_log": strategy_log,
                "optimal_length": optimal_length
            }
        else:
            return {
                "path": path,
                "steps": steps,
                "status": "failed",
                "reason": f"Exceeded max steps ({max_steps})",
                "strategy_used": "heuristic",
                "strategy_log": strategy_log,
                "optimal_length": optimal_length
            }

def load_json_file(path: Path) -> Dict:
    """Load a JSON file."""
    if not path.exists():
        print(f"Error: File not found at {path}")
        sys.exit(1)
    with open(path, 'r') as f:
        return json.load(f)

def solve_daily_challenges_heuristic(num_to_solve: int = 50, path_length: int = 6) -> List[Dict]:
    """
    Solve daily challenges using heuristic solver.
    
    Args:
        num_to_solve: Number of puzzles to solve
        path_length: Filter for puzzles with this optimal path length
    
    Returns:
        List of solution results
    """
    print(f"Loading data and initializing heuristic solver...")
    
    # Load data
    daily_challenges_data = load_json_file(DAILY_CHALLENGES_PATH)
    daily_challenges = daily_challenges_data["challenges"]
    graph_data = load_json_file(GRAPH_PATH)
    graph_nodes = graph_data["nodes"]
    
    # Filter challenges by path length
    filtered_challenges = [c for c in daily_challenges if c.get('pathLength') == path_length]
    print(f"Found {len(filtered_challenges)} challenges with path length {path_length}")
    
    if len(filtered_challenges) < num_to_solve:
        print(f"Warning: Only {len(filtered_challenges)} challenges available, solving all of them")
        num_to_solve = len(filtered_challenges)
    
    # Initialize solver
    solver = HeuristicSolver(graph_nodes)
    print(f"Solver initialized with {len(graph_nodes)} words")
    print(f"Identified {len(solver.hub_words)} hub words")
    
    # Solve puzzles
    results = []
    solved_count = 0
    
    # Shuffle to get random selection
    random.shuffle(filtered_challenges)
    
    for i, challenge in enumerate(filtered_challenges[:num_to_solve]):
        challenge_id = challenge.get("id")
        start_word = challenge.get("startWord")
        end_word = challenge.get("targetWord")
        optimal_length = challenge.get("pathLength")
        
        print(f"\n--- Challenge {i+1}/{num_to_solve}: {challenge_id} ---")
        print(f"Solving: {start_word} -> {end_word} (optimal: {optimal_length} steps)")
        
        # Solve the puzzle
        result = solver.solve_puzzle(start_word, end_word)
        
        # Format result for consistency with LLM solver
        formatted_result = {
            "id": challenge_id,
            "startWord": start_word,
            "endWord": end_word,
            "optimalPathLength": optimal_length,
            "llmPath": result["path"],  # Keep same field name for compatibility
            "stepsTaken": result["steps"],
            "status": result["status"],
            "reason": result["reason"],
            "model": "heuristic_solver",
            "strategy_log": result.get("strategy_log", []),
            "heuristic_score": result["steps"] / optimal_length if result["status"] == "solved" else float('inf')
        }
        
        results.append(formatted_result)
        
        if result["status"] == "solved":
            solved_count += 1
            efficiency = result["steps"] / optimal_length
            print(f"✓ SOLVED in {result['steps']} steps (efficiency: {efficiency:.2f}x optimal)")
            print(f"  Path: {' -> '.join(result['path'])}")
        else:
            print(f"✗ FAILED: {result['reason']}")
            print(f"  Partial path: {' -> '.join(result['path'])}")
        
        # Show some strategy details for first few
        if i < 3 and "strategy_log" in result:
            print("  Strategy log:")
            for log_entry in result["strategy_log"][-3:]:  # Show last 3 steps
                print(f"    {log_entry}")
    
    # Summary
    success_rate = (solved_count / num_to_solve) * 100 if num_to_solve > 0 else 0
    print(f"\n--- Heuristic Solver Summary ---")
    print(f"Attempted: {num_to_solve}")
    print(f"Solved: {solved_count}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if solved_count > 0:
        solved_results = [r for r in results if r["status"] == "solved"]
        avg_efficiency = sum(r["heuristic_score"] for r in solved_results) / len(solved_results)
        print(f"Average Efficiency: {avg_efficiency:.2f}x optimal")
    
    return results

def solve_playtest_pairs_heuristic(pairs_file_path: str, max_retries: int = 50) -> List[Dict]:
    """
    Solve playtest pairs using heuristic solver with multiple retries.
    
    Args:
        pairs_file_path: Path to the playtest pairs JSON file
        max_retries: Maximum number of retry attempts per puzzle
    
    Returns:
        List of solution results
    """
    print(f"Loading playtest pairs and initializing heuristic solver...")
    print(f"Using max_retries = {max_retries} (will avoid perfectly optimal solutions)")
    
    # Load data
    pairs_data = load_json_file(Path(pairs_file_path))
    pairs = pairs_data["pairs"]
    graph_data = load_json_file(GRAPH_PATH)
    graph_nodes = graph_data["nodes"]
    
    print(f"Found {len(pairs)} pairs to solve")
    
    # Initialize solver
    solver = HeuristicSolver(graph_nodes)
    print(f"Solver initialized with {len(graph_nodes)} words")
    print(f"Identified {len(solver.hub_words)} hub words")
    
    # Solve puzzles
    results = []
    solved_count = 0
    optimal_count = 0
    retry_count = 0
    
    for i, pair in enumerate(pairs):
        start_word = pair.get("startWord")
        end_word = pair.get("targetWord")
        optimal_length = pair.get("pathLength")
        
        # Create a challenge ID based on index
        challenge_id = f"pair_{i+1:03d}"
        
        print(f"\n--- Pair {i+1}/{len(pairs)}: {challenge_id} ---")
        print(f"Solving: {start_word} -> {end_word} (optimal: {optimal_length} steps)")
        
        # Solve the puzzle with retries
        result = solver.solve_puzzle(start_word, end_word, max_retries=max_retries)
        
        # Track retry statistics
        final_attempt = result.get("final_attempt", 1)
        if final_attempt > 1:
            retry_count += 1
            print(f"  Required {final_attempt} attempts to find non-optimal solution")
        
        # Format result for consistency with LLM solver
        formatted_result = {
            "id": challenge_id,
            "startWord": start_word,
            "endWord": end_word,
            "optimalPathLength": optimal_length,
            "llmPath": result["path"],  # Keep same field name for compatibility
            "stepsTaken": result["steps"],
            "status": result["status"],
            "reason": result["reason"],
            "model": "heuristic_solver",
            "strategy_log": result.get("strategy_log", []),
            "heuristic_score": result["steps"] / optimal_length if result["status"] == "solved" else float('inf'),
            "final_attempt": final_attempt,
            "total_attempts": len(result.get("attempts", [])),
            "was_retried": final_attempt > 1
        }
        
        results.append(formatted_result)
        
        if result["status"] == "solved":
            solved_count += 1
            efficiency = result["steps"] / optimal_length
            
            # Track if solution is optimal
            if result["steps"] == optimal_length:
                optimal_count += 1
                optimal_marker = " [OPTIMAL]"
            else:
                optimal_marker = ""
            
            print(f"✓ SOLVED in {result['steps']} steps (efficiency: {efficiency:.2f}x optimal){optimal_marker}")
            print(f"  Path: {' -> '.join(result['path'])}")
            
            # Show retry info if multiple attempts were made
            if final_attempt > 1:
                print(f"  Required {final_attempt} attempts to find non-optimal solution")
        else:
            print(f"✗ FAILED: {result['reason']}")
            print(f"  Partial path: {' -> '.join(result['path'])}")
            if final_attempt > 1:
                print(f"  Failed after {final_attempt} attempts")
        
        # Show progress every 50 pairs
        if (i + 1) % 50 == 0:
            current_success_rate = (solved_count / (i + 1)) * 100
            current_optimal_rate = (optimal_count / max(1, solved_count)) * 100
            print(f"\n--- Progress: {i+1}/{len(pairs)} pairs processed ---")
            print(f"  Solved: {solved_count} ({current_success_rate:.1f}%)")
            print(f"  Optimal solutions: {optimal_count} ({current_optimal_rate:.1f}% of solved)")
            print(f"  Required retries: {retry_count}")
    
    # Summary
    success_rate = (solved_count / len(pairs)) * 100 if len(pairs) > 0 else 0
    optimal_rate = (optimal_count / max(1, solved_count)) * 100
    retry_rate = (retry_count / len(pairs)) * 100
    
    print(f"\n--- Heuristic Solver Summary ---")
    print(f"Attempted: {len(pairs)}")
    print(f"Solved: {solved_count} ({success_rate:.1f}%)")
    print(f"Optimal solutions: {optimal_count} ({optimal_rate:.1f}% of solved)")
    print(f"Required retries: {retry_count} ({retry_rate:.1f}% of total)")
    
    if solved_count > 0:
        solved_results = [r for r in results if r["status"] == "solved"]
        avg_efficiency = sum(r["heuristic_score"] for r in solved_results) / len(solved_results)
        print(f"Average Efficiency: {avg_efficiency:.2f}x optimal")
        
        # Show efficiency distribution
        efficiency_ranges = {"1.0x (optimal)": 0, "1.0-1.5x": 0, "1.5-2.0x": 0, "2.0x+": 0}
        for r in solved_results:
            eff = r["heuristic_score"]
            if eff == 1.0:
                efficiency_ranges["1.0x (optimal)"] += 1
            elif eff <= 1.5:
                efficiency_ranges["1.0-1.5x"] += 1
            elif eff <= 2.0:
                efficiency_ranges["1.5-2.0x"] += 1
            else:
                efficiency_ranges["2.0x+"] += 1
        
        print("Efficiency distribution:")
        for range_name, count in efficiency_ranges.items():
            percentage = (count / solved_count) * 100
            print(f"  {range_name}: {count} ({percentage:.1f}%)")
    
    return results

def filter_and_sample_results(results: List[Dict], target_distribution: Dict[int, int]) -> List[Dict]:
    """
    Filter out optimal solutions and sample the exact distribution we need.
    
    Args:
        results: List of solved puzzle results
        target_distribution: Dict mapping path length to number needed
    
    Returns:
        List of sampled non-optimal results with exact target distribution
    """
    print(f"\nFiltering out optimal solutions and sampling target distribution...")
    
    # Separate results by path length and filter out optimal solutions
    non_optimal_by_length = {}
    optimal_count = 0
    
    for result in results:
        if result["status"] != "solved":
            continue
            
        path_length = result["optimalPathLength"]
        steps_taken = result["stepsTaken"]
        
        # Skip optimal solutions (where steps taken equals optimal path length)
        if steps_taken == path_length:
            optimal_count += 1
            print(f"Filtering out optimal solution: {result['startWord']} -> {result['endWord']} ({steps_taken} steps)")
            continue
        
        # Add to non-optimal results
        if path_length not in non_optimal_by_length:
            non_optimal_by_length[path_length] = []
        non_optimal_by_length[path_length].append(result)
    
    print(f"Filtered out {optimal_count} optimal solutions")
    
    # Sample the exact distribution we need
    sampled_results = []
    
    print("\nSampling target distribution:")
    for length, needed in target_distribution.items():
        available = non_optimal_by_length.get(length, [])
        
        if len(available) < needed:
            print(f"WARNING: Only {len(available)} non-optimal pairs available for length {length}, need {needed}")
            sampled_results.extend(available)  # Take all available
        else:
            # Randomly sample the exact number needed
            sampled = random.sample(available, needed)
            sampled_results.extend(sampled)
            print(f"Length {length}: sampled {needed} from {len(available)} non-optimal pairs")
    
    # Shuffle the final list
    random.shuffle(sampled_results)
    
    print(f"\nFinal sampled results: {len(sampled_results)} total")
    return sampled_results

if __name__ == "__main__":
    # Set random seed for reproducibility
    random.seed(42)
    
    # Target distribution for daily challenges
    TARGET_DISTRIBUTION = {
        4: 165,  # 165 challenges with 4 steps (45% - Easy)
        5: 200   # 200 challenges with 5 steps (55% - Medium)
    }
    
    # Solve the playtest pairs
    pairs_file = PROJECT_ROOT / "src" / "data" / "playtest_pairs.json"
    results = solve_playtest_pairs_heuristic(str(pairs_file))
    
    # Filter out optimal solutions and sample target distribution
    sampled_results = filter_and_sample_results(results, TARGET_DISTRIBUTION)
    
    # Save all results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = PROJECT_ROOT / "scripts" / "llm_test_results" / f"heuristic_results_{timestamp}.json"
    results_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Save sampled results (the ones we actually want for daily challenges)
    sampled_file = PROJECT_ROOT / "scripts" / "llm_test_results" / f"daily_challenges_sampled_{timestamp}.json"
    with open(sampled_file, 'w') as f:
        json.dump(sampled_results, f, indent=2)
    
    print(f"\nAll results saved to: {results_file}")
    print(f"Sampled daily challenges saved to: {sampled_file}")
    print(f"Next step: Use {sampled_file} as input to generate_daily_challenges.js") 