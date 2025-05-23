# Synapse: Semantic Pathways - Client Application

This directory contains the frontend React application for the Synapse word navigation game.

## Tech Stack

*   **Framework:** React
*   **Build Tool:** Vite
*   **State Management:** React Context API (`GameContext`, `GraphDataContext`)
*   **Visualization:** D3.js
*   **Styling:** CSS (`App.css`, `index.css`)

## Getting Started

1.  **Install Dependencies:**
    Make sure you are in the `client` directory.
    ```bash
    npm install
    ```

2.  **Run Development Server:**
    This command starts the Vite development server with Hot Module Replacement (HMR).
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5173`.

## Project Structure (`client/src/`)

*   **`components/`:** Reusable React components (e.g., `GraphVisualization`, `InfoBox`, `GameReportDisplay`, `NeighborSelection`).
*   **`context/`:** React Context providers for managing global state:
    *   `GraphDataContext.jsx`: Handles loading graph and definition data.
    *   `GameContext.jsx`: Manages core game state, logic, and actions.
*   **`utils/`:** Utility functions:
    *   `graphUtils.js`: Pathfinding algorithms (`findShortestPath`, `findValidWordPair`) and graph helpers.
    *   `gameReportUtils.js`: Logic for generating post-game statistics.
    *   `tinyqueue.js`: Min-priority queue helper (likely used by `findShortestPath`).
*   **`App.jsx`:** Main application component, sets up layout and context providers, renders the `Game` component.
*   **`App.css`:** Main application styles. *(Note: This file is large and could be broken down further).*
*   **`main.jsx`:** Application entry point.

## Data Files

The game requires data files (`graph.json`, `definitions.json`) which are expected to be in the `client/public/data/` directory. 

**These files are generated by the Python scripts located in the root `scripts/` directory.** Please refer to the main project `README.md` (in the repository root) for detailed instructions on data generation.

## Building for Production

To create an optimized production build:
```bash
npm run build
```
The output will be generated in the `client/dist/` directory.
