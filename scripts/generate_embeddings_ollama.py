import json
import pickle
import requests
import os
import sys
import time
import numpy as np

# --- Configuration ---
WORDS_PATH = os.path.join("raw_data", "ENGLISH_LEMMATIZED.json")
OUTPUT_DIR = "raw_data"
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "embeddings.pkl")
OLLAMA_API_URL = "http://localhost:11434/api/embeddings"
MODEL_NAME = "nomic-embed-text:137m-v1.5-fp16"
REQUEST_TIMEOUT = 60 # Timeout for API requests in seconds
RETRY_DELAY = 5 # Delay before retrying API request in seconds
MAX_RETRIES = 3 # Maximum number of retries for a single word
# --- End Configuration ---

def get_ollama_embedding(word, retries=MAX_RETRIES):
    """Fetches embedding for a single word from the Ollama API with retries."""
    payload = {
        "model": MODEL_NAME,
        "prompt": word
    }
    current_retries = 0
    while current_retries < retries:
        try:
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=REQUEST_TIMEOUT)
            response.raise_for_status() # Raises HTTPError for bad responses (4XX or 5XX)
            
            data = response.json()
            if "embedding" in data and isinstance(data["embedding"], list):
                # Convert to numpy array for consistency if build_graph expects it
                return np.array(data["embedding"], dtype=np.float32) 
            else:
                print(f"  Warning: Unexpected response format for word '{word}': {data}", file=sys.stderr)
                return None # Or raise an error

        except requests.exceptions.ConnectionError as e:
            print(f"  Connection Error for word '{word}': {e}. Retrying in {RETRY_DELAY}s...", file=sys.stderr)
        except requests.exceptions.Timeout as e:
            print(f"  Timeout Error for word '{word}': {e}. Retrying in {RETRY_DELAY}s...", file=sys.stderr)
        except requests.exceptions.HTTPError as e:
            print(f"  HTTP Error for word '{word}': {e.Response.status_code} - {e.Response.text}. Retrying in {RETRY_DELAY}s...", file=sys.stderr)
        except requests.exceptions.RequestException as e:
            print(f"  Request Error for word '{word}': {e}. Retrying in {RETRY_DELAY}s...", file=sys.stderr)
        
        current_retries += 1
        if current_retries < retries:
            time.sleep(RETRY_DELAY)
        else:
            print(f"  Failed to get embedding for word '{word}' after {retries} retries.", file=sys.stderr)
            return None # Failed after retries

def generate_embeddings():
    """Loads words, fetches embeddings from Ollama, and saves them to a pickle file."""
    print(f"Loading words from {WORDS_PATH}...")
    try:
        with open(WORDS_PATH, 'r') as f:
            words = json.load(f)
        print(f"Loaded {len(words)} words.")
    except FileNotFoundError:
        print(f"Error: Words file not found at {WORDS_PATH}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {WORDS_PATH}", file=sys.stderr)
        sys.exit(1)

    embeddings_dict = {}
    failed_words = []
    total_words = len(words)

    print(f"Generating embeddings using Ollama model: {MODEL_NAME}")
    print(f"Connecting to Ollama API at: {OLLAMA_API_URL}")

    # Ensure Ollama is running and the model is available (optional pre-check)
    try:
        requests.get(OLLAMA_API_URL.replace('/api/embeddings', '/api/tags'), timeout=5).raise_for_status()
        print("Successfully connected to Ollama API.")
        # You could add a check here to see if MODEL_NAME is in the list of available models
    except requests.exceptions.RequestException as e:
        print(f"Error: Could not connect to Ollama API at {OLLAMA_API_URL.replace('/api/embeddings', '')}. Please ensure Ollama is running.", file=sys.stderr)
        print(f"Details: {e}", file=sys.stderr)
        sys.exit(1)


    for i, word in enumerate(words):
        print(f"Processing word {i + 1}/{total_words}: '{word}'")
        embedding = get_ollama_embedding(word)
        
        if embedding is not None:
            embeddings_dict[word] = embedding
        else:
            failed_words.append(word)
            print(f"  Skipping word '{word}' due to embedding failure.")

        # Optional small delay to be nice to the API
        # time.sleep(0.05) 

    success_count = len(embeddings_dict)
    fail_count = len(failed_words)
    print(f"\nEmbedding generation complete.")
    print(f"Successfully generated embeddings for {success_count} words.")
    if fail_count > 0:
        print(f"Failed to generate embeddings for {fail_count} words:")
        print(f"  {failed_words}")

    if success_count == 0:
        print("Error: No embeddings were successfully generated. Aborting save.", file=sys.stderr)
        sys.exit(1)

    print(f"Saving embeddings dictionary to {OUTPUT_PATH}...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        with open(OUTPUT_PATH, 'wb') as f:
            pickle.dump(embeddings_dict, f)
        print("Embeddings saved successfully.")
    except Exception as e:
        print(f"Error: Failed to save embeddings pickle file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Note: This script requires the 'requests' library.
    # Install it using: pip install requests
    generate_embeddings() 