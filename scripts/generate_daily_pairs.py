import json
import random
import os
import sys
from collections import deque
from multiprocessing import Pool, cpu_count, Manager, Lock
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta

# Assuming graph.json is in ../client/public/data/graph.json relative to this script's location
GRAPH_PATH = "../client/public/data/graph.json"
OUTPUT_PATH = "../src/data/playtest_pairs.json"  # Changed output path

# Constraints (matching useGameStore.ts)
MIN_PATH_LENGTH = 4  # 4 steps (5 nodes)
MAX_PATH_LENGTH = 5  # 5 steps (6 nodes)
MAX_ATTEMPTS_PER_PAIR = 200  # Increased attempts
MIN_NODE_DEGREE = 3  # Increased back to 3 for better quality pairs
MIN_TSNE_DISTANCE_SQUARED = 20 * 20  # Reduced from 20*20 to allow more potential pairs

# Daily challenges configuration - Generate MORE than 365 to allow filtering
# Target: 165 4-step, 200 5-step = 365 total
# Generate: 185 4-step, 220 5-step = 405 total (extra buffer for filtering)
PAIRS_PER_PATH_LENGTH = {
    4: 185,  # 165 challenges with 4 steps (20 extra)
    5: 220   # 200 challenges with 5 steps (20 extra)
}
TARGET_PATH_LENGTHS = [4, 5]  # Only 4-5 step paths
CHUNK_SIZE = 10  # Increased chunk size for efficiency

# Global lock for thread-safe printing
print_lock = Lock()

def safe_print(*args, **kwargs):
    """Thread-safe printing function."""
    with print_lock:
        print(*args, **kwargs)

def load_graph(path):
    """Loads the graph data from a JSON file."""
    if not os.path.exists(path):
        print(f"Error: Graph file not found at {path}")
        print("Please ensure build_graph.py has been run and the path is correct.")
        sys.exit(1)
    with open(path, 'r') as f:
        return json.load(f)["nodes"]

def find_shortest_path(graph, start_node, end_node):
    """Finds the shortest path between start_node and end_node using Dijkstra's algorithm with semantic distances."""
    if start_node not in graph or end_node not in graph:
        print(f"find_shortest_path: Invalid graph data or start/end words (start={start_node}, end={end_node})")
        return []
    
    # Initialize distances and previous nodes
    distances = {node: float('infinity') for node in graph}
    previous_nodes = {node: None for node in graph}
    visited = set()  # Track visited nodes
    unvisited = set(graph.keys())
    distances[start_node] = 0
    
    while unvisited:
        # Find unvisited node with smallest distance
        current = None
        min_distance = float('infinity')
        for node in unvisited:
            if distances[node] < min_distance:
                min_distance = distances[node]
                current = node
        
        # If all remaining unvisited nodes are inaccessible, or if we reached end node
        if current is None or distances[current] == float('infinity') or current == end_node:
            break
            
        unvisited.remove(current)
        visited.add(current)  # Mark as visited
        
        # Update distances for neighbors
        edges = graph[current].get("edges", {})
        for neighbor, similarity in edges.items():
            # Skip if neighbor has been visited
            if neighbor in visited:
                continue
                
            # Convert similarity to cost (higher similarity = lower cost)
            cost = 1 - similarity
            distance_through_current = distances[current] + cost
            
            if distance_through_current < distances[neighbor]:
                distances[neighbor] = distance_through_current
                previous_nodes[neighbor] = current
    
    # Reconstruct path if end is reachable
    if distances[end_node] == float('infinity'):
        print(f"No path found from {start_node} to {end_node}")
        return []
        
    # Trace back from end to start
    path = []
    current = end_node
    while current is not None:
        path.insert(0, current)  # Use insert(0) instead of append + reverse
        current = previous_nodes[current]
        if current == start_node:
            path.insert(0, start_node)
            break
    
    return path

