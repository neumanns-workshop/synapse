# Synapse: Semantic Pathways - Implementation Plan

## 1. Project Overview

"Synapse: Semantic Pathways" is a word navigation game where players use semantic relationships between words to find a path from a source word to a target word through a graph-based network. Players navigate by choosing from the top-k most similar words at each step, trying to advance toward the target word in as few moves as possible. The game visualizes the journey through a semantic space, creating an experience analogous to neural pathways forming connections in the brain.

## 2. Core Components

### 2.1 Data Preparation
- **Word Embeddings**: Process and compress pre-trained word embeddings for the 4,000-word vocabulary
- **Graph Construction**: Generate a directed graph by calculating top-k similar words for each word
- **Similarity Calculations**: Pre-compute similarity scores as edge weights in the graph
- **t-SNE Visualization**: Generate 2D coordinates for visualizing the semantic space

### 2.2 Game Logic
- **Path Finding**: Implementation of Dijkstra's algorithm to determine optimal paths.
- **Graph Traversal**: Logic for navigating the pre-computed word graph.
- **Scoring System**: Comparison of player moves against optimal path length.
- **Difficulty Scaling**: Word pairs selected based on optimal path length constraints (e.g., 2-15 moves).

### 2.3 User Interface
- **Game Screen**: Display start/target/current word. Neighbor options ordered by similarity with rank-based gradient hint.
- **Graph Visualization**: Basic SVG plot showing t-SNE positions of relevant nodes. Connects nodes in player path. On give-up, shows optimal/suggested paths and allows toggling path visibility combinations (Player/Optimal, Player/Suggested, Optimal/Suggested).
- **Path Tracking**: Inline display (word -> word) of the player's journey.
- **Status Display**: Shows Target, Moves, Best score possible from current location (`Possible in: Z`), and Accuracy (with tooltips).
- **Post-Game Report**: Detailed analysis displayed on Win/Give Up, including accuracy, semantic distance, greedy moves, and repositioning moves. Styled to match application theme.
- **Definition Tooltips:** Display WordNet definitions on hover for neighbor words, words in the path display, and the target word to reveal polysemy.

## 3. Technical Architecture

### 3.1 Frontend Stack
- **Framework**: React (using Vite for build tooling)
- **Visualization**: D3.js (Switched from basic SVG)
- **Styling**: CSS (`App.css`, refactored from inline styles)
- **State Management**: React Context API (GraphDataContext, GameContext)

### 3.2 Data Storage
- **Graph Structure**: Adjacency list representation of the word graph (`graph.json`) - Includes integrated t-SNE coordinates.
- **Edge Weights**: Pre-computed similarity scores between connected words (Stored in `graph.json`).
- **Optimal Paths**: Pre-calculated shortest paths for common word pairs
- **t-SNE Coordinates**: Pre-calculated 2D positions for visualization
- **Word Definitions:** Pre-computed WordNet definitions for all vocabulary words (`definitions.json`).

### 3.3 Optimization Techniques
- **Data Compression**: Quantized word vectors to reduce file size (Future possibility)
- **Lazy Loading**: Load only necessary data for current game (Handled by initial fetch)
- **Caching**: Store frequently accessed data in memory (React state/context provides caching)

## 4. Implementation Phases

### Phase 1: Data Preparation
1. ~~Process word embeddings for the 4,000-word vocabulary~~ (Done - loaded from `raw_data`)
2. ~~Construct the word graph by finding top-k similar words for each word~~ (Done - `scripts/build_graph.py`, K=6 settled)
3. ~~Store graph as an adjacency list with weighted edges~~ (Done - `data/graph.json`)
4. ~~Generate t-SNE coordinates for visualization~~ (Done - `scripts/generate_tsne.py`)
5. ~~Pre-compute optimal paths between common word pairs~~ (*Decision: Calculate on demand*)
6. ~~Create optimized data structures for client-side use~~ (Done - `client/public/data/graph.json` combines graph and t-SNE)
7. ~~Filter problematic words~~ (Done - Filter added to `scripts/build_graph.py` for offensive words *and words lacking definitions*)
8. ~~Add visual distance check to pair finding~~ (Done - Added to `startGame`)

