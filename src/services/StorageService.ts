import AsyncStorage from "@react-native-async-storage/async-storage";

// import type { Achievement } from "../features/achievements"; // Removed unused import
import type { WordCollection } from "../features/wordCollections";
import type { GameState } from "../stores/useGameStore";
import type { GameReport } from "../utils/gameReportUtils";

const GAME_HISTORY_KEY = "synapse_game_history";
const LIFETIME_STATS_KEY = "synapse_lifetime_stats";
const UNLOCKED_ACHIEVEMENTS_KEY = "synapse_unlocked_achievements";
const WORD_COLLECTIONS_PROGRESS_KEY = "synapse_word_collections_progress";
const CURRENT_GAME_KEY = "synapse_current_game";
const CHALLENGE_GAME_KEY = "synapse_challenge_game"; // New key for challenge games
const TEMP_SAVED_GAME_KEY = "synapse_temp_saved_game"; // New key for temporary saved games

export interface LifetimeStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalGaveUps: number;
  achievementsUnlocked: number;
  cumulativeMoveAccuracySum: number;
  // For now, keep it simple. More stats can be added later.
  // totalOptimalPathMoves: number;
  // totalBacktracksUsed: number;
}

const initialLifetimeStats: LifetimeStats = {
  totalGamesPlayed: 0,
  totalWins: 0,
  totalGaveUps: 0,
  achievementsUnlocked: 0,
  cumulativeMoveAccuracySum: 0,
};

