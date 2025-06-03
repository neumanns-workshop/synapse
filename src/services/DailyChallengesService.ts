import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  DailyChallenge, 
  DailyChallengesData, 
  DailyChallengeProgress, 
  DailyChallengeState 
} from '../types/dailyChallenges';

// Storage keys
const DAILY_CHALLENGE_PROGRESS_KEY = 'dailyChallengeProgress';
const DAILY_CHALLENGE_STATE_KEY = 'dailyChallengeState';
const FREE_GAMES_COUNT_KEY = 'freeGamesCount';
const LAST_RESET_DATE_KEY = 'lastResetDate';

// Import the daily challenges data
import dailyChallengesData from '../data/daily_challenges_v2.json';

export class DailyChallengesService {
  private static instance: DailyChallengesService;
  private challenges: DailyChallenge[] = [];

  private constructor() {
    this.challenges = (dailyChallengesData as DailyChallengesData).challenges;
  }

  public static getInstance(): DailyChallengesService {
    if (!DailyChallengesService.instance) {
      DailyChallengesService.instance = new DailyChallengesService();
    }
    return DailyChallengesService.instance;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get the daily challenge for a specific date
   */
  public getChallengeForDate(date: string): DailyChallenge | null {
    return this.challenges.find(challenge => challenge.date === date) || null;
  }

  /**
   * Get today's daily challenge
   */
  public getTodaysChallenge(): DailyChallenge | null {
    return this.getChallengeForDate(this.getTodayString());
  }

  /**
   * Check if user has completed today's challenge
   */
  public async hasCompletedTodaysChallenge(): Promise<boolean> {
    const today = this.getTodayString();
    const progress = await this.getDailyChallengeProgress();
    return progress[today]?.completed || false;
  }

  /**
   * Get all daily challenge progress
   */
  public async getDailyChallengeProgress(): Promise<Record<string, DailyChallengeProgress>> {
    try {
      const progressJson = await AsyncStorage.getItem(DAILY_CHALLENGE_PROGRESS_KEY);
      return progressJson ? JSON.parse(progressJson) : {};
    } catch (error) {
      console.error('Error loading daily challenge progress:', error);
      return {};
    }
  }

  /**
   * Save daily challenge progress
   */
  public async saveDailyChallengeProgress(
    challengeId: string, 
    progress: Omit<DailyChallengeProgress, 'challengeId'>
  ): Promise<void> {
    try {
      const allProgress = await this.getDailyChallengeProgress();
      allProgress[challengeId] = { challengeId, ...progress };
      await AsyncStorage.setItem(DAILY_CHALLENGE_PROGRESS_KEY, JSON.stringify(allProgress));
    } catch (error) {
      console.error('Error saving daily challenge progress:', error);
    }
  }

  /**
   * Get remaining free games for today
   */
  public async getRemainingFreeGames(): Promise<number> {
    try {
      const today = this.getTodayString();
      const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);
      
      // Reset count if it's a new day
      if (lastResetDate !== today) {
        await AsyncStorage.setItem(FREE_GAMES_COUNT_KEY, '2'); // 2 free games per day
        await AsyncStorage.setItem(LAST_RESET_DATE_KEY, today);
        return 2;
      }

      const freeGamesJson = await AsyncStorage.getItem(FREE_GAMES_COUNT_KEY);
      return freeGamesJson ? parseInt(freeGamesJson, 10) : 2;
    } catch (error) {
      console.error('Error getting remaining free games:', error);
      return 2;
    }
  }

  /**
   * Consume a free game
   */
  public async consumeFreeGame(): Promise<number> {
    try {
      const remaining = await this.getRemainingFreeGames();
      const newCount = Math.max(0, remaining - 1);
      await AsyncStorage.setItem(FREE_GAMES_COUNT_KEY, newCount.toString());
      return newCount;
    } catch (error) {
      console.error('Error consuming free game:', error);
      return 0;
    }
  }

  /**
   * Check if user is premium (placeholder for future implementation)
   */
  public async isPremiumUser(): Promise<boolean> {
    // TODO: Implement premium user check
    return false;
  }

  /**
   * Get the current daily challenge state
   */
  public async getDailyChallengeState(): Promise<DailyChallengeState> {
    const todaysChallenge = this.getTodaysChallenge();
    const hasPlayedToday = await this.hasCompletedTodaysChallenge();
    const remainingFreeGames = await this.getRemainingFreeGames();
    const isPremium = await this.isPremiumUser();
    const progress = await this.getDailyChallengeProgress();

    return {
      todaysChallenge,
      hasPlayedToday,
      remainingFreeGames,
      isPremium,
      progress
    };
  }

  /**
   * Get challenges for a date range (for calendar view)
   */
  public getChallengesInRange(startDate: string, endDate: string): DailyChallenge[] {
    return this.challenges.filter(challenge => 
      challenge.date >= startDate && challenge.date <= endDate
    );
  }

  /**
   * Get all available challenges (for calendar view)
   */
  public getAllChallenges(): DailyChallenge[] {
    return this.challenges;
  }

  /**
   * Check if a challenge is available (not in the future)
   */
  public isChallengeAvailable(date: string): boolean {
    const today = this.getTodayString();
    return date <= today;
  }

  /**
   * Reset all daily challenge data (for testing purposes)
   */
  public async resetDailyChallengeData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        DAILY_CHALLENGE_PROGRESS_KEY,
        DAILY_CHALLENGE_STATE_KEY,
        FREE_GAMES_COUNT_KEY,
        LAST_RESET_DATE_KEY,
      ]);
      console.log('Daily challenge data cleared');
    } catch (error) {
      console.error('Error clearing daily challenge data:', error);
    }
  }
}

// Export singleton instance
export const dailyChallengesService = DailyChallengesService.getInstance(); 