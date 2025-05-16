import { create } from 'zustand';
import { loadGraphData, loadDefinitionsData, GraphData, DefinitionsData, WordFrequencies, loadWordFrequencies } from '../services/dataLoader';
import { generateGameReport, trackOptimalChoice, GameReport, OptimalChoice, BacktrackReportEntry } from '../utils/gameReportUtils';
import { findShortestPath } from '../utils/graphUtils';
import type { Achievement } from '../features/achievements/achievements'; // Import Achievement
import { evaluateAchievements } from '../features/achievements/achievements'; // Import evaluateAchievements
import { recordEndedGame, saveCurrentGame, loadCurrentGame, clearCurrentGame } from '../services/StorageService'; // Add new storage functions
import type { WordCollection } from '../features/wordCollections/wordCollections';
import { getFilteredWordCollections, testCollectionsForDate } from '../features/wordCollections/wordCollections';
import { checkAndRecordWordForCollections } from '../services/StorageService';

// Define path display modes
interface PathDisplayMode {
  player: boolean;
  optimal: boolean; // Global optimal path
  suggested: boolean; // Optimal path from current node
}

// Define the state structure
interface BacktrackEvent {
  jumpedFrom: string;
  landedOn: string;
}

interface PotentialRarestMove {
  word: string;
  frequency: number;
  playerChoseThisRarestOption: boolean;
}

// Define the state structure -- EXPORTING THIS
export interface GameState { // Existing interface, adding export
  graphData: GraphData | null;
  definitionsData: DefinitionsData | null;
  wordFrequencies: WordFrequencies | null;
  isLoadingData: boolean;
  errorLoadingData: string | null;
  // Add game state properties
  startWord: string | null;
  endWord: string | null;
  currentWord: string | null;
  playerPath: string[];
  optimalPath: string[]; // Path from startWord to endWord
  suggestedPathFromCurrent: string[]; // Path from currentWord to endWord
  potentialRarestMovesThisGame: PotentialRarestMove[]; // Added for "Putting on the Dog"
  pathDisplayMode: PathDisplayMode;
  gameStatus: 'idle' | 'loading' | 'playing' | 'won' | 'lost' | 'given_up';
  gameReport: GameReport | null; // Add game report
  optimalChoices: OptimalChoice[]; // Track optimal choices
  backtrackHistory: BacktrackEvent[]; // Stores actual backtrack jumps
  aboutModalVisible: boolean;
  statsModalVisible: boolean; // Renamed from historyModalVisible
  // Definition Dialog State
  definitionDialogWord: string | null;
  definitionDialogPathIndex: number | null; // To pass path index to dialog for context
  definitionDialogVisible: boolean;

  // Achievement Detail Dialog State
  selectedAchievement: Achievement | null;
  achievementDialogVisible: boolean;

  // Word Collections
  wordCollections: WordCollection[];
  activeWordCollections: WordCollection[];

  // Actions
  loadInitialData: () => Promise<boolean>;
  clearSavedData: () => void;
  startGame: () => void; // Start game action without difficulty
  selectWord: (word: string) => void; // Placeholder for next step
  giveUp: () => void; // New action for giving up
  setPathDisplayMode: (mode: Partial<PathDisplayMode>) => void; // Action to change visibility
  setAboutModalVisible: (visible: boolean) => void;
  setStatsModalVisible: (visible: boolean) => void; // Renamed from setHistoryModalVisible
  backtrackToWord: (word: string, index: number) => void; // New action for backtracking to a previous optimal word
  // Definition Dialog Actions
  showWordDefinition: (word: string, pathIndex?: number | null) => void;
  hideWordDefinition: () => void;
  // Achievement Detail Dialog Actions
  showAchievementDetail: (achievement: Achievement) => void;
  hideAchievementDetail: () => void;
  // Add other game state actions later (selectWord, giveUp, etc.)

  // Testing function for date-based collections
  testWordCollectionsForDate: (month: number, day: number) => Promise<void>;
}

