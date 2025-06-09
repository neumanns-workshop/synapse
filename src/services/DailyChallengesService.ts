import { unifiedDataStore } from "./UnifiedDataStore";
import dailyChallengesData from "../data/daily_challenges_v2.json";
import type {
  DailyChallenge,
  DailyChallengesData,
  DailyChallengeProgress,
  DailyChallengeState,
} from "../types/dailyChallenges";

// Import the daily challenges data

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
   * Get today's date in YYYY-MM-DD format using EST timezone
   * Daily challenges reset at 12:00 AM EST
   */
  private getTodayString(): string {
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
  }

  /**
   * Get the daily challenge for a specific date
   */
  public getChallengeForDate(date: string): DailyChallenge | null {
    return this.challenges.find((challenge) => challenge.date === date) || null;
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
    const todaysChallenge = this.getTodaysChallenge();
    console.log(
      "🔍 DailyChallengesService: hasCompletedTodaysChallenge called:",
      {
        todaysChallengeExists: !!todaysChallenge,
        challengeId: todaysChallenge?.id,
      },
    );

    if (!todaysChallenge) {
      console.log(
        "🔍 DailyChallengesService: No challenge for today, returning false",
      );
      return false; // No challenge available for today
    }

    const progress = await unifiedDataStore.getDailyChallengeProgress();
    console.log("🔍 DailyChallengesService: Progress data:", {
      allProgressKeys: Object.keys(progress),
      targetChallengeId: todaysChallenge.id,
      targetProgress: progress[todaysChallenge.id],
      isCompleted: progress[todaysChallenge.id]?.completed,
    });

    // Use the challenge ID as the key, not the date
    const isCompleted = progress[todaysChallenge.id]?.completed || false;
    console.log("🔍 DailyChallengesService: Final result:", isCompleted);
    return isCompleted;
  }

  /**
   * Get all daily challenge progress
   */
  public async getDailyChallengeProgress(): Promise<
    Record<string, DailyChallengeProgress>
  > {
    return await unifiedDataStore.getDailyChallengeProgress();
  }

  /**
   * Save daily challenge progress
   */
  public async saveDailyChallengeProgress(
    challengeId: string,
    progress: Omit<DailyChallengeProgress, "challengeId" | "completed"> & {
      status: "won" | "given_up";
    },
  ): Promise<void> {
    const fullProgress: DailyChallengeProgress = {
      challengeId,
      completed: true, // Mark as completed regardless of status
      ...progress,
    };
    await unifiedDataStore.updateDailyChallengeProgress(
      challengeId,
      fullProgress,
    );
  }

  /**
   * Get remaining free games for today
   */
  public async getRemainingFreeGames(): Promise<number> {
    return await unifiedDataStore.getRemainingFreeGames();
  }

  /**
   * Consume a free game
   */
  public async consumeFreeGame(): Promise<number> {
    return await unifiedDataStore.consumeFreeGame();
  }

  /**
   * Check if user is premium
   * Now requires BOTH local premium status AND being authenticated
   */
  public async isPremiumUser(): Promise<boolean> {
    // First check if user has local premium status
    const hasLocalPremium = await unifiedDataStore.isPremiumUser();

    // If no local premium, definitely not premium
    if (!hasLocalPremium) {
      return false;
    }

    // If has local premium, also check if user is authenticated
    // This prevents signed-out users from retaining premium benefits
    try {
      const { SupabaseService } = await import("./SupabaseService");
      const supabaseService = SupabaseService.getInstance();
      const isAuthenticated = supabaseService.isAuthenticated();

      // Must be both locally premium AND authenticated
      return hasLocalPremium && isAuthenticated;
    } catch (error) {
      console.error("Error checking authentication for premium status:", error);
      // If we can't check auth, default to local premium status only
      return hasLocalPremium;
    }
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
      progress,
    };
  }

  /**
   * Get challenges for a date range (for calendar view)
   */
  public getChallengesInRange(
    startDate: string,
    endDate: string,
  ): DailyChallenge[] {
    return this.challenges.filter(
      (challenge) => challenge.date >= startDate && challenge.date <= endDate,
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
    // Reset the daily challenges section in unified data
    const data = await unifiedDataStore.getData();
    data.dailyChallenges = {
      progress: {},
      freeGamesRemaining: 2,
      lastResetDate: this.getTodayString(),
    };
    await unifiedDataStore.saveData();
    console.log("Daily challenge data cleared");
  }
}

// Export singleton instance
export const dailyChallengesService = DailyChallengesService.getInstance();
