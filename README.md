# Synapse: Semantic Pathways (React Native)

A mobile and web implementation of the Synapse word navigation game, where players find paths between words using semantic similarity. Navigate a graph of interconnected words, aiming to reach the target word from the start word in the fewest steps.

## How to Play

The goal of Synapse is to find a path between a randomly selected **Start Word** and **End Word** by navigating through a graph of interconnected words. 

- Each word is a node in the graph.
- You can only move from your current word to directly connected (semantically similar) words shown in the graph.
- Select adjacent words one by one to form a path. Your path history will be visually highlighted.
- If you make a mistake or want to explore a different route, simply **click/tap on a word in your path history** to backtrack to that point.
- Try to reach the **End Word** in the **fewest steps** possible!
- You can explore word definitions to help guide your choices.
- When you're stuck, you can choose to "Give Up" and see the optimal path.
- After completing a game (winning or giving up), you can view different path visualizations including your path and the optimal path.

## Project Structure

This project is built with React Native using Expo, following modern development practices:

- **TypeScript**: For type safety and improved developer experience
- **React Navigation**: For screen navigation
- **React Native SVG**: For graph visualization (replaces Skia from previous versions)
- **React Native Paper**: For Material Design UI components, providing a consistent look and feel.
- **Zustand**: For lightweight global state management
- **AsyncStorage**: For local data persistence (scores, settings)
- **Native Sharing & ViewShot**: For sharing game results as text or screenshots

## Features

- Navigate through a semantic word graph to find connections
- **Accordion-style Path Display:** Visualize your journey with color-coded words and progress indication
- **Word Definitions:** Tap on any word to see its definition
- **Path Visualization:** See the optimal path after completing a game
- **Responsive Design:** Works on iOS, Android, and **Web browsers**
- **Custom Theming:** Consistent color scheme for different node types (start, current, end, path, optimal, suggested)
- Works with minimal dependencies and no server requirements

## Recent UI Improvements

- **Visual Path Journey:** The path display now shows your word journey as a sequence (word1 → word2 → word3), with the number of dots after your current word indicating the length of the suggested remaining path
- **Color-Coded Path Words:** Words are colored based on their role (start=green, current=blue, end=red, optimal=orange, suggested=purple)
- **Improved Button Labels:** "Restart" changed to "New Game" for clarity, "Hint" replaced with "Give Up" to match the original game philosophy
- **Better Context Awareness:** Path display options only appear when appropriate (after completing a game)

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli` or `npx expo`)
- iOS Simulator (for Mac) / Android Emulator or Device (for native development)
- A Web Browser (for web development)

### Installation

1.  Clone the repository
2.  Install dependencies:
    ```bash
    npm install
    ```
    *(Note: The previous `--legacy-peer-deps` flag might no longer be needed but can be added if peer dependency issues arise.)*

### Running the Development Server

Start the Expo development server:
```bash
npm start 
# or: npx expo start
```
Follow the instructions in the terminal to run the app:
- Press `i` to run on iOS Simulator
- Press `a` to run on Android Emulator/Device
- Press `w` to run in a Web Browser

### Building for Web (Production)

To create a static build for web deployment:
```bash
npm run build:web
# or: npx expo export -p web
```
This command generates a `web-build` directory (or similar, check `app.json` configuration) containing the static assets (HTML, CSS, JS).

### Deploying the Web Build

Deploy the contents of the `web-build` directory to any static web hosting provider. Popular choices include:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

These platforms often integrate directly with your Git repository for automatic deployments.

### Troubleshooting 

If you encounter issues:

1.  Ensure dependencies are installed correctly (`npm install`).
2.  Run `npx expo doctor --fix-dependencies` to check for common Expo/dependency issues.
3.  Check for TypeScript errors: `npx tsc --noEmit`
4.  If you see Babel errors related to `@babel/runtime/helpers`:
    ```
    Unable to resolve "@babel/runtime/helpers/interopRequireDefault" from "index.js"
    ```
    Run the following commands:
    ```bash
    npm cache clean --force
    npm install --save @babel/runtime
    ```
    If that doesn't work, try updating the babel.config.js file to add `absoluteRuntime: false` to the plugin-transform-runtime options.

5.  React DOM warnings about createRoot in development mode are expected and can be safely ignored.

## Storage Implementation

The game uses `@react-native-async-storage/async-storage` for persisting data like high scores and user settings locally on the device or in the browser's local storage (via Expo's web adaptation).

## Sharing Implementation

Game results can be shared using React Native's `Share` API for text-based results and `react-native-view-shot` to capture and share screenshots of the game state.

## Development Status

- [x] Configure project structure and dependencies ✅
- [x] Add UI Library (`react-native-paper`) ✅
- [x] Create basic screen navigation ✅
- [x] Integrate `react-native-paper` components into UI elements ✅
- [x] Create data loading service to fetch game data from assets/imports ✅
- [x] Set up state management (Zustand) for core data ✅
- [x] Implement graph visualization component using `react-native-svg` ✅
- [x] Implement word selection and path finding logic ✅
- [x] Add Settings screen with theme configuration ✅
- [x] Create word definition dialog for looking up meanings ✅
- [x] Implement accordion-style path display with color coding ✅
- [x] Add game completion detection (win condition) ✅
- [x] Implement optimal path visualization after game completion ✅
- [ ] Add animations and transitions for a better UX (using `react-native-reanimated`) 🔄
- [ ] Implement panning and zooming for graph visualization 🔄
- [ ] Design and implement tutorial screens ⏳
- [ ] Add persistence for game state and settings ⏳
- [ ] Test sharing functionality on different platforms (iOS, Android, Web) ⏳
- [ ] Add unit tests for storage and game logic ⏳
- [ ] Optimize performance for different device sizes and web ⏳

Legend: ✅ Complete, 🔄 In Progress, ⏳ Planned

## Data Files

The game requires the following data files, located in `src/data/`:

- `graph.json`: Contains the word graph structure (nodes, edges, coordinates).
- `definitions.json`: Contains word definitions.

**Data Generation Summary (Phase 0 - Complete):** The data was generated using Python scripts (`scripts/build_graph.py`) with the following parameters and filters applied:
- **Neighbors (K):** 5
- **Definition Filtering:** Words without definitions in WordNet were excluded.
- **Definition Length:** Only definitions <= 90 characters were kept.
- **Max Definitions:** Max 3 definitions stored per word.
- **Final Count:** The resulting dataset includes ~4970 words.

## Folder Structure

```