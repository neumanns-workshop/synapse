import AsyncStorage from "@react-native-async-storage/async-storage";

import type { WordCollection } from "../features/wordCollections";
import type { GameState } from "../stores/useGameStore";
import type { DailyChallengeProgress } from "../types/dailyChallenges";
import { DataCompressor, StorageSizeEstimator } from "../utils/dataCompression";
import type { GameReport } from "../utils/gameReportUtils";

// Import compression debug utilities in development
if (__DEV__) {
  import("../utils/compressionDebug");
}

// ============================================================================
// UNIFIED DATA STORE - Single source of truth for all app data
// ============================================================================

// Storage keys - centralized
const UNIFIED_DATA_KEY = "synapse_unified_data_v1";

// Main data structure that contains everything
export interface UnifiedAppData {
  // User Profile & Settings
  user: {
    id: string; // Generated locally, synced with Supabase later
    email?: string; // For auth and correspondence
    isPremium: boolean; // One-time purchase unlock status
    tutorialComplete: boolean;
    hasPlayedBefore: boolean;
    createdAt: number;
    lastActiveAt: number;

    // One-time purchase metadata (for validation and support)
    purchase?: {
      platform: "ios" | "android" | "web" | "stripe"; // Where they purchased
      transactionId?: string; // Platform-specific transaction ID
      purchaseDate?: number; // When they made the one-time purchase
      receiptData?: string; // Receipt/proof of purchase (for validation)
      validated?: boolean; // Whether purchase has been validated
      lastValidated?: number; // Last time we validated the purchase
    };

    // Privacy settings (for social features via deep links)
    privacy?: {
      allowChallengeSharing: boolean; // Can share challenge links
      allowStatsSharing: boolean; // Can share stats/achievements
      allowLeaderboards: boolean; // Participate in global leaderboards (future)
      dataCollection: boolean; // Allow anonymized analytics
    };
  };

  // Game Statistics & Progress
  stats: {
    totalGamesPlayed: number;
    totalWins: number;
    totalGaveUps: number;
    achievementsUnlocked: number;
    cumulativeMoveAccuracySum: number;
    // Add more stats as needed
  };

  // Game History (last 100 games)
  gameHistory: GameReport[];

  // Achievements
  achievements: {
    unlockedIds: string[];
    viewedIds: string[]; // Track which achievements have been viewed/acknowledged
    // Track when achievements were unlocked for analytics and versioning
    unlockTimestamps: Record<string, number>;
    // Progressive achievement tracking - track cumulative counts for progressive achievements
    progressiveCounters: Record<string, number>;
    // Schema version for safe migrations
    schemaVersion: number;
  };

  // Word Collections Progress
  collections: {
    [collectionId: string]: {
      collectedWords: string[];
      lastUpdated: number;
    };
  };

  // Word Collection Viewing (track completed and viewed collections)
  wordCollections: {
    completedIds: string[]; // Track which collections have been completed
    viewedIds: string[]; // Track which completed collections have been viewed/acknowledged
    completionTimestamps: Record<string, number>; // Track when collections were completed
    schemaVersion: number;
  };

  // Daily Challenges
  dailyChallenges: {
    progress: Record<string, DailyChallengeProgress>;
    freeGamesRemaining: number;
    lastResetDate: string;
  };

  // News & Notifications
  news: {
    readArticleIds: string[]; // Track which articles have been read
    lastChecked: number; // Last time user checked news
  };

  // Current Game States (for persistence)
  currentGames: {
    regular: PersistentGameState | null;
    challenge: PersistentGameState | null;
    temp: PersistentGameState | null;
  };

  // Metadata for sync and versioning
  meta: {
    version: string;
    schemaVersion: number; // For data structure migrations
    lastSyncAt?: number; // For Supabase sync
    lastBackupAt?: number;
    deviceId?: string; // For conflict resolution
  };
}

// Game state interface (compatible with existing game store)
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
  currentDailyChallengeId?: string;
  potentialRarestMovesThisGame?: GameState["potentialRarestMovesThisGame"];
}

/**
 * Get today's date in YYYY-MM-DD format using EST timezone
 * This ensures daily resets happen at 12:00 AM EST, consistent with daily challenges
 */
