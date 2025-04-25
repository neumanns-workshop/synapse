# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-04-25

### Added

-   Initial public release (V1) of the Synapse word navigation game.
-   Core gameplay mechanics: pathfinding, neighbor selection, game state management.
-   Interactive D3.js graph visualization of the semantic space (t-SNE) and player/optimal paths.
-   Post-game report analyzing player performance (accuracy, distance, move types).
-   WordNet definition tooltips on hover.
-   "About" modal explaining game rules and acknowledging data sources.
-   Python script (`scripts/generate_embeddings_ollama.py`) to generate word embeddings using a local Ollama instance.
-   Python script (`scripts/generate_tsne.py`) to generate t-SNE coordinates from embeddings.
-   Python script (`scripts/build_graph.py`) to construct the final graph data for the client, combining embeddings (via cosine similarity), t-SNE coordinates, and neighbor finding (k=7).
-   Python script (`scripts/generate_definitions.py`) to fetch WordNet definitions.
-   Basic project `README.md` and `.gitignore`.

### Changed

-   Updated word embeddings to use `nomic-embed-text:137m-v1.5-fp16` via Ollama.
-   Increased neighbor count (`k`) from 6 to 7 in the graph generation.
-   Refined UI layout:
    -   Moved "About" button trigger next to "New Game" (idle state) or "Give Up" (playing state).
    -   Converted "About" section into a modal dialog.
    -   Changed neighbor selection layout from fixed columns to a wrapped flex layout.
-   Improved consistency of optimal move indicators:
    -   Uses colored text (orange=global, purple=local) directly on the word in both the game path display and the post-game report.
    -   Added tooltips to game path words explaining the color meaning.
    -   Added colored star (★) marker only to successfully made optimal moves in the report list.
-   Cleaned up game report display by removing section headers ("Optimal Moves Made", "Missed Optimal Moves").
-   Removed debug `console.log` statements from client code.

### Fixed

-   Corrected tooltip text in "About" modal to accurately describe optimal move indicators (colored text vs. stars).
-   Resolved React error caused by incorrect inline style syntax in `InfoBox.jsx`.
-   Ensured consistent styling for optimal/missed optimal moves in the game report. 