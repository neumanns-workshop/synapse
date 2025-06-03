// User data types - consolidated for cloud sync compatibility
export interface UserProfile {
  id: string;
  email?: string;
  createdAt: number;
  lastActiveAt: number;
  isPremium: boolean;
  premiumExpiresAt?: number;
  version: number; // For data migration
}

export interface LifetimeStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalGaveUps: number;
  achievementsUnlocked: number;
  cumulativeMoveAccuracySum: number;
  longestWinStreak: number;
  currentWinStreak: number;
  totalBacktracksUsed: number;
  perfectGames: number; // Games where moveAccuracy = 100%
  averageMovesPerGame: number;
  version: number;
}

export interface GameSettings {
  tutorialComplete: boolean;
  showPathHints: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  version: number;
}

export interface WordCollectionProgress {
  [collectionId: string]: {
    collectedWords: string[];
    lastUpdated: number;
    completedAt?: number; // When collection was completed
  };
}

export interface DailyChallengeData {
  progress: Record<string, DailyChallengeProgress>;
  freeGamesCount: number;
  lastResetDate: string;
  hasPlayedToday: boolean;
  version: number;
}

export interface UnlockedAchievements {
  achievementIds: string[];
  lastUnlockedAt?: number;
  version: number;
}

// Consolidated user data structure
export interface UserData {
  profile: UserProfile;
  stats: LifetimeStats;
  settings: GameSettings;
  achievements: UnlockedAchievements;
  wordCollections: WordCollectionProgress;
  dailyChallenges: DailyChallengeData;
  gameHistory: GameReport[]; // Limit to last 100 games
  version: number; // Overall data structure version
  lastSyncedAt?: number;
  lastBackupAt?: number;
}

// Import types from existing files
import type { GameReport } from '../utils/gameReportUtils';
import type { DailyChallengeProgress } from './dailyChallenges';

// Storage keys - consistent naming
export const STORAGE_KEYS = {
  // Local-only data (never synced)
  CURRENT_GAME: 'synapse_current_game',
  TEMP_GAME: 'synapse_temp_game',
  CHALLENGE_GAME: 'synapse_challenge_game',
  
  // User data (synced to cloud)
  USER_DATA: 'synapse_user_data',
  LAST_SYNC: 'synapse_last_sync',
  
  // Auth data
  USER_SESSION: 'synapse_user_session',
  DEVICE_ID: 'synapse_device_id',
} as const;

// Data version constants
export const DATA_VERSIONS = {
  USER_DATA: 1,
  LIFETIME_STATS: 1,
  GAME_SETTINGS: 1,
  ACHIEVEMENTS: 1,
  DAILY_CHALLENGES: 1,
} as const;

// Migration helpers
export interface DataMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: any) => any;
}

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]; 