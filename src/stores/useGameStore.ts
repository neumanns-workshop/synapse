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
  endWord: string | null;
  currentWord: string | null;
  playerPath: string[];
  optimalPath: string[]; // Path from startWord to endWord
  suggestedPathFromCurrent: string[]; // Path from currentWord to endWord
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

  // Actions
  loadInitialData: () => Promise<boolean>;
  clearSavedData: () => void;
  startGame: () => void; // Start game action without difficulty
  startChallengeGame: (startWord: string, targetWord: string) => Promise<void>; // New action for starting a challenge game
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
}

// Improved function to find a valid word pair with a proper path between them
const findValidWordPair = (
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
  endWord: null,
  currentWord: null,
  playerPath: [],
  optimalPath: [],
  suggestedPathFromCurrent: [],
  potentialRarestMovesThisGame: [], // Initialized
  pathDisplayMode: {
    player: true,
    optimal: false,
    suggested: false,
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

  loadInitialData: async (): Promise<boolean> => {
    try {
      set({
        isLoadingData: true,
        errorLoadingData: null,
        potentialRarestMovesThisGame: [],
      }); // Reset on load

      const [graphData, definitionsData, wordFrequencies, savedGame] =
        await Promise.all([
          loadGraphData(),
          loadDefinitionsData(),
          loadWordFrequencies(),
          loadCurrentGame(),
        ]);

      set({
        graphData,
        definitionsData,
        wordFrequencies,
        isLoadingData: false,
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
            savedGame.endWord || "",
          );
          set({
            startWord: savedGame.startWord,
            endWord: savedGame.endWord,
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
    const { graphData, shouldRestoreTempGame } = get();
    if (!graphData) {
      set({ gameStatus: "idle", errorLoadingData: "Graph data missing." });
      return;
    }

    // Check if we should restore a temporary saved game
    if (shouldRestoreTempGame) {
      const tempGame = await restoreTempGame();
      if (tempGame) {
        set({
          startWord: tempGame.startWord,
          endWord: tempGame.endWord,
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
          },
          isChallenge: false,
          shouldRestoreTempGame: false,
        });

        return;
      }
    }

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
      },
      isChallenge: false,
      shouldRestoreTempGame: false,
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
        gameStatus: "playing",
      });

      const gameState = {
        startWord: start,
        endWord: end,
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
      },
      isChallenge: true, // Mark as challenge
    });

    const optimal = findShortestPath(graphData, startWord, targetWord);
    const suggested = findShortestPath(graphData, startWord, targetWord);

    set({
      startWord,
      endWord: targetWord,
      currentWord: startWord,
      playerPath: [startWord],
      optimalPath: optimal,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing",
    });

    const gameState = {
      startWord,
      endWord: targetWord,
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
      },
      isChallenge: true,
      startTime: Date.now(),
    };
    await saveCurrentGame(gameState);
  },

  selectWord: async (selectedWord: string) => {
    const {
      graphData,
      currentWord,
      endWord,
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
    if (!graphData || !currentWord || !endWord || gameStatus !== "playing")
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
      endWord,
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

    if (selectedWord === endWord) {
      await clearCurrentGame();

      const finalOptimalChoices = get().optimalChoices;
      const finalBacktrackHistory = get().backtrackHistory;
      const finalPotentialRarestMoves = get().potentialRarestMovesThisGame; // Get the final list

      const report = generateGameReport(
        graphData,
        newPlayerPath,
        optimalPath,
        finalOptimalChoices,
        endWord,
        findShortestPath,
        findShortestPath,
        finalBacktrackHistory,
        finalPotentialRarestMoves, // Pass to report
      );

      const earnedAchievements = evaluateAchievements(report, "won");
      report.earnedAchievements = earnedAchievements;

      set({
        gameStatus: "won",
        gameReport: report,
        pathDisplayMode: { player: true, optimal: true, suggested: false },
      });
      await recordEndedGame(report);

      if (activeWordCollections.length > 0) {
        checkAndRecordWordForCollections(selectedWord, activeWordCollections);
      }
      return;
    }

    const suggested = findShortestPath(graphData, selectedWord, endWord);

    set({ suggestedPathFromCurrent: suggested });

    const gameStateToSave = {
      startWord: playerPath[0],
      endWord: endWord,
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
      endWord,
      optimalChoices,
      backtrackHistory,
      potentialRarestMovesThisGame,
      isChallenge,
      optimalPath,
    } = get();
    if (!graphData || !endWord) return;

    await clearCurrentGame();

    const report = generateGameReport(
      graphData,
      playerPath,
      optimalPath,
      optimalChoices,
      endWord,
      findShortestPath,
      findShortestPath,
      backtrackHistory,
      potentialRarestMovesThisGame, // Pass to report
    );

    const earnedAchievements = evaluateAchievements(report, "given_up");
    report.earnedAchievements = earnedAchievements;

    set({
      gameStatus: "given_up",
      gameReport: report,
      pathDisplayMode: { player: true, optimal: false, suggested: true },
    });
    await recordEndedGame(report, isChallenge);
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
      endWord,
      startWord,
      currentWord: wordPlayerIsJumpingFrom,
      backtrackHistory,
      potentialRarestMovesThisGame,
    } = get();
    if (
      !graphData ||
      !playerPath ||
      !endWord ||
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
    const newOptimalPath = findShortestPath(graphData, startWord, endWord);
    const suggested = findShortestPath(
      graphData,
      newCurrentWordAfterBacktrack,
      endWord,
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
      endWord: endWord,
      currentWord: newCurrentWordAfterBacktrack,
      playerPath: newPlayerPath,
      optimalPath: newOptimalPath,
      suggestedPathFromCurrent: suggested,
      gameStatus: "playing" as const,
      optimalChoices: finalOptimalChoices,
      backtrackHistory: [...backtrackHistory, newBacktrackEvent],
      potentialRarestMovesThisGame: newPotentialRarestMoves, // Save truncated list
      pathDisplayMode: get().pathDisplayMode,
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
}));
