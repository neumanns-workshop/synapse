import pickle
import numpy as np
from sklearn.manifold import TSNE
import json
import os
import sys

# Constants
EMBEDDINGS_PATH = os.path.join("raw_data", "embeddings.pkl")
OUTPUT_DIR = os.path.join("data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "tsne_coordinates.json")

# t-SNE Parameters (adjust as needed)
TSNE_PERPLEXITY = 30.0
TSNE_LEARNING_RATE = 200.0
TSNE_N_ITER = 1000
TSNE_INIT = 'pca' # pca is often faster and more stable than random
TSNE_VERBOSE = 1 # Print progress

def generate_tsne():
    """
    Loads embeddings, computes 2D t-SNE coordinates, and saves them
    to a JSON file mapping words to coordinates.
    """
    print("Loading embeddings dictionary...")
    with open(EMBEDDINGS_PATH, 'rb') as f:
        embeddings_dict = pickle.load(f)
    print(f"Loaded embeddings for {len(embeddings_dict)} words.")

    print("Reconstructing words list and embeddings matrix from dictionary...")
    words = list(embeddings_dict.keys())
    try:
        embeddings_list = [embeddings_dict[word] for word in words]
        embeddings = np.stack(embeddings_list)
    except Exception as e:
        print(f"Error stacking embeddings: {e}")
        sys.exit(1)

    # Ensure float32 for t-SNE
    if embeddings.dtype != np.float32:
        embeddings = embeddings.astype(np.float32)

    print(f"Reconstructed embeddings matrix with shape: {embeddings.shape}")

    print("Running t-SNE... (This may take a while)")
    tsne = TSNE(
        n_components=2,
        perplexity=TSNE_PERPLEXITY,
        learning_rate=TSNE_LEARNING_RATE,
        n_iter=TSNE_N_ITER,
        init=TSNE_INIT,
        verbose=TSNE_VERBOSE,
        random_state=42 # for reproducibility
    )

    tsne_results = tsne.fit_transform(embeddings)

    print("t-SNE calculation complete.")
    print(f"Shape of t-SNE results: {tsne_results.shape}")

    print("Creating word-to-coordinate mapping...")
    tsne_map = {}
    for i, word in enumerate(words):
        # Convert numpy floats to standard Python floats for JSON serialization
        tsne_map[word] = [float(tsne_results[i, 0]), float(tsne_results[i, 1])]

    print(f"Saving t-SNE coordinates to {OUTPUT_PATH}...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(tsne_map, f, indent=2) # Use indent for readability
    print("t-SNE coordinates saved successfully.")

if __name__ == "__main__":
    generate_tsne() 