// Utility for memoizing pathfinding functions
const memoizePathFn = <T extends (graphData: GraphData | null, start: string, end: string) => string[]>(fn: T, cacheName?: string): T & { clearCache: () => void } => {
  const cache = new Map<string, string[]>();
  
  const memoizedFn = (graphData: GraphData | null, start: string, end: string): string[] => {
    if (!graphData) return fn(graphData, start, end); // Don't cache if no graphData
    const key = `${start}->${end}`;
    let startTime;
    if (cache.has(key)) {
      // startTime = performance.now(); // Optional: time cache retrieval too
      const result = cache.get(key)!;
      // const duration = (performance.now() - startTime).toFixed(2);
      // console.log(`[CACHE HIT] ${cacheName || fn.name}: ${key} (retrieval: ${duration}ms)`);
      return result;
    }
    startTime = performance.now();
    const result = fn(graphData, start, end);
    const duration = (performance.now() - startTime).toFixed(2);
    cache.set(key, result);
    console.log(`[CACHE MISS & COMPUTED] ${cacheName || (fn as any).name || 'pathFn'}: ${key} (computed in ${duration}ms, cache size: ${cache.size})`);
    return result;
  };

  (memoizedFn as any).clearCache = () => {
    console.log(`[CACHE CLEARED] For ${cacheName || (fn as any).name || 'pathFn'}`);
    cache.clear();
  };

  return memoizedFn as T & { clearCache: () => void };
};