def generate_valid_pair(graph, words_list, used_start_words, used_target_words, target_path_length=None):
    """Attempts to find a single valid word pair based on specified criteria."""
    if len(words_list) < 2:
        return None

    for _ in range(MAX_ATTEMPTS_PER_PAIR):
        # Select two random words
        start_index = random.randint(0, len(words_list) - 1)
        end_index = random.randint(0, len(words_list) - 1)
        
        # Make sure start and end are different
        while end_index == start_index:
            end_index = random.randint(0, len(words_list) - 1)
            
        start_word = words_list[start_index]
        end_word = words_list[end_index]

        # Skip if either word has been used in its current role
        if start_word in used_start_words or end_word in used_target_words:
            continue

        start_node_data = graph.get(start_word)
        end_node_data = graph.get(end_word)

        if not start_node_data or not end_node_data:
            continue

        # 1. Check t-SNE distance - more lenient for shorter paths
        if "tsne" in start_node_data and "tsne" in end_node_data:
            s_tsne = start_node_data["tsne"]
            e_tsne = end_node_data["tsne"]
            if s_tsne and e_tsne and len(s_tsne) == 2 and len(e_tsne) == 2:
                dx = s_tsne[0] - e_tsne[0]
                dy = s_tsne[1] - e_tsne[1]
                dist_squared = dx*dx + dy*dy
                # Use more lenient distance for shorter paths
                min_distance = MIN_TSNE_DISTANCE_SQUARED
                if target_path_length is not None and target_path_length <= 4:
                    min_distance = (MIN_TSNE_DISTANCE_SQUARED // 2)  # Half the distance for shorter paths
                if dist_squared < min_distance:
                    continue
            else:
                continue
        else:
            continue

        # 2. Check node degree - more lenient for shorter paths
        start_degree = len(start_node_data.get("edges", {}))
        end_degree = len(end_node_data.get("edges", {}))
        min_degree = MIN_NODE_DEGREE
        if target_path_length is not None and target_path_length <= 4:
            min_degree = 1  # Allow single connections for shorter paths
        if start_degree < min_degree or end_degree < min_degree:
            continue

        # 3. Find shortest path and check length
        path = find_shortest_path(graph, start_word, end_word)
        path_length = len(path) - 1 if path else 0
        
        # If path length is in our target range, return it
        if MIN_PATH_LENGTH <= path_length <= MAX_PATH_LENGTH:
            return {"startWord": start_word, "targetWord": end_word, "pathLength": path_length}
        
    return None

def generate_chunk(args: Tuple[Dict, List[str], int, dict, dict, dict]) -> List[Dict]:
    """Generate a chunk of valid pairs in parallel."""
    graph, words, chunk_size, used_start_words, used_target_words, needed_pairs = args
    chunk_pairs = []
    generated_pairs = set()
    
    while any(count > 0 for count in needed_pairs.values()):
        pair_info = generate_valid_pair(graph, words, used_start_words, used_target_words)
        if pair_info:
            start_word = pair_info["startWord"]
            target_word = pair_info["targetWord"]
            path_length = pair_info["pathLength"]
            
            # Skip if we don't need more pairs of this length
            if path_length not in needed_pairs or needed_pairs[path_length] <= 0:
                continue
            
            # Create a unique key for the pair to check for duplicates
            pair_key = tuple(sorted((start_word, target_word)))
            if pair_key not in generated_pairs:
                safe_print(f"Found path of length {path_length} from {start_word} to {target_word}")
                chunk_pairs.append(pair_info)
                generated_pairs.add(pair_key)
                used_start_words[start_word] = True
                used_target_words[target_word] = True
                needed_pairs[path_length] -= 1
                
                # Print progress
                remaining = sum(needed_pairs.values())
                if remaining % 5 == 0:  # Print every 5 pairs
                    safe_print(f"Still need: {dict(needed_pairs)}")
                
                # If we've found all pairs for this length, print it
                if needed_pairs[path_length] == 0:
                    safe_print(f"Completed length {path_length}!")
    
    return chunk_pairs

def main():
    safe_print(f"Loading graph from {GRAPH_PATH}...")
    graph_nodes = load_graph(GRAPH_PATH)
    words = list(graph_nodes.keys())
    safe_print(f"Loaded {len(words)} words from graph.")

    # Create shared dictionaries for used words and progress tracking
    with Manager() as manager:
        used_start_words = manager.dict()
        used_target_words = manager.dict()
        # Track global progress
        needed_pairs = manager.dict({length: PAIRS_PER_PATH_LENGTH[length] for length in TARGET_PATH_LENGTHS})

        # Generate pairs for each target path length
        all_pairs = []
        safe_print(f"\nGenerating pairs with distribution: {PAIRS_PER_PATH_LENGTH}")
        
        # Calculate number of chunks needed
        total_pairs_needed = sum(PAIRS_PER_PATH_LENGTH.values())  # 185 + 220 = 405
        num_chunks = (total_pairs_needed + CHUNK_SIZE - 1) // CHUNK_SIZE
        
        # Prepare arguments for parallel processing
        chunk_args = [(graph_nodes, words, CHUNK_SIZE, used_start_words, used_target_words, needed_pairs) 
                     for _ in range(num_chunks)]

        # Use multiprocessing to generate pairs in parallel
        with Pool(processes=min(cpu_count(), 4)) as pool:
            chunk_results = pool.map(generate_chunk, chunk_args)

        # Combine results
        for chunk in chunk_results:
            all_pairs.extend(chunk)

        # Verify we have all the pairs we need
        pairs_by_length = {}
        for pair in all_pairs:
            length = pair["pathLength"]
            if length not in pairs_by_length:
                pairs_by_length[length] = []
            pairs_by_length[length].append(pair)

        # Print summary
        safe_print("\nGenerated pairs summary:")
        for length in TARGET_PATH_LENGTHS:
            count = len(pairs_by_length.get(length, []))
            safe_print(f"Length {length}: {count} pairs")

        # Ensure output directory exists
        output_dir = os.path.dirname(OUTPUT_PATH)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Create the final structure
        output_data = {
            "version": "1.0",
            "lastUpdated": datetime.now().strftime("%Y-%m-%d"),
            "pairs": all_pairs
        }

        safe_print(f"\nSaving {len(all_pairs)} playtest pairs to {OUTPUT_PATH}...")
        with open(OUTPUT_PATH, 'w') as f:
            json.dump(output_data, f, indent=2)
        safe_print("Playtest pairs saved successfully.")

if __name__ == "__main__":
    # Adjust GRAPH_PATH and OUTPUT_PATH based on script location relative to project root
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    GRAPH_PATH = os.path.join(project_root, "client", "public", "data", "graph.json")
    OUTPUT_PATH = os.path.join(project_root, "src", "data", "playtest_pairs.json")
    
    main() 