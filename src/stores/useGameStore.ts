import { create } from "zustand";

import type { Achievement } from "../features/achievements";
import { evaluateAchievements } from "../features/achievements";
import type { WordCollection } from "../features/wordCollections";
import {
  getFilteredWordCollections,
  allWordCollections,
} from "../features/wordCollections";
import {
  loadGraphData,
  loadDefinitionsData,
  GraphData,
  DefinitionsData,
  WordFrequencies,
  loadWordFrequencies,
} from "../services/dataLoader";
import {
  recordEndedGame,
  saveCurrentGame,
  loadCurrentGame,
  clearCurrentGame,
  saveTempGame,
  restoreTempGame,
  checkAndRecordWordForCollections,
} from "../services/StorageService";
import { dailyChallengesService } from "../services/DailyChallengesService";
import type { DailyChallenge } from "../types/dailyChallenges";
import {
  generateGameReport,
  trackOptimalChoice,
  GameReport,
  OptimalChoice,
  BacktrackReportEntry,
} from "../utils/gameReportUtils";
import { findShortestPath } from "../utils/graphUtils";

// Define path display modes
interface PathDisplayMode {
  player: boolean;
  optimal: boolean; // Global optimal path
  suggested: boolean; // Optimal path from current node
  ai: boolean; // AI solution path (for daily challenges debugging)
}

// Define the state structure
// Removed local BacktrackEvent interface, will use imported BacktrackReportEntry
// interface BacktrackEvent {
//   jumpedFrom: string;
//   landedOn: string;
// }

interface PotentialRarestMove {
  word: string;
  frequency: number;
  playerChoseThisRarestOption: boolean;
}

// Define the state structure -- EXPORTING THIS
export interface GameState {
  // Existing interface, adding export
  graphData: GraphData | null;
  definitionsData: DefinitionsData | null;
  wordFrequencies: WordFrequencies | null;
  isLoadingData: boolean;
  errorLoadingData: string | null;
  // Add game state properties
  startWord: string | null;
  targetWord: string | null;
  currentWord: string | null;
  playerPath: string[];
  optimalPath: string[]; // Path from startWord to targetWord
  suggestedPathFromCurrent: string[]; // Path from currentWord to targetWord
  aiPath: string[]; // AI solution path (for daily challenges)
  aiModel: string | null; // AI model that generated the solution (for daily challenges)
  potentialRarestMovesThisGame: PotentialRarestMove[]; // Added for "Putting on the Dog"
  pathDisplayMode: PathDisplayMode;
  gameStatus: "idle" | "loading" | "playing" | "won" | "lost" | "given_up";
  gameReport: GameReport | null; // Add game report
  optimalChoices: OptimalChoice[]; // Track optimal choices
  backtrackHistory: BacktrackReportEntry[]; // Stores actual backtrack jumps (using imported type)
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

  // Challenge Mode
  isChallenge: boolean;
  shouldRestoreTempGame: boolean;

  // Daily Challenges
  isDailyChallenge: boolean;
  currentDailyChallenge: DailyChallenge | null;
  hasPlayedTodaysChallenge: boolean;
  remainingFreeGames: number;

  // Upgrade prompt state
  upgradePromptVisible: boolean;
  upgradePromptMessage: string;

  // Actions
  loadInitialData: () => Promise<boolean>;
  clearSavedData: () => void;
  startGame: () => void; // Start game action without difficulty
  startChallengeGame: (startWord: string, targetWord: string) => Promise<void>; // New action for starting a challenge game
  startDailyChallengeGame: () => Promise<void>; // New action for starting today's daily challenge
  selectWord: (word: string) => void;
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

  // Testing function for date-based collections
  testWordCollectionsForDate: (month: number, day: number) => Promise<void>;

  hasPendingChallenge: boolean;
  pendingChallengeWords: { startWord: string; targetWord: string } | null;
  setHasPendingChallenge: (hasPending: boolean) => void;
  setPendingChallengeWords: (
    words: { startWord: string; targetWord: string } | null,
  ) => void;