const getTodayStringEST = (): string => {
  const now = new Date();

  // Convert to EST (UTC-5) or EDT (UTC-4) depending on DST
  // Using toLocaleDateString with EST timezone
  const estDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  // Format as YYYY-MM-DD
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, "0");
  const day = String(estDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Default data structure for new users
const createDefaultData = (): UnifiedAppData => ({
  user: {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: undefined, // Will be set during auth
    isPremium: false,
    tutorialComplete: false,
    hasPlayedBefore: false,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),

    // Default purchase metadata
    purchase: undefined, // Will be set when user makes one-time purchase

    // Default privacy settings (opt-in for sharing, opt-out for data collection)
    privacy: {
      allowChallengeSharing: true, // Enable deep link sharing by default
      allowStatsSharing: true, // Enable stats sharing by default
      allowLeaderboards: true, // Opt-in for future leaderboards
      dataCollection: false, // Opt-in for analytics (privacy-first)
    },
  },
  stats: {
    totalGamesPlayed: 0,
    totalWins: 0,
    totalGaveUps: 0,
    achievementsUnlocked: 0,
    cumulativeMoveAccuracySum: 0,
  },
  gameHistory: [],
  achievements: {
    unlockedIds: [],
    viewedIds: [],
    unlockTimestamps: {},
    progressiveCounters: {},
    schemaVersion: 1,
  },
  collections: {},
  dailyChallenges: {
    progress: {},
    freeGamesRemaining: 2,
    lastResetDate: getTodayStringEST(),
  },
  news: {
    readArticleIds: [],
    lastChecked: Date.now(),
  },
  currentGames: {
    regular: null,
    challenge: null,
    temp: null,
  },
  meta: {
    version: "1.0.0",
    schemaVersion: 1,
    deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  },
  wordCollections: {
    completedIds: [],
    viewedIds: [],
    completionTimestamps: {},
    schemaVersion: 1,
  },
});

// ============================================================================
// UNIFIED DATA STORE CLASS
// ============================================================================

export class UnifiedDataStore {
  private static instance: UnifiedDataStore;
  private data: UnifiedAppData | null = null;
  private isLoaded = false;

  private constructor() {}

  public static getInstance(): UnifiedDataStore {
    if (!UnifiedDataStore.instance) {
      UnifiedDataStore.instance = new UnifiedDataStore();
    }
    return UnifiedDataStore.instance;
  }

  // ============================================================================
  // CORE DATA OPERATIONS
  // ============================================================================

  /**
   * Load all data from storage
   */
  public async loadData(): Promise<UnifiedAppData> {
    if (this.isLoaded && this.data) {
      return this.data;
    }

    try {
      const jsonValue = await AsyncStorage.getItem(UNIFIED_DATA_KEY);

      if (jsonValue) {
        const parsedData = JSON.parse(jsonValue);

        // Check if data is compressed (has compressed structure)
        if (parsedData.achievements?.unlockedBits !== undefined) {
          // Data is compressed, decompress it
          this.data = DataCompressor.decompress(parsedData);
          console.log(
            "📦 Loaded compressed data and decompressed successfully",
          );
        } else {
          // Data is uncompressed (legacy format)
          this.data = parsedData;
          console.log("📄 Loaded legacy uncompressed data");
        }

        // Ensure data structure is complete (handle version updates)
        this.data = this.ensureDataStructure(this.data);
      } else {
        // First time user - create default data
        this.data = createDefaultData();
        await this.saveData();
      }

      this.isLoaded = true;
      this.data.user.lastActiveAt = Date.now();
      await this.saveData();

      return this.data;
    } catch (error) {
      console.error("Error loading unified data:", error);
      this.data = createDefaultData();
      this.isLoaded = true;
      return this.data;
    }
  }

  /**
   * Save all data to storage (with compression)
   */
  public async saveData(): Promise<void> {
    if (!this.data) return;

    try {
      this.data.user.lastActiveAt = Date.now();

      // Compress data before saving
      const compressedData = DataCompressor.compress(this.data);
      const jsonData = JSON.stringify(compressedData);

      // Log compression savings in development
      if (__DEV__) {
        const sizeInfo = StorageSizeEstimator.estimateSize(this.data);
        console.log(
          `💾 Storage compression: ${sizeInfo.uncompressed} → ${jsonData.length} bytes (${Math.round(((sizeInfo.uncompressed - jsonData.length) / sizeInfo.uncompressed) * 100)}% saved)`,
        );
      }

      await AsyncStorage.setItem(UNIFIED_DATA_KEY, jsonData);
    } catch (error) {
      console.error("Failed to save data:", error);
      throw error;
    }
  }

  /**
   * Get current data (load if not loaded)
   */
  public async getData(): Promise<UnifiedAppData> {
    if (!this.isLoaded || !this.data) {
      return await this.loadData();
    }
    return this.data;
  }

