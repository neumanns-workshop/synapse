import json
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import sys
import argparse
import nltk # Add NLTK imports
from nltk.corpus import wordnet as wn

# Constants
MAX_DEFINITIONS_PER_WORD = 3 # Max definitions to keep
MAX_DEFINITION_LENGTH = 90 # Max characters per definition
# K = 7 # REMOVED
WORDS_PATH = os.path.join("raw_data", "ENGLISH_LEMMATIZED.json")
EMBEDDINGS_PATH = os.path.join("raw_data", "embeddings.pkl")
TSNE_COORDS_PATH = os.path.join("data", "tsne_coordinates.json")
OUTPUT_DIR = os.path.join("client", "public", "data")
OUTPUT_GRAPH_PATH = os.path.join(OUTPUT_DIR, "graph.json")
OUTPUT_DEFS_PATH = os.path.join(OUTPUT_DIR, "definitions.json") # Path for definitions

# --- WordNet Definition Function ---
# Ensure WordNet data is available before calling this
try:
    wn.ensure_loaded()
except LookupError:
    print("WordNet corpus not found. Please ensure NLTK data is downloaded.")
    print("Run: python -c \"import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')\"")
    sys.exit(1)

def get_wordnet_definition(word):
    """Fetches up to MAX_DEFINITIONS_PER_WORD synset definitions for a given word,
       filtering by MAX_DEFINITION_LENGTH."""
    synsets = wn.synsets(word)
    if synsets:
        # Get all non-empty definitions first
        all_definitions = [s.definition() for s in synsets if s.definition()]
        # Filter by length
        filtered_definitions = [d for d in all_definitions if len(d) <= MAX_DEFINITION_LENGTH]
        # Return the first MAX_DEFINITIONS_PER_WORD from the filtered list
        return filtered_definitions[:MAX_DEFINITIONS_PER_WORD]
    return []
# --- End Definition Function ---

def build_graph(k_neighbors):
    """
    Loads embeddings, filters words based on definition existence,
    loads t-SNE coordinates, calculates similarity, finds neighbors,
    and saves the resulting graph and definitions to JSON files.

    Args:
        k_neighbors (int): The number of nearest neighbors.
    """
    print("Loading embeddings dictionary...")
    with open(EMBEDDINGS_PATH, 'rb') as f:
        embeddings_dict = pickle.load(f)
    initial_word_count = len(embeddings_dict)
    print(f"Loaded embeddings for {initial_word_count} words.")

    # --- Filter Words Based on Definitions ---
    print("Fetching definitions and filtering words...")
    filtered_embeddings_dict = {}
    final_definitions = {}
    definition_not_found_count = 0
    words_processed = 0

    for word, embedding in embeddings_dict.items():
        definitions_list = get_wordnet_definition(word)
        if definitions_list: # Keep only words with definitions
            filtered_embeddings_dict[word] = embedding
            final_definitions[word] = definitions_list
        else:
            definition_not_found_count += 1
        
        words_processed += 1
        if words_processed % 500 == 0:
            print(f"  Processed {words_processed}/{initial_word_count} words for definition check...")
    
    filtered_word_count = len(filtered_embeddings_dict)
    print(f"Finished definition check. Kept {filtered_word_count} words with definitions.")
    print(f"Removed {definition_not_found_count} words without definitions.")
    # --- End Filter ---

    # Continue with the filtered dictionary
    embeddings_dict = filtered_embeddings_dict

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

    # --- Reconstruct words list and embeddings matrix FROM FILTERED DATA ---
    print("Reconstructing words list and embeddings matrix from FILTERED dictionary...")
    words = list(embeddings_dict.keys()) # Now uses filtered words
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
        similarities = similarity_matrix[i]
        num_to_find = min(k_neighbors + 1, num_words)
        indices = np.argpartition(similarities, -num_to_find)[-num_to_find:]
        sorted_indices = indices[np.argsort(similarities[indices])[::-1]]

        edges = {}
        neighbors_found = 0
        for idx in sorted_indices:
            if idx != i:
                neighbor_word = words[idx]
                score = float(similarities[idx])
                edges[neighbor_word] = score
                neighbors_found += 1
                if neighbors_found == k_neighbors:
                    break

        tsne_coords = tsne_coords_map.get(word)
        if tsne_coords is None:
            tsne_coords = [0.0, 0.0]
            missing_tsne_count += 1

        graph["nodes"][word] = {
            "edges": edges,
            "tsne": tsne_coords
        }

        if (i + 1) % 500 == 0:
            print(f"Processed {i + 1}/{num_words} words...")

    if missing_tsne_count > 0:
        print(f"Warning: Missing t-SNE coordinates for {missing_tsne_count} words. Defaulted to [0,0].")
    print("Graph construction complete.")

    # --- Save Output Files ---
    print(f"Saving graph to {OUTPUT_GRAPH_PATH}...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_GRAPH_PATH, 'w') as f:
        json.dump(graph, f, indent=2)
    print("Graph saved successfully.")

    print(f"Saving definitions to {OUTPUT_DEFS_PATH}...")
    with open(OUTPUT_DEFS_PATH, 'w') as f:
        json.dump(final_definitions, f, indent=2)
    print("Definitions saved successfully.")
    # --- End Save ---

    # --- Generate and Save Dense Similarity Matrix ---
    print("\nGenerating dense similarity matrix for all filtered word pairs...")
    dense_similarity_data = {}
    num_filtered_words = len(words) # words list is already based on filtered_embeddings_dict

    for i in range(num_filtered_words):
        word1 = words[i]
        dense_similarity_data[word1] = {}
        for j in range(num_filtered_words):
            word2 = words[j]
            # similarity_matrix was calculated on the filtered embeddings
            raw_score = float(similarity_matrix[i][j])
            quantized_score = round(raw_score, 3) # Round to 3 decimal places
            dense_similarity_data[word1][word2] = quantized_score
        if (i + 1) % 500 == 0:
            print(f"  Built dense similarities for {i + 1}/{num_filtered_words} words...")

    OUTPUT_DENSE_SIMILARITY_PATH = os.path.join(OUTPUT_DIR, "dense_similarity_matrix.json")
    print(f"Saving dense similarity matrix to {OUTPUT_DENSE_SIMILARITY_PATH}...")
    try:
        with open(OUTPUT_DENSE_SIMILARITY_PATH, 'w') as f:
            json.dump(dense_similarity_data, f) # Intentionally no indent for smaller size
        print("Dense similarity matrix saved successfully.")
        
        # Get and print file size
        file_size_bytes = os.path.getsize(OUTPUT_DENSE_SIMILARITY_PATH)
        file_size_mb = file_size_bytes / (1024 * 1024)
        print(f"\n--- Dense Similarity Matrix File Size ---")
        print(f"Vocabulary size (filtered words): {num_filtered_words}")
        print(f"File size of dense_similarity_matrix.json: {file_size_mb:.2f} MB")
        print(f"This contains N*N = {num_filtered_words*num_filtered_words} similarity scores.")
        print(f"--- End File Size Report ---")

    except Exception as e:
        print(f"Error saving or getting size of dense similarity matrix: {e}")
    # --- End Dense Similarity ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build a semantic graph and definitions from word embeddings, filtering words without definitions.")
    parser.add_argument("-k", "--k", type=int, default=5, # Default to K=5
                        help="Number of nearest neighbors (K) to include for each word.")
    args = parser.parse_args()
    build_graph(args.k) 