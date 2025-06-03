import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserData, 
  UserProfile,
  LifetimeStats, 
  GameSettings,
  UnlockedAchievements,
  WordCollectionProgress,
  DailyChallengeData,
  STORAGE_KEYS,
  DATA_VERSIONS
} from '../types/userData';
import type { GameReport } from '../utils/gameReportUtils';
import type { DailyChallengeProgress } from '../types/dailyChallenges';

export class UserDataService {
  private static instance: UserDataService;
  private userData: UserData | null = null;

  private constructor() {}

  public static getInstance(): UserDataService {
    if (!UserDataService.instance) {
      UserDataService.instance = new UserDataService();
    }
    return UserDataService.instance;
  }

  // Initialize default user data
  private getDefaultUserData(userId?: string): UserData {
    const now = Date.now();
    return {
      profile: {
        id: userId || this.generateUserId(),
        createdAt: now,
        lastActiveAt: now,
        isPremium: false,
        version: DATA_VERSIONS.USER_DATA,
      },
      stats: {
        totalGamesPlayed: 0,
        totalWins: 0,
        totalGaveUps: 0,
        achievementsUnlocked: 0,
        cumulativeMoveAccuracySum: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        totalBacktracksUsed: 0,
        perfectGames: 0,
        averageMovesPerGame: 0,
        version: DATA_VERSIONS.LIFETIME_STATS,
      },
      settings: {
        tutorialComplete: false,
        showPathHints: true,
        soundEnabled: true,
        hapticFeedback: true,
        version: DATA_VERSIONS.GAME_SETTINGS,
      },
      achievements: {
        achievementIds: [],
        version: DATA_VERSIONS.ACHIEVEMENTS,
      },
      wordCollections: {},
      dailyChallenges: {
        progress: {},
        freeGamesCount: 2,
        lastResetDate: new Date().toISOString().split('T')[0],
        hasPlayedToday: false,
        version: DATA_VERSIONS.DAILY_CHALLENGES,
      },
      gameHistory: [],
      version: DATA_VERSIONS.USER_DATA,
      lastBackupAt: now,
    };
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Load user data from storage
  public async loadUserData(): Promise<UserData> {
    try {
      if (this.userData) {
        return this.userData;
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (stored) {
        this.userData = JSON.parse(stored);
        // TODO: Add data migration logic here
        return this.userData!;
      }

      // No stored data, create default
      this.userData = this.getDefaultUserData();
      await this.saveUserData();
      return this.userData;
    } catch (error) {
      console.error('Error loading user data:', error);
      // Return default data on error
      this.userData = this.getDefaultUserData();
      return this.userData;
    }
  }

  // Save user data to storage
  public async saveUserData(userData?: UserData): Promise<void> {
    try {
      const data = userData || this.userData;
      if (!data) {
        throw new Error('No user data to save');
      }

      data.lastBackupAt = Date.now();
      this.userData = data;
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  // Get current user data (loads if not cached)
  public async getUserData(): Promise<UserData> {
    if (!this.userData) {
      return await this.loadUserData();
    }
    return this.userData;
  }

  // Update specific sections of user data
  public async updateStats(newStats: Partial<LifetimeStats>): Promise<void> {
    const userData = await this.getUserData();
    userData.stats = { ...userData.stats, ...newStats };
    await this.saveUserData(userData);
  }

  public async updateSettings(newSettings: Partial<GameSettings>): Promise<void> {
    const userData = await this.getUserData();
    userData.settings = { ...userData.settings, ...newSettings };
    await this.saveUserData(userData);
  }

  public async addGameToHistory(gameReport: GameReport): Promise<void> {
    const userData = await this.getUserData();
    userData.gameHistory = [gameReport, ...userData.gameHistory].slice(0, 100);
    await this.saveUserData(userData);
  }

  public async unlockAchievement(achievementId: string): Promise<void> {
    const userData = await this.getUserData();
    if (!userData.achievements.achievementIds.includes(achievementId)) {
      userData.achievements.achievementIds.push(achievementId);
      userData.achievements.lastUnlockedAt = Date.now();
      userData.stats.achievementsUnlocked = userData.achievements.achievementIds.length;
      await this.saveUserData(userData);
    }
  }

  public async updateWordCollectionProgress(
    collectionId: string,
    word: string
  ): Promise<void> {
    const userData = await this.getUserData();
    
    if (!userData.wordCollections[collectionId]) {
      userData.wordCollections[collectionId] = {
        collectedWords: [],
        lastUpdated: Date.now(),
      };
    }

    if (!userData.wordCollections[collectionId].collectedWords.includes(word)) {
      userData.wordCollections[collectionId].collectedWords.push(word);
      userData.wordCollections[collectionId].lastUpdated = Date.now();
      await this.saveUserData(userData);
    }
  }

  public async updateDailyChallengeProgress(
    challengeId: string,
    progress: Omit<DailyChallengeProgress, 'challengeId'>
  ): Promise<void> {
    const userData = await this.getUserData();
    userData.dailyChallenges.progress[challengeId] = { challengeId, ...progress };
    await this.saveUserData(userData);
  }

  public async consumeFreeGame(): Promise<number> {
    const userData = await this.getUserData();
    const newCount = Math.max(0, userData.dailyChallenges.freeGamesCount - 1);
    userData.dailyChallenges.freeGamesCount = newCount;
    await this.saveUserData(userData);
    return newCount;
  }

  public async resetDailyFreeGames(): Promise<void> {
    const userData = await this.getUserData();
    const today = new Date().toISOString().split('T')[0];
    
    if (userData.dailyChallenges.lastResetDate !== today) {
      userData.dailyChallenges.freeGamesCount = 2;
      userData.dailyChallenges.lastResetDate = today;
      userData.dailyChallenges.hasPlayedToday = false;
      await this.saveUserData(userData);
    }
  }

  // Migration utilities
  public async migrateOldData(): Promise<void> {
    try {
      console.log('Starting data migration from old storage format...');
      
      // Migrate old data from individual storage keys
      const oldStats = await this.getOldLifetimeStats();
      const oldHistory = await this.getOldGameHistory();
      const oldAchievements = await this.getOldAchievements();
      const oldCollections = await this.getOldWordCollections();
      const tutorialComplete = await AsyncStorage.getItem('tutorialComplete');

      // Create new consolidated user data
      const userData = this.getDefaultUserData();
      
      if (oldStats) {
        userData.stats = { ...userData.stats, ...oldStats, version: DATA_VERSIONS.LIFETIME_STATS };
      }
      
      if (oldHistory && oldHistory.length > 0) {
        userData.gameHistory = oldHistory.slice(0, 100);
      }
      
      if (oldAchievements && oldAchievements.length > 0) {
        userData.achievements.achievementIds = oldAchievements;
        userData.stats.achievementsUnlocked = oldAchievements.length;
      }
      
      if (oldCollections) {
        userData.wordCollections = oldCollections;
      }
      
      if (tutorialComplete === 'true') {
        userData.settings.tutorialComplete = true;
      }

      // Save consolidated data
      await this.saveUserData(userData);
      
      // Clean up old storage keys (optional - uncomment when ready)
      // await this.cleanupOldStorageKeys();
      
      console.log('Data migration completed successfully');
    } catch (error) {
      console.error('Error during data migration:', error);
    }
  }

  private async getOldLifetimeStats(): Promise<Partial<LifetimeStats> | null> {
    try {
      const stored = await AsyncStorage.getItem('synapse_lifetime_stats');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async getOldGameHistory(): Promise<GameReport[] | null> {
    try {
      const stored = await AsyncStorage.getItem('synapse_game_history');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async getOldAchievements(): Promise<string[] | null> {
    try {
      const stored = await AsyncStorage.getItem('synapse_unlocked_achievements');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async getOldWordCollections(): Promise<WordCollectionProgress | null> {
    try {
      const stored = await AsyncStorage.getItem('synapse_word_collections_progress');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Clear all user data (for testing or account deletion)
  public async clearAllUserData(): Promise<void> {
    try {
      this.userData = null;
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.USER_SESSION,
      ]);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  // Check if user is premium
  public async isPremiumUser(): Promise<boolean> {
    const userData = await this.getUserData();
    if (!userData.profile.isPremium) {
      return false;
    }
    
    // Check if premium has expired
    if (userData.profile.premiumExpiresAt && userData.profile.premiumExpiresAt < Date.now()) {
      userData.profile.isPremium = false;
      await this.saveUserData(userData);
      return false;
    }
    
    return true;
  }

  // Grant premium access
  public async grantPremium(expiresAt?: number): Promise<void> {
    const userData = await this.getUserData();
    userData.profile.isPremium = true;
    userData.profile.premiumExpiresAt = expiresAt;
    await this.saveUserData(userData);
  }
}

// Export singleton instance
export const userDataService = UserDataService.getInstance(); 