  /**
   * Ensure data structure is complete (for version updates)
   */
  private ensureDataStructure(data: any): UnifiedAppData {
    const defaultData = createDefaultData();

    // Merge with defaults to ensure all fields exist
    const result = {
      user: {
        ...defaultData.user,
        ...data.user,
        // Ensure privacy settings exist with defaults
        privacy: {
          ...defaultData.user.privacy,
          ...data.user?.privacy,
        },
      },
      stats: { ...defaultData.stats, ...data.stats },
      gameHistory: data.gameHistory || [],
      achievements: {
        ...defaultData.achievements,
        ...data.achievements,
        // Ensure progressive counters exist
        progressiveCounters: {
          ...defaultData.achievements.progressiveCounters,
          ...data.achievements?.progressiveCounters,
        },
      },
      collections: { ...defaultData.collections, ...data.collections },
      dailyChallenges: {
        ...defaultData.dailyChallenges,
        ...data.dailyChallenges,
      },
      news: { ...defaultData.news, ...data.news },
      currentGames: {
        ...defaultData.currentGames,
        ...data.currentGames,
      },
      meta: { ...defaultData.meta, ...data.meta },
      wordCollections: {
        ...defaultData.wordCollections,
        ...data.wordCollections,
      },
    };

    return result;
  }

  // ============================================================================
  // CONVENIENCE METHODS (Clean API for your existing code)
  // ============================================================================

  /**
   * Game History Operations
   */
  public async addGameToHistory(gameReport: GameReport): Promise<void> {
    const data = await this.getData();
    data.gameHistory = [gameReport, ...data.gameHistory].slice(0, 100); // Increased to 100 games
    await this.saveData();
  }

  public async getGameHistory(): Promise<GameReport[]> {
    const data = await this.getData();
    return data.gameHistory;
  }

  /**
   * Stats Operations
   */
  public async updateStatsOnGameEnd(gameReport: GameReport): Promise<void> {
    const data = await this.getData();
    data.stats.totalGamesPlayed += 1;
    data.stats.cumulativeMoveAccuracySum += gameReport.moveAccuracy || 0;

    if (gameReport.status === "won") {
      data.stats.totalWins += 1;
    } else if (gameReport.status === "given_up") {
      data.stats.totalGaveUps += 1;
    }

    await this.saveData();
  }

  public async getLifetimeStats() {
    const data = await this.getData();
    return data.stats;
  }

  /**
   * Achievement Operations
   */
  public async unlockAchievement(achievementId: string): Promise<boolean> {
    const data = await this.getData();

    if (!data.achievements.unlockedIds.includes(achievementId)) {
      data.achievements.unlockedIds.push(achievementId);
      data.stats.achievementsUnlocked += 1;
      data.achievements.unlockTimestamps[achievementId] = Date.now();
      await this.saveData();
      return true; // New achievement
    }

    return false; // Already unlocked
  }

  public async getUnlockedAchievements(): Promise<string[]> {
    const data = await this.getData();
    return data.achievements.unlockedIds;
  }

  public async getViewedAchievementIds(): Promise<string[]> {
    const data = await this.getData();
    return data.achievements.viewedIds;
  }

  public async markAchievementAsViewed(achievementId: string): Promise<void> {
    const data = await this.getData();
    if (!data.achievements.viewedIds.includes(achievementId)) {
      data.achievements.viewedIds.push(achievementId);
      await this.saveData();
    }
  }

