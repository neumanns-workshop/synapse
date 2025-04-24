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
- **Graph Visualization**: Basic SVG plot showing t-SNE positions of relevant nodes. Connects nodes in player path. On give-up, shows optimal path and allows toggling path visibility.
- **Path Tracking**: Inline display (word -> word) of the player's journey.
- **Score Tracking**: Displays current moves vs. optimal moves, e.g., "Moves: X (Optimal: Y)".

## 3. Technical Architecture

### 3.1 Frontend Stack
- **Framework**: React (using Vite for build tooling)
- **Visualization**: SVG (currently). Could switch to Canvas/library later for performance/features.
- **Styling**: CSS (minimal inline styles currently).
- **State Management**: React Context API (GraphDataContext, GameContext).

### 3.2 Data Storage
- **Graph Structure**: Adjacency list representation of the word graph (`graph.json`) - Includes integrated t-SNE coordinates.
- **Edge Weights**: Pre-computed similarity scores between connected words (Stored in `graph.json`).
- **Optimal Paths**: Pre-calculated shortest paths for common word pairs
- **t-SNE Coordinates**: Pre-calculated 2D positions for visualization

### 3.3 Optimization Techniques
- **Data Compression**: Quantized word vectors to reduce file size (Future possibility)
- **Lazy Loading**: Load only necessary data for current game (Handled by initial fetch)
- **Caching**: Store frequently accessed data in memory (React state/context provides caching)

## 4. Implementation Phases

### Phase 1: Data Preparation
1. ~~Process word embeddings for the 4,000-word vocabulary~~ (Done - loaded from `raw_data`)
2. ~~Construct the word graph by finding top-k similar words for each word~~ (Done - `scripts/build_graph.py`, K=7)
3. ~~Store graph as an adjacency list with weighted edges~~ (Done - `data/graph.json`)
4. ~~Generate t-SNE coordinates for visualization~~ (Done - `scripts/generate_tsne.py`)
5. ~~Pre-compute optimal paths between common word pairs~~ (*Decision: Calculate on demand*)
6. ~~Create optimized data structures for client-side use~~ (Done - `data/graph.json` combines graph and t-SNE)

### Phase 2: Core Game Logic
1. Implement graph traversal algorithms (Dijkstra's ~~and/or A*~~) - (Implemented in `graphUtils.js`)
2. Develop functions to access the pre-computed word graph - (Implemented via `GraphDataContext`)
3. Create path validation and scoring system based on graph distances - (Implemented - Validation in `startGame`, scoring display in UI)
4. Build difficulty estimation using graph metrics (path length, connectivity) - (Implemented via Path Length Constraints in `startGame`)
5. Implement game state management and progression - (Implemented via `GameContext`)

### Phase 3: User Interface
1. Design main game screen with word selection interface - (Implemented - `Game` component in `App.jsx`)
2. Implement interactive graph visualization component - (In Progress - Basic SVG plot implemented)
3. Create visual elements for showing current position, path history, and target - (Implemented)
4. Develop radar-like t-SNE plot with zoom/pan capabilities - (Future enhancement for visualization)
5. Create responsive layout for desktop and mobile - (Future)
6. Add animations for transitions between nodes in the graph - (Future)

### Phase 4: Game Features
1. Implement scoring system - (Future - beyond basic move count)
2. Add difficulty levels - (Future)
3. Create daily challenges with specific word pairs - (Future)
4. Develop hint system for stuck players - (Future)

### Phase 5: Testing & Optimization
1. Performance testing, especially for mobile devices - (Future)
2. User testing for difficulty balance and enjoyment - (Future)
3. Optimize data loading and rendering - (Future)
4. Browser compatibility testing - (Future)

## 5. Technical Challenges & Solutions

### 5.1 Graph Construction
**Challenge**: Building an effective semantic graph from word embeddings
**Solution**: 
- Pre-compute similarity matrices and extract top-k connections for each word (K=7)
- Ensure graph connectivity through validation algorithms (*Note: Currently relies on random pair finding success with path length constraints*)
- Analyze graph properties to confirm navigability
- Store graph in optimized format for client-side use (`graph.json`)

### 5.2 Visualization Performance
**Challenge**: Rendering and updating the graph visualization could be computationally intensive
**Solution**:
- Implement progressive rendering that only shows relevant subgraphs (Partially done by filtering nodes)
- Use canvas for performance-critical rendering (Future possibility)
- Employ level-of-detail techniques that simplify the graph at zoomed-out views
- Pre-calculate layout positions to minimize runtime computation (t-SNE done)

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
- Run connectivity analysis during graph construction (Not done, currently handled by retrying in `startGame` with path length constraints)
- Add additional edges if needed to ensure full connectivity (Not done)
- Calculate graph statistics like diameter and average path length (Not done)
- Identify and address any isolated clusters of words (Not done)

## 6. Data Structures

### 6.1 Word Graph Format (`graph.json`)
```javascript
{
  "nodes": {
    "word1": {
      // embedding: [v1, v2, ...], // Not stored in client-side JSON
      "tsne": [x1, y1], // Integrated t-SNE coordinates
      "edges": {        // Top K neighbors (K=7 currently)
        "similar1": 0.95,
        "similar2": 0.92,
        // ... up to K neighbors
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
  status: GameStatus, // e.g., 'idle', 'playing', 'won', 'gave_up'
  startWord: string | null,
  endWord: string | null,
  currentWord: string | null,
  playerPath: string[], // Array of words visited
  optimalPath: string[], // Added: Optimal path node list
  optimalDistance: number | null, // Calculated Dijkstra cost (1-similarity)
  optimalPathLength: number | null, // Optimal number of moves (nodes - 1)
  error: string | null, // Game-specific errors
  // Plus functions like startGame(), selectWord(), giveUp()
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
- **Phase 2**: Core game logic implementation (Implemented)
- **Phase 3**: User interface development (In Progress - Basic UI/Viz implemented)
- **Phase 4**: Game features and enhancements (Future)
- **Phase 5**: Testing, optimization, and initial release (Future)

## 9. Key Milestones

1. **Data Preparation Complete**: Word embeddings processed and optimized graph JSON created.
2. **Core Gameplay Functional**: Basic word navigation, pathfinding, state management, and difficulty constraints implemented.
3. **Visualization Implemented**: Basic SVG visualization showing paths and nodes implemented.
4. **Alpha Version**: Internal testing version with basic features.
5. **Beta Version**: Limited release with core functionality.
6. **Initial Release**: Public release with complete basic features.

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