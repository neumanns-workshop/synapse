import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameReport } from '../utils/gameReportUtils';
import type { Achievement } from '../features/achievements/achievements'; // For achievement types
import type { WordCollection } from '../features/wordCollections/wordCollections';

const GAME_HISTORY_KEY = 'synapse_game_history';
const LIFETIME_STATS_KEY = 'synapse_lifetime_stats';
const UNLOCKED_ACHIEVEMENTS_KEY = 'synapse_unlocked_achievements';
const WORD_COLLECTIONS_PROGRESS_KEY = 'synapse_word_collections_progress';

export interface LifetimeStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalGaveUps: number;
  // For now, keep it simple. More stats can be added later.
  // totalMovesMade: number;
  // totalOptimalPathMoves: number;
  // totalBacktracksUsed: number;
  // achievementsUnlockedCount: number;
}

const initialLifetimeStats: LifetimeStats = {
  totalGamesPlayed: 0,
  totalWins: 0,
  totalGaveUps: 0,
};

// --- Game History ---
export const saveGameToHistory = async (gameReport: GameReport): Promise<void> => {
  try {
    const history = await loadGameHistory();
    // Add new report to the beginning and keep only the last 50 games
    const newHistory = [gameReport, ...history].slice(0, 50); 
    await AsyncStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("Failed to save game to history", e);
  }
};

export const loadGameHistory = async (): Promise<GameReport[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(GAME_HISTORY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Failed to load game history", e);
    return [];
  }
};

// --- Lifetime Stats ---
export const getLifetimeStats = async (): Promise<LifetimeStats> => {
  try {
    const jsonValue = await AsyncStorage.getItem(LIFETIME_STATS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : { ...initialLifetimeStats };
  } catch (e) {
    console.error("Failed to load lifetime stats", e);
    return { ...initialLifetimeStats };
  }
};

export const updateLifetimeStatsOnGameEnd = async (gameReport: GameReport): Promise<void> => {
  try {
    const currentStats = await getLifetimeStats();
    const newStats: LifetimeStats = {
      ...currentStats,
      totalGamesPlayed: (currentStats.totalGamesPlayed || 0) + 1,
    };
    if (gameReport.status === 'won') {
      newStats.totalWins = (currentStats.totalWins || 0) + 1;
    } else if (gameReport.status === 'given_up') {
      newStats.totalGaveUps = (currentStats.totalGaveUps || 0) + 1;
    }
    await AsyncStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(newStats));
  } catch (e) {
    console.error("Failed to update lifetime stats", e);
  }
};

// --- Unlocked Achievements Implementation ---
export const getUnlockedAchievementIds = async (): Promise<string[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Failed to load unlocked achievements", e);
  return []; 
  }
};

export const markAchievementAsUnlocked = async (achievementId: string): Promise<void> => {
  try {
    const currentAchievements = await getUnlockedAchievementIds();
    // Only add if not already unlocked
    if (!currentAchievements.includes(achievementId)) {
      const updatedAchievements = [...currentAchievements, achievementId];
      await AsyncStorage.setItem(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify(updatedAchievements));
      console.log(`Achievement unlocked: ${achievementId}`);
    }
  } catch (e) {
    console.error(`Failed to mark achievement ${achievementId} as unlocked`, e);
  }
};

// Updated to also mark achievement IDs as unlocked
export const recordEndedGame = async (gameReport: GameReport) => {
  // Ensure gameReport has an id and timestamp, if not added during generation
  const reportToSave = { 
    ...gameReport, 
    id: gameReport.id || Date.now().toString(), 
    timestamp: gameReport.timestamp || Date.now() 
  };

  await saveGameToHistory(reportToSave);
  await updateLifetimeStatsOnGameEnd(reportToSave);
  
  // Save any achievements earned in this game
  if (reportToSave.earnedAchievements && reportToSave.earnedAchievements.length > 0) {
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

export const getWordCollectionsProgress = async (): Promise<WordCollectionProgress> => {
  try {
    const jsonValue = await AsyncStorage.getItem(WORD_COLLECTIONS_PROGRESS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : {};
  } catch (e) {
    console.error("Failed to load word collections progress", e);
    return {};
  }
};

export const recordWordForCollection = async (
  collectionId: string,
  word: string
): Promise<void> => {
  try {
    const progress = await getWordCollectionsProgress();
    
    // Initialize collection progress if it doesn't exist
    if (!progress[collectionId]) {
      progress[collectionId] = {
        collectedWords: [],
        lastUpdated: Date.now()
      };
    }
    
    // Add word if not already collected
    if (!progress[collectionId].collectedWords.includes(word)) {
      progress[collectionId].collectedWords.push(word);
      progress[collectionId].lastUpdated = Date.now();
      
      await AsyncStorage.setItem(
        WORD_COLLECTIONS_PROGRESS_KEY, 
        JSON.stringify(progress)
      );
      console.log(`Word "${word}" added to collection "${collectionId}"`);
    }
  } catch (e) {
    console.error(`Failed to record word "${word}" for collection "${collectionId}"`, e);
  }
};

export const resetCollectionProgress = async (collectionId: string): Promise<void> => {
  try {
    const progress = await getWordCollectionsProgress();
    
    if (progress[collectionId]) {
      progress[collectionId] = {
        collectedWords: [],
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem(
        WORD_COLLECTIONS_PROGRESS_KEY, 
        JSON.stringify(progress)
      );
      console.log(`Progress for collection "${collectionId}" has been reset`);
    }
  } catch (e) {
    console.error(`Failed to reset progress for collection "${collectionId}"`, e);
  }
};

// Function to check if a word should be recorded for collections
export const checkAndRecordWordForCollections = async (
  word: string,
  activeCollections: WordCollection[]
): Promise<void> => {
  // For each active collection, check if the word belongs to it
  for (const collection of activeCollections) {
    if (collection.words.includes(word)) {
      await recordWordForCollection(collection.id, word);
    }
  }
}; 