  public async markMultipleAchievementsAsViewed(
    achievementIds: string[],
  ): Promise<void> {
    const data = await this.getData();
    let hasChanges = false;

    for (const achievementId of achievementIds) {
      if (!data.achievements.viewedIds.includes(achievementId)) {
        data.achievements.viewedIds.push(achievementId);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveData();
    }
  }

  /**
   * Progressive Achievement Operations
   */
  public async incrementProgressiveAchievement(
    achievementId: string,
  ): Promise<number> {
    const data = await this.getData();

    if (!data.achievements.progressiveCounters[achievementId]) {
      data.achievements.progressiveCounters[achievementId] = 0;
    }

    data.achievements.progressiveCounters[achievementId] += 1;

    // Mark achievement as unlocked if it's the first time
    if (data.achievements.progressiveCounters[achievementId] === 1) {
      await this.unlockAchievement(achievementId);
    }

    await this.saveData();
    return data.achievements.progressiveCounters[achievementId];
  }

  public async getProgressiveAchievementCount(
    achievementId: string,
  ): Promise<number> {
    const data = await this.getData();
    return data.achievements.progressiveCounters[achievementId] || 0;
  }

  public async getProgressiveAchievementCounts(): Promise<
    Record<string, number>
  > {
    const data = await this.getData();
    return data.achievements.progressiveCounters;
  }

  /**
   * Daily Challenge Operations
   */
  public async updateDailyChallengeProgress(
    challengeId: string,
    progress: DailyChallengeProgress,
  ): Promise<void> {
    const data = await this.getData();
    data.dailyChallenges.progress[challengeId] = progress;
    await this.saveData();
  }

  public async getDailyChallengeProgress(): Promise<
    Record<string, DailyChallengeProgress>
  > {
    const data = await this.getData();
    return data.dailyChallenges.progress;
  }

  public async getRemainingFreeGames(): Promise<number> {
    const data = await this.getData();
    const today = getTodayStringEST();

    // Reset if new day
    if (data.dailyChallenges.lastResetDate !== today) {
      data.dailyChallenges.freeGamesRemaining = 2;
      data.dailyChallenges.lastResetDate = today;
      await this.saveData();
    }

    return data.dailyChallenges.freeGamesRemaining;
  }

  public async consumeFreeGame(): Promise<number> {
    const data = await this.getData();
    data.dailyChallenges.freeGamesRemaining = Math.max(
      0,
      data.dailyChallenges.freeGamesRemaining - 1,
    );
    await this.saveData();
    return data.dailyChallenges.freeGamesRemaining;
  }

  /**
   * User Profile Operations
   */
  public async isPremiumUser(): Promise<boolean> {
    const data = await this.getData();
    return data.user.isPremium;
  }

  public async setPremiumStatus(isPremium: boolean): Promise<void> {
    const data = await this.getData();
    data.user.isPremium = isPremium;
    await this.saveData();
  }

  public async getUserId(): Promise<string> {
    const data = await this.getData();
    return data.user.id;
  }

  public async getEmail(): Promise<string | undefined> {
    const data = await this.getData();
    return data.user.email;
  }

  public async setEmail(email: string): Promise<void> {
    const data = await this.getData();
    data.user.email = email;
    await this.saveData();
  }

  public async getPurchaseInfo(): Promise<UnifiedAppData["user"]["purchase"]> {
    const data = await this.getData();
    return data.user.purchase;
  }

  public async setPurchaseInfo(
    purchase: NonNullable<UnifiedAppData["user"]["purchase"]>,
  ): Promise<void> {
    const data = await this.getData();
    data.user.purchase = purchase;
    data.user.isPremium = true; // Auto-set premium status
    await this.saveData();
  }

  public async clearPurchase(): Promise<void> {
    const data = await this.getData();
    data.user.purchase = undefined;
    data.user.isPremium = false;
    await this.saveData();
  }

  public async getPrivacySettings(): Promise<
    NonNullable<UnifiedAppData["user"]["privacy"]>
  > {
    const data = await this.getData();
    // Return default privacy settings if not set
    return (
      data.user.privacy || {
              allowChallengeSharing: true,
      allowStatsSharing: true,
      allowLeaderboards: true,
      dataCollection: false,
      }
    );
  }

  public async updatePrivacySettings(
    settings: Partial<NonNullable<UnifiedAppData["user"]["privacy"]>>,
  ): Promise<void> {
    const data = await this.getData();
    const currentPrivacy = await this.getPrivacySettings();
    data.user.privacy = { ...currentPrivacy, ...settings };
    await this.saveData();
  }

  public async isTutorialComplete(): Promise<boolean> {
    const data = await this.getData();
    return data.user.tutorialComplete;
  }

  public async setTutorialComplete(complete: boolean): Promise<void> {
    const data = await this.getData();
    data.user.tutorialComplete = complete;
    data.user.hasPlayedBefore = true;
    await this.saveData();
  }

  /**
   * Game State Persistence
   */
  public async saveCurrentGame(
    gameState: PersistentGameState,
    type: "regular" | "challenge" | "temp" = "regular",
  ): Promise<void> {
    const data = await this.getData();
    data.currentGames[type] = gameState;
    await this.saveData();
  }

  public async loadCurrentGame(
    type: "regular" | "challenge" | "temp" = "regular",
  ): Promise<PersistentGameState | null> {
    const data = await this.getData();
    return data.currentGames[type];
  }

  public async clearCurrentGame(
    type: "regular" | "challenge" | "temp" = "regular",
  ): Promise<void> {
    const data = await this.getData();
    data.currentGames[type] = null;
    await this.saveData();
  }

  /**
   * Word Collections
   */
  public async recordWordForCollection(
    collectionId: string,
    word: string,
  ): Promise<void> {
    const data = await this.getData();

    if (!data.collections[collectionId]) {
      data.collections[collectionId] = {
        collectedWords: [],
        lastUpdated: Date.now(),
      };
    }

    if (!data.collections[collectionId].collectedWords.includes(word)) {
      data.collections[collectionId].collectedWords.push(word);
      data.collections[collectionId].lastUpdated = Date.now();
      await this.saveData();

      // Check if this collection is now completed
      await this.checkAndUpdateWordCollectionCompletion();
    }
  }

  public async getCollectionProgress(): Promise<
    Record<string, { collectedWords: string[]; lastUpdated: number }>
  > {
    const data = await this.getData();
    return data.collections;
  }

  /**
   * News & Notifications
   */
  public async markArticleAsRead(articleId: string): Promise<void> {
    const data = await this.getData();
    if (!data.news.readArticleIds.includes(articleId)) {
      data.news.readArticleIds.push(articleId);
      await this.saveData();
    }
  }

  public async markAllArticlesAsRead(articleIds: string[]): Promise<void> {
    const data = await this.getData();
    const newReadIds = articleIds.filter(
      (id) => !data.news.readArticleIds.includes(id),
    );
    data.news.readArticleIds.push(...newReadIds);
    await this.saveData();
  }

  public async getReadArticleIds(): Promise<string[]> {
    const data = await this.getData();
    return data.news.readArticleIds;
  }

  public async updateLastNewsCheck(): Promise<void> {
    const data = await this.getData();
    data.news.lastChecked = Date.now();
    await this.saveData();
  }

  public async getLastNewsCheck(): Promise<number> {
    const data = await this.getData();
    return data.news.lastChecked;
  }

  /**
   * Data Management & Sync
   */
  public async resetAllData(): Promise<void> {
    console.log("🔥 Resetting all application data to default state...");
    this.data = createDefaultData();
    await this.saveData();
    console.log("✅ All data reset.");
  }

  /**
   * Anonymizes local data after account deletion.
   * This preserves gameplay stats, history, and achievements while removing
   * all personal and account-related information, effectively turning the
   * user back into a "rich" anonymous user.
   */
  public async anonymizeDataOnAccountDeletion(): Promise<void> {
    console.log("👤 Anonymizing user data post-deletion...");
    const currentData = await this.getData();

    // Create a fresh, default user object
    const defaultUser = createDefaultData().user;

    // Preserve gameplay-related stats and progress from the old user
    const anonymizedData: UnifiedAppData = {
      ...currentData,
      user: {
        // Start with a completely new anonymous user profile
        ...defaultUser,
        // But keep their hard-earned tutorial status
        tutorialComplete: currentData.user.tutorialComplete,
        hasPlayedBefore: currentData.user.hasPlayedBefore,
      },
      // Clear any cloud sync metadata
      meta: {
        ...currentData.meta,
        lastSyncAt: undefined,
      },
      // Reset daily challenges and free games to the default anonymous state
      dailyChallenges: createDefaultData().dailyChallenges,
    };

    // Replace the old data with the newly anonymized data
    this.data = anonymizedData;
    await this.saveData();
    console.log("✅ Local data has been successfully anonymized.");
  }

  /**
   * Resets session-specific data when a user signs out, preserving their
   * long-term progress (history, stats) but giving them a clean slate
   * for their new anonymous session (e.g., resetting free game counts).
   */
  public async resetForNewAnonymousSession(): Promise<void> {
    console.log("🔄 Resetting data for a new anonymous session...");
    const currentData = await this.getData();

    // Preserve the user's valuable progress
    const preservedData = {
      stats: currentData.stats,
      gameHistory: currentData.gameHistory,
      achievements: currentData.achievements,
      collections: currentData.collections,
      wordCollections: currentData.wordCollections,
      dailyChallenges: currentData.dailyChallenges, // PRESERVE daily challenge completion
    };

    // Create a fresh default data object
    const defaultData = createDefaultData();

    // Combine the preserved progress with a fresh default state
    this.data = {
      ...defaultData,
      ...preservedData,
      // Ensure the user object is completely new and anonymous, but preserve tutorial status
      user: {
        ...defaultData.user,
        tutorialComplete: currentData.user.tutorialComplete, // Preserve tutorial completion
        hasPlayedBefore: currentData.user.hasPlayedBefore, // Also preserve this flag
      },
      // Reset free games for anonymous user while preserving challenge completion
      dailyChallenges: {
        ...preservedData.dailyChallenges,
        freeGamesRemaining: 2, // Reset to anonymous user limit
      },
    };

    await this.saveData();
    console.log("✅ Session state has been reset, progress is preserved.");
  }

  /**
   * Export data for backup/sync
   */
  public async exportData(): Promise<UnifiedAppData> {
    return await this.getData();
  }

  /**
   * Export compressed data for cloud sync (more efficient)
   */
  public async exportCompressedData(): Promise<any> {
    const data = await this.getData();
    return DataCompressor.compress(data);
  }

  /**
   * Import data from backup/sync (for cloud sync)
   */
  public async importData(importedData: UnifiedAppData): Promise<void> {
    this.data = this.ensureDataStructure(importedData);
    this.isLoaded = true;
    await this.saveData();
  }

  /**
   * Import compressed data from cloud sync (more efficient)
   */
  public async importCompressedData(compressedData: any): Promise<void> {
    const decompressedData = DataCompressor.decompress(compressedData);
    this.data = this.ensureDataStructure(decompressedData);
    this.isLoaded = true;
    await this.saveData();
  }

  /**
   * Decompress data without importing (for sync processing)
   */
  public decompressData(compressedData: any): UnifiedAppData {
    const decompressedData = DataCompressor.decompress(compressedData);
    return this.ensureDataStructure(decompressedData);
  }

  /**
   * Update sync metadata
   */
  public async updateSyncMetadata(lastSyncAt: number): Promise<void> {
    const data = await this.getData();
    data.meta.lastSyncAt = lastSyncAt;
    await this.saveData();
  }

  /**
   * Get data size for monitoring
   */
  public async getDataSize(): Promise<number> {
    const data = await this.getData();
    return JSON.stringify(data).length;
  }

  // ============================================================================
  // DEBUG UTILITIES (for development/testing)
  // ============================================================================

  /**
   * Debug utility to easily set premium status
   */
  public async debugSetPremium(isPremium = true): Promise<void> {
    console.log(`🔧 DEBUG: Setting premium status to ${isPremium}`);
    await this.setPremiumStatus(isPremium);
    console.log(`✅ Premium status updated to ${isPremium}`);
  }

  /**
   * Debug utility to reset free games (useful for testing limits)
   */
  public async debugResetFreeGames(count = 2): Promise<void> {
    console.log(`🔧 DEBUG: Resetting free games to ${count}`);
    const data = await this.getData();
    data.dailyChallenges.freeGamesRemaining = count;
    await this.saveData();
    console.log(`✅ Free games reset to ${count}`);
  }

  /**
   * Debug utility to check word collection status
   */
  public async debugCheckWordCollections(): Promise<void> {
    console.log("🔧 DEBUG: Checking word collection status...");
    const data = await this.getData();
    console.log("📊 Word Collections Progress:");

    if (Object.keys(data.collections).length === 0) {
      console.log("  ❌ No words collected yet");
    } else {
      for (const [collectionId, progress] of Object.entries(data.collections)) {
        console.log(
          `  📚 ${collectionId}: ${progress.collectedWords.length} words`,
        );
        console.log(`    Words: ${progress.collectedWords.join(", ")}`);
      }
    }
  }

  /**
   * Debug utility to manually add a word to a collection (for testing)
   */
  public async debugAddWordToCollection(
    collectionId: string,
    word: string,
  ): Promise<void> {
    console.log(`🔧 DEBUG: Adding "${word}" to collection "${collectionId}"`);
    await this.recordWordForCollection(collectionId, word);
    console.log(`✅ Word added successfully`);
  }

  /**
   * Debug utility to completely reset all player data (for testing)
   */
  public async debugResetAllData(): Promise<void> {
    console.log("🔧 DEBUG: Resetting ALL player data...");
    console.log("⚠️  This will clear:");
    console.log("   - Game history and statistics");
    console.log("   - Achievement progress");
    console.log("   - Word collection progress");
    console.log("   - Daily challenge progress");
    console.log("   - Premium status");
    console.log("   - Tutorial completion status");
    console.log("   - All saved game states");
    console.log("   - Supabase authentication session");

    await this.resetAllData();

    // Also sign out from Supabase to avoid auth/data mismatch
    try {
      const { SupabaseService } = await import("./SupabaseService");
      const supabaseService = SupabaseService.getInstance();
      await supabaseService.signOut();
      console.log("🔓 Signed out from Supabase");
    } catch (error) {
      console.log("ℹ️ Could not sign out from Supabase (may not be signed in)");
    }

    console.log("✅ All player data has been reset to defaults");
    console.log("🎮 You now have a fresh start with 2 free games!");
    console.log("📚 Tutorial will show on next page refresh");
    console.log("🔄 Please refresh the page to complete the reset");
  }

  /**
   * Debug utility to fix missing user profile (when auth exists but profile data is missing)
   */
  public async debugFixMissingProfile(): Promise<void> {
    console.log("🔧 DEBUG: Attempting to fix missing user profile...");

    try {
      const { SupabaseService } = await import("./SupabaseService");
      const supabaseService = SupabaseService.getInstance();
      const user = supabaseService.getUser();

      if (!user) {
        console.log("❌ No authenticated user found");
        return;
      }

      console.log("👤 Found authenticated user:", user.id);
      console.log("📧 Email:", user.email);

      // Try to recreate the profile by signing up again (this will create the profile)
      if (user.email) {
        // This will fail with "user already exists" but might recreate the profile
        console.log("🔄 Attempting to recreate user profile...");

        // Alternative: try to create the profile directly using updateUserProfile
        const result = await supabaseService.updateUserProfile({
          email: user.email,
          is_premium: false, // Start as non-premium, they can upgrade again
          privacy_settings: {
            allow_challenge_sharing: true,
            allow_stats_sharing: true,
            allow_leaderboards: true,
            data_collection: false,
            email_updates: false,
          },
        });

        if (result.error) {
          console.log("❌ Could not recreate profile:", result.error);
          console.log(
            "💡 Try signing out and signing in again, or contact support",
          );
        } else {
          console.log("✅ User profile recreated successfully!");
          console.log("🔄 Please refresh the page to see the changes");
        }
      } else {
        console.log("❌ No email found for user");
      }
    } catch (error) {
      console.log("❌ Error fixing profile:", error);
      console.log("💡 Try: synapseDebug.resetAllData() to completely reset");
    }
  }

  /**
   * Debug utility to properly sign out of Supabase (more thorough than normal sign out)
   */
  public async debugSignOut(): Promise<void> {
    console.log("🔧 DEBUG: Signing out of Supabase...");

    try {
      const { SupabaseService } = await import("./SupabaseService");
      const supabaseService = SupabaseService.getInstance();

      const user = supabaseService.getUser();
      if (!user) {
        console.log("ℹ️ No authenticated user found - already signed out");
        return;
      }

      console.log("👤 Current user:", user.id);
      console.log("📧 Email:", user.email);
      console.log("🔓 Attempting sign out...");

      // Try normal sign out first
      const result = await supabaseService.signOut();

      if (result.error) {
        console.log("⚠️ Normal sign out failed:", result.error);
        console.log("🔧 Trying manual session clearing...");

        // Manual session clearing if normal sign out fails
        if (typeof window !== "undefined") {
          // Clear all Supabase-related storage
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.includes("supabase") || key.includes("auth")) {
              localStorage.removeItem(key);
              console.log("🗑️ Cleared localStorage key:", key);
            }
          }

          const sessionKeys = Object.keys(sessionStorage);
          for (const key of sessionKeys) {
            if (key.includes("supabase") || key.includes("auth")) {
              sessionStorage.removeItem(key);
              console.log("🗑️ Cleared sessionStorage key:", key);
            }
          }
        }

        console.log("✅ Manual session clearing complete");
        console.log("🔄 Please refresh the page to complete sign out");
      } else {
        console.log("✅ Sign out successful!");
        console.log(
          "🔄 Please refresh the page if you're still seeing auth errors",
        );
      }
    } catch (error) {
      console.log("❌ Error during sign out:", error);
      console.log(
        "💡 Try refreshing the page or clearing browser storage manually",
      );
    }
  }

  /**
   * Word Collection Operations
   */
  public async markWordCollectionAsCompleted(
    collectionId: string,
  ): Promise<boolean> {
    const data = await this.getData();

    if (!data.wordCollections.completedIds.includes(collectionId)) {
      data.wordCollections.completedIds.push(collectionId);
      data.wordCollections.completionTimestamps[collectionId] = Date.now();
      await this.saveData();
      return true; // New completion
    }

    return false; // Already completed
  }

  public async getCompletedWordCollections(): Promise<string[]> {
    const data = await this.getData();
    return data.wordCollections.completedIds;
  }

  public async getViewedWordCollections(): Promise<string[]> {
    const data = await this.getData();
    return data.wordCollections.viewedIds;
  }

  public async markWordCollectionAsViewed(collectionId: string): Promise<void> {
    const data = await this.getData();
    if (!data.wordCollections.viewedIds.includes(collectionId)) {
      data.wordCollections.viewedIds.push(collectionId);
      await this.saveData();
    }
  }

  public async markMultipleWordCollectionsAsViewed(
    collectionIds: string[],
  ): Promise<void> {
    const data = await this.getData();
    let hasChanges = false;

    for (const collectionId of collectionIds) {
      if (!data.wordCollections.viewedIds.includes(collectionId)) {
        data.wordCollections.viewedIds.push(collectionId);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveData();
    }
  }

  /**
   * Check and update word collection completion status
   * This should be called whenever word collection progress changes
   */
  public async checkAndUpdateWordCollectionCompletion(): Promise<string[]> {
    const data = await this.getData();
    const newlyCompleted: string[] = [];

    // Import word collections to check against
    const { allWordCollections } = await import("../features/wordCollections");

    for (const collection of allWordCollections) {
      const progress = data.collections[collection.id];

      if (progress && collection.words && collection.words.length > 0) {
        const isCompleted =
          progress.collectedWords.length === collection.words.length;

        if (
          isCompleted &&
          !data.wordCollections.completedIds.includes(collection.id)
        ) {
          // Mark as completed
          data.wordCollections.completedIds.push(collection.id);
          data.wordCollections.completionTimestamps[collection.id] = Date.now();
          newlyCompleted.push(collection.id);
        }
      }
    }

    if (newlyCompleted.length > 0) {
      await this.saveData();
    }

    return newlyCompleted;
  }

  // ============================================================================
  // PENDING CONVERSION DATA (Temporary storage during purchase flow)
  // These methods interact with AsyncStorage directly for specific temporary keys,
  // separate from the main UNIFIED_DATA_KEY blob.
  // ============================================================================

  public async storePendingConversionDetails(
    anonymousUserId: string,
    details: { 
      email: string; 
      password?: string; // Password becomes optional if JWT is used for auth to finalize
      emailUpdatesOptIn: boolean; 
      anonymousUserJwt?: string; // Add JWT here
    }
  ): Promise<void> {
    const key = `pending_conversion_${anonymousUserId}`;
    try {
      if (details.password) {
        console.warn(`Storing password temporarily for user ${anonymousUserId}. Ensure it's cleared after conversion.`);
      }
      if (!details.anonymousUserJwt) {
        console.warn(`Storing pending conversion details without JWT for ${anonymousUserId}. Finalize function call might need it.`);
      }
      await AsyncStorage.setItem(key, JSON.stringify(details));
      console.log(`Stored pending conversion details for ${anonymousUserId}`);
    } catch (error) {
      console.error(`Failed to store pending conversion details for ${anonymousUserId}:`, error);
      throw error; 
    }
  }

  public async retrievePendingConversionDetails(
    anonymousUserId: string
  ): Promise<{ 
    email: string; 
    password?: string; 
    emailUpdatesOptIn: boolean; 
    anonymousUserJwt?: string; 
  } | null> {
    const key = `pending_conversion_${anonymousUserId}`;
    try {
      const detailsString = await AsyncStorage.getItem(key);
      if (detailsString) {
        console.log(`Retrieved pending conversion details for ${anonymousUserId}`);
        return JSON.parse(detailsString);
      }
      return null;
    } catch (error) {
      console.error(`Failed to retrieve pending conversion details for ${anonymousUserId}:`, error);
      return null; 
    }
  }

  public async clearPendingConversionDetails(anonymousUserId: string): Promise<void> {
    const key = `pending_conversion_${anonymousUserId}`;
    try {
      await AsyncStorage.removeItem(key);
      console.log(`Cleared pending conversion details for ${anonymousUserId}`);
    } catch (error) {
      console.error(`Failed to clear pending conversion details for ${anonymousUserId}:`, error);
      // Optionally re-throw
    }
  }
}

