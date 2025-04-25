# Synapse: Semantic Pathways (V1)

A word navigation game where players find paths between words using semantic similarity. Navigate a graph of interconnected words, aiming to reach the target word from the start word in the fewest steps.

This repository contains the complete project, including the frontend client and the data generation scripts. It is intended to be used as a Git submodule within a larger website structure.

## Status

Version 1.0.0 - See [CHANGELOG.md](CHANGELOG.md) for details.

## Project Structure

- `client/`: Contains the React frontend application (Vite + React + D3.js). See `client/README.md` for more details.
  - `client/public/data/`: Holds the generated data files required by the game (`graph.json`, `definitions.json`). **These files are essential for the client to run.**
  - `client/dist/`: Contains the built static assets after running `npm run build` in the `client` directory.
  - `client/src/`: Source code for the React components, game logic, context, and utilities.
- `scripts/`: Python scripts used to generate the data files.
- `raw_data/`: Source data (word lists, initial embeddings) used by the Python scripts.
- `implementation_docs/`: Design documents and implementation plans.
- `CHANGELOG.md`: Log of changes per version.
- `.gitignore`: Specifies intentionally untracked files.
- `README.md`: This file.

## Running the Client (Development)

1.  Navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  Run the Vite development server:
    ```bash
    npm run dev
    ```
    The application should now be running, typically on `http://localhost:5173`.

## Building the Client (Production)

1.  Navigate to the client directory:
    ```bash
    cd client
    ```
2.  Run the build script:
    ```bash
    npm run build
    ```
    Static assets will be generated in `client/dist/`. This directory contains the files needed for static deployment.

## Data Generation (Development / Customization)

The game client relies on `client/public/data/graph.json` and `client/public/data/definitions.json`. These are pre-generated and included in the repository. If you wish to regenerate them (e.g., using different embeddings, word lists, or parameters):

**Prerequisites:**

*   Python 3.x
*   Required Python libraries: `pip install requests numpy scikit-learn nltk`
*   NLTK data: Run `python -m nltk.downloader wordnet omw-1.4`
*   A running Ollama instance (if using `generate_embeddings_ollama.py`) accessible at `http://localhost:11434` with the desired model pulled (e.g., `ollama pull nomic-embed-text:137m-v1.5-fp16`).

**Steps:**

1.  **(Embeddings)** Generate the word embeddings dictionary and save it to `raw_data/embeddings.pkl`. Use the provided script or your own method:
    ```bash
    # Example using the Ollama script
    python scripts/generate_embeddings_ollama.py 
    ```
2.  **(t-SNE)** Generate 2D coordinates from the embeddings. This reads `raw_data/embeddings.pkl` and outputs `data/tsne_coordinates.json`.
    ```bash
    python scripts/generate_tsne.py
    ```
3.  **(Graph)** Build the final graph structure. This reads `raw_data/embeddings.pkl` and `data/tsne_coordinates.json`, filters words, calculates similarities, finds neighbors (use `-k` to specify), and saves `client/public/data/graph.json`.
    ```bash
    # Example using K=7
    python scripts/build_graph.py -k 7 
    ```
4.  **(Definitions)** Fetch WordNet definitions for the words present in the final graph. This reads `client/public/data/graph.json` and saves `client/public/data/definitions.json`.
    ```bash
    python scripts/generate_definitions.py
    ```
5.  **(Cleanup - Optional)** The intermediate `data/tsne_coordinates.json` file is no longer needed after step 3.

## Submodule Usage

This repository can be added to another project as a Git submodule. For example:

```bash
git submodule add <repository_url> path/to/synapse
```

Ensure your deployment process correctly serves the static files located in `path/to/synapse/client/dist/`. 