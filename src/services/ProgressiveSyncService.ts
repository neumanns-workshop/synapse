import { SupabaseService } from './SupabaseService';
import { UnifiedDataStore, UnifiedAppData } from './UnifiedDataStore';

export interface SyncProgress {
  step: 'profile' | 'challenges' | 'achievements' | 'history';
  stepNumber: number;
  totalSteps: number;
  message: string;
  completed: boolean;
  error?: any;
}

export interface ProgressiveSyncResult {
  success: boolean;
  steps: SyncProgress[];
  totalTime: number;
  error?: any;
}

export class ProgressiveSyncService {
  private static instance: ProgressiveSyncService;
  private supabaseService: SupabaseService;
  private unifiedStore: UnifiedDataStore;
  private syncProgressListeners: ((progress: SyncProgress) => void)[] = [];

  private constructor() {
    this.supabaseService = SupabaseService.getInstance();
    this.unifiedStore = UnifiedDataStore.getInstance();
  }

  public static getInstance(): ProgressiveSyncService {
    if (!ProgressiveSyncService.instance) {
      ProgressiveSyncService.instance = new ProgressiveSyncService();
    }
    return ProgressiveSyncService.instance;
  }

  public onSyncProgress(callback: (progress: SyncProgress) => void) {
    this.syncProgressListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.syncProgressListeners.indexOf(callback);
      if (index > -1) {
        this.syncProgressListeners.splice(index, 1);
      }
    };
  }

  private notifySyncProgress(progress: SyncProgress) {
    this.syncProgressListeners.forEach((listener) => listener(progress));
  }

  /**
   * Progressive sync: Upload data to cloud in priority order with progress updates
   */
  public async syncToCloud(): Promise<ProgressiveSyncResult> {
    const startTime = Date.now();
    const steps: SyncProgress[] = [];
    const totalSteps = 4;

    try {
      if (!this.supabaseService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const localData = await this.unifiedStore.exportData();
      const userId = this.supabaseService.getUser()?.id!;

      // Step 1: Sync user profile (critical auth data)
      const profileStep = await this.syncUserProfileToCloud(localData, userId, 1, totalSteps);
      steps.push(profileStep);
      if (!profileStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: profileStep.error };
      }

      // Step 2: Sync daily challenges (time-sensitive)
      const challengesStep = await this.syncDailyChallengesToCloud(localData, userId, 2, totalSteps);
      steps.push(challengesStep);
      if (!challengesStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: challengesStep.error };
      }

      // Step 3: Sync achievements/stats (user progress)
      const achievementsStep = await this.syncAchievementsStatsToCloud(localData, userId, 3, totalSteps);
      steps.push(achievementsStep);
      if (!achievementsStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: achievementsStep.error };
      }

      // Step 4: Sync game history (bulk data)
      const historyStep = await this.syncGameHistoryToCloud(localData, userId, 4, totalSteps);
      steps.push(historyStep);
      if (!historyStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: historyStep.error };
      }

      // Update local sync timestamp
      await this.unifiedStore.updateSyncMetadata(Date.now());

      return { success: true, steps, totalTime: Date.now() - startTime };
    } catch (error) {
      console.error('Progressive sync to cloud failed:', error);
      return { success: false, steps, totalTime: Date.now() - startTime, error };
    }
  }

  /**
   * Progressive sync: Download data from cloud in priority order with progress updates
   */
  public async syncFromCloud(): Promise<ProgressiveSyncResult> {
    const startTime = Date.now();
    const steps: SyncProgress[] = [];
    const totalSteps = 4;

    try {
      if (!this.supabaseService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const userId = this.supabaseService.getUser()?.id!;

      // Step 1: Sync user profile (critical auth data)
      const profileStep = await this.syncUserProfileFromCloud(userId, 1, totalSteps);
      steps.push(profileStep);
      if (!profileStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: profileStep.error };
      }

      // Step 2: Sync daily challenges (time-sensitive)
      const challengesStep = await this.syncDailyChallengesFromCloud(userId, 2, totalSteps);
      steps.push(challengesStep);
      if (!challengesStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: challengesStep.error };
      }

      // Step 3: Sync achievements/stats (user progress)
      const achievementsStep = await this.syncAchievementsStatsFromCloud(userId, 3, totalSteps);
      steps.push(achievementsStep);
      if (!achievementsStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: achievementsStep.error };
      }

      // Step 4: Sync game history (bulk data)
      const historyStep = await this.syncGameHistoryFromCloud(userId, 4, totalSteps);
      steps.push(historyStep);
      if (!historyStep.completed) {
        return { success: false, steps, totalTime: Date.now() - startTime, error: historyStep.error };
      }

      return { success: true, steps, totalTime: Date.now() - startTime };
    } catch (error) {
      console.error('Progressive sync from cloud failed:', error);
      return { success: false, steps, totalTime: Date.now() - startTime, error };
    }
  }

  // ============================================================================
  // PRIVATE SYNC STEP METHODS - TO CLOUD
  // ============================================================================

  private async syncUserProfileToCloud(localData: UnifiedAppData, userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'profile',
      stepNumber,
      totalSteps,
      message: 'Syncing user profile...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Get the current profile to preserve email_updates (this is managed separately in the UI)
      const currentProfile = this.supabaseService.getUserProfile();
      
      // Use existing SupabaseService method for profile updates
      const profileUpdates = {
        is_premium: localData.user.isPremium,
        platform_purchase_data: localData.user.purchase || undefined,
        privacy_settings: {
          allow_challenge_sharing: localData.user.privacy?.allowChallengeSharing ?? true,
          allow_stats_sharing: localData.user.privacy?.allowStatsSharing ?? true,
          allow_leaderboards: localData.user.privacy?.allowLeaderboards ?? true,
          data_collection: localData.user.privacy?.dataCollection ?? false,
          // Preserve the current email_updates setting from the profile
          // This prevents sync from overwriting user preference changes
          email_updates: currentProfile?.privacy_settings?.email_updates ?? false,
        },
      };

      await this.supabaseService.updateUserProfile(profileUpdates);

      step.completed = true;
      step.message = 'User profile synced successfully';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing user profile to cloud:', error);
      step.error = error;
      step.message = 'Failed to sync user profile';
      this.notifySyncProgress(step);
      return step;
    }
  }

  private async syncDailyChallengesToCloud(localData: UnifiedAppData, userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'challenges',
      stepNumber,
      totalSteps,
      message: 'Syncing daily challenges...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Skip this step for now since full sync will happen in the final step
      // This avoids multiple full syncs per progressive sync operation
      
      step.completed = true;
      step.message = 'Daily challenges prepared for sync';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing daily challenges to cloud:', error);
      step.error = error;
      step.message = 'Failed to sync daily challenges';
      this.notifySyncProgress(step);
      return step;
    }
  }

  private async syncAchievementsStatsToCloud(localData: UnifiedAppData, userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'achievements',
      stepNumber,
      totalSteps,
      message: 'Syncing achievements and stats...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Skip this step for now since full sync will happen in the final step
      // This avoids multiple full syncs per progressive sync operation
      
      step.completed = true;
      step.message = 'Achievements and stats prepared for sync';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing achievements/stats to cloud:', error);
      step.error = error;
      step.message = 'Failed to sync achievements and stats';
      this.notifySyncProgress(step);
      return step;
    }
  }

  private async syncGameHistoryToCloud(localData: UnifiedAppData, userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'history',
      stepNumber,
      totalSteps,
      message: 'Uploading all data to cloud...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Final complete sync to cloud - this does the actual data upload
      await this.supabaseService.syncLocalDataToCloud();

      step.completed = true;
      step.message = 'All data uploaded successfully';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing data to cloud:', error);
      step.error = error;
      step.message = 'Failed to upload data to cloud';
      this.notifySyncProgress(step);
      return step;
    }
  }

  // ============================================================================
  // PRIVATE SYNC STEP METHODS - FROM CLOUD
  // ============================================================================

  private async syncUserProfileFromCloud(userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'profile',
      stepNumber,
      totalSteps,
      message: 'Loading user profile...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Use existing method to refresh profile
      await this.supabaseService.refreshUserProfile();

      step.completed = true;
      step.message = 'User profile loaded successfully';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing user profile from cloud:', error);
      step.error = error;
      step.message = 'Failed to load user profile';
      this.notifySyncProgress(step);
      return step;
    }
  }

  private async syncDailyChallengesFromCloud(userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'challenges',
      stepNumber,
      totalSteps,
      message: 'Loading daily challenges...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Skip this step for now since full sync will happen in the final step
      // This avoids multiple full downloads per progressive sync operation
      
      step.completed = true;
      step.message = 'Daily challenges prepared for loading';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing daily challenges from cloud:', error);
      step.error = error;
      step.message = 'Failed to load daily challenges';
      this.notifySyncProgress(step);
      return step;
    }
  }

  private async syncAchievementsStatsFromCloud(userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'achievements',
      stepNumber,
      totalSteps,
      message: 'Loading achievements and stats...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Skip this step for now since full sync will happen in the final step
      // This avoids multiple full downloads per progressive sync operation
      
      step.completed = true;
      step.message = 'Achievements and stats prepared for loading';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing achievements/stats from cloud:', error);
      step.error = error;
      step.message = 'Failed to load achievements and stats';
      this.notifySyncProgress(step);
      return step;
    }
  }

  private async syncGameHistoryFromCloud(userId: string, stepNumber: number, totalSteps: number): Promise<SyncProgress> {
    const step: SyncProgress = {
      step: 'history',
      stepNumber,
      totalSteps,
      message: 'Loading all data from cloud...',
      completed: false
    };

    this.notifySyncProgress(step);

    try {
      // Final complete sync from cloud - this does the actual data download
      await this.supabaseService.syncCloudDataToLocal();

      step.completed = true;
      step.message = 'All data loaded successfully';
      this.notifySyncProgress(step);
      return step;
    } catch (error) {
      console.error('Error syncing data from cloud:', error);
      step.error = error;
      step.message = 'Failed to load data from cloud';
      this.notifySyncProgress(step);
      return step;
    }
  }
}

export default ProgressiveSyncService; 