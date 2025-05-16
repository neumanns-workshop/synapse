import json
import nltk
from nltk.corpus import wordnet as wn
import os

# Ensure NLTK data path is correctly configured if needed
# nltk.data.path.append('/path/to/your/nltk_data') # Example if default location doesn't work

# Define file paths
# Corrected paths relative to the workspace root
GRAPH_FILE_PATH = os.path.join('client', 'public', 'data', 'graph.json')
OUTPUT_FILE_PATH = os.path.join('client', 'public', 'data', 'definitions.json')

# Maximum number of definitions to store per word
MAX_DEFINITIONS_PER_WORD = 3

def get_wordnet_definition(word):
    """Fetches up to MAX_DEFINITIONS_PER_WORD synset definitions for a given word."""
    synsets = wn.synsets(word)
    if synsets:
        # Get definitions, filtering out empty ones, and take only the first MAX_DEFINITIONS_PER_WORD
        definitions = [s.definition() for s in synsets if s.definition()]
        return definitions[:MAX_DEFINITIONS_PER_WORD] 
    return [] # Return an empty list if word not found or no definitions available

def main():
    """Loads graph data, extracts words, gets definitions, and saves to JSON."""
    print(f"Loading graph data from {GRAPH_FILE_PATH}...")
    try:
        with open(GRAPH_FILE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Graph file not found at {GRAPH_FILE_PATH}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {GRAPH_FILE_PATH}")
        return

    if 'nodes' not in data:
        print("Error: 'nodes' key not found in graph data.")
        return

    words = list(data['nodes'].keys())
    print(f"Found {len(words)} words in the graph.")

    definitions = {}
    not_found_count = 0
    words_not_found = [] # List to store words without definitions
    print("Fetching definitions from WordNet...")
    for i, word in enumerate(words):
        definitions_list = get_wordnet_definition(word)
        definitions[word] = definitions_list
        if not definitions_list:
            not_found_count += 1
            words_not_found.append(word) # Add word to the list
        if (i + 1) % 100 == 0 or (i + 1) == len(words):
            print(f"Processed {i + 1}/{len(words)} words...")

    print(f"Finished fetching definitions. {not_found_count} words had no definition found in WordNet.")
    if words_not_found:
        print("Words without definitions:", words_not_found) # Print the list

    print(f"Saving definitions to {OUTPUT_FILE_PATH}...")
    try:
        with open(OUTPUT_FILE_PATH, 'w') as f:
            json.dump(definitions, f, indent=2)
        print("Definitions saved successfully.")
    except IOError:
        print(f"Error: Could not write definitions to {OUTPUT_FILE_PATH}")

if __name__ == "__main__":
    # Ensure WordNet data is available before running
    try:
        wn.ensure_loaded()
    except LookupError:
        print("WordNet corpus not found. Please ensure NLTK data is downloaded.")
        print("Run: python -c \"import nltk; nltk.download('wordnet'); nltk.download('omw-1.4')\"")
    else:
        main() 