### Phase 2: Core Game Logic
1. ~~Implement graph traversal algorithms (Dijkstra's)~~ - (Implemented in `graphUtils.js`)
2. ~~Develop functions to access the pre-computed word graph~~ - (Implemented via `GraphDataContext`)
3. ~~Create path validation and scoring system based on graph distances~~ - (Implemented - Validation in `startGame`, scoring display in UI)
4. ~~Build difficulty estimation using graph metrics (path length, connectivity)~~ - (Implemented via Path Length + Visual Distance Constraints in `startGame`)
5. ~~Implement game state management and progression~~ - (Implemented via `GameContext`)
6. ~~Add Suggested Path calculation on Give Up~~ - (Implemented in `GameContext`)

### Phase 3: User Interface
1. ~~Design main game screen with word selection interface~~ - (Implemented & Refined - `Game` component in `App.jsx`)
2. ~~Implement interactive graph visualization component~~ - (Implemented using D3.js - `GraphVisualization.jsx`, includes path toggling for various combinations, node clicking)
3. ~~Create visual elements for showing current position, path history, and target~~ - (Implemented & Refined - Status info block, colored path text)
4. ~~Develop radar-like t-SNE plot with zoom/pan capabilities~~ - (Basic pan/zoom via D3 viewBox, no radar yet - Future enhancement)
5. ~~Create responsive layout for desktop and mobile~~ - (Substantially addressed via CSS @media queries in `App.css`, adjustments for buttons, graph, report. Further fine-tuning possible.)
6. ~~Add animations for transitions between nodes in the graph~~ - (Basic D3 transitions implemented - Future enhancement possible)
7. ~~Refactor inline styles to CSS~~ - (Done - Styles moved to `App.css`)
8. ~~Improve overall visual aesthetic (theme, spacing, controls)~~ - (Done - Dark theme refined, K selector removed, layout simplified, Post-Game Report styled, Info Box refined, Button Contrast improved, Layout Consistency improved, Status Line refined)
9. ~~Implement K selector for graph complexity~~ - (*Decision: Removed*, settled on K=6)
10. ~~Add "How to Play" info box~~ - (Implemented & Refined - Thematically integrated, concise)
11. ~~Implement detailed Post-Game Report component~~ - (Implemented - `GameReportDisplay` in `App.jsx`)
12. ~~Implement enhanced path visibility toggles for Give Up state~~ - (Implemented in `App.jsx` and `GraphVisualization.jsx`)
13. ~~Implement Definition Tooltips on Hover (Neighbor words, Path words, Target word)~~ - (Done)

### 3.3 UI Enhancements (Recent Progress)
1. ✅ Implemented multiselect buttons for path visualization in Give Up screen
   - Replaced pairwise buttons with three toggle buttons (Player, Optimal, Suggested)
   - Added visual indicators for active paths with proper coloring
   - Improved button styling and tooltips

2. ✅ Enhanced path visualization and streamlined UI
   - Added dynamic ellipsis with dots representing remaining moves
   - Integrated color logic (orange for optimal path, purple for alternative path)
   - Moved target word display to the path itself with expansion notation
   - Reduced unnecessary text metrics in favor of visual storytelling
   - Added comprehensive tooltips for game information

3. ✅ Added optimal move indicators with visual feedback
   - Implemented star indicators (★) for words that were optimal choices
   - Color-coded stars: orange for global optimal path moves, purple for locally optimal moves
   - Created consistent visual system in both gameplay and post-game report
   - Removed numerical accuracy display during gameplay for cleaner UI
   - Enhanced learning feedback loop by highlighting good decisions in real-time

4. 🔄 Future Considerations
   - Further refinement of dots visualization (possibly keeping them orange)
   - Potentially making dots disappear or animate as moves are made

### Phase 4: Game Features
1. Implement scoring system - (Future - beyond basic move count)
2. Add difficulty levels - (Future - K selector removed, could revisit)
3. Create daily challenges with specific word pairs - (Future)
4. Develop hint system for stuck players - (Future)
5. Add move accuracy metric - (Future - requires perf testing)

### Phase 5: Testing & Optimization
1. Performance testing, especially for mobile devices - (Future)
2. User testing for difficulty balance and enjoyment - (Future)
3. Optimize data loading and rendering - (Future)
4. Browser compatibility testing - (Future)

## 5. Technical Challenges & Solutions

### 5.1 Graph Construction
**Challenge**: Building an effective semantic graph from word embeddings
**Solution**: 
- Pre-compute similarity matrices and extract top-k connections for each word (K=6)
- Ensure graph connectivity through validation algorithms (*Note: Currently relies on random pair finding success with path length/visual distance constraints*)
- Analyze graph properties to confirm navigability
- Store graph in optimized format for client-side use (`graph.json`)

### 5.2 Visualization Performance
**Challenge**: Rendering and updating the graph visualization efficiently, including on mobile.
**Solution**:
- Implemented using D3.js with enter/update/exit pattern.
- ViewBox calculation adjusts zoom/pan based on relevant nodes, with responsive padding.
- Basic transitions added.
- Pre-calculate layout positions using t-SNE.
- Combined path rendering logic corrected (`getNodeClass`, `getLinkClass`).
- Canvas rendering still a future possibility if needed.

### 5.3 Pathfinding Optimization
**Challenge**: Computing optimal paths efficiently at runtime
**Solution**:
- Implement optimized Dijkstra's or A* algorithms for graph traversal (Dijkstra's implemented)
- ~~Pre-compute common paths during data preparation~~ (*Decision: On-demand calculation*)
- Use heuristics based on t-SNE coordinates to guide A* search (Future possibility if Dijkstra too slow)
- Cache path calculation results for repeated queries (Not currently needed)

### 5.4 Graph Connectivity
**Challenge**: Ensuring the graph is navigable and all word pairs are connected
**Solution**:
- Run connectivity analysis during graph construction (Not done, currently handled by retrying in `startGame` with path length/visual distance constraints)
- Add additional edges if needed to ensure full connectivity (Not done)
- Calculate graph statistics like diameter and average path length (Not done)
- Identify and address any isolated clusters of words (Not done)