// --- Game History ---
export const saveGameToHistory = async (
  gameReport: GameReport,
): Promise<void> => {
  try {
    const history = await loadGameHistory();
    // Add new report to the beginning and keep only the last 50 games
    const newHistory = [gameReport, ...history].slice(0, 50);
    await AsyncStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {}
};

export const loadGameHistory = async (): Promise<GameReport[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(GAME_HISTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

// --- Lifetime Stats ---
export const getLifetimeStats = async (): Promise<LifetimeStats> => {
  try {
    const jsonValue = await AsyncStorage.getItem(LIFETIME_STATS_KEY);
    return jsonValue != null
      ? JSON.parse(jsonValue)
      : { ...initialLifetimeStats };
  } catch (e) {
    return { ...initialLifetimeStats };
  }
};

export const updateLifetimeStatsOnGameEnd = async (
  gameReport: GameReport,
): Promise<void> => {
  try {
    const currentStats = await getLifetimeStats();
    const newStats: LifetimeStats = {
      ...currentStats,
      totalGamesPlayed: (currentStats.totalGamesPlayed || 0) + 1,
      cumulativeMoveAccuracySum: (currentStats.cumulativeMoveAccuracySum || 0) + (gameReport.moveAccuracy || 0),
    };
    if (gameReport.status === "won") {
      newStats.totalWins = (currentStats.totalWins || 0) + 1;
    } else if (gameReport.status === "given_up") {
      newStats.totalGaveUps = (currentStats.totalGaveUps || 0) + 1;
    }
    await AsyncStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(newStats));
  } catch (e) {}
};

// --- Unlocked Achievements Implementation ---
export const getUnlockedAchievementIds = async (): Promise<string[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

export const markAchievementAsUnlocked = async (
  achievementId: string,
): Promise<void> => {
  try {
    const currentAchievements = await getUnlockedAchievementIds();
    // Only add if not already unlocked
    if (!currentAchievements.includes(achievementId)) {
      const updatedAchievements = [...currentAchievements, achievementId];
      await AsyncStorage.setItem(
        UNLOCKED_ACHIEVEMENTS_KEY,
        JSON.stringify(updatedAchievements),
      );
      // console.log(`Achievement unlocked: ${achievementId}`); // Keep this for next edit pass

      // Update lifetime stats for achievements unlocked
      const currentStats = await getLifetimeStats();
      const newStats: LifetimeStats = {
        ...currentStats,
        achievementsUnlocked: (currentStats.achievementsUnlocked || 0) + 1,
      };
      await AsyncStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(newStats));
    }
  } catch (e) {}
};

// Updated to also mark achievement IDs as unlocked
export const recordEndedGame = async (
  gameReport: GameReport,
  isChallenge = false,
  isDailyChallenge = false,
): Promise<void> => {
  // Ensure gameReport has an id and timestamp, if not added during generation
  const reportToSave = {
    ...gameReport,
    id: gameReport.id || Date.now().toString(),
    timestamp: gameReport.timestamp || Date.now(),
    isChallenge: isChallenge, // Add flag to identify challenge games in history
    isDailyChallenge: isDailyChallenge, // Add flag to identify daily challenge games
  };

  await saveGameToHistory(reportToSave);
  await updateLifetimeStatsOnGameEnd(reportToSave);

  // Save any achievements earned in this game
  if (
    reportToSave.earnedAchievements &&
    reportToSave.earnedAchievements.length > 0
  ) {
    for (const achievement of reportToSave.earnedAchievements) {
      await markAchievementAsUnlocked(achievement.id);
    }
  }
};

// --- Word Collections Progress ---
export interface WordCollectionProgress {
  [collectionId: string]: {
    collectedWords: string[];
    lastUpdated: number;
  };
}

export const getWordCollectionsProgress =
  async (): Promise<WordCollectionProgress> => {
    try {
      const jsonValue = await AsyncStorage.getItem(
        WORD_COLLECTIONS_PROGRESS_KEY,
      );
      return jsonValue != null ? JSON.parse(jsonValue) : {};
    } catch (e) {
      return {};
    }
  };

export const recordWordForCollection = async (
  collectionId: string,
  word: string,
): Promise<void> => {
  try {
    const progress = await getWordCollectionsProgress();

    // Initialize collection progress if it doesn't exist
    if (!progress[collectionId]) {
      progress[collectionId] = {
        collectedWords: [],
        lastUpdated: Date.now(),
      };
    }

    // Add word if not already collected
    if (!progress[collectionId].collectedWords.includes(word)) {
      progress[collectionId].collectedWords.push(word);
      progress[collectionId].lastUpdated = Date.now();

      await AsyncStorage.setItem(
        WORD_COLLECTIONS_PROGRESS_KEY,
        JSON.stringify(progress),
      );
      // console.log(`Word "${word}" added to collection "${collectionId}"`); // Keep this for next edit pass
    }
  } catch (e) {}
};

export const resetCollectionProgress = async (
  collectionId: string,
): Promise<void> => {
  try {
    const progress = await getWordCollectionsProgress();

    if (progress[collectionId]) {
      progress[collectionId] = {
        collectedWords: [],
        lastUpdated: Date.now(),
      };

      await AsyncStorage.setItem(
        WORD_COLLECTIONS_PROGRESS_KEY,
        JSON.stringify(progress),
      );
      // console.log(`Progress for collection "${collectionId}" has been reset`); // Keep this for next edit pass
    }
  } catch (e) {}
};

// Function to check if a word should be recorded for collections
export const checkAndRecordWordForCollections = async (
  word: string,
  activeCollections: WordCollection[],
): Promise<void> => {
  // For each active collection, check if the word belongs to it
  for (const collection of activeCollections) {
    if (collection.words.includes(word)) {
      await recordWordForCollection(collection.id, word);
    }
  }
};

// --- Current Game Persistence ---
// Define what we need to persist from the game state
export interface PersistentGameState {
  startWord: string | null;
  targetWord: string | null;
  currentWord: string | null;
  playerPath: string[];
  optimalPath: string[];
  suggestedPathFromCurrent: string[];
  gameStatus: GameState["gameStatus"];
  optimalChoices: GameState["optimalChoices"];
  backtrackHistory: GameState["backtrackHistory"];
  pathDisplayMode: GameState["pathDisplayMode"];
  startTime: number; // Add timestamp of when the game started
  isChallenge?: boolean; // New flag to mark challenge games
  isDailyChallenge?: boolean; // Flag to mark daily challenge games
  aiPath?: string[]; // AI solution path for daily challenges
  aiModel?: string | null; // AI model that generated the solution
  currentDailyChallengeId?: string; // ID of the current daily challenge
  potentialRarestMovesThisGame?: GameState["potentialRarestMovesThisGame"]; // Preserve this data if it exists
}

export const saveCurrentGame = async (
  gameState: Partial<PersistentGameState>,
): Promise<void> => {
  try {
    // Only save games that are in progress
    if (gameState.gameStatus !== "playing") {
      return;
    }

    // Add current timestamp if not provided
    if (!gameState.startTime) {
      gameState.startTime = Date.now();
    }

    // Determine which storage key to use based on whether it's a challenge game
    const storageKey = gameState.isChallenge
      ? CHALLENGE_GAME_KEY
      : CURRENT_GAME_KEY;

    await AsyncStorage.setItem(storageKey, JSON.stringify(gameState));
    // console.log(`Game state saved successfully to ${storageKey}`); // Keep this for next edit pass
  } catch (e) {}
};

export const loadCurrentGame = async (
  isChallenge = false,
): Promise<PersistentGameState | null> => {
  try {
    const storageKey = isChallenge ? CHALLENGE_GAME_KEY : CURRENT_GAME_KEY;
    const jsonValue = await AsyncStorage.getItem(storageKey);

    if (!jsonValue) {
      // console.log(`No saved game found for ${storageKey}`); // Keep this for next edit pass
      return null;
    }

    return JSON.parse(jsonValue);
  } catch (e) {
    return null;
  }
};

export const clearCurrentGame = async (isChallenge = false): Promise<void> => {
  try {
    const storageKey = isChallenge ? CHALLENGE_GAME_KEY : CURRENT_GAME_KEY;
    await AsyncStorage.removeItem(storageKey);
    // console.log(`Cleared game from ${storageKey}`); // Keep this for next edit pass
  } catch (e) {}
};

// New function to save a regular game temporarily when entering challenge mode
export const saveTempGame = async (
  gameState: PersistentGameState,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(TEMP_SAVED_GAME_KEY, JSON.stringify(gameState));
    // console.log("Regular game saved temporarily while in challenge mode"); // Keep this for next edit pass
  } catch (e) {}
};

// New function to check if there's a temporarily saved game
export const hasTempSavedGame = async (): Promise<boolean> => {
  try {
    const jsonValue = await AsyncStorage.getItem(TEMP_SAVED_GAME_KEY);
    return jsonValue !== null;
  } catch (e) {
    return false;
  }
};

// New function to restore the temporarily saved game
export const restoreTempGame =
  async (): Promise<PersistentGameState | null> => {
    if (!(await hasTempSavedGame())) {
      return null;
    }
    try {
      const jsonValue = await AsyncStorage.getItem(TEMP_SAVED_GAME_KEY);

      if (!jsonValue) {
        // console.log("No temporary saved game found to restore"); // Keep this for next edit pass
        return null;
      }
      const tempGame = JSON.parse(jsonValue) as PersistentGameState;

      // Clear the temporary game from storage
      await AsyncStorage.removeItem(TEMP_SAVED_GAME_KEY);

      // console.log("Temporary game restored to current game"); // Keep this for next edit pass
      return tempGame;
    } catch (e) {
      return null;
    }
  };

// New function to clear all player data
export const resetAllPlayerData = async (): Promise<void> => {
  try {
    const keys = [
      LIFETIME_STATS_KEY,
      GAME_HISTORY_KEY,
      UNLOCKED_ACHIEVEMENTS_KEY,
      WORD_COLLECTIONS_PROGRESS_KEY,
      CURRENT_GAME_KEY,
      CHALLENGE_GAME_KEY,
      TEMP_SAVED_GAME_KEY,
      'tutorialComplete',  // Add tutorial-related keys
      'hasPlayedBefore',
      'tutorialStep',
      'tutorialShown',
    ];
    await AsyncStorage.multiRemove(keys);

    // Reset daily challenge data using the service method
    const { dailyChallengesService } = await import('./DailyChallengesService');
    await dailyChallengesService.resetDailyChallengeData();

    console.log("All player data cleared from AsyncStorage.");

    // Explicitly re-initialize lifetime stats to ensure it's reset to default values
    await AsyncStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(initialLifetimeStats));
    console.log("Lifetime stats re-initialized.");

  } catch (e) {
    console.error("Error clearing player data:", e);
  }
};