  // Upgrade prompt actions
  showUpgradePrompt: (message: string) => void;
  hideUpgradePrompt: () => void;

  // Dialog visibility actions
  setDefinitionDialogWord: (word) => void;
  setDefinitionDialogPathIndex: (index) => void;
  setDefinitionDialogVisible: (visible) => void;
  setSelectedAchievement: (achievement) => void;
  setAchievementDialogVisible: (visible) => void;
}

// Moved and exported for testing
export const findValidWordPair = (
  graphData: GraphData | null,
): { start: string | null; end: string | null } => {
  if (!graphData) {
    return { start: null, end: null };
  }

  const words = Object.keys(graphData);

  if (words.length < 2) {
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
        continue;
      }
    }

    // Check if the words have enough connections
    const startDegree = Object.keys(startNodeData?.edges || {}).length;
    const endDegree = Object.keys(endNodeData?.edges || {}).length;

    if (startDegree < MIN_NODE_DEGREE || endDegree < MIN_NODE_DEGREE) {
      continue; // Skip this pair if either word doesn't have enough connections
    }

    // Find the shortest path between the words
    const path = findShortestPath(graphData, start, end);

    // Check if there is a valid path of appropriate length
    if (path.length >= MIN_PATH_LENGTH && path.length <= MAX_PATH_LENGTH) {
      // Check for alternate approach near the end, similar to old implementation
      let hasAlternateApproach = false;
      if (path.length >= 2) {
        // Path must have at least a penultimate node
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
        continue;
      }

      return { start, end };
    }
  }

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
  targetWord: null,
  currentWord: null,
  playerPath: [],
  optimalPath: [],
  suggestedPathFromCurrent: [],
  aiPath: [],
  aiModel: null,
  potentialRarestMovesThisGame: [], // Initialized
  pathDisplayMode: {
    player: true,
    optimal: false,
    suggested: false,
    ai: false,
  },
  gameStatus: "idle",
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
  isChallenge: false, // Initialize challenge mode as false
  shouldRestoreTempGame: false, // Initialize shouldRestoreTempGame as false
  hasPendingChallenge: false,
  pendingChallengeWords: null,
  isDailyChallenge: false,
  currentDailyChallenge: null,
  hasPlayedTodaysChallenge: false,
  remainingFreeGames: 0,

  // Upgrade prompt state
  upgradePromptVisible: false,
  upgradePromptMessage: '',

  loadInitialData: async (): Promise<boolean> => {
    try {
      set({
        isLoadingData: true,
        errorLoadingData: null,
        potentialRarestMovesThisGame: [],
      }); // Reset on load

      const [graphData, definitionsData, wordFrequencies, savedGame, dailyChallengeState] =
        await Promise.all([
          loadGraphData(),
          loadDefinitionsData(),
          loadWordFrequencies(),
          loadCurrentGame(),
          dailyChallengesService.getDailyChallengeState(),
        ]);

      set({
        graphData,
        definitionsData,
        wordFrequencies,
        isLoadingData: false,
        // Update daily challenge state
        currentDailyChallenge: dailyChallengeState.todaysChallenge,
        hasPlayedTodaysChallenge: dailyChallengeState.hasPlayedToday,
        remainingFreeGames: dailyChallengeState.remainingFreeGames,
      });

      if (graphData) {
        const filteredCollections = await getFilteredWordCollections(
          allWordCollections,
          graphData,
        );

        if (savedGame && savedGame.gameStatus === "playing") {
          const suggested = findShortestPath(
            graphData,
            savedGame.currentWord || "",
            savedGame.targetWord || "",
          );
          
          // If this is a daily challenge, restore the challenge data
          let restoredDailyChallenge: DailyChallenge | null = null;
          if (savedGame.isDailyChallenge && savedGame.currentDailyChallengeId) {
            restoredDailyChallenge = dailyChallengesService.getChallengeForDate(savedGame.currentDailyChallengeId);
          }
          
          set({
            startWord: savedGame.startWord,
            targetWord: savedGame.targetWord,
            currentWord: savedGame.currentWord,
            playerPath: savedGame.playerPath,
            optimalPath: savedGame.optimalPath,
            suggestedPathFromCurrent: suggested,
            gameStatus: "playing",
            optimalChoices: savedGame.optimalChoices,
            backtrackHistory: savedGame.backtrackHistory,
            // Assuming potentialRarestMovesThisGame is not in savedGame or should be reset
            potentialRarestMovesThisGame:
              savedGame.potentialRarestMovesThisGame || [], // Restore if available
            pathDisplayMode: {
              ...savedGame.pathDisplayMode,
              suggested: false,
            },
            wordCollections: filteredCollections,
            activeWordCollections: filteredCollections,
            // Restore daily challenge state
            isChallenge: savedGame.isChallenge || false,
            isDailyChallenge: savedGame.isDailyChallenge || false,
            aiPath: savedGame.aiPath || [],
            aiModel: savedGame.aiModel || null,
            currentDailyChallenge: restoredDailyChallenge,
          });

          return true;
        } else {
          set((state) => ({
            ...state,
            wordCollections: filteredCollections,
            activeWordCollections: filteredCollections,
            potentialRarestMovesThisGame: [], // Ensure reset if no saved game
          }));
        }
      }
      return false;
    } catch (error) {
      set({
        isLoadingData: false,
        errorLoadingData:
          error instanceof Error ? error.message : "Failed to load data",
      });
      return false;
    }
  },

  clearSavedData: async () => {
    set({
      playerPath: [],
      gameStatus: "idle",
      errorLoadingData: null,
      potentialRarestMovesThisGame: [], // Reset here too
      isChallenge: false, // Reset challenge mode
    });
    await clearCurrentGame(get().isChallenge);
  },

  startGame: async () => {
    const { graphData, shouldRestoreTempGame, hasPlayedTodaysChallenge, currentDailyChallenge, remainingFreeGames, upgradePromptVisible } = get();
    
    // Prevent calling startGame if upgrade prompt is already visible
    if (upgradePromptVisible) {
      console.log('startGame: upgrade prompt already visible, skipping');
      return;
    }
    
    // Add debugging
    console.log('Starting game with:', {
      remainingFreeGames,
      hasPlayedTodaysChallenge,
      currentDailyChallenge: !!currentDailyChallenge,
      shouldRestoreTempGame
    });
    
    if (!graphData) {
      set({ gameStatus: "idle", errorLoadingData: "Graph data missing." });
      return;
    }

    // Check free game limits for random games (daily challenges and player challenges are always free)
    if (remainingFreeGames <= 0) {
      // Show upgrade prompt instead of starting a game
      console.log('Showing upgrade prompt - no free games remaining');
      get().showUpgradePrompt("You've used all your free games for today! Upgrade for unlimited play, or try daily challenges which are always free.");
      return;
    }

    // TEMPORARY: For testing the upgrade prompt, uncomment the line below to force it to show
    // get().showUpgradePrompt("Test upgrade prompt - remove this line after testing!"); return;

    // TEMPORARY: Force show upgrade prompt for testing (set to true to test)
    const FORCE_UPGRADE_PROMPT = false;
    if (FORCE_UPGRADE_PROMPT) {
      console.log('FORCING upgrade prompt for testing');
      get().showUpgradePrompt("Test upgrade prompt - this is for testing the UI!");
      return;
    }

    // Check if we should restore a temporary saved game
    if (shouldRestoreTempGame) {
      const tempGame = await restoreTempGame();
      if (tempGame) {
        set({
          startWord: tempGame.startWord,
          targetWord: tempGame.targetWord,
          currentWord: tempGame.currentWord,
          playerPath: tempGame.playerPath || [],
          optimalPath: tempGame.optimalPath || [],
          suggestedPathFromCurrent: tempGame.suggestedPathFromCurrent || [],
          gameStatus: tempGame.gameStatus,
          optimalChoices: tempGame.optimalChoices || [],
          backtrackHistory: tempGame.backtrackHistory || [],
          potentialRarestMovesThisGame:
            tempGame.potentialRarestMovesThisGame || [],
          pathDisplayMode: tempGame.pathDisplayMode || {
            player: true,
            optimal: false,
            suggested: false,
            ai: false,
          },
          isChallenge: false,
          isDailyChallenge: false,
          shouldRestoreTempGame: false,
        });

        return;
      }
    }

    // Check if we should prioritize today's daily challenge
    // Priority: if user hasn't played today's challenge and there is one available
    if (!hasPlayedTodaysChallenge && currentDailyChallenge) {
      // Start today's daily challenge instead of a random game
      console.log('Starting daily challenge instead of random game');
      await get().startDailyChallengeGame();
      return;
    }

    // Consume a free game before starting (since we passed the limit check)
    console.log('Consuming free game, remaining before:', remainingFreeGames);
    await dailyChallengesService.consumeFreeGame();
    
    // Update the store with the new remaining count
    const newRemainingFreeGames = await dailyChallengesService.getRemainingFreeGames();
    console.log('Free games remaining after consumption:', newRemainingFreeGames);
    set({ remainingFreeGames: newRemainingFreeGames });

    // If no restoration or it failed, continue with normal game start
    await clearCurrentGame(false); // Clear regular game, not challenge

    set({
      gameStatus: "loading",
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
        suggested: false,
        ai: false,
      },
      isChallenge: false,
      isDailyChallenge: false,
      shouldRestoreTempGame: false,
    });

    const { start, end } = findValidWordPair(graphData);

    if (start && end) {
      const optimal = findShortestPath(graphData, start, end);
      const suggested = findShortestPath(graphData, start, end);

      set({
        startWord: start,
        targetWord: end,
        currentWord: start,
        playerPath: [start],
        optimalPath: optimal,
        suggestedPathFromCurrent: suggested,
        gameStatus: "playing",
      });

      const gameState = {
        startWord: start,
        targetWord: end,
        currentWord: start,
        playerPath: [start],
        optimalPath: optimal,
        suggestedPathFromCurrent: suggested,
        gameStatus: "playing" as const,
        optimalChoices: [],
        backtrackHistory: [],
        potentialRarestMovesThisGame: [], // Start with empty for saved game
        pathDisplayMode: {
          player: true,
          optimal: false,
          suggested: false,
          ai: false,
        },
        isChallenge: false,
        startTime: Date.now(),
      };
      await saveCurrentGame(gameState);
    } else {
      set({ gameStatus: "idle", errorLoadingData: "Could not start game." });
    }
  },

  startChallengeGame: async (startWord: string, targetWord: string) => {
    const { graphData } = get();
    if (!graphData) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Graph data missing.",
        hasPendingChallenge: false,
        pendingChallengeWords: null,
      });
      return;
    }

    // Verify words exist in the graph
    if (!graphData[startWord] || !graphData[targetWord]) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Invalid challenge words.",
        hasPendingChallenge: false,
        pendingChallengeWords: null,
      });
      return;
    }

    // Check if a path exists between the words
    const pathBetweenWords = findShortestPath(graphData, startWord, targetWord);
    if (pathBetweenWords.length === 0) {
      // Or pathBetweenWords.length < 2 if start === end is not allowed
      set({
        gameStatus: "idle",
        errorLoadingData: "No path exists for this challenge.",
        hasPendingChallenge: false,
        pendingChallengeWords: null,
      });
      return;
    }

    // Check for existing game to save temporarily
    const currentGame = await loadCurrentGame(false); // Load regular game
    if (currentGame && currentGame.gameStatus === "playing") {
      await saveTempGame(currentGame); // Save to temp storage
      set({ shouldRestoreTempGame: true });
    }

    // Clear any existing challenge game
    await clearCurrentGame(true); // Clear challenge game storage

    set({
      gameStatus: "loading",
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
        suggested: false,
        ai: false,
      },
      isChallenge: true, // Mark as challenge
    });

    const optimal = findShortestPath(graphData, startWord, targetWord);
    const suggested = findShortestPath(graphData, startWord, targetWord);

    set({
      startWord,
      targetWord: targetWord,
      currentWord: startWord,
      playerPath: [startWord],
      optimalPath: optimal,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing",
    });

    const gameState = {
      startWord,
      targetWord: targetWord,
      currentWord: startWord,
      playerPath: [startWord],
      optimalPath: optimal,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing" as const,
      optimalChoices: [],
      backtrackHistory: [],
      potentialRarestMovesThisGame: [], // Start with empty for saved game
      pathDisplayMode: {
        player: true,
        optimal: false,
        suggested: false,
        ai: false,
      },
      isChallenge: true,
      startTime: Date.now(),
    };
    await saveCurrentGame(gameState);
  },

  startDailyChallengeGame: async () => {
    const { graphData } = get();
    if (!graphData) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Graph data missing.",
      });
      return;
    }

    // Get today's challenge
    const todaysChallenge = dailyChallengesService.getTodaysChallenge();
    if (!todaysChallenge) {
      set({
        gameStatus: "idle",
        errorLoadingData: "No daily challenge available for today.",
      });
      return;
    }

    // Check if already completed today's challenge
    const hasCompleted = await dailyChallengesService.hasCompletedTodaysChallenge();
    if (hasCompleted) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Today's challenge has already been completed.",
      });
      return;
    }

    // Verify words exist in the graph
    if (!graphData[todaysChallenge.startWord] || !graphData[todaysChallenge.targetWord]) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Daily challenge words not found in graph.",
      });
      return;
    }

    // Check if a path exists between the words
    const pathBetweenWords = findShortestPath(graphData, todaysChallenge.startWord, todaysChallenge.targetWord);
    if (pathBetweenWords.length === 0) {
      set({
        gameStatus: "idle",
        errorLoadingData: "No path exists for today's challenge.",
      });
      return;
    }

    // Check for existing game to save temporarily
    const currentGame = await loadCurrentGame(false); // Load regular game
    if (currentGame && currentGame.gameStatus === "playing") {
      await saveTempGame(currentGame); // Save to temp storage
      set({ shouldRestoreTempGame: true });
    }

    // Clear any existing challenge game
    await clearCurrentGame(true); // Clear challenge game storage

    set({
      gameStatus: "loading",
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
        suggested: false,
        ai: false,
      },
      isChallenge: true, // Mark as challenge
      isDailyChallenge: true, // Mark as daily challenge
      currentDailyChallenge: todaysChallenge,
    });

    const optimal = findShortestPath(graphData, todaysChallenge.startWord, todaysChallenge.targetWord);
    const suggested = findShortestPath(graphData, todaysChallenge.startWord, todaysChallenge.targetWord);
    
    // Get AI solution path from daily challenge data
    const aiSolutionPath = todaysChallenge.aiSolution?.path || [];

    set({
      startWord: todaysChallenge.startWord,
      targetWord: todaysChallenge.targetWord,
      currentWord: todaysChallenge.startWord,
      playerPath: [todaysChallenge.startWord],
      optimalPath: optimal,
      suggestedPathFromCurrent: suggested,
      aiPath: aiSolutionPath,
      aiModel: todaysChallenge.aiSolution?.model || null,
      gameStatus: "playing",
    });

    const gameState = {
      startWord: todaysChallenge.startWord,
      targetWord: todaysChallenge.targetWord,
      currentWord: todaysChallenge.startWord,
      playerPath: [todaysChallenge.startWord],
      optimalPath: optimal,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing" as const,
      optimalChoices: [],
      backtrackHistory: [],
      potentialRarestMovesThisGame: [], // Start with empty for saved game
      pathDisplayMode: {
        player: true,
        optimal: false,
        suggested: false,
        ai: false,
      },
      isChallenge: true,
      isDailyChallenge: true, // Mark as daily challenge
      aiPath: aiSolutionPath, // Include AI path
      aiModel: todaysChallenge.aiSolution?.model || null, // Include AI model
      currentDailyChallengeId: todaysChallenge.id, // Include challenge ID
      startTime: Date.now(),
    };
    await saveCurrentGame(gameState);
  },

  selectWord: async (selectedWord: string) => {
    const {
      graphData,
      currentWord,
      targetWord,
      playerPath,
      optimalPath,
      gameStatus,
      suggestedPathFromCurrent,
      backtrackHistory,
      activeWordCollections,
      wordFrequencies,
      potentialRarestMovesThisGame,
      isChallenge,
    } = get();
    if (!graphData || !currentWord || !targetWord || gameStatus !== "playing")
      return;

    if (!graphData[currentWord]?.edges[selectedWord]) {
      return;
    }

    // --- Logic for "Putting on the Dog" ---
    let rarestOfferedThisStep: { word: string; frequency: number } | null =
      null;
    const directNeighborsEdges = graphData[currentWord]?.edges;
    if (
      directNeighborsEdges &&
      Object.keys(directNeighborsEdges).length > 0 &&
      wordFrequencies
    ) {
      const neighborFreqDetails = Object.keys(directNeighborsEdges)
        .map((neighborWord) => ({
          word: neighborWord,
          frequency: wordFrequencies[neighborWord] ?? Infinity,
        }))
        .sort((a, b) => a.frequency - b.frequency); // Sort by frequency, rarest first

      if (
        neighborFreqDetails.length > 0 &&
        neighborFreqDetails[0].frequency !== Infinity
      ) {
        rarestOfferedThisStep = neighborFreqDetails[0];
      }
    }

    const newPotentialRarestMovesList = [...potentialRarestMovesThisGame];
    if (rarestOfferedThisStep) {
      newPotentialRarestMovesList.push({
        word: rarestOfferedThisStep.word,
        frequency: rarestOfferedThisStep.frequency,
        playerChoseThisRarestOption:
          selectedWord === rarestOfferedThisStep.word,
      });
    }
    // --- End logic for "Putting on the Dog" ---

    const optimalChoice = trackOptimalChoice(
      graphData,
      currentWord,
      selectedWord,
      optimalPath,
      suggestedPathFromCurrent,
      targetWord,
      findShortestPath,
      wordFrequencies,
    );

    // Get all relevant information for logging BEFORE the move is made

    const newPlayerPath = [...playerPath, selectedWord];

    set({
      currentWord: selectedWord,
      playerPath: newPlayerPath,
      optimalChoices: [...get().optimalChoices, optimalChoice],
      potentialRarestMovesThisGame: newPotentialRarestMovesList, // Update the list
    });

    // Log available rare words for achievement testing from the NEW position
    if (graphData[selectedWord]?.edges && wordFrequencies) {
    }

    if (selectedWord === targetWord) {
      await clearCurrentGame();

      const finalOptimalChoices = get().optimalChoices;
      const finalBacktrackHistory = get().backtrackHistory;
      const finalPotentialRarestMoves = get().potentialRarestMovesThisGame; // Get the final list

      const report = generateGameReport(
        graphData,
        newPlayerPath,
        optimalPath,
        finalOptimalChoices,
        targetWord,
        findShortestPath,
        findShortestPath,
        finalBacktrackHistory,
        finalPotentialRarestMoves, // Pass to report
        get().isDailyChallenge, // Add daily challenge flag
        get().currentDailyChallenge?.id, // Add daily challenge ID
        get().aiPath, // Add AI path
        get().aiModel, // Add AI model
      );

      const earnedAchievements = evaluateAchievements(report, "won");
      report.earnedAchievements = earnedAchievements;

      set({
        gameStatus: "won",
        gameReport: report,
        pathDisplayMode: { player: true, optimal: true, suggested: false, ai: false },
      });
      await recordEndedGame(report, isChallenge, get().isDailyChallenge);

      if (activeWordCollections.length > 0) {
        checkAndRecordWordForCollections(selectedWord, activeWordCollections);
      }

      // Mark daily challenge as completed (even if won) to prevent returning to it
      if (get().isDailyChallenge && get().currentDailyChallenge) {
        const currentChallenge = get().currentDailyChallenge;
        if (currentChallenge) {
          await dailyChallengesService.saveDailyChallengeProgress(
            currentChallenge.id,
            {
              completed: true,
              completedAt: new Date().toISOString(),
              playerMoves: playerPath.length - 1,
              playerPath: playerPath,
              // No score for winning
            }
          );
          
          // Update the store state to reflect completion
          set({ hasPlayedTodaysChallenge: true });
        }
      }
      return;
    }

    const suggested = findShortestPath(graphData, selectedWord, targetWord);

    set({ suggestedPathFromCurrent: suggested });

    const gameStateToSave = {
      startWord: playerPath[0],
      targetWord: targetWord,
      currentWord: selectedWord,
      playerPath: newPlayerPath,
      optimalPath: optimalPath,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing" as const,
      optimalChoices: get().optimalChoices,
      backtrackHistory: backtrackHistory,
      potentialRarestMovesThisGame: get().potentialRarestMovesThisGame, // Save this list
      pathDisplayMode: get().pathDisplayMode,
      isChallenge, // Include challenge flag
      isDailyChallenge: get().isDailyChallenge, // Include daily challenge flag
      aiPath: get().aiPath, // Include AI path for daily challenges
      aiModel: get().aiModel, // Include AI model for daily challenges
      currentDailyChallengeId: get().currentDailyChallenge?.id, // Include daily challenge ID
    };
    await saveCurrentGame(gameStateToSave);

    if (activeWordCollections.length > 0) {
      checkAndRecordWordForCollections(selectedWord, activeWordCollections);
    }
  },

  giveUp: async () => {
    const {
      graphData,
      playerPath,
      targetWord,
      optimalChoices,
      backtrackHistory,
      potentialRarestMovesThisGame,
      isChallenge,
      optimalPath,
      isDailyChallenge,
      currentDailyChallenge,
    } = get();
    if (!graphData || !targetWord) return;

    await clearCurrentGame();

    const report = generateGameReport(
      graphData,
      playerPath,
      optimalPath,
      optimalChoices,
      targetWord,
      findShortestPath,
      findShortestPath,
      backtrackHistory,
      potentialRarestMovesThisGame,
      isDailyChallenge,
      currentDailyChallenge?.id, // Add daily challenge ID
      get().aiPath,
      get().aiModel,
    );

    const earnedAchievements = evaluateAchievements(report, "given_up");
    report.earnedAchievements = earnedAchievements;

    set({
      gameStatus: "given_up",
      gameReport: report,
      pathDisplayMode: { player: true, optimal: false, suggested: true, ai: false },
    });
    await recordEndedGame(report, isChallenge, isDailyChallenge);

    // Mark daily challenge as completed (even if given up) to prevent returning to it
    if (isDailyChallenge && currentDailyChallenge) {
      const currentChallenge = currentDailyChallenge;
      if (currentChallenge) {
        await dailyChallengesService.saveDailyChallengeProgress(
          currentChallenge.id,
          {
            completed: true,
            completedAt: new Date().toISOString(),
            playerMoves: playerPath.length - 1,
            playerPath: playerPath,
            // No score for giving up
          }
        );
        
        // Update the store state to reflect completion
        set({ hasPlayedTodaysChallenge: true });
      }
    }
  },

  setPathDisplayMode: (modeUpdate: Partial<PathDisplayMode>) => {
    set((state) => ({
      pathDisplayMode: { ...state.pathDisplayMode, ...modeUpdate },
    }));
  },

  setAboutModalVisible: (visible) => set({ aboutModalVisible: visible }),
  setStatsModalVisible: (visible) => set({ statsModalVisible: visible }),

  backtrackToWord: async (word: string, index: number) => {
    const {
      graphData,
      playerPath,
      optimalChoices,
      targetWord,
      startWord,
      currentWord: wordPlayerIsJumpingFrom,
      backtrackHistory,
      potentialRarestMovesThisGame,
    } = get();
    if (
      !graphData ||
      !playerPath ||
      !targetWord ||
      !startWord ||
      !wordPlayerIsJumpingFrom ||
      get().gameStatus !== "playing"
    )
      return;

    const alreadyBacktrackedToThisWord = backtrackHistory.some(
      (event) => event.landedOn === word,
    );
    if (alreadyBacktrackedToThisWord) {
      return;
    }

    const checkpointChoiceIndex = index - 1;
    if (
      checkpointChoiceIndex < 0 ||
      checkpointChoiceIndex >= optimalChoices.length
    ) {
      return;
    }

    const choiceToMark = optimalChoices[checkpointChoiceIndex];
    if (
      !(choiceToMark.isGlobalOptimal || choiceToMark.isLocalOptimal) ||
      choiceToMark.usedAsCheckpoint
    ) {
      return;
    }

    const newPlayerPath = playerPath.slice(0, index + 1);
    // Truncate optimalChoices and potentialRarestMovesThisGame to match the new path length
    // New path has newPlayerPath.length words, meaning (newPlayerPath.length - 1) moves.
    const numMoves = newPlayerPath.length - 1;
    const newOptimalChoicesBase = optimalChoices.slice(0, numMoves);
    const newPotentialRarestMoves = potentialRarestMovesThisGame.slice(
      0,
      numMoves,
    );

    const finalOptimalChoices = newOptimalChoicesBase.map((c, i) => {
      if (i === checkpointChoiceIndex) {
        return { ...c, usedAsCheckpoint: true };
      }
      return c;
    });

    const newCurrentWordAfterBacktrack =
      newPlayerPath[newPlayerPath.length - 1];
    const newOptimalPath = findShortestPath(graphData, startWord, targetWord);
    const suggested = findShortestPath(
      graphData,
      newCurrentWordAfterBacktrack,
      targetWord,
    );

    const newBacktrackEvent: BacktrackReportEntry = {
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
      targetWord: targetWord,
      currentWord: newCurrentWordAfterBacktrack,
      playerPath: newPlayerPath,
      optimalPath: newOptimalPath,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing" as const,
      optimalChoices: finalOptimalChoices,
      backtrackHistory: [...backtrackHistory, newBacktrackEvent],
      potentialRarestMovesThisGame: newPotentialRarestMoves, // Save truncated list
      pathDisplayMode: get().pathDisplayMode,
      isChallenge: get().isChallenge, // Include challenge flag
      isDailyChallenge: get().isDailyChallenge, // Include daily challenge flag
      aiPath: get().aiPath, // Include AI path for daily challenges
      aiModel: get().aiModel, // Include AI model for daily challenges
      currentDailyChallengeId: get().currentDailyChallenge?.id, // Include daily challenge ID
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
      return;
    }

    try {
      const testDate = new Date(new Date().getFullYear(), month - 1, day);
      const collections = await getFilteredWordCollections(
        allWordCollections,
        graphData,
        testDate,
      );
      set({
        wordCollections: collections,
        activeWordCollections: collections,
      });
    } catch (error) {}
  },

  // Add the setters
  setHasPendingChallenge: (hasPending) =>
    set({ hasPendingChallenge: hasPending }),
  setPendingChallengeWords: (words) => set({ pendingChallengeWords: words }),

  // Upgrade prompt actions
  showUpgradePrompt: (message: string) => {
    console.log('showUpgradePrompt called with message:', message);
    set({ upgradePromptVisible: true, upgradePromptMessage: message });
    console.log('showUpgradePrompt state updated - visible should be true');
  },
  hideUpgradePrompt: () => {
    console.log('hideUpgradePrompt called');
    console.trace('hideUpgradePrompt stack trace:'); // This will show us what called it
    set({ upgradePromptVisible: false, upgradePromptMessage: '' });
  },

  // Dialog visibility actions
  setDefinitionDialogWord: (word) => set({ definitionDialogWord: word }),
  setDefinitionDialogPathIndex: (index) =>
    set({ definitionDialogPathIndex: index }),
  setDefinitionDialogVisible: (visible) =>
    set({ definitionDialogVisible: visible }),
  setSelectedAchievement: (achievement) =>
    set({ selectedAchievement: achievement }),
  setAchievementDialogVisible: (visible) =>
    set({ achievementDialogVisible: visible }),
}));