## 6. Data Structures

### 6.1 Word Graph Format (`client/public/data/graph.json`)
```javascript
{
  "nodes": {
    "word1": {
      "tsne": [x1, y1], 
      "edges": {        // Top K neighbors (K=6 currently)
        "similar1": 0.95,
        "similar2": 0.92,
        // ... up to K=6 neighbors
      }
    },
    "word2": {
      "tsne": [...],
      "edges": {...}
    },
    // ... all words
  }
}
```

### 6.2 Pre-computed Paths Format
(*Note: This structure is not currently used as paths are calculated on-demand.*)
```javascript
// {
//   "paths": {
//     "source1-target1": {
//       "path": ["source1", "word2", "word3", "target1"],
//       "distance": 3,
//       "difficulty": "medium"
//     },
//     ...
//   }
// }
```

### 6.3 Game State (Managed in `GameContext`)
```javascript
// Represents the state managed by the useGame() hook
{
  status: GameStatus, 
  startWord: string | null,
  endWord: string | null,
  currentWord: string | null,
  playerPath: string[],
  optimalPath: string[], 
  optimalDistance: number | null, // Semantic distance of the initial optimal path
  optimalPathLength: number | null, // Length (# moves) of the initial optimal path (Used for "Best")
  optimalRemainingLength: number | null, // Length (# moves) of optimal path from current node (Used for "Possible in")
  suggestedPathFromCurrent: string[], // Added
  suggestedPathFromCurrentLength: number | null, // Added
  error: string | null, // Game-specific errors
  // Accuracy state
  optimalMovesMade: number, // Count of moves matching locally optimal path
  moveAccuracy: number | null, // Percentage accuracy
  // Semantic distance state
  playerSemanticDistance: number, // Cumulative semantic distance player has traveled
  // Graph loading/error status also provided
  isLoading: boolean, // Graph loading status
  graphError: string | null, // Graph loading error
  gameReport: object | null, // Detailed analysis object (accuracy, greedy, repositioning moves, etc.)
  // Plus functions like startGame(), selectWord(), giveUp()
}
```

### 6.4 Word Definitions Format (`client/public/data/definitions.json`)
```javascript
{
  "word1": [
    "definition 1 for word1",
    "definition 2 for word1",
    // ... all definitions
  ],
  "word2": [
    "definition 1 for word2"
  ],
  // ... all words in vocabulary
  "word_without_definitions_in_wordnet": [] // Note: These words are filtered out during graph build
}
```

## 7. Deployment Plan

### 7.1 Development Environment
- Local development with live server (Vite dev server)
- Version control via Git
- Automated testing for core functions (Future)

### 7.2 Production Deployment
- Static site hosting (GitHub Pages, Netlify, or Vercel)
- CDN for optimized asset delivery
- Minified and bundled JavaScript for production (Handled by `npm run build` via Vite)

### 7.3 Future Scaling
- Consider serverless functions for advanced features
- Database for user progress and leaderboards if needed
- Additional language support with separate embedding sets

## 8. Development Sequence

- **Phase 1**: Data preparation and initial architecture (Complete)
- **Phase 2**: Core game logic implementation (Complete, incl. Suggested Path)
- **Phase 3**: User interface development (Complete - Core elements implemented, minor refinements possible later)
- **Phase 4**: Game features and enhancements (Future)
- **Phase 5**: Testing, optimization, and initial release (Future)

## 9. Key Milestones

1. ~~Data Preparation Complete~~: Word embeddings processed, filtered, and optimized K=6 graph JSON created.
2. ~~Core Gameplay Functional~~: Basic word navigation, pathfinding, state management, difficulty/visual distance constraints, suggested path implemented, game report calculation added.
3. ~~Visualization Implemented~~: D3.js visualization showing paths, nodes, basic transitions, interactivity, multiple path combination toggles, and responsive adjustments implemented.
4. ~~UI Refined~~: Basic styling, layout improved (including responsiveness), controls polished, game report styled and integrated.
5. **Alpha Version**: Getting closer. Needs focus on pair quality & robust testing.
6. **Beta Version**: Limited release with core functionality.
7. **Initial Release**: Public release with complete basic features.

## 10. Possible Extensions

- **Multiplayer Mode**: Race against others to find optimal neural pathways through the word graph
- **Custom Word Lists**: Allow users to play with domain-specific vocabularies and graphs
- **Neural Analysis**: Visual and statistical analysis of player's chosen paths compared to others
- **Additional Languages**: Support for non-English word graphs and cross-lingual connections
- **Advanced Visualizations**: 3D neural network-style visualization with force-directed layouts
- **Graph Theory Features**: Incorporate centrality measures and other neural network metrics
- **Synaptic Hubs**: Highlight key connector words that bridge different semantic domains
- **Challenge Modes**: Find paths with specific constraints (must use/avoid certain nodes)
- **Semantic Clusters**: Visualize clusters of semantically related words like regions of the brain
- **Educational Mode**: Explainers about how word embeddings and semantic relationships work
- **Synaptic Strength**: Mechanics where frequently used paths become stronger/easier to traverse