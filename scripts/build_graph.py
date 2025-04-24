import json
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import sys
import argparse # Import argparse

# Constants
# K = 7  # REMOVED: Number of neighbors will come from args
WORDS_PATH = os.path.join("raw_data", "ENGLISH_LEMMATIZED.json")
EMBEDDINGS_PATH = os.path.join("raw_data", "embeddings.pkl")
TSNE_COORDS_PATH = os.path.join("data", "tsne_coordinates.json")
OUTPUT_DIR = os.path.join("data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "graph.json")

def build_graph(k_neighbors):
    """
    Loads words and embeddings, loads pre-computed t-SNE coordinates,
    calculates pairwise cosine similarity, finds the top k_neighbors for each word,
    and saves the resulting graph structure (including t-SNE coords) to a JSON file.

    Args:
        k_neighbors (int): The number of nearest neighbors to find for each word.
    """
    # print("Loading words...") # No longer loading words file first
    # with open(WORDS_PATH, 'r') as f:
    #     words = json.load(f)
    # print(f"Loaded {len(words)} words.")

    print("Loading embeddings dictionary...")
    with open(EMBEDDINGS_PATH, 'rb') as f:
        embeddings_dict = pickle.load(f)
    print(f"Loaded embeddings for {len(embeddings_dict)} words.")
    
    # --- Add Filter --- 
    offensive_word = "negro"
    if offensive_word in embeddings_dict:
        del embeddings_dict[offensive_word]
        print(f"Removed offensive word '{offensive_word}' from embeddings dictionary.")
        print(f"Embeddings dictionary now contains {len(embeddings_dict)} words.")
    # --- End Filter --- 

    print(f"Loading t-SNE coordinates from {TSNE_COORDS_PATH}...")
    try:
        with open(TSNE_COORDS_PATH, 'r') as f:
            tsne_coords_map = json.load(f)
        print(f"Loaded t-SNE coordinates for {len(tsne_coords_map)} words.")
    except FileNotFoundError:
        print(f"Error: t-SNE coordinates file not found at {TSNE_COORDS_PATH}")
        print("Please run scripts/generate_tsne.py first.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {TSNE_COORDS_PATH}")
        sys.exit(1)

    # --- Reconstruct words list and embeddings matrix ---
    print("Reconstructing words list and embeddings matrix from dictionary...")
    words = list(embeddings_dict.keys())
    # Assuming values are numpy arrays or lists that can be stacked
    try:
        embeddings_list = [embeddings_dict[word] for word in words]
        embeddings = np.stack(embeddings_list)
    except KeyError as e:
        print(f"Error: Word '{e}' not found in embeddings dictionary during matrix construction.")
        sys.exit(1)
    except Exception as e:
        print(f"Error stacking embeddings: {e}")
        sys.exit(1)

    print(f"Reconstructed embeddings matrix with shape: {embeddings.shape}")
    print(f"Reconstructed word list with {len(words)} words.")
    # --- End Reconstruct ---

    # Remove inspection code:
    # print(f"Type of loaded embeddings data: {type(embeddings_data)}")
    # if isinstance(embeddings_data, dict):
    # ... rest of inspection code ...

    # The shape check is now redundant as we just built the matrix
    # if len(words) != embeddings.shape[0]:
    #    raise ValueError("Mismatch between number of words and number of embedding vectors.")

    print("Calculating cosine similarity matrix...")
    # Ensure embeddings are float32 for efficiency if needed
    if embeddings.dtype != np.float32:
         embeddings = embeddings.astype(np.float32)
    similarity_matrix = cosine_similarity(embeddings)
    print(f"Calculated similarity matrix with shape: {similarity_matrix.shape}")

    print(f"Building graph with top {k_neighbors} neighbors and t-SNE coordinates...")
    graph = {"nodes": {}}
    num_words = len(words)
    missing_tsne_count = 0

    for i in range(num_words):
        word = words[i]
        # Get similarities for the current word, excluding itself
        similarities = similarity_matrix[i]
        # Get indices of top k_neighbors+1 similarities (including self)
        # Use argpartition for efficiency, find k_neighbors+1 largest, then sort those k_neighbors+1
        # Ensure k_neighbors+1 does not exceed the number of words
        num_to_find = min(k_neighbors + 1, num_words)
        indices = np.argpartition(similarities, -num_to_find)[-num_to_find:]
        # Sort these indices by similarity score in descending order
        sorted_indices = indices[np.argsort(similarities[indices])[::-1]]

        edges = {}
        neighbors_found = 0
        for idx in sorted_indices:
            if idx != i:  # Exclude self
                neighbor_word = words[idx]
                score = float(similarities[idx]) # Ensure score is JSON serializable float
                edges[neighbor_word] = score
                neighbors_found += 1
                if neighbors_found == k_neighbors: # Use k_neighbors arg
                    break

        # Get t-SNE coordinates for the current word
        tsne_coords = tsne_coords_map.get(word)
        if tsne_coords is None:
            # This case should ideally not happen if both scripts use the same source
            # print(f"Warning: No t-SNE coordinates found for word: {word}. Skipping.")
            tsne_coords = [0.0, 0.0] # Assign default or handle as error?
            missing_tsne_count += 1

        # Add node data including edges and t-SNE coordinates
        graph["nodes"][word] = {
            "edges": edges,
            "tsne": tsne_coords
        }

        if (i + 1) % 500 == 0:
            print(f"Processed {i + 1}/{num_words} words...")

    if missing_tsne_count > 0:
        print(f"Warning: Missing t-SNE coordinates for {missing_tsne_count} words. Defaulted to [0,0].")
    print("Graph construction complete.")

    print(f"Saving graph to {OUTPUT_PATH}...")
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(graph, f, indent=2) # Use indent for readability for now
    print("Graph saved successfully.")

if __name__ == "__main__":
    # Setup argument parser
    parser = argparse.ArgumentParser(description="Build a semantic graph from word embeddings.")
    parser.add_argument("-k", "--k", type=int, default=7,
                        help="Number of nearest neighbors (K) to include for each word.")
    # Parse arguments
    args = parser.parse_args()

    # Call build_graph with the parsed k value
    build_graph(args.k) 