// Original pathfinding functions (to be wrapped)
const _findShortestPathByHops = (graphData: GraphData | null, start: string, end: string): string[] => {
  if (!graphData || !graphData[start] || !graphData[end]) {
    console.error(`findShortestPathByHops: Invalid graph data or start/end words (start=${start}, end=${end})`);
    return [];
  }

  // Track distances from start node
  const distances: {[key: string]: number} = {};
  // Track previous nodes in optimal path
  const previousNodes: {[key: string]: string | null} = {};
  // Track nodes that have been visited
  const visited = new Set<string>();
  // Nodes to be visited (all nodes initially)
  const unvisited = new Set<string>();

  // Initialize all distances as infinity and previousNodes as null
  for (const word in graphData) {
    distances[word] = Infinity;
    previousNodes[word] = null;
    unvisited.add(word);
  }

  // Distance from start node to itself is 0
  distances[start] = 0;

  // Main Dijkstra algorithm loop
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentNode: string | null = null;
    let minDistance = Infinity;

    for (const word of unvisited) {
      if (distances[word] < minDistance) {
        minDistance = distances[word];
        currentNode = word;
      }
    }

    // If all remaining unvisited nodes are inaccessible, or if we reached end node
    if (currentNode === null || distances[currentNode] === Infinity || currentNode === end) {
      break;
    }

    // Remove current node from unvisited set and add to visited
    unvisited.delete(currentNode);
    visited.add(currentNode);

    // For each neighbor of current node
    const edges = graphData[currentNode]?.edges || {};
    for (const neighbor in edges) {
      // Skip if neighbor has been visited
      if (visited.has(neighbor)) continue;

      // To minimize HOP COUNT, the cost of traversing any edge is 1
      const cost = 1; 
      const tentativeDistance = distances[currentNode] + cost;

      // If this path is better than previous one
      if (tentativeDistance < distances[neighbor]) {
        distances[neighbor] = tentativeDistance;
        previousNodes[neighbor] = currentNode;
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current = end;

  // If end is unreachable
  if (distances[end] === Infinity) {
    console.warn(`No path found from ${start} to ${end}`);
    return [];
  }

  // Trace back from end to start
  while (current) {
    path.unshift(current);
    current = previousNodes[current] as string;
    if (current === start) {
      path.unshift(start);
      break;
    }
  }

  return path;
};

const _findShortestPathBySemanticDistance = (graphData: GraphData | null, start: string, end: string): string[] => {
  if (!graphData || !graphData[start] || !graphData[end]) {
    console.error(`findShortestPathBySemanticDistance: Invalid graph data or start/end words (start=${start}, end=${end})`);
    return [];
  }

  const distances: {[key: string]: number} = {};
  const previousNodes: {[key: string]: string | null} = {};
  const visited = new Set<string>();
  const unvisited = new Set<string>();

  for (const word in graphData) {
    distances[word] = Infinity;
    previousNodes[word] = null;
    unvisited.add(word);
  }
  distances[start] = 0;

  while (unvisited.size > 0) {
    let currentNode: string | null = null;
    let minDistance = Infinity;
    for (const word of unvisited) {
      if (distances[word] < minDistance) {
        minDistance = distances[word];
        currentNode = word;
      }
    }
    if (currentNode === null || distances[currentNode] === Infinity || currentNode === end) {
      break;
    }
    unvisited.delete(currentNode);
    visited.add(currentNode);

    const edges = graphData[currentNode]?.edges || {};
    for (const neighbor in edges) {
      if (visited.has(neighbor)) continue;
      // To minimize SEMANTIC DISTANCE, the cost is (1 - similarity)
      const similarity = edges[neighbor];
      const cost = 1 - similarity; 
      const tentativeDistance = distances[currentNode] + cost;
      if (tentativeDistance < distances[neighbor]) {
        distances[neighbor] = tentativeDistance;
        previousNodes[neighbor] = currentNode;
      }
    }
  }

  const path: string[] = [];
  let current = end;
  if (distances[end] === Infinity) {
    // console.warn(`No path found by semantic distance from ${start} to ${end}`); // Optional: less noisy log
    return [];
  }
  while (current) {
    path.unshift(current);
    current = previousNodes[current] as string;
    if (current === start) {
      path.unshift(start);
      break;
    }
  }
  return path;
};

// Create memoized versions
const findShortestPathByHops = memoizePathFn(_findShortestPathByHops, 'hopsCache');
const findShortestPathBySemanticDistance = memoizePathFn(_findShortestPathBySemanticDistance, 'semanticCache');

// Improved function to find a valid word pair with a proper path between them
const findValidWordPair = (graphData: GraphData | null): { start: string | null, end: string | null } => {
  if (!graphData) {
    console.error("findValidWordPair: graphData is null.");
    return { start: null, end: null };
  }
  
  const words = Object.keys(graphData);
  console.log(`findValidWordPair: Found ${words.length} words in graphData.`);

  if (words.length < 2) {
    console.error(`findValidWordPair: Not enough words in graphData (${words.length}).`);
    return { start: null, end: null };
  }

  // Define constraints
  const MIN_PATH_LENGTH = 4; // Minimum number of steps (Changed from 3)
  const MAX_PATH_LENGTH = 7; // Maximum number of steps (Changed from 6)
  const MAX_ATTEMPTS = 100; // Increased attempts slightly due to new constraint
  const MIN_NODE_DEGREE = 3; // Minimum connections for a word to be start/end
  const MIN_TSNE_DISTANCE_SQUARED = 50 * 50; // Adjusted: Words must be at least 50 t-SNE units apart (was 60 * 60)

  // Try to find a valid word pair
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Select two random words
    const startIndex = Math.floor(Math.random() * words.length);
    let endIndex = Math.floor(Math.random() * words.length);
    
    // Make sure start and end are different
    while (endIndex === startIndex) {
      endIndex = Math.floor(Math.random() * words.length);
    }
    
    const start = words[startIndex];
    const end = words[endIndex];
    
    // Check t-SNE distance
    const startNodeData = graphData[start];
    const endNodeData = graphData[end];

    if (startNodeData?.tsne && endNodeData?.tsne) {
      const dx = startNodeData.tsne[0] - endNodeData.tsne[0];
      const dy = startNodeData.tsne[1] - endNodeData.tsne[1];
      const distSquared = dx * dx + dy * dy;
      if (distSquared < MIN_TSNE_DISTANCE_SQUARED) {
        console.log(`Skipping pair ${start}->${end}: t-SNE distance too small (${Math.sqrt(distSquared).toFixed(2)} < ${Math.sqrt(MIN_TSNE_DISTANCE_SQUARED).toFixed(2)})`);
        continue;
      }
    }
    
    // Check if the words have enough connections
    const startDegree = Object.keys(startNodeData?.edges || {}).length;
    const endDegree = Object.keys(endNodeData?.edges || {}).length;
    
    if (startDegree < MIN_NODE_DEGREE || endDegree < MIN_NODE_DEGREE) {
      console.log(`Skipping pair ${start}->${end}: Not enough connections (start: ${startDegree}, end: ${endDegree})`);
      continue; // Skip this pair if either word doesn't have enough connections
    }
    
    // Find the shortest path between the words
    const path = findShortestPath(graphData, start, end);
    
    // Check if there is a valid path of appropriate length
    if (path.length >= MIN_PATH_LENGTH && path.length <= MAX_PATH_LENGTH) {
      // Check for alternate approach near the end, similar to old implementation
      let hasAlternateApproach = false;
      if (path.length >= 2) { // Path must have at least a penultimate node
        const penultimateNode = path[path.length - 2];
        const penultimateNodeData = graphData[penultimateNode];

        if (penultimateNodeData?.edges) {
          for (const neighborOfPenultimate in penultimateNodeData.edges) {
            // Ensure the neighbor is not the end word itself (we're looking for an ALTERNATE way)
            if (neighborOfPenultimate !== end) {
              const neighborNodeData = graphData[neighborOfPenultimate];
              // Check if this neighbor has a direct edge to the actual end word
              if (neighborNodeData?.edges && neighborNodeData.edges[end]) {
                hasAlternateApproach = true;
                break; // Found an alternate approach
              }
            }
          }
        }
      }

      if (!hasAlternateApproach) {
        console.log(`Skipping pair ${start}->${end}: No alternate approach near the end.`);
        continue;
      }

      console.log(`Found valid word pair: ${start} -> ${end} with path length ${path.length} (and alt approach)`);
      return { start, end };
    }
    
    console.log(`Skipping pair ${start}->${end}: Path length ${path.length} outside range ${MIN_PATH_LENGTH}-${MAX_PATH_LENGTH}`);
  }

  console.warn(`Failed to find valid word pair after ${MAX_ATTEMPTS} attempts. Using random pair.`);
  
  // Fallback to random selection if no valid pair is found
  const startIndex = Math.floor(Math.random() * words.length);
  let endIndex = Math.floor(Math.random() * words.length);
  
  while (endIndex === startIndex) {
    endIndex = Math.floor(Math.random() * words.length);
  }
  
  const start = words[startIndex];
  const end = words[endIndex];
  
  return { start, end };
};

// Create the Zustand store
export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  graphData: null,
  definitionsData: null,
  wordFrequencies: null,
  isLoadingData: false,
  errorLoadingData: null,
  startWord: null,
  endWord: null,
  currentWord: null,
  playerPath: [],
  optimalPath: [],
  suggestedPathFromCurrent: [],
  potentialRarestMovesThisGame: [], // Initialized
  pathDisplayMode: {
    player: true,
    optimal: false,
    suggested: false
  },
  gameStatus: 'idle',
  gameReport: null,
  optimalChoices: [],
  backtrackHistory: [],
  aboutModalVisible: false,
  statsModalVisible: false,
  definitionDialogWord: null,
  definitionDialogPathIndex: null,
  definitionDialogVisible: false,
  selectedAchievement: null,
  achievementDialogVisible: false,
  wordCollections: [],
  activeWordCollections: [],

  loadInitialData: async (): Promise<boolean> => {
    try {
      set({ isLoadingData: true, errorLoadingData: null, potentialRarestMovesThisGame: [] }); // Reset on load
      
      const [graphData, definitionsData, wordFrequencies, savedGame] = await Promise.all([
        loadGraphData(),
        loadDefinitionsData(),
        loadWordFrequencies(),
        loadCurrentGame()
      ]);

      set({ 
        graphData, 
        definitionsData,
        wordFrequencies,
        isLoadingData: false 
      });

      if (graphData) {
        const filteredCollections = await getFilteredWordCollections(graphData);
        
        if (savedGame && savedGame.gameStatus === 'playing') {
          console.log('useGameStore: Restoring saved game', { 
            startWord: savedGame.startWord,
            endWord: savedGame.endWord, 
            currentWord: savedGame.currentWord,
            pathLength: savedGame.playerPath?.length || 0
          });
          
          const suggested = findShortestPath(graphData, savedGame.currentWord || '', savedGame.endWord || '');
          set({
            startWord: savedGame.startWord,
            endWord: savedGame.endWord,
            currentWord: savedGame.currentWord,
            playerPath: savedGame.playerPath,
            optimalPath: savedGame.optimalPath,
            suggestedPathFromCurrent: suggested,
            gameStatus: 'playing',
            optimalChoices: savedGame.optimalChoices,
            backtrackHistory: savedGame.backtrackHistory,
            // Assuming potentialRarestMovesThisGame is not in savedGame or should be reset
            potentialRarestMovesThisGame: savedGame.potentialRarestMovesThisGame || [], // Restore if available
            pathDisplayMode: {
              ...savedGame.pathDisplayMode,
              suggested: false
            },
            wordCollections: filteredCollections,
            activeWordCollections: filteredCollections
          });
          
          console.log('useGameStore: Game successfully restored to playing state');
          
          // Log rare words available at the restored position with comprehensive details
          if (savedGame.currentWord && wordFrequencies) {
            const currentNeighborsEdges = graphData[savedGame.currentWord]?.edges;
            if (currentNeighborsEdges) {
              const neighborFreqs = Object.keys(currentNeighborsEdges)
                .map(word => ({ word, frequency: wordFrequencies[word] ?? Infinity }))
                .sort((a, b) => a.frequency - b.frequency);
                
              const rarestWord = neighborFreqs.length > 0 ? neighborFreqs[0] : null;
              const rarestFreq = rarestWord?.frequency;
              
              // Get optimal and suggested paths for the restored game position
              const optimalPath = savedGame.optimalPath || [];
              const optimalNextMove = optimalPath[optimalPath.indexOf(savedGame.currentWord) + 1];
              const suggestedPath = savedGame.currentWord ? 
                findShortestPath(graphData, savedGame.currentWord, savedGame.endWord || '') : 
                [];
              const suggestedNextMove = suggestedPath.length > 1 ? suggestedPath[1] : null;
        
              console.log('[RESTORED GAME DEBUG FOR TESTING]', {
                // Current state
                currentPosition: savedGame.currentWord,
                // Optimal information
                optimalNextMove: optimalNextMove,
                suggestedNextMove: suggestedNextMove,
                // Rare word information
                allAvailableWords: Object.keys(currentNeighborsEdges),
                rarestWordAvailable: rarestWord?.word,
                rarestWordFrequency: rarestFreq,
                top5RarestWords: neighborFreqs.slice(0, 5)
              });
            }
          }
          
          return true;
        } else {
          console.log('useGameStore: No saved game found or invalid saved game');
          set(state => ({
            ...state,
            wordCollections: filteredCollections,
            activeWordCollections: filteredCollections,
            potentialRarestMovesThisGame: [] // Ensure reset if no saved game
          }));
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading initial data:', error);
      set({ 
        isLoadingData: false, 
        errorLoadingData: error instanceof Error ? error.message : 'Failed to load data' 
      });
      return false;
    }
  },

  clearSavedData: async () => {
    console.log("Clearing saved data...");
    try {
      set({ 
        playerPath: [],
        gameStatus: 'idle',
        errorLoadingData: null,
        potentialRarestMovesThisGame: [], // Reset here too
      });
      await clearCurrentGame();
      console.log("Game data cleared successfully");
    } catch (error) {
      console.error("Failed to clear saved data:", error);
      set({ 
        errorLoadingData: error instanceof Error 
          ? error.message 
          : "An unknown error occurred while clearing data."
      });
    }
  },

  startGame: async () => {
    const { graphData } = get();
    if (!graphData) {
      console.error("Cannot start game: Graph data not loaded.");
      set({ gameStatus: 'idle', errorLoadingData: "Graph data missing." });
      return;
    }
    
    await clearCurrentGame();
    
    set({ 
      gameStatus: 'loading', 
      errorLoadingData: null, 
      playerPath: [], 
      optimalPath: [], 
      suggestedPathFromCurrent: [],
      gameReport: null,
      optimalChoices: [],
      backtrackHistory: [],
      potentialRarestMovesThisGame: [], // Reset for new game
      pathDisplayMode: {
        player: true,
        optimal: false,
        suggested: false
      }
    });
    
    const { start, end } = findValidWordPair(graphData);

    if (start && end) {
      const optimal = findShortestPath(graphData, start, end);
      const suggested = findShortestPath(graphData, start, end);

      set({ 
        startWord: start,
        endWord: end,
        currentWord: start,
        playerPath: [start],
        optimalPath: optimal,
        suggestedPathFromCurrent: suggested,
        gameStatus: 'playing'
      });
      
      const gameState = {
        startWord: start,
        endWord: end,
        currentWord: start,
        playerPath: [start],
        optimalPath: optimal,
        suggestedPathFromCurrent: suggested,
        gameStatus: 'playing' as const,
        optimalChoices: [],
        backtrackHistory: [],
        potentialRarestMovesThisGame: [], // Start with empty for saved game
        pathDisplayMode: {
          player: true,
          optimal: false,
          suggested: false
        },
        startTime: Date.now()
      };
      await saveCurrentGame(gameState);
      
      console.log(`Game started: ${start} → ${end}`);
      
      // Log rare words available at the start position
      const { wordFrequencies } = get();
      const directNeighborsEdges = graphData[start]?.edges;
      if (directNeighborsEdges && wordFrequencies) {
        const neighborFreqs = Object.keys(directNeighborsEdges)
          .map(word => ({ word, frequency: wordFrequencies[word] ?? Infinity }))
          .sort((a, b) => a.frequency - b.frequency)
          .slice(0, 5); // Show top 5 at game start
          
        const rarestWord = neighborFreqs[0]?.word;
        const rarestFreq = neighborFreqs[0]?.frequency;
  
        console.log('[GAME START RARE WORDS]', {
          startWord: start,
          rarestOptions: neighborFreqs,
          rarestAvailable: rarestWord,
          rarestFrequency: rarestFreq
        });
      }
    } else {
      console.error("Failed to find valid start/end word pair.");
      set({ gameStatus: 'idle', errorLoadingData: "Could not start game." });
    }
  },

  giveUp: async () => {
    const { graphData, playerPath, optimalPath, optimalChoices, endWord, backtrackHistory, potentialRarestMovesThisGame } = get();
    if (!graphData || !endWord) return;

    await clearCurrentGame();

    let report = generateGameReport(
      graphData,
      playerPath,
      optimalPath, 
      optimalChoices, 
      endWord,
      findShortestPath, 
      findShortestPath, 
      backtrackHistory,
      potentialRarestMovesThisGame // Pass to report
    );

    const earnedAchievements = evaluateAchievements(report, 'given_up'); 
    report.earnedAchievements = earnedAchievements;

    console.log("Player gave up", report);
    set({ 
      gameStatus: 'given_up',
      gameReport: report, 
      pathDisplayMode: { player: true, optimal: false, suggested: true }
    });
    await recordEndedGame(report);
  },

  selectWord: async (selectedWord: string) => {
    const { graphData, currentWord, endWord, playerPath, optimalPath, gameStatus, suggestedPathFromCurrent, backtrackHistory, activeWordCollections, wordFrequencies, potentialRarestMovesThisGame } = get();
    if (!graphData || !currentWord || !endWord || gameStatus !== 'playing') return;

    if (!graphData[currentWord]?.edges[selectedWord]) {
      console.warn(`Invalid move: ${selectedWord} is not a neighbor of ${currentWord}`);
      return;
    }

    // --- Logic for "Putting on the Dog" ---
    let rarestOfferedThisStep: { word: string, frequency: number } | null = null;
    const directNeighborsEdges = graphData[currentWord]?.edges;
    if (directNeighborsEdges && Object.keys(directNeighborsEdges).length > 0 && wordFrequencies) {
      const neighborFreqDetails = Object.keys(directNeighborsEdges)
        .map(neighborWord => ({
          word: neighborWord,
          frequency: wordFrequencies[neighborWord] ?? Infinity,
        }))
        .sort((a, b) => a.frequency - b.frequency); // Sort by frequency, rarest first

      if (neighborFreqDetails.length > 0 && neighborFreqDetails[0].frequency !== Infinity) {
        rarestOfferedThisStep = neighborFreqDetails[0];
      }
    }

    let newPotentialRarestMovesList = [...potentialRarestMovesThisGame];
    if (rarestOfferedThisStep) {
      newPotentialRarestMovesList.push({
        word: rarestOfferedThisStep.word,
        frequency: rarestOfferedThisStep.frequency,
        playerChoseThisRarestOption: selectedWord === rarestOfferedThisStep.word,
      });
    }
    // --- End logic for "Putting on the Dog" ---

    let sTime = performance.now();
    const optimalChoice = trackOptimalChoice(
      graphData, 
      currentWord, 
      selectedWord, 
      optimalPath,
      suggestedPathFromCurrent,
      endWord, 
      findShortestPath,
      wordFrequencies
    );
    console.log(`[PERF] selectWord.trackOptimalChoice call took ${(performance.now() - sTime).toFixed(2)}ms`);

    // Get all relevant information for logging BEFORE the move is made
    const optimalNextMove = optimalPath[optimalPath.indexOf(currentWord) + 1];
    const suggestedNextMove = suggestedPathFromCurrent[suggestedPathFromCurrent.indexOf(currentWord) + 1];
    
    // Log ALL testing information together in one place
    console.log('[MOVE DEBUG FOR TESTING]', {
      // Current state
      currentPosition: currentWord,
      // Optimal information
      optimalNextMove: optimalNextMove,
      suggestedNextMove: suggestedNextMove,
      // Rare word information
      allAvailableWords: directNeighborsEdges ? Object.keys(directNeighborsEdges) : [],
      rarestWordAvailable: rarestOfferedThisStep?.word,
      rarestWordFrequency: rarestOfferedThisStep?.frequency,
      top5RarestWords: directNeighborsEdges && wordFrequencies 
        ? Object.keys(directNeighborsEdges)
            .map(word => ({ word, frequency: wordFrequencies[word] ?? Infinity }))
            .sort((a, b) => a.frequency - b.frequency)
            .slice(0, 5)
        : [],
      // Player choice info
      playerChose: selectedWord,
      playerChoseFrequency: wordFrequencies?.[selectedWord] ?? 'unknown',
      isGlobalOptimal: optimalChoice.isGlobalOptimal,
      isLocalOptimal: optimalChoice.isLocalOptimal,
      choseRarestWord: selectedWord === rarestOfferedThisStep?.word
    });

    const newPlayerPath = [...playerPath, selectedWord];
    
    set({
      currentWord: selectedWord,
      playerPath: newPlayerPath,
      optimalChoices: [...get().optimalChoices, optimalChoice],
      potentialRarestMovesThisGame: newPotentialRarestMovesList // Update the list
    });

    // Log available rare words for achievement testing from the NEW position
    if (graphData[selectedWord]?.edges && wordFrequencies) {
      const newPositionNeighborsEdges = graphData[selectedWord]?.edges;
      const neighborFreqs = Object.keys(newPositionNeighborsEdges)
        .map(word => ({ word, frequency: wordFrequencies[word] ?? Infinity }))
        .sort((a, b) => a.frequency - b.frequency);
      
      // Get full list for proper tracking
      const allOptions = [...neighborFreqs];
      // For display, limit to top 5
      const displayOptions = neighborFreqs.slice(0, 5);

      // Find the rarest option at the new position
      const rarestAtNewPosition = neighborFreqs.length > 0 ? neighborFreqs[0] : null;

      // Get next optimal move from the new position if one exists
      const newOptimalNextMove = optimalPath[optimalPath.indexOf(selectedWord) + 1] || null;
      
      console.log('[MOVE OPTIONS FROM NEW POSITION]', {
        currentPosition: selectedWord,
        optimalNextMove: newOptimalNextMove,
        suggestedPath: graphData[selectedWord] && endWord ? findShortestPath(graphData, selectedWord, endWord).slice(1) : [],
        rarestWord: rarestAtNewPosition?.word,
        rarestFrequency: rarestAtNewPosition?.frequency,
        topRareOptions: displayOptions,
        totalNeighbors: Object.keys(newPositionNeighborsEdges).length
      });
    }

    if (selectedWord === endWord) {
      console.log("Player won!");
      await clearCurrentGame();
      
      const finalOptimalChoices = get().optimalChoices;
      const finalBacktrackHistory = get().backtrackHistory;
      const finalPotentialRarestMoves = get().potentialRarestMovesThisGame; // Get the final list

      let report = generateGameReport(
        graphData,
        newPlayerPath,
        optimalPath, 
        finalOptimalChoices, 
        endWord,
        findShortestPath, 
        findShortestPath, 
        finalBacktrackHistory,
        finalPotentialRarestMoves // Pass to report
      );

      const earnedAchievements = evaluateAchievements(report, 'won');
      report.earnedAchievements = earnedAchievements;

      set({ 
        gameStatus: 'won',
        gameReport: report,
        pathDisplayMode: { player: true, optimal: true, suggested: false }
      });
      await recordEndedGame(report);

      if (activeWordCollections.length > 0) {
        checkAndRecordWordForCollections(selectedWord, activeWordCollections);
      }
      return;
    }

    sTime = performance.now();
    const suggested = findShortestPath(graphData, selectedWord, endWord);
    console.log(`[PERF] selectWord.findShortestPath (for suggested) took ${(performance.now() - sTime).toFixed(2)}ms`);

    set({ suggestedPathFromCurrent: suggested });
    
    const gameStateToSave = {
      startWord: playerPath[0],
      endWord: endWord,
      currentWord: selectedWord,
      playerPath: newPlayerPath,
      optimalPath: optimalPath,
      suggestedPathFromCurrent: suggested,
      gameStatus: 'playing' as const,
      optimalChoices: get().optimalChoices,
      backtrackHistory: backtrackHistory,
      potentialRarestMovesThisGame: get().potentialRarestMovesThisGame, // Save this list
      pathDisplayMode: get().pathDisplayMode
    };
    await saveCurrentGame(gameStateToSave);

    if (activeWordCollections.length > 0) {
      checkAndRecordWordForCollections(selectedWord, activeWordCollections);
    }
  },

  setPathDisplayMode: (modeUpdate: Partial<PathDisplayMode>) => {
    set((state) => ({
      pathDisplayMode: { ...state.pathDisplayMode, ...modeUpdate }
    }));
  },

  setAboutModalVisible: (visible) => set({ aboutModalVisible: visible }),
  setStatsModalVisible: (visible) => set({ statsModalVisible: visible }),

  backtrackToWord: async (word: string, index: number) => {
    const { graphData, playerPath, optimalChoices, endWord, startWord, currentWord: wordPlayerIsJumpingFrom, backtrackHistory, potentialRarestMovesThisGame } = get();
    if (!graphData || !playerPath || !endWord || !startWord || !wordPlayerIsJumpingFrom || get().gameStatus !== 'playing') return;

    const alreadyBacktrackedToThisWord = backtrackHistory.some(event => event.landedOn === word);
    if (alreadyBacktrackedToThisWord) {
      console.warn(`Invalid backtrack: The word "${word}" has already been used as a backtrack target.`);
      return; 
    }

    const checkpointChoiceIndex = index -1; 
    if (checkpointChoiceIndex < 0 || checkpointChoiceIndex >= optimalChoices.length) {
      console.warn(`Invalid backtrack: checkpointChoiceIndex ${checkpointChoiceIndex} out of range.`);
      return;
    }
    
    const choiceToMark = optimalChoices[checkpointChoiceIndex];
    if (!(choiceToMark.isGlobalOptimal || choiceToMark.isLocalOptimal) || choiceToMark.usedAsCheckpoint) {
      console.warn(`Invalid backtrack: word at playerPath index ${index} not an unused optimal choice.`);
      return;
    }

    const newPlayerPath = playerPath.slice(0, index + 1);
    // Truncate optimalChoices and potentialRarestMovesThisGame to match the new path length
    // New path has newPlayerPath.length words, meaning (newPlayerPath.length - 1) moves.
    const numMoves = newPlayerPath.length - 1;
    const newOptimalChoicesBase = optimalChoices.slice(0, numMoves); 
    const newPotentialRarestMoves = potentialRarestMovesThisGame.slice(0, numMoves);

    const finalOptimalChoices = newOptimalChoicesBase.map((c, i) => {
      if (i === checkpointChoiceIndex) {
        return { ...c, usedAsCheckpoint: true };
      }
      return c;
    });

    const newCurrentWordAfterBacktrack = newPlayerPath[newPlayerPath.length - 1];
    const newOptimalPath = findShortestPath(graphData, startWord, endWord);
    const suggested = findShortestPath(graphData, newCurrentWordAfterBacktrack, endWord);
    
    const newBacktrackEvent: BacktrackEvent = {
      jumpedFrom: wordPlayerIsJumpingFrom,
      landedOn: word,
    };

    set({ 
      currentWord: newCurrentWordAfterBacktrack,
      playerPath: newPlayerPath,
      optimalChoices: finalOptimalChoices,
      potentialRarestMovesThisGame: newPotentialRarestMoves, // Set truncated list
      optimalPath: newOptimalPath,
      suggestedPathFromCurrent: suggested,
      backtrackHistory: [...backtrackHistory, newBacktrackEvent],
    });

    const gameStateToSave = {
      startWord: playerPath[0],
      endWord: endWord,
      currentWord: newCurrentWordAfterBacktrack,
      playerPath: newPlayerPath,
      optimalPath: newOptimalPath,
      suggestedPathFromCurrent: suggested,
      gameStatus: 'playing' as const,
      optimalChoices: finalOptimalChoices,
      backtrackHistory: [...backtrackHistory, newBacktrackEvent],
      potentialRarestMovesThisGame: newPotentialRarestMoves, // Save truncated list
      pathDisplayMode: get().pathDisplayMode
    };
    await saveCurrentGame(gameStateToSave);
  },

  showWordDefinition: (word: string, pathIndex?: number | null) => {
    set({
      definitionDialogWord: word,
      definitionDialogPathIndex: pathIndex ?? null,
      definitionDialogVisible: true,
    });
  },
  hideWordDefinition: () => {
    set({
      definitionDialogWord: null,
      definitionDialogPathIndex: null,
      definitionDialogVisible: false,
    });
  },

  showAchievementDetail: (achievement: Achievement) => {
    set({
      selectedAchievement: achievement,
      achievementDialogVisible: true,
    });
  },
  hideAchievementDetail: () => {
    set({
      selectedAchievement: null,
      achievementDialogVisible: false,
    });
  },

  testWordCollectionsForDate: async (month: number, day: number) => {
    const { graphData } = get();
    if (!graphData) {
      console.error('Cannot test collections: Graph data not loaded');
      return;
    }
    
    try {
      const testDate = new Date(new Date().getFullYear(), month - 1, day);
      console.log(`Testing collections for date: ${testDate.toLocaleDateString()}`);
      const collections = await getFilteredWordCollections(graphData, testDate);
      set({ 
        wordCollections: collections,
        activeWordCollections: collections
      });
      console.log(`Found ${collections.length} collections for date ${testDate.toLocaleDateString()}`);
      collections.forEach(c => console.log(` - ${c.id}: ${c.title}`));
    } catch (error) {
      console.error('Error testing collections for date:', error);
    }
  },
})); 