// Create and export the singleton instance
export const unifiedDataStore = UnifiedDataStore.getInstance();

// ============================================================================
// GLOBAL DEBUG UTILITIES (for development)
// ============================================================================

// Expose debug utilities to global scope for easy console access
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).synapseDebug = {
    setPremium: (isPremium = true) =>
      unifiedDataStore.debugSetPremium(isPremium),
    resetFreeGames: (count = 2) => unifiedDataStore.debugResetFreeGames(count),
    checkPremium: () => unifiedDataStore.isPremiumUser(),
    checkFreeGames: () => unifiedDataStore.getRemainingFreeGames(),
    checkWordCollections: () => unifiedDataStore.debugCheckWordCollections(),
    addWordToCollection: (collectionId: string, word: string) =>
      unifiedDataStore.debugAddWordToCollection(collectionId, word),
    resetAllData: () => unifiedDataStore.debugResetAllData(),
    fixMissingProfile: () => unifiedDataStore.debugFixMissingProfile(),
    signOut: () => unifiedDataStore.debugSignOut(),
  };
  console.log("🎮 Synapse Debug utilities available at window.synapseDebug");
  console.log("📝 Available commands:");
  console.log("  - synapseDebug.setPremium(true)  // Set premium status");
  console.log("  - synapseDebug.setPremium(false) // Remove premium status");
  console.log(
    "  - synapseDebug.checkPremium()    // Check current premium status",
  );
  console.log("  - synapseDebug.resetFreeGames(5) // Reset free games count");
  console.log(
    "  - synapseDebug.checkFreeGames()  // Check remaining free games",
  );
  console.log(
    "  - synapseDebug.checkWordCollections() // Check word collection progress",
  );
  console.log(
    '  - synapseDebug.addWordToCollection("movement", "run") // Add word to collection',
  );
  console.log("  - synapseDebug.resetAllData()  // Reset all player data");
  console.log(
    "  - synapseDebug.fixMissingProfile()  // Fix missing user profile",
  );
  console.log("  - synapseDebug.signOut()  // Properly sign out of Supabase");
}