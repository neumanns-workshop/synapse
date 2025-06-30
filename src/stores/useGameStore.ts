import { create } from "zustand";

import type { UpgradeContext } from "../components/UpgradePrompt";
import type { Achievement } from "../features/achievements";
import { evaluateAchievements } from "../features/achievements";
import type {
  WordCollection,
  WordCollectionWithStatus,
} from "../features/wordCollections";
import {
  getAllWordCollectionsWithStatus,
  allWordCollections,
} from "../features/wordCollections";
import { dailyChallengesService } from "../services/DailyChallengesService";
import {
  loadGraphData,
  loadDefinitionsData,
  DefinitionsData,
  WordFrequencies,
  loadWordFrequencies,
} from "../services/dataLoader";
import type { GraphData } from "../types/gameTypes";
import {
  recordEndedGame,
  saveCurrentGame,
  loadCurrentGame,
  clearCurrentGame,
  saveTempGame,
  restoreTempGame,
  checkAndRecordWordForCollections,
} from "../services/StorageAdapter";
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

  // Modal visibility states - replaced aboutModalVisible with separate modals
  quickstartModalVisible: boolean;
  newsModalVisible: boolean;
  contactModalVisible: boolean;
  labsModalVisible: boolean;
  statsModalVisible: boolean; // Renamed from historyModalVisible
  dailiesModalVisible: boolean;

  // Game Report Modal state
  gameReportModalVisible: boolean;
  gameReportModalReport: GameReport | null;

  // Definition Dialog State
  definitionDialogWord: string | null;
  definitionDialogPathIndex: number | null; // To pass path index to dialog for context
  definitionDialogVisible: boolean;

  // Achievement Detail Dialog State
  selectedAchievement: Achievement | null;
  achievementDialogVisible: boolean;

  // Word Collections - Updated to use WordCollectionWithStatus
  wordCollections: WordCollectionWithStatus[];
  activeWordCollections: WordCollection[];

  // Challenge Mode
  isChallenge: boolean;
  shouldRestoreTempGame: boolean;

  // Daily Challenges
  isDailyChallenge: boolean;
  currentDailyChallenge: DailyChallenge | null;
  hasPlayedTodaysChallenge: boolean;
  remainingFreeGames: number;
  initialDataLoaded: boolean; // Add flag to track initial data loading

  // Challenge-related state
  hasPendingChallenge: boolean;
  pendingChallengeWords: { startWord: string; targetWord: string } | null;

  // Upgrade prompt state
  upgradePromptVisible: boolean;
  upgradePromptMessage: string;
  upgradePromptContext: UpgradeContext | undefined;
  upgradePromptDismissedThisSession: boolean;

  // Actions
  loadInitialData: () => Promise<boolean>;
  clearSavedData: () => void;
  startGame: () => void; // Start game action without difficulty
  startChallengeGame: (
    startWord: string,
    targetWord: string,
    dailyChallenge?: DailyChallenge,
  ) => Promise<void>; // New action for starting a challenge game
  startDailyChallengeGame: () => Promise<void>; // New action for starting today's daily challenge
  selectWord: (word: string) => void;
  giveUp: () => void; // New action for giving up
  setPathDisplayMode: (mode: Partial<PathDisplayMode>) => void; // Action to change visibility

  // Modal visibility actions - replaced setAboutModalVisible with separate actions
  setQuickstartModalVisible: (visible: boolean) => void;
  setNewsModalVisible: (visible: boolean) => void;
  setContactModalVisible: (visible: boolean) => void;
  setLabsModalVisible: (visible: boolean) => void;
  setStatsModalVisible: (visible: boolean) => void; // Renamed from setHistoryModalVisible
  setDailiesModalVisible: (visible: boolean) => void;

  // Game Report Modal actions
  showGameReportModal: (report: GameReport) => void;
  hideGameReportModal: () => void;

  backtrackToWord: (word: string, index: number) => void; // New action for backtracking to a previous optimal word
  // Definition Dialog Actions
  showWordDefinition: (word: string, pathIndex?: number | null) => void;
  hideWordDefinition: () => void;
  // Achievement Detail Dialog Actions
  showAchievementDetail: (achievement: Achievement) => void;
  hideAchievementDetail: () => void;

  // Testing function for date-based collections
  testWordCollectionsForDate: (month: number, day: number) => Promise<void>;

  // Challenge actions
  setHasPendingChallenge: (hasPending: boolean) => void;
  setPendingChallengeWords: (
    words: { startWord: string; targetWord: string } | null,
  ) => void;

  // Upgrade prompt actions
  showUpgradePrompt: (message: string, context?: UpgradeContext) => void;
  hideUpgradePrompt: () => void;
  resetUpgradePromptDismissal: () => void;

  // Dialog visibility actions
  setDefinitionDialogWord: (word) => void;
  setDefinitionDialogPathIndex: (index) => void;
  setDefinitionDialogVisible: (visible) => void;
  setSelectedAchievement: (achievement) => void;
  setAchievementDialogVisible: (visible) => void;

  // Function to refresh user's game access state after sign-in
  refreshGameAccessState: () => Promise<{ success: boolean; error?: string }>;

  // Add a reset function to restore the store to its initial state
  reset: () => void;
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
  const MIN_PATH_LENGTH = 4; // 3 steps (4 nodes)
  const MAX_PATH_LENGTH = 7; // 6 steps (7 nodes)
  const MAX_ATTEMPTS = 100; // Increased attempts slightly due to new constraint
  const MIN_NODE_DEGREE = 2; // Reduced from 3 for more lenient generation
  const MIN_TSNE_DISTANCE_SQUARED = 30 * 30; // Reduced from 50 * 50 for more lenient generation

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

      // Use base distance first, we'll adjust for path length later
      if (distSquared < MIN_TSNE_DISTANCE_SQUARED / 2) {
        continue;
      }
    }

    // Check if the words have enough connections
    const startDegree = Object.keys(startNodeData?.edges || {}).length;
    const endDegree = Object.keys(endNodeData?.edges || {}).length;

    // Use base degree first, we'll adjust for path length later
    if (startDegree < MIN_NODE_DEGREE || endDegree < MIN_NODE_DEGREE) {
      continue; // Skip this pair if either word doesn't have enough connections
    }

    // Find the shortest path between the words
    const path = findShortestPath(graphData, start, end);

    // Check if there is a valid path of appropriate length
    if (path.length >= MIN_PATH_LENGTH && path.length <= MAX_PATH_LENGTH) {
      // Now that we have the path, check if we need to be more lenient
      if (path.length <= 5) {
        // For shorter paths (3-4 steps), be more lenient with t-SNE distance
        if (startNodeData?.tsne && endNodeData?.tsne) {
          const dx = startNodeData.tsne[0] - endNodeData.tsne[0];
          const dy = startNodeData.tsne[1] - endNodeData.tsne[1];
          const distSquared = dx * dx + dy * dy;
          if (distSquared < MIN_TSNE_DISTANCE_SQUARED / 2) {
            continue;
          }
        }
      }

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

  // Modal visibility states - replaced aboutModalVisible with separate modals
  quickstartModalVisible: false,
  newsModalVisible: false,
  contactModalVisible: false,
  labsModalVisible: false,
  statsModalVisible: false,
  dailiesModalVisible: false,

  // Game Report Modal state
  gameReportModalVisible: false,
  gameReportModalReport: null,

  // Definition Dialog State
  definitionDialogWord: null,
  definitionDialogPathIndex: null,
  definitionDialogVisible: false,

  // Achievement Detail Dialog State
  selectedAchievement: null,
  achievementDialogVisible: false,

  // Word Collections - Updated to use WordCollectionWithStatus
  wordCollections: [],
  activeWordCollections: [],

  // Challenge Mode
  isChallenge: false,
  shouldRestoreTempGame: false,

  // Daily Challenges
  isDailyChallenge: false,
  currentDailyChallenge: null,
  hasPlayedTodaysChallenge: false,
  remainingFreeGames: 0,
  initialDataLoaded: false, // Add flag to track initial data loading

  // Challenge-related state
  hasPendingChallenge: false,
  pendingChallengeWords: null,

  // Upgrade prompt state
  upgradePromptVisible: false,
  upgradePromptMessage: "",
  upgradePromptContext: undefined,
  upgradePromptDismissedThisSession: false,

  loadInitialData: async (): Promise<boolean> => {
    try {
      console.log("🎮 loadInitialData: Starting");
      set({
        isLoadingData: true,
        errorLoadingData: null,
        potentialRarestMovesThisGame: [],
      }); // Reset on load

      const [
        graphData,
        definitionsData,
        wordFrequencies,
        savedGame,
        dailyChallengeState,
      ] = await Promise.all([
        loadGraphData(),
        loadDefinitionsData(),
        loadWordFrequencies(),
        loadCurrentGame(),
        dailyChallengesService.getDailyChallengeState(),
      ]);

      console.log("🎮 loadInitialData: Daily challenge state loaded:", {
        todaysChallenge: !!dailyChallengeState.todaysChallenge,
        challengeId: dailyChallengeState.todaysChallenge?.id,
        hasPlayedToday: dailyChallengeState.hasPlayedToday,
        remainingFreeGames: dailyChallengeState.remainingFreeGames,
        willPreventAutoStart: dailyChallengeState.remainingFreeGames === 0,
      });

      set({
        graphData,
        definitionsData,
        wordFrequencies,
        isLoadingData: false,
        // Update daily challenge state
        currentDailyChallenge: dailyChallengeState.todaysChallenge,
        hasPlayedTodaysChallenge: dailyChallengeState.hasPlayedToday,
        remainingFreeGames: dailyChallengeState.remainingFreeGames,
        initialDataLoaded: true,
      });

      console.log(
        "🎮 loadInitialData: Store state updated with daily challenge data",
      );

      if (graphData) {
        const allCollectionsWithStatus = await getAllWordCollectionsWithStatus(
          allWordCollections,
          graphData,
        );

        // For activeWordCollections, filter to only currently available ones and cast to WordCollection[]
        const currentlyActiveCollections: WordCollection[] =
          allCollectionsWithStatus
            .filter((collection) => collection.isCurrentlyAvailable)
            .map(({ isCurrentlyAvailable, ...collection }) => collection);

        if (savedGame && savedGame.gameStatus === "playing") {
          console.log("🎮 loadInitialData: Restoring saved game");

          // Check if this is a completed daily challenge that shouldn't be restored
          if (savedGame.isDailyChallenge && savedGame.currentDailyChallengeId) {
            const hasCompletedThisChallenge =
              await dailyChallengesService.hasCompletedTodaysChallenge();
            if (
              hasCompletedThisChallenge &&
              savedGame.currentDailyChallengeId ===
                dailyChallengeState.todaysChallenge?.id
            ) {
              console.log(
                "🎮 loadInitialData: Daily challenge already completed, clearing saved game",
              );
              await clearCurrentGame(false); // Clear the completed daily challenge game from regular storage
              // Don't restore the game, just set the collections and continue
              set((state) => ({
                ...state,
                wordCollections: allCollectionsWithStatus,
                activeWordCollections: currentlyActiveCollections,
                potentialRarestMovesThisGame: [], // Ensure reset if no saved game
              }));
              console.log("🎮 loadInitialData: Completed, returning false");
              return false;
            }
          }

          const suggested = findShortestPath(
            graphData,
            savedGame.currentWord || "",
            savedGame.targetWord || "",
          );

          // If this is a daily challenge, restore the challenge data
          let restoredDailyChallenge: DailyChallenge | null = null;
          if (savedGame.isDailyChallenge && savedGame.currentDailyChallengeId) {
            restoredDailyChallenge = dailyChallengesService.getChallengeForDate(
              savedGame.currentDailyChallengeId,
            );
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
            wordCollections: allCollectionsWithStatus,
            activeWordCollections: currentlyActiveCollections,
            // Restore daily challenge state
            isChallenge: savedGame.isChallenge || false,
            isDailyChallenge: savedGame.isDailyChallenge || false,
            aiPath: savedGame.aiPath || [],
            aiModel: savedGame.aiModel || null,
            // Only override currentDailyChallenge if this is a daily challenge game
            // Otherwise preserve the daily challenge data loaded earlier
            ...(savedGame.isDailyChallenge
              ? { currentDailyChallenge: restoredDailyChallenge }
              : {}),
          });

          console.log("🎮 loadInitialData: Game restored, returning true");
          return true;
        } else {
          console.log("🎮 loadInitialData: No saved game to restore");
          set((state) => ({
            ...state,
            wordCollections: allCollectionsWithStatus,
            activeWordCollections: currentlyActiveCollections,
            potentialRarestMovesThisGame: [], // Ensure reset if no saved game
          }));
        }
      }
      console.log("🎮 loadInitialData: Completed, returning false");
      return false;
    } catch (error) {
      console.error("🎮 loadInitialData: Error:", error);
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
    const {
      graphData,
      shouldRestoreTempGame,
      remainingFreeGames,
      upgradePromptVisible,
      upgradePromptDismissedThisSession,
      initialDataLoaded,
    } = get();

    // Prevent calling startGame if upgrade prompt is already visible
    if (upgradePromptVisible) {
      console.log("startGame: upgrade prompt already visible, skipping");
      return;
    }

    // **FIX:** Check for premium status EARLIER to override dismissal logic
    const isPremium = await dailyChallengesService.isPremiumUser();

    // Prevent calling startGame if upgrade prompt was dismissed this session and user has no free games
    // This should NOT apply to premium users.
    if (
      !isPremium &&
      upgradePromptDismissedThisSession &&
      remainingFreeGames <= 0
    ) {
      console.log(
        "startGame: upgrade prompt was dismissed and no free games, skipping for non-premium user",
      );
      set({ gameStatus: "idle" });
      return;
    }

    // Ensure initial data is loaded before proceeding
    if (!initialDataLoaded) {
      console.log("startGame: initial data not loaded yet, waiting...");
      // Wait for initial data to load
      await get().loadInitialData();
      // Get updated values after loading
      const updatedState = get();
      if (!updatedState.initialDataLoaded) {
        console.log("startGame: failed to load initial data");
        set({
          gameStatus: "idle",
          errorLoadingData: "Failed to load initial data.",
        });
        return;
      }
    }

    // Add debugging
    console.log("Starting game with:", {
      remainingFreeGames: get().remainingFreeGames, // Get fresh value
      hasPlayedTodaysChallenge: get().hasPlayedTodaysChallenge,
      currentDailyChallenge: !!get().currentDailyChallenge,
      shouldRestoreTempGame,
      initialDataLoaded: get().initialDataLoaded,
    });

    if (!graphData) {
      set({ gameStatus: "idle", errorLoadingData: "Graph data missing." });
      return;
    }

    // Get fresh remaining free games value
    const currentRemainingFreeGames = get().remainingFreeGames;

    // Check if user has free games left, or is premium
    if (!isPremium && currentRemainingFreeGames <= 0) {
      // User is not premium and has no free games
      console.log(
        "startGame: No free games remaining. Showing upgrade prompt.",
      );
      get().showUpgradePrompt(
        "You're out of free games for today. Upgrade to Synapse Premium for unlimited play!",
        "freeGamesLimited",
      );
      return; // Stop game start process
    }

    // Restore temporary game if needed
    if (shouldRestoreTempGame) {
      const restored = await restoreTempGame();
      if (restored) {
        // Find suggested path for restored game
        const suggested = findShortestPath(
          graphData,
          restored.currentWord || "",
          restored.targetWord || "",
        );

        set({
          startWord: restored.startWord,
          targetWord: restored.targetWord,
          currentWord: restored.currentWord,
          playerPath: restored.playerPath,
          optimalPath: restored.optimalPath,
          suggestedPathFromCurrent: suggested,
          gameStatus: "playing",
          optimalChoices: restored.optimalChoices,
          backtrackHistory: restored.backtrackHistory,
          potentialRarestMovesThisGame:
            restored.potentialRarestMovesThisGame || [],
          pathDisplayMode: {
            ...restored.pathDisplayMode,
            suggested: false,
          },
          isChallenge: restored.isChallenge || false,
          shouldRestoreTempGame: false, // Reset flag
        });
        await clearCurrentGame(true); // Clear temp storage
        return; // Game restored, exit function
      }
      // If restoration fails, fall through to start a new game
      set({ shouldRestoreTempGame: false }); // Reset flag
    }

    // Check if we should prioritize today's daily challenge
    // Priority: if user hasn't played today's challenge and there is one available
    // BUT only if we're not already in a game (to avoid overwriting unfinished games)
    // AND only if this is the initial game start (not a user-requested random game after completing daily challenge)
    const currentGameStatus = get().gameStatus;
    const freshHasPlayedTodaysChallenge = get().hasPlayedTodaysChallenge;
    const freshCurrentDailyChallenge = get().currentDailyChallenge;

    console.log("🎮 startGame: Checking daily challenge priority:", {
      currentGameStatus,
      freshHasPlayedTodaysChallenge,
      freshCurrentDailyChallenge: !!freshCurrentDailyChallenge,
      challengeId: freshCurrentDailyChallenge?.id,
      challengeDate: freshCurrentDailyChallenge?.date,
      upgradePromptVisible: get().upgradePromptVisible,
      upgradePromptDismissedThisSession:
        get().upgradePromptDismissedThisSession,
      isDailyChallenge: get().isDailyChallenge,
      isChallenge: get().isChallenge,
      hasPendingChallenge: get().hasPendingChallenge,
      pendingChallengeWords: get().pendingChallengeWords,
    });

    // Check persistent storage FIRST to get the authoritative completion status
    // This fixes the bug where users are taken back to completed daily challenges after sign-in
    const hasCompletedPersistent = freshCurrentDailyChallenge
      ? await dailyChallengesService.hasCompletedTodaysChallenge()
      : true; // If no challenge exists, consider it "completed" to skip auto-start

    console.log("🎮 startGame: Daily challenge completion check:", {
      freshHasPlayedTodaysChallenge,
      hasCompletedPersistent,
      willAutoStart: !hasCompletedPersistent && freshCurrentDailyChallenge,
    });

    // If persistent storage shows completion but store doesn't, sync the store state
    if (hasCompletedPersistent && !freshHasPlayedTodaysChallenge) {
      console.log(
        "🎮 startGame: Syncing completion state from persistent storage",
      );
      set({ hasPlayedTodaysChallenge: true });
    }

    // Only auto-start daily challenge if:
    // 1. Game status is idle, won, given_up, or lost (not currently playing)
    // 2. Challenge has NOT been completed according to persistent storage (authoritative)
    // 3. There is a daily challenge available
    // 4. Upgrade prompt wasn't dismissed this session (respect user's intent to not auto-start)
    if (
      (currentGameStatus === "idle" ||
        currentGameStatus === "won" ||
        currentGameStatus === "given_up" ||
        currentGameStatus === "lost") &&
      !hasCompletedPersistent &&
      freshCurrentDailyChallenge &&
      !upgradePromptDismissedThisSession
    ) {
      console.log(
        "🎮 startGame: Starting daily challenge instead of random game",
      );
      await get().startDailyChallengeGame();
      return;
    } else if (currentGameStatus === "playing") {
      console.log(
        "🎮 startGame: Already in a game, not overriding with daily challenge",
      );
      return; // Don't start a new game if already playing
    } else if (upgradePromptDismissedThisSession) {
      console.log(
        "🎮 startGame: Skipping daily challenge auto-start because upgrade prompt was dismissed",
      );
    }

    // Consume a free game before starting (since we passed the limit check)
    // Only consume for non-premium users
    if (!isPremium) {
      console.log(
        "Consuming free game, remaining before:",
        currentRemainingFreeGames,
      );
      await dailyChallengesService.consumeFreeGame();

      // Update the store with the new remaining count
      const newRemainingFreeGames =
        await dailyChallengesService.getRemainingFreeGames();
      console.log(
        "Free games remaining after consumption:",
        newRemainingFreeGames,
      );
      set({ remainingFreeGames: newRemainingFreeGames });
    } else {
      console.log("Premium user - not consuming free game");
    }

    // If no restoration or it failed, continue with normal game start
    await clearCurrentGame(false); // Clear regular game, not challenge

    // ** CRITICAL: Reset all game-related state for a clean slate **
    const defaultState = useGameStore.getInitialState();
    set({
      ...defaultState,
      // But preserve essential data that shouldn't be reset
      graphData: get().graphData,
      definitionsData: get().definitionsData,
      wordFrequencies: get().wordFrequencies,
      initialDataLoaded: get().initialDataLoaded,
      wordCollections: get().wordCollections,
      activeWordCollections: get().activeWordCollections,
      // And the modal states
      quickstartModalVisible: get().quickstartModalVisible,
      newsModalVisible: get().newsModalVisible,
      contactModalVisible: get().contactModalVisible,
      labsModalVisible: get().labsModalVisible,
      statsModalVisible: get().statsModalVisible,
      dailiesModalVisible: get().dailiesModalVisible,
      // And daily challenge/free game status
      currentDailyChallenge: get().currentDailyChallenge,
      hasPlayedTodaysChallenge: get().hasPlayedTodaysChallenge,
      remainingFreeGames: get().remainingFreeGames,
      upgradePromptDismissedThisSession:
        get().upgradePromptDismissedThisSession,

      // Now, set the loading status for the new game
      gameStatus: "loading",
      errorLoadingData: null,
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

  startChallengeGame: async (
    startWord: string,
    targetWord: string,
    dailyChallenge?: DailyChallenge,
  ) => {
    const { graphData } = get();
    if (!graphData) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Graph data missing.",
        // Clear pending challenge state on failure
        hasPendingChallenge: false,
        pendingChallengeWords: null,
      });
      return;
    }

    // Verify words exist in the graph
    if (!graphData[startWord] || !graphData[targetWord]) {
      set({
        gameStatus: "idle",
        errorLoadingData: "Challenge words not found in graph.",
        // Clear pending challenge state on failure
        hasPendingChallenge: false,
        pendingChallengeWords: null,
      });
      return;
    }

    // Check if a path exists between the words
    const pathBetweenWords = findShortestPath(graphData, startWord, targetWord);
    if (pathBetweenWords.length === 0) {
      set({
        gameStatus: "idle",
        errorLoadingData: "No path exists for this challenge.",
        // Clear pending challenge state on failure
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
    await clearCurrentGame(!dailyChallenge); // Clear challenge storage for player challenges, regular storage for daily challenges

    // Clear pending challenge state and upgrade prompt dismissal when starting challenge
    // Challenges should always be playable regardless of upgrade prompt state
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
      isChallenge: !dailyChallenge, // Only true for regular challenges, false for daily challenges
      isDailyChallenge: !!dailyChallenge, // Mark as daily challenge if provided
      currentDailyChallenge: dailyChallenge || null,
      // Clear pending challenge state on successful start
      hasPendingChallenge: false,
      pendingChallengeWords: null,
      // Hide any upgrade prompt and reset dismissal state for challenges
      upgradePromptVisible: false,
      upgradePromptMessage: "",
      upgradePromptDismissedThisSession: false,
    });

    const optimal = findShortestPath(graphData, startWord, targetWord);
    const suggested = findShortestPath(graphData, startWord, targetWord);

    // Get AI solution path from daily challenge data if available
    const aiSolutionPath = dailyChallenge?.aiSolution?.path || [];

    set({
      startWord,
      targetWord: targetWord,
      currentWord: startWord,
      playerPath: [startWord],
      optimalPath: optimal,
      suggestedPathFromCurrent: suggested,
      aiPath: aiSolutionPath,
      aiModel: dailyChallenge?.aiSolution?.model || null,
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
      isChallenge: !dailyChallenge, // Only true for regular challenges, false for daily challenges
      isDailyChallenge: !!dailyChallenge, // Mark as daily challenge if provided
      aiPath: aiSolutionPath, // Include AI path
      aiModel: dailyChallenge?.aiSolution?.model || null, // Include AI model
      currentDailyChallengeId: dailyChallenge?.id, // Include challenge ID if available
      startTime: Date.now(),
    };
    await saveCurrentGame(gameState);
  },

  startDailyChallengeGame: async () => {
    console.log("🎮 startDailyChallengeGame called");
    const { graphData } = get();
    if (!graphData) {
      console.log("🎮 startDailyChallengeGame: No graph data");
      set({
        gameStatus: "idle",
        errorLoadingData: "Graph data missing.",
      });
      return;
    }

    // Get today's challenge
    const todaysChallenge = dailyChallengesService.getTodaysChallenge();
    console.log(
      "🎮 startDailyChallengeGame: Today's challenge:",
      todaysChallenge,
    );
    if (!todaysChallenge) {
      console.log("🎮 startDailyChallengeGame: No daily challenge available");
      set({
        gameStatus: "idle",
        errorLoadingData: "No daily challenge available for today.",
      });
      return;
    }

    // Allow replaying daily challenges, but warn if already completed
    const hasCompleted =
      await dailyChallengesService.hasCompletedTodaysChallenge();
    console.log(
      "🎮 startDailyChallengeGame: Has completed today's challenge:",
      hasCompleted,
    );
    if (hasCompleted) {
      console.log(
        "🎮 startDailyChallengeGame: Starting daily challenge replay (already completed)",
      );
      // Allow replay but mark as completed in store to prevent auto-prioritization
      set({ hasPlayedTodaysChallenge: true });
    }

    // Verify words exist in the graph
    if (
      !graphData[todaysChallenge.startWord] ||
      !graphData[todaysChallenge.targetWord]
    ) {
      console.log(
        "🎮 startDailyChallengeGame: Challenge words not found in graph",
      );
      set({
        gameStatus: "idle",
        errorLoadingData: "Daily challenge words not found in graph.",
      });
      return;
    }

    // Check if a path exists between the words
    const pathBetweenWords = findShortestPath(
      graphData,
      todaysChallenge.startWord,
      todaysChallenge.targetWord,
    );
    if (pathBetweenWords.length === 0) {
      console.log("🎮 startDailyChallengeGame: No path exists for challenge");
      set({
        gameStatus: "idle",
        errorLoadingData: "No path exists for today's challenge.",
      });
      return;
    }

    console.log("🎮 startDailyChallengeGame: Starting daily challenge game");

    // Check for existing game to save temporarily
    const currentGame = await loadCurrentGame(false); // Load regular game
    if (currentGame && currentGame.gameStatus === "playing") {
      await saveTempGame(currentGame); // Save to temp storage
      set({ shouldRestoreTempGame: true });
    }

    // Clear any existing daily challenge game (use regular storage since daily challenges have isChallenge: false)
    await clearCurrentGame(false); // Clear regular storage for daily challenges

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
      isChallenge: false, // Daily challenges are NOT challenges
      isDailyChallenge: true, // Mark as daily challenge
      currentDailyChallenge: todaysChallenge,
    });

    const optimal = findShortestPath(
      graphData,
      todaysChallenge.startWord,
      todaysChallenge.targetWord,
    );
    const suggested = findShortestPath(
      graphData,
      todaysChallenge.startWord,
      todaysChallenge.targetWord,
    );

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
      isChallenge: false, // Daily challenges are NOT challenges
      isDailyChallenge: true, // Mark as daily challenge
      aiPath: aiSolutionPath, // Include AI path
      aiModel: todaysChallenge.aiSolution?.model || null, // Include AI model
      currentDailyChallengeId: todaysChallenge.id, // Include challenge ID
      startTime: Date.now(),
    };
    await saveCurrentGame(gameState);

    console.log(
      "🎮 startDailyChallengeGame: Daily challenge game started successfully",
    );
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
        pathDisplayMode: {
          player: true,
          optimal: false,
          suggested: false,
          ai: false,
        },
        gameReportModalVisible: true,
        gameReportModalReport: report,
      });
      await recordEndedGame(report, isChallenge, get().isDailyChallenge);

      if (activeWordCollections.length > 0) {
        checkAndRecordWordForCollections(selectedWord, activeWordCollections);
      }

      // Mark daily challenge as completed (even if won) to prevent returning to it
      if (get().isDailyChallenge && get().currentDailyChallenge) {
        const currentChallenge = get().currentDailyChallenge;
        if (currentChallenge) {
          try {
            await dailyChallengesService.saveDailyChallengeProgress(
              currentChallenge.id,
              {
                status: "won",
                completedAt: new Date().toISOString(),
                playerMoves: newPlayerPath.length - 1,
                playerPath: newPlayerPath,
                // No score for winning
              },
            );

            // Update the store state to reflect completion
            set({ hasPlayedTodaysChallenge: true });
          } catch (error) {
            console.error("Failed to save daily challenge progress:", error);
            // Continue with game completion even if save fails
            // The user has still won the game, we just couldn't save the progress
          }
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

    await clearCurrentGame(isChallenge);

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
      pathDisplayMode: {
        player: true,
        optimal: false,
        suggested: false,
        ai: false,
      },
      gameReportModalVisible: true,
      gameReportModalReport: report,
    });
    await recordEndedGame(report, isChallenge, isDailyChallenge);

    // Mark daily challenge as completed (even if given up) to prevent returning to it
    if (isDailyChallenge && currentDailyChallenge) {
      const currentChallenge = currentDailyChallenge;
      if (currentChallenge) {
        try {
          await dailyChallengesService.saveDailyChallengeProgress(
            currentChallenge.id,
            {
              status: "given_up",
              completedAt: new Date().toISOString(),
              playerMoves: playerPath.length - 1,
              playerPath: playerPath,
              // No score for giving up
            },
          );

          // Update the store state to reflect completion
          set({ hasPlayedTodaysChallenge: true });
        } catch (error) {
          console.error("Failed to save daily challenge progress:", error);
          // Continue with game completion even if save fails
          // The user has still given up the game, we just couldn't save the progress
        }
      }
    }
  },

  setPathDisplayMode: (modeUpdate: Partial<PathDisplayMode>) => {
    set((state) => ({
      pathDisplayMode: { ...state.pathDisplayMode, ...modeUpdate },
    }));
  },

  setQuickstartModalVisible: (visible) =>
    set({ quickstartModalVisible: visible }),
  setNewsModalVisible: (visible) => set({ newsModalVisible: visible }),
  setContactModalVisible: (visible) => set({ contactModalVisible: visible }),
  setLabsModalVisible: (visible) => set({ labsModalVisible: visible }),
  setStatsModalVisible: (visible) => set({ statsModalVisible: visible }),
  setDailiesModalVisible: (visible) => set({ dailiesModalVisible: visible }),

  // Game Report Modal actions
  showGameReportModal: (report) =>
    set({
      gameReportModalVisible: true,
      gameReportModalReport: report,
    }),
  hideGameReportModal: () =>
    set({
      gameReportModalVisible: false,
      gameReportModalReport: null,
    }),

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
      const allCollectionsWithStatus = await getAllWordCollectionsWithStatus(
        allWordCollections,
        graphData,
        testDate,
      );

      // For activeWordCollections, filter to only currently available ones and cast to WordCollection[]
      const currentlyActiveCollections: WordCollection[] =
        allCollectionsWithStatus
          .filter((collection) => collection.isCurrentlyAvailable)
          .map(({ isCurrentlyAvailable, ...collection }) => collection);

      set({
        wordCollections: allCollectionsWithStatus,
        activeWordCollections: currentlyActiveCollections,
      });
    } catch (error) {}
  },

  // Add the setters
  setHasPendingChallenge: (hasPending) =>
    set({ hasPendingChallenge: hasPending }),
  setPendingChallengeWords: (words) => set({ pendingChallengeWords: words }),

  // Upgrade prompt actions
  showUpgradePrompt: (message: string, context?: UpgradeContext) => {
    console.log("🔍 showUpgradePrompt called with:", {
      message,
      context,
      currentGameStatus: get().gameStatus,
      hasActiveGame: !!(get().startWord && get().targetWord),
      remainingFreeGames: get().remainingFreeGames,
    });
    set({
      upgradePromptVisible: true,
      upgradePromptMessage: message,
      upgradePromptContext: context,
      // IMPORTANT: Set game status to idle to prevent race conditions with auto-start logic
      gameStatus: "idle",
      errorLoadingData: null, // Clear any error state
    });
    console.log("showUpgradePrompt state updated - visible should be true");
  },
  hideUpgradePrompt: () => {
    console.log("hideUpgradePrompt called");
    const currentContext = get().upgradePromptContext;
    const currentGameStatus = get().gameStatus;
    const hasActiveGame = get().startWord && get().targetWord;

    console.log("🔍 hideUpgradePrompt debug:", {
      currentContext,
      currentGameStatus,
      hasActiveGame,
      startWord: get().startWord,
      targetWord: get().targetWord,
      playerPath: get().playerPath?.length || 0,
    });

    // Only clear game state if this was a "no free games" upgrade prompt
    // Don't clear state for general upgrades, experimental features, etc.
    // Also don't clear if user has an active game in progress (they should be able to continue)
    const shouldClearGameState =
      currentContext === "freeGamesLimited" &&
      currentGameStatus !== "playing" &&
      currentGameStatus !== "won";

    console.log("🔍 shouldClearGameState:", shouldClearGameState, "because:", {
      isFreeGamesLimited: currentContext === "freeGamesLimited",
      notPlaying: currentGameStatus !== "playing",
      notWon: currentGameStatus !== "won",
    });

    if (shouldClearGameState) {
      // User hit free games limit and dismissed - clear partial game state
      set({
        upgradePromptVisible: false,
        upgradePromptMessage: "",
        upgradePromptDismissedThisSession: true, // Mark as dismissed for this session
        upgradePromptContext: undefined,
        // Ensure we're in idle state when dismissed to prevent loading text
        gameStatus: "idle",
        errorLoadingData: null, // Clear any error state
        // Clear any partial game state that might be confusing
        startWord: null,
        targetWord: null,
        currentWord: null,
        playerPath: [],
        optimalPath: [],
        suggestedPathFromCurrent: [],
        gameReport: null,
        optimalChoices: [],
        backtrackHistory: [],
        potentialRarestMovesThisGame: [],
        // Reset path display mode to default
        pathDisplayMode: {
          player: true,
          optimal: false,
          suggested: false,
          ai: false,
        },
        // Clear challenge state
        isChallenge: false,
        isDailyChallenge: false,
        hasPendingChallenge: false,
        pendingChallengeWords: null,
      });
    } else {
      // For other upgrade contexts (general, experimental features, etc.)
      // Just hide the prompt without clearing game state
      set({
        upgradePromptVisible: false,
        upgradePromptMessage: "",
        upgradePromptDismissedThisSession: true, // Always mark as dismissed
        upgradePromptContext: undefined,
        // Don't change game status or clear game state for non-blocking upgrade prompts
      });
    }
  },
  resetUpgradePromptDismissal: () => {
    set({ upgradePromptDismissedThisSession: false });
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

  // Function to refresh user's game access state after sign-in
  refreshGameAccessState: async () => {
    console.log("🔄 Refreshing game access state after sign-in...");

    try {
      // Get fresh daily challenge state (includes premium status and free games)
      const dailyChallengeState =
        await dailyChallengesService.getDailyChallengeState();

      console.log("🔄 Fresh daily challenge state:", {
        isPremium: dailyChallengeState.isPremium,
        remainingFreeGames: dailyChallengeState.remainingFreeGames,
        hasPlayedToday: dailyChallengeState.hasPlayedToday,
        todaysChallengeId: dailyChallengeState.todaysChallenge?.id,
        progressKeys: Object.keys(dailyChallengeState.progress),
      });

      // Update store with fresh data
      set({
        currentDailyChallenge: dailyChallengeState.todaysChallenge,
        hasPlayedTodaysChallenge: dailyChallengeState.hasPlayedToday,
        remainingFreeGames: dailyChallengeState.remainingFreeGames,
      });

      // If user now has access to games (premium or free games available),
      // reset the upgrade prompt dismissal state
      const hasGameAccess =
        dailyChallengeState.isPremium ||
        dailyChallengeState.remainingFreeGames > 0;

      if (hasGameAccess) {
        console.log(
          "🎮 User now has game access - resetting upgrade prompt dismissal",
        );
        set({
          upgradePromptDismissedThisSession: false,
          upgradePromptVisible: false, // Hide any visible upgrade prompt
          upgradePromptMessage: "",
          upgradePromptContext: undefined,
        });
      }

      console.log("✅ Game access state refreshed successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ Error refreshing game access state:", error);
      return {
        success: false,
        error: (error as Error).message || "An unknown error occurred",
      };
    }
  },

  // Reset function implementation - CONSERVATIVE: Only clear UI state, preserve all user data
  reset: () => {
    console.log(
      "🔄 Resetting useGameStore UI state only (preserving all user data)",
    );
    set({
      // ONLY clear UI state that might show stale "logged in" appearance

      // Close all modals and dialogs
      quickstartModalVisible: false,
      newsModalVisible: false,
      contactModalVisible: false,
      labsModalVisible: false,
      statsModalVisible: false,
      dailiesModalVisible: false,
      gameReportModalVisible: false,
      gameReportModalReport: null,
      definitionDialogWord: null,
      definitionDialogPathIndex: null,
      definitionDialogVisible: false,
      selectedAchievement: null,
      achievementDialogVisible: false,

      // Clear any current upgrade prompts
      upgradePromptVisible: false,
      upgradePromptMessage: "",
      upgradePromptContext: undefined,
      upgradePromptDismissedThisSession: false,
    });
  },
}));
