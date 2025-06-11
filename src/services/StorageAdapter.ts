import { handleProgressiveAchievements } from "../features/achievements/logic";
import type { WordCollection } from "../features/wordCollections";
import type { GameState } from "../stores/useGameStore";
import type { GameReport } from "../utils/gameReportUtils";
import { unifiedDataStore } from "./UnifiedDataStore";

// ============================================================================
// STORAGE ADAPTER - Provides same API as old StorageService
// ============================================================================
// This allows your existing code to work unchanged while using the new unified store

export interface LifetimeStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalGaveUps: number;
  achievementsUnlocked: number;
  cumulativeMoveAccuracySum: number;
}

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
  startTime: number;
  isChallenge?: boolean;
  isDailyChallenge?: boolean;
  aiPath?: string[];
  aiModel?: string | null;
  currentDailyChallengeId?: string;
  potentialRarestMovesThisGame?: GameState["potentialRarestMovesThisGame"];
}

export interface WordCollectionProgress {
  [collectionId: string]: {
    collectedWords: string[];
    lastUpdated: number;
  };
}

// ============================================================================
// GAME HISTORY FUNCTIONS
// ============================================================================

export const saveGameToHistory = async (
  gameReport: GameReport,
): Promise<void> => {
  await unifiedDataStore.addGameToHistory(gameReport);
};

export const loadGameHistory = async (): Promise<GameReport[]> => {
  return await unifiedDataStore.getGameHistory();
};

// ============================================================================
// LIFETIME STATS FUNCTIONS
// ============================================================================

export const getLifetimeStats = async (): Promise<LifetimeStats> => {
  return await unifiedDataStore.getLifetimeStats();
};

export const updateLifetimeStatsOnGameEnd = async (
  gameReport: GameReport,
): Promise<void> => {
  await unifiedDataStore.updateStatsOnGameEnd(gameReport);
};

// ============================================================================
// ACHIEVEMENTS FUNCTIONS
// ============================================================================

export const getUnlockedAchievementIds = async (): Promise<string[]> => {
  return await unifiedDataStore.getUnlockedAchievements();
};

export const markAchievementAsUnlocked = async (
  achievementId: string,
): Promise<void> => {
  await unifiedDataStore.unlockAchievement(achievementId);
};

// ============================================================================
// GAME RECORDING FUNCTION
// ============================================================================

export const recordEndedGame = async (
  gameReport: GameReport,
  isChallenge = false,
  isDailyChallenge = false,
): Promise<void> => {
  try {
    // Ensure gameReport has an id and timestamp
    const reportToSave = {
      ...gameReport,
      id: gameReport.id || Date.now().toString(),
      timestamp: gameReport.timestamp || Date.now(),
      isChallenge: isChallenge,
      isDailyChallenge: isDailyChallenge,
    };

    await unifiedDataStore.addGameToHistory(reportToSave);
    await unifiedDataStore.updateStatsOnGameEnd(reportToSave);

    // Save any achievements earned in this game
    if (
      reportToSave.earnedAchievements &&
      reportToSave.earnedAchievements.length > 0
    ) {
      for (const achievement of reportToSave.earnedAchievements) {
        await unifiedDataStore.unlockAchievement(achievement.id);
      }
    }

    // Handle progressive achievements (increment counters for achievements that triggered)
    try {
      const progressiveAchievementsTriggered =
        await handleProgressiveAchievements(reportToSave, reportToSave.status);

      if (progressiveAchievementsTriggered.length > 0) {
        console.log(
          `Progressive achievements triggered: ${progressiveAchievementsTriggered.join(", ")}`,
        );
      }
    } catch (error) {
      console.error("Error handling progressive achievements:", error);
    }
  } catch (error) {
    console.error("Error recording ended game:", error);
    // Don't re-throw the error to allow graceful handling
  }
};

// ============================================================================
// WORD COLLECTIONS FUNCTIONS
// ============================================================================

export const getWordCollectionsProgress =
  async (): Promise<WordCollectionProgress> => {
    return await unifiedDataStore.getCollectionProgress();
  };

export const recordWordForCollection = async (
  collectionId: string,
  word: string,
): Promise<void> => {
  await unifiedDataStore.recordWordForCollection(collectionId, word);
};

export const resetCollectionProgress = async (
  collectionId: string,
): Promise<void> => {
  // For now, we'll implement this by clearing the collection
  // You might want to enhance this in the unified store later
  const data = await unifiedDataStore.getData();
  if (data.collections[collectionId]) {
    data.collections[collectionId] = {
      collectedWords: [],
      lastUpdated: Date.now(),
    };
    await unifiedDataStore.saveData();
  }
};

export const checkAndRecordWordForCollections = async (
  word: string,
  activeCollections: WordCollection[],
): Promise<void> => {
  for (const collection of activeCollections) {
    if (collection.words.includes(word)) {
      await unifiedDataStore.recordWordForCollection(collection.id, word);
    }
  }
};

// ============================================================================
// CURRENT GAME PERSISTENCE FUNCTIONS
// ============================================================================

export const saveCurrentGame = async (
  gameState: Partial<PersistentGameState>,
): Promise<void> => {
  // Only save games that are in progress
  if (gameState.gameStatus !== "playing") {
    return;
  }

  // Add current timestamp if not provided
  if (!gameState.startTime) {
    gameState.startTime = Date.now();
  }

  // Determine game type
  const type = gameState.isChallenge ? "challenge" : "regular";

  await unifiedDataStore.saveCurrentGame(
    gameState as PersistentGameState,
    type,
  );
};

export const loadCurrentGame = async (
  isChallenge = false,
): Promise<PersistentGameState | null> => {
  const type = isChallenge ? "challenge" : "regular";
  return await unifiedDataStore.loadCurrentGame(type);
};

export const clearCurrentGame = async (isChallenge = false): Promise<void> => {
  const type = isChallenge ? "challenge" : "regular";
  await unifiedDataStore.clearCurrentGame(type);
};

export const saveTempGame = async (
  gameState: PersistentGameState,
): Promise<void> => {
  await unifiedDataStore.saveCurrentGame(gameState, "temp");
};

export const hasTempSavedGame = async (): Promise<boolean> => {
  const tempGame = await unifiedDataStore.loadCurrentGame("temp");
  return tempGame !== null;
};

export const restoreTempGame =
  async (): Promise<PersistentGameState | null> => {
    const tempGame = await unifiedDataStore.loadCurrentGame("temp");
    if (tempGame) {
      // Clear the temp game after restoring
      await unifiedDataStore.clearCurrentGame("temp");
    }
    return tempGame;
  };

// ============================================================================
// DATA MANAGEMENT FUNCTIONS
// ============================================================================

export const resetAllPlayerData = async (): Promise<void> => {
  await unifiedDataStore.resetAllData();
  console.log("All player data cleared from unified storage.");
};
