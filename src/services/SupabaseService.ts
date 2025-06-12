import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from "@supabase/supabase-js";

import { useGameStore } from "../stores/useGameStore";
import { Logger } from "../utils/logger";
import type { GameReport } from "../utils/gameReportUtils";
import { UnifiedDataStore, UnifiedAppData } from "./UnifiedDataStore";

// Environment variables (set in your .env file)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Temporarily comment out the throw to see the log even if vars are missing
  // throw new Error("Missing Supabase environment variables");
  console.error(
    "ERROR: Missing Supabase environment variables. Supabase URL:",
    supabaseUrl,
    "Anon Key:",
    supabaseAnonKey,
  );
}

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_premium: boolean;
  platform_purchase_data?: {
    platform: "ios" | "android" | "web" | "stripe";
    transactionId?: string;
    purchaseDate?: number;
    receiptData?: string;
    validated?: boolean;
    lastValidated?: number;
  };
  privacy_settings: {
    allow_challenge_sharing: boolean;
    allow_stats_sharing: boolean;
    allow_leaderboards: boolean;
    data_collection: boolean;
    email_updates: boolean;
  };
  legal_consent?: {
    terms_of_service: {
      accepted: boolean;
      accepted_at?: string;
      version?: string;
    };
    privacy_policy: {
      accepted: boolean;
      accepted_at?: string;
      version?: string;
    };
  };
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

// ============================================================================
// MERGE METHOD TYPE INTERFACES
// ============================================================================

interface AchievementData {
  unlockedIds: string[];
  viewedIds: string[];
  unlockTimestamps: Record<string, number>;
  progressiveCounters: Record<string, number>;
  schemaVersion: number;
}

interface WordCollectionData {
  [collectionId: string]: {
    collectedWords: string[];
    lastUpdated: number;
  };
}

interface WordCollectionStatusData {
  completedIds: string[];
  viewedIds: string[];
  completionTimestamps: Record<string, number>;
  schemaVersion: number;
}

interface StatisticsData {
  totalGamesPlayed: number;
  totalWins: number;
  totalGaveUps: number;
  achievementsUnlocked: number;
  cumulativeMoveAccuracySum: number;
}

interface NewsStatusData {
  readArticleIds: string[];
  lastChecked: number;
}

interface GameHistoryItem extends Partial<GameReport> {
  id?: string;
  timestamp: number;
  [key: string]: unknown;
}

export class SupabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;
  private unifiedStore: UnifiedDataStore;
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentAuthState: AuthState = {
    user: null,
    session: null,
    profile: null,
    isLoading: true,
  };

  private constructor() {
    // ACCESS ENV VARS AND CHECK HERE:
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

    // Only throw error in non-test environments
    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      supabaseUrl === "" ||
      supabaseAnonKey === ""
    ) {
      // Skip error in test environments (Jest sets NODE_ENV to 'test')
      if (process.env.NODE_ENV !== "test") {
        console.error("❌ Missing Supabase environment variables");
        console.error("URL present:", !!supabaseUrl);
        console.error("Key present:", !!supabaseAnonKey);
        throw new Error(
          "Missing Supabase environment variables. Check .env file and restart server.",
        );
      }

      // Use default test values if in test environment
      const testUrl = supabaseUrl || "https://test.supabase.co";
      const testKey = supabaseAnonKey || "test-anon-key";
      this.supabase = createClient(testUrl, testKey);
    } else {
      // Validate URL format before creating client
      try {
        new URL(supabaseUrl);
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      } catch (urlError) {
        console.error(
          "❌ Invalid Supabase URL format - check environment variables",
        );
        console.error("URL that failed validation:", supabaseUrl);
        throw new Error(
          `Invalid Supabase URL format. Please check your environment variables.`,
        );
      }
    }
    this.unifiedStore = UnifiedDataStore.getInstance();
    this.initializeAuth();
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // ============================================================================
  // AUTH STATE MANAGEMENT
  // ============================================================================

  private async initializeAuth() {
    // Get initial session
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
    }

    if (session?.user) {
      await this.handleAuthStateChange(session);
    } else {
      this.updateAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
      });
    }

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      Logger.debug("Auth state changed:", event);
      await this.handleAuthStateChange(session);
    });
  }

  private async handleAuthStateChange(session: Session | null) {
    Logger.debug(" handleAuthStateChange called with session:", !!session);
    if (session?.user) {
      Logger.debug(" User is signed in, fetching profile...");
      // User is signed in
      const profile = await this.fetchUserProfile(session.user.id);
      Logger.debug(" Profile fetched:", !!profile);

      // If no profile exists, this might be a database reset scenario
      if (!profile) {
        console.warn(
          "🚨 No user profile found for authenticated user - possible database reset",
        );
        console.warn("🔄 Signing out user to clear inconsistent state");

        // Sign out to clear the inconsistent state
        await this.signOut();
        return; // Exit early, don't continue with sync
      }

      Logger.debug(" Updating auth state...");
      this.updateAuthState({
        user: session.user,
        session,
        profile,
        isLoading: false,
      });
      Logger.debug(" Auth state updated");

      // PROGRESSIVE SYNC FLOW: Use new progressive sync system
      Logger.debug(" Starting progressive data sync...");

      // Import ProgressiveSyncService dynamically to avoid circular dependency
      const { ProgressiveSyncService } = await import(
        "./ProgressiveSyncService"
      );
      const progressiveSync = ProgressiveSyncService.getInstance();

      // Fetch cloud data first (like git fetch)
      Logger.debug(" Starting progressive cloud data sync (fetch)...");
      const fetchResult = await progressiveSync.syncFromCloud();

      // If sync failed due to missing data, user was already signed out
      if (
        !fetchResult.success &&
        fetchResult.error &&
        typeof fetchResult.error === "object" &&
        "message" in fetchResult.error &&
        typeof fetchResult.error.message === "string" &&
        fetchResult.error.message.includes("signed out for consistency")
      ) {
        Logger.debug(" User was signed out during sync due to missing data");
        return; // Exit early
      }

      Logger.debug(
        " Progressive cloud data sync completed in",
        fetchResult.totalTime,
        "ms",
      );

      // Then sync local data to cloud (like git push)
      Logger.debug(" Starting progressive local data sync (push)...");
      const pushResult = await progressiveSync.syncToCloud();
      Logger.debug(
        " Progressive local data sync completed in",
        pushResult.totalTime,
        "ms",
      );

      // Refresh profile after sync in case premium status changed
      Logger.debug(" Refreshing profile after sync...");
      const updatedProfile = await this.fetchUserProfile(session.user.id);
      if (updatedProfile) {
        this.updateAuthState({
          profile: updatedProfile,
        });
        Logger.debug(" Profile refreshed and updated");
      }
      Logger.debug(" handleAuthStateChange completed successfully");
    } else {
      Logger.debug(" User is signed out, clearing auth state");
      // User is signed out
      this.updateAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
      });
    }
  }

  private updateAuthState(newState: Partial<AuthState>) {
    this.currentAuthState = { ...this.currentAuthState, ...newState };
    this.authStateListeners.forEach((listener) =>
      listener(this.currentAuthState),
    );
  }

  public onAuthStateChange(callback: (state: AuthState) => void) {
    this.authStateListeners.push(callback);
    // Immediately call with current state
    callback(this.currentAuthState);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  public getCurrentAuthState(): AuthState {
    return this.currentAuthState;
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  public async signUp(
    email: string,
    password: string,
    emailUpdatesOptIn = false,
  ) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create user profile with email opt-in preference
      if (data.user) {
        await this.createUserProfile(data.user.id, email, emailUpdatesOptIn);
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { user: null, error };
    }
  }

  public async signInAnonymously(captchaToken?: string) {
    try {
      console.log(
        "🔐 SupabaseService.signInAnonymously called with captcha:",
        !!captchaToken,
      );
      const { data, error } = await this.supabase.auth.signInAnonymously({
        options: {
          captchaToken,
        },
      });

      console.log("🔐 Supabase anonymous auth response:", {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasAccessToken: !!data?.session?.access_token,
        errorCode: error?.message || "none",
      });

      if (error) throw error;

      // Important: Update auth state after anonymous sign-in
      // This will also trigger profile fetching for the new anonymous user
      if (data.session) {
        await this.handleAuthStateChange(data.session);
      }
      // Even if session is null for some reason but user exists, handle it.
      // However, signInAnonymously should always return a session on success.
      else if (data.user && !data.session) {
        // This case is less likely for signInAnonymously but good for robustness
        // We might need to get a session explicitly or handle partial state.
        // For now, let's assume session is present on success as per Supabase docs.
        console.warn(
          "Anonymous sign-in returned user but no session, state might be incomplete.",
        );
        // Potentially call getSession then handleAuthStateChange
        const { data: newSessionData } = await this.supabase.auth.getSession();
        if (newSessionData.session) {
          await this.handleAuthStateChange(newSessionData.session);
        }
      }

      return { data, error: null }; // Return structure similar to Supabase client
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      return { data: { user: null, session: null }, error };
    }
  }

  public async signIn(email: string, password: string, captchaToken?: string) {
    Logger.debug(" SupabaseService.signIn called with email:", email);
    try {
      const signInOptions: {
        email: string;
        password: string;
        options?: { captchaToken: string };
      } = {
        email,
        password,
      };

      // Add CAPTCHA token if provided
      if (captchaToken) {
        signInOptions.options = {
          captchaToken,
        };
      }

      Logger.debug(" Calling supabase.auth.signInWithPassword...");
      const { data, error } =
        await this.supabase.auth.signInWithPassword(signInOptions);
      Logger.debug(
        "🔐 signInWithPassword response - user:",
        !!data.user,
        "session:",
        !!data.session,
        "error:",
        error,
      );

      if (error) {
        console.error("🔐 Sign-in failed with Supabase error:", error);
        return { user: null, session: null, error };
      }

      Logger.debug(" Sign-in successful, returning data");
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error("🔐 Sign in exception:", error);
      return { user: null, session: null, error };
    }
  }

  public async signOut(options: { accountDeleted?: boolean } = {}) {
    try {
      if (options.accountDeleted) {
        // After account deletion, we want a completely fresh start,
        // but we preserve their gameplay history and stats as an anonymous user.
        Logger.debug("👤 Account deleted. Anonymizing local data...");
        await this.unifiedStore.anonymizeDataOnAccountDeletion();
        Logger.info(" Local data anonymized.");
      } else {
        // For a standard sign-out, we reset the session (e.g., free games)
        // but keep all their progress.
        Logger.debug(
          "➡️ Performing standard sign-out, resetting session state...",
        );
        await this.unifiedStore.resetForNewAnonymousSession();
        Logger.info(" Session state reset for new anonymous user.");
      }

      // Sign out from all sessions
      const { error } = await this.supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.warn(
          "Standard signOut failed, attempting manual cleanup:",
          error,
        );
        // Fallback for manual session clearing if normal sign out fails
        if (typeof window !== "undefined") {
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.startsWith("sb-") || key.includes("supabase")) {
              localStorage.removeItem(key);
              Logger.debug(" Cleared localStorage key:", key);
            }
          }
          Logger.info(" Manual localStorage cleanup complete");
        }
      }

      // Manually clear the auth state to ensure UI updates immediately
      this.updateAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
      });

      // ** CRITICAL FIX (Corrected Location): Reset the game store for ALL sign-outs **
      useGameStore.getState().reset();

      // After account deletion, a reload is the safest way to ensure a clean state.
      if (options.accountDeleted) {
        Logger.debug(" Reloading application for a clean slate...");
        window.location.reload();
      }

      Logger.info(" Sign-out complete.");
      return { error: null };
    } catch (error) {
      console.error("Sign out error:", error);
      return { error };
    }
  }

  public async resetPassword(email: string) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Reset password error:", error);
      return { error };
    }
  }

  public async updateUserCredentials(
    email: string,
    password?: string,
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      const updateData: { email: string; password?: string } = { email };
      if (password) {
        updateData.password = password;
      }

      const { data, error } = await this.supabase.auth.updateUser(updateData);

      if (error) throw error;

      // After successfully updating auth user, refresh the local auth state
      // to get the updated user object (e.g., new email reflected).
      // The onAuthStateChange listener should also pick this up, but an explicit refresh here is good.
      if (data.user) {
        // Fetch a fresh session which should contain the updated user
        const { data: sessionData, error: sessionError } =
          await this.supabase.auth.refreshSession();
        if (sessionError) {
          console.warn(
            "Error refreshing session after user update:",
            sessionError,
          );
          // Proceed with potentially stale session data in currentAuthState, onAuthStateChange might fix it
          await this.handleAuthStateChange(this.currentAuthState.session);
        } else if (sessionData.session) {
          await this.handleAuthStateChange(sessionData.session);
        }

        // Also, update the email in the user_profiles table if it's different
        // This assumes the currently authenticated user (whose credentials were updated)
        // is the one whose profile needs this email update.
        if (
          this.currentAuthState.profile &&
          this.currentAuthState.profile.email !== email
        ) {
          await this.updateUserProfile({ email: email });
          Logger.debug(
            `Updated user_profiles email for user ${data.user.id} to ${email}`,
          );
        }
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Error updating user credentials:", error);
      return {
        user: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  public async getIsPremium(userId: string): Promise<boolean | null> {
    try {
      const { data, error } = await this.supabase
        .from("user_profiles")
        .select("is_premium")
        .eq("id", userId)
        .single();

      if (error) {
        // PGRST116 means no rows found, which is a valid state (profile might not exist yet or was deleted)
        // In this specific context, it means premium is effectively false.
        if (error.code === "PGRST116") return false;
        console.error(`Error fetching is_premium for user ${userId}:`, error);
        return null; // Indicate an actual error occurred
      }
      return data?.is_premium || false;
    } catch (e) {
      console.error(`Exception fetching is_premium for user ${userId}:`, e);
      return null; // Indicate an actual error occurred
    }
  }

  // ============================================================================
  // USER PROFILE METHODS
  // ============================================================================

  private async createUserProfile(
    userId: string,
    email: string,
    emailUpdatesOptIn: boolean,
    termsAccepted = false,
    privacyAccepted = false,
  ) {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase.from("user_profiles").insert({
        id: userId,
        email,
        privacy_settings: {
          allow_challenge_sharing: true,
          allow_stats_sharing: true,
          allow_leaderboards: true,
          data_collection: false,
          email_updates: emailUpdatesOptIn,
        },
        legal_consent: {
          terms_of_service: {
            accepted: termsAccepted,
            accepted_at: termsAccepted ? now : undefined,
            version: "1.0",
          },
          privacy_policy: {
            accepted: privacyAccepted,
            accepted_at: privacyAccepted ? now : undefined,
            version: "1.0",
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  }

  private async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    Logger.debug(" fetchUserProfile called for userId:", userId);
    try {
      Logger.debug(" Executing Supabase query for user_profiles...");
      const { data, error } = await this.supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      Logger.debug(
        "🔍 Supabase query completed. Data:",
        !!data,
        "Error:",
        error,
      );

      if (error) {
        console.error("🔍 Error fetching user profile:", error);
        return null;
      }

      Logger.debug(" Profile fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("🔍 Exception in fetchUserProfile:", error);
      return null;
    }
  }

  public async updateUserProfile(updates: Partial<UserProfile>) {
    try {
      const userId = this.currentAuthState.user?.id;
      if (!userId) throw new Error("No authenticated user");

      Logger.debug("🔧 Attempting to update user profile:", {
        userId,
        updates,
      });

      const { error } = await this.supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId);

      if (error) {
        console.error("🚨 Database update error:", error);
        throw error;
      }

      Logger.info(" Database update successful");

      // Update local auth state
      if (this.currentAuthState.profile) {
        this.updateAuthState({
          profile: { ...this.currentAuthState.profile, ...updates },
        });
        Logger.info(" Local auth state updated");
      }

      return { error: null };
    } catch (error) {
      console.error("Error updating user profile:", error);
      return { error };
    }
  }

  public async updateEmailPreferences(emailUpdatesOptIn: boolean) {
    const currentProfile = this.currentAuthState.profile;
    if (!currentProfile) throw new Error("No user profile found");

    const result = await this.updateUserProfile({
      privacy_settings: {
        ...currentProfile.privacy_settings,
        email_updates: emailUpdatesOptIn,
      },
    });

    // If the update was successful, also update the local unified data store
    // This prevents sync operations from overwriting the preference change
    if (!result.error) {
      try {
        Logger.info(
          " Updating local UnifiedDataStore with email preference:",
          emailUpdatesOptIn,
        );
        // Note: email_updates is managed in the profile table, not in the local privacy settings
        // But we should sync any other privacy changes to keep things consistent

        // Refresh the profile to ensure local auth state is up to date
        await this.refreshUserProfile();
      } catch (error) {
        console.warn("Could not update local privacy settings:", error);
        // Don't fail the whole operation if local update fails
      }
    }

    return result;
  }

  public async updatePrivacySettings(
    privacyUpdates: Partial<UserProfile["privacy_settings"]>,
  ) {
    const currentProfile = this.currentAuthState.profile;
    if (!currentProfile) throw new Error("No user profile found");

    const result = await this.updateUserProfile({
      privacy_settings: {
        ...currentProfile.privacy_settings,
        ...privacyUpdates,
      },
    });

    // If the update was successful, also update the local unified data store
    // This prevents sync operations from overwriting the preference changes
    if (!result.error) {
      try {
        Logger.debug(
          "🔒 Updating local UnifiedDataStore with privacy settings:",
          privacyUpdates,
        );

        // Map the privacy settings to the local format
        const localPrivacyUpdates: any = {};
        if (privacyUpdates.allow_challenge_sharing !== undefined) {
          localPrivacyUpdates.allowChallengeSharing =
            privacyUpdates.allow_challenge_sharing;
        }
        if (privacyUpdates.allow_stats_sharing !== undefined) {
          localPrivacyUpdates.allowStatsSharing =
            privacyUpdates.allow_stats_sharing;
        }
        if (privacyUpdates.allow_leaderboards !== undefined) {
          localPrivacyUpdates.allowLeaderboards =
            privacyUpdates.allow_leaderboards;
        }
        if (privacyUpdates.data_collection !== undefined) {
          localPrivacyUpdates.dataCollection = privacyUpdates.data_collection;
        }

        await this.unifiedStore.updatePrivacySettings(localPrivacyUpdates);

        // Refresh the profile to ensure local auth state is up to date
        await this.refreshUserProfile();
      } catch (error) {
        console.warn("Could not update local privacy settings:", error);
        // Don't fail the whole operation if local update fails
      }
    }

    return result;
  }

  // ============================================================================
  // LEGAL CONSENT METHODS
  // ============================================================================

  public async updateLegalConsent(
    consentType:
      | "terms_of_service"
      | "privacy_policy"
      | "marketing_emails"
      | "analytics",
    accepted: boolean,
    version = "1.0",
  ) {
    if (!this.currentAuthState.user) {
      throw new Error("No authenticated user");
    }

    try {
      const { error } = await this.supabase.rpc("update_user_legal_consent", {
        user_id: this.currentAuthState.user.id,
        consent_type: consentType,
        accepted: accepted,
        version: version,
      });

      if (error) throw error;

      // Refresh the user profile to get updated consent status
      await this.refreshUserProfile();

      Logger.info(`✅ Legal consent updated: ${consentType} = ${accepted}`);
      return { error: null };
    } catch (error) {
      console.error("Error updating legal consent:", error);
      return { error };
    }
  }

  public async checkLegalConsent() {
    if (!this.currentAuthState.user) {
      throw new Error("No authenticated user");
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "check_required_legal_consent",
        {
          user_id: this.currentAuthState.user.id,
        },
      );

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error checking legal consent:", error);
      return { data: null, error };
    }
  }

  public async getLegalConsent() {
    if (!this.currentAuthState.user) {
      throw new Error("No authenticated user");
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "get_user_legal_consent",
        {
          user_id: this.currentAuthState.user.id,
        },
      );

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error getting legal consent:", error);
      return { data: null, error };
    }
  }

  public async updateMultipleLegalConsents(consents: {
    terms_of_service?: boolean;
    privacy_policy?: boolean;
    marketing_emails?: boolean;
    analytics?: boolean;
  }) {
    const results: Array<{ consentType: string; result: { error: any } }> = [];

    for (const [consentType, accepted] of Object.entries(consents)) {
      if (accepted !== undefined) {
        const result = await this.updateLegalConsent(
          consentType as
            | "terms_of_service"
            | "privacy_policy"
            | "marketing_emails"
            | "analytics",
          accepted,
        );
        results.push({ consentType, result });
      }
    }

    return results;
  }

  public async refreshUserProfile() {
    try {
      const userId = this.currentAuthState.user?.id;
      if (!userId) throw new Error("No authenticated user");

      Logger.debug(" Force refreshing user profile from database...");
      const freshProfile = await this.fetchUserProfile(userId);

      if (freshProfile) {
        this.updateAuthState({
          profile: freshProfile,
        });
        Logger.info(" Profile refreshed:", freshProfile);
        return { profile: freshProfile, error: null };
      } else {
        throw new Error("Could not fetch fresh profile");
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
      return { profile: null, error };
    }
  }

  /**
   * Create a premium user profile immediately after payment
   * This is used for optimistic UI updates
   */
  public async createPremiumProfile(
    userId: string,
    email: string,
    termsAccepted = true,
    privacyAccepted = true,
  ): Promise<{ error: Error | null }> {
    try {
      const now = new Date().toISOString();
      // Use UPSERT instead of INSERT to handle existing profiles
      const { error } = await this.supabase.from("user_profiles").upsert(
        {
          id: userId,
          email,
          is_premium: true,
          updated_at: now,
          privacy_settings: {
            allow_challenge_sharing: true,
            allow_stats_sharing: true,
            allow_leaderboards: true,
            data_collection: false,
            email_updates: false,
          },
          platform_purchase_data: {
            platform: "stripe" as const,
            purchaseDate: Date.now(),
            validated: false, // Will be set to true by webhook
          },
          legal_consent: {
            terms_of_service: {
              accepted: termsAccepted,
              accepted_at: termsAccepted ? now : undefined,
              version: "1.0",
            },
            privacy_policy: {
              accepted: privacyAccepted,
              accepted_at: privacyAccepted ? now : undefined,
              version: "1.0",
            },
          },
        },
        {
          onConflict: "id", // Handle conflicts on the primary key (user ID)
        },
      );

      if (error) throw error;

      // Update local auth state immediately
      const newProfile: UserProfile = {
        id: userId,
        email,
        is_premium: true,
        created_at: new Date().toISOString(),
        updated_at: now,
        privacy_settings: {
          allow_challenge_sharing: true,
          allow_stats_sharing: true,
          allow_leaderboards: true,
          data_collection: false,
          email_updates: false,
        },
        platform_purchase_data: {
          platform: "stripe",
          purchaseDate: Date.now(),
          validated: false,
        },
        legal_consent: {
          terms_of_service: {
            accepted: termsAccepted,
            accepted_at: termsAccepted ? now : undefined,
            version: "1.0",
          },
          privacy_policy: {
            accepted: privacyAccepted,
            accepted_at: privacyAccepted ? now : undefined,
            version: "1.0",
          },
        },
      };

      this.updateAuthState({
        profile: newProfile,
      });

      Logger.info(" Premium profile created immediately:", newProfile);
      return { error: null };
    } catch (error) {
      console.error("Error creating premium profile:", error);
      return {
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ============================================================================
  // PURCHASE DATA SYNCHRONIZATION
  // ============================================================================

  public async syncPurchaseData(
    purchaseData: NonNullable<UserProfile["platform_purchase_data"]>,
  ) {
    try {
      const userId = this.currentAuthState.user?.id;
      if (!userId) throw new Error("No authenticated user");

      // Update user profile with purchase data and premium status
      const { error } = await this.supabase
        .from("user_profiles")
        .update({
          is_premium: true,
          platform_purchase_data: purchaseData,
        })
        .eq("id", userId);

      if (error) throw error;

      // Update local auth state
      if (this.currentAuthState.profile) {
        this.updateAuthState({
          profile: {
            ...this.currentAuthState.profile,
            is_premium: true,
            platform_purchase_data: purchaseData,
          },
        });
      }

      // Also sync to local storage
      await this.unifiedStore.setPurchaseInfo(purchaseData);

      // Trigger progressive data sync to ensure everything is up to date
      const { ProgressiveSyncService } = await import(
        "./ProgressiveSyncService"
      );
      const progressiveSync = ProgressiveSyncService.getInstance();
      await progressiveSync.syncToCloud();

      Logger.debug("Purchase data synced successfully");
      return { error: null };
    } catch (error) {
      console.error("Error syncing purchase data:", error);
      return { error };
    }
  }

  // ============================================================================
  // DATA SYNCHRONIZATION
  // ============================================================================

  public async syncLocalDataToCloud() {
    try {
      const userId = this.currentAuthState.user?.id;
      if (!userId) return;

      // Get local data (uncompressed for processing)
      const localData = await this.unifiedStore.exportData();

      // Prepare data for cloud storage
      const cloudData = {
        ...localData,
        user: {
          ...localData.user,
          id: userId, // Use Supabase user ID
        },
        meta: {
          ...localData.meta,
          lastSyncAt: Date.now(),
        },
      };

      // Compress data for efficient cloud storage
      const compressedCloudData =
        await this.unifiedStore.exportCompressedData();

      // Sync to user_data table (full data backup) - using compressed data
      const { error: dataError } = await this.supabase.from("user_data").upsert(
        {
          user_id: userId,
          data: compressedCloudData, // Use compressed data for storage
          device_id: localData.meta.deviceId,
          schema_version: localData.meta.schemaVersion,
          is_compressed: true, // Flag to indicate this is compressed data
        },
        {
          onConflict: "user_id",
        },
      );

      if (dataError) throw dataError;

      // Also sync key profile info to user_profiles table (for easy querying)
      const profileUpdates: Partial<UserProfile> = {
        is_premium: localData.user.isPremium,
        platform_purchase_data: localData.user.purchase || undefined,
        privacy_settings: {
          allow_challenge_sharing:
            localData.user.privacy?.allowChallengeSharing ?? true,
          allow_stats_sharing:
            localData.user.privacy?.allowStatsSharing ?? true,
          allow_leaderboards: localData.user.privacy?.allowLeaderboards ?? true,
          data_collection: localData.user.privacy?.dataCollection ?? false,
          email_updates:
            this.currentAuthState.profile?.privacy_settings?.email_updates ??
            false,
        },
      };

      const { error: profileError } = await this.supabase
        .from("user_profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileError) {
        console.warn("Error syncing profile data:", profileError);
        // Don't throw here - data sync succeeded even if profile sync failed
      }

      // Update local sync timestamp
      await this.unifiedStore.updateSyncMetadata(Date.now());

      Logger.debug("Data synced to cloud successfully");
      return { error: null };
    } catch (error) {
      console.error("Error syncing data to cloud:", error);
      return { error };
    }
  }

  public async syncCloudDataToLocal() {
    try {
      const userId = this.currentAuthState.user?.id;
      if (!userId) return;

      // Fetch cloud data from user_data table (full backup)
      const { data: userData, error: dataError } = await this.supabase
        .from("user_data")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Fetch profile data from user_profiles table
      const { data: profileData, error: profileError } = await this.supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (dataError && dataError.code !== "PGRST116") {
        throw dataError;
      }

      if (profileError && profileError.code !== "PGRST116") {
        console.warn("Error fetching profile data:", profileError);
        // Continue without profile data
      }

      // Check if both user data and profile are missing (database was reset)
      const noUserData = dataError && dataError.code === "PGRST116";
      const noProfile = profileError && profileError.code === "PGRST116";

      if (noUserData && noProfile) {
        console.warn(
          "🚨 User data and profile not found in cloud - database may have been reset",
        );
        console.warn("🔄 Signing out user to clear inconsistent state");

        // Sign out the user to clear the inconsistent state
        await this.signOut();

        // Reset local data to defaults but preserve any local progress
        const localData = await this.unifiedStore.getData();
        localData.user.isPremium = false;
        localData.user.email = undefined;
        localData.user.purchase = undefined;
        await this.unifiedStore.importData(localData);

        return {
          error: new Error(
            "User profile not found - signed out for consistency",
          ),
        };
      }

      if (userData?.data) {
        // Check if data is compressed and decompress if needed
        let cloudData: UnifiedAppData;
        if (userData.is_compressed) {
          Logger.debug("🗜️ Decompressing cloud data...");
          cloudData = this.unifiedStore.decompressData(userData.data);
        } else {
          console.log("📄 Using uncompressed cloud data (legacy format)");
          cloudData = userData.data as UnifiedAppData;
        }

        // Merge in profile data if available (profile data takes precedence)
        if (profileData) {
          cloudData = {
            ...cloudData,
            user: {
              ...cloudData.user,
              email: profileData.email,
              isPremium: profileData.is_premium,
              purchase:
                profileData.platform_purchase_data || cloudData.user.purchase,
              privacy: {
                allowChallengeSharing:
                  profileData.privacy_settings?.allow_challenge_sharing ??
                  cloudData.user.privacy?.allowChallengeSharing ??
                  true,
                allowStatsSharing:
                  profileData.privacy_settings?.allow_stats_sharing ??
                  cloudData.user.privacy?.allowStatsSharing ??
                  true,
                allowLeaderboards:
                  profileData.privacy_settings?.allow_leaderboards ??
                  cloudData.user.privacy?.allowLeaderboards ??
                  true,
                dataCollection:
                  profileData.privacy_settings?.data_collection ??
                  cloudData.user.privacy?.dataCollection ??
                  false,
              },
            },
          };
        }

        // Get current local data to preserve local-only progress
        const localData = await this.unifiedStore.getData();

        // For daily challenges, prioritize cloud data (user-specific, account-bound)
        // Only merge in local progress if cloud has no data for that specific challenge
        const mergedDailyChallengeProgress = {
          ...localData.dailyChallenges.progress,
        };
        for (const [challengeId, cloudProgress] of Object.entries(
          cloudData.dailyChallenges.progress,
        )) {
          mergedDailyChallengeProgress[challengeId] = cloudProgress; // Cloud takes precedence
        }
        cloudData.dailyChallenges.progress = mergedDailyChallengeProgress;

        // Merge game history (combine and deduplicate by ID, keep most recent 100)
        const mergedGameHistory = this.mergeGameHistory(
          cloudData.gameHistory || [],
          localData.gameHistory || [],
        );
        cloudData.gameHistory = mergedGameHistory;

        // Merge achievements (combine unlocked IDs, viewed IDs, timestamps, and progressive counters)
        cloudData.achievements = this.mergeAchievements(
          cloudData.achievements || {},
          localData.achievements || {},
        );

        // Merge word collections progress (combine collected words)
        cloudData.collections = this.mergeWordCollections(
          cloudData.collections || {},
          localData.collections || {},
        );

        // Merge word collection viewing status (combine completed and viewed IDs)
        cloudData.wordCollections = this.mergeWordCollectionStatus(
          cloudData.wordCollections || {},
          localData.wordCollections || {},
        );

        // Merge statistics (take the higher values for most stats)
        cloudData.stats = this.mergeStatistics(
          cloudData.stats || {},
          localData.stats || {},
        );

        // Merge news read status (combine read article IDs)
        cloudData.news = this.mergeNewsStatus(
          cloudData.news || {},
          localData.news || {},
        );

        // Preserve current games (local takes precedence for in-progress games)
        cloudData.currentGames = {
          regular:
            localData.currentGames.regular ||
            cloudData.currentGames?.regular ||
            null,
          challenge:
            localData.currentGames.challenge ||
            cloudData.currentGames?.challenge ||
            null,
          temp:
            localData.currentGames.temp || cloudData.currentGames?.temp || null,
        };

        console.log("🔄 Comprehensive data merge completed:", {
          dailyChallengeProgress: Object.keys(mergedDailyChallengeProgress)
            .length,
          gameHistory: mergedGameHistory.length,
          achievements: Object.keys(cloudData.achievements.unlockedIds || [])
            .length,
          wordCollections: Object.keys(cloudData.collections).length,
          currentGames: Object.values(cloudData.currentGames).filter(Boolean)
            .length,
        });

        // Import merged cloud data to local storage
        await this.unifiedStore.importData(cloudData);
        Logger.debug("Cloud data synced to local successfully");
      } else {
        // No full data backup, but we might have profile data
        if (profileData) {
          // Get current local data
          const localData = await this.unifiedStore.getData();

          // Update local data with profile info (preserving all local progress)
          localData.user.email = profileData.email;
          localData.user.isPremium = profileData.is_premium;
          if (profileData.platform_purchase_data) {
            localData.user.purchase = profileData.platform_purchase_data;
          }
          if (profileData.privacy_settings) {
            localData.user.privacy = {
              allowChallengeSharing:
                profileData.privacy_settings.allow_challenge_sharing,
              allowStatsSharing:
                profileData.privacy_settings.allow_stats_sharing,
              allowLeaderboards:
                profileData.privacy_settings.allow_leaderboards,
              dataCollection: profileData.privacy_settings.data_collection,
            };
          }

          // Note: We don't merge daily challenge progress here because there's no cloud data
          // Local daily challenge progress is preserved as-is
          console.log(
            "🔄 Preserving local daily challenge progress (no cloud backup found)",
          );

          await this.unifiedStore.importData(localData);
          Logger.debug("Profile data synced to local successfully");
        } else {
          Logger.debug("No cloud data found for user");
        }
      }

      return { error: null };
    } catch (error) {
      console.error("Error syncing cloud data to local:", error);
      return { error };
    }
  }

  // ============================================================================
  // DATA MERGE UTILITY METHODS
  // ============================================================================
  // MERGE METHOD TYPE INTERFACES
  // ============================================================================

  // ============================================================================
  // MERGE METHODS
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mergeGameHistory(cloudHistory: any[], localHistory: any[]): any[] {
    // Combine both arrays and deduplicate by ID or timestamp
    const combined = [...cloudHistory, ...localHistory];
    const deduped = combined.reduce((acc, game) => {
      const key = game.id || game.timestamp;
      if (!acc.has(key) || game.timestamp > acc.get(key)?.timestamp) {
        acc.set(key, game);
      }
      return acc;
    }, new Map());

    // Sort by timestamp (most recent first) and keep only the last 100
    return (
      Array.from(deduped.values())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 100)
    );
  }

  private mergeAchievements(
    cloudAchievements: AchievementData,
    localAchievements: AchievementData,
  ): AchievementData {
    const defaultAchievements = {
      unlockedIds: [],
      viewedIds: [],
      unlockTimestamps: {},
      progressiveCounters: {},
      schemaVersion: 1,
    };

    const cloud = { ...defaultAchievements, ...cloudAchievements };
    const local = { ...defaultAchievements, ...localAchievements };

    return {
      unlockedIds: [...new Set([...cloud.unlockedIds, ...local.unlockedIds])],
      viewedIds: [...new Set([...cloud.viewedIds, ...local.viewedIds])],
      unlockTimestamps: {
        ...cloud.unlockTimestamps,
        ...local.unlockTimestamps,
      },
      progressiveCounters: this.mergeProgressiveCounters(
        cloud.progressiveCounters,
        local.progressiveCounters,
      ),
      schemaVersion: Math.max(cloud.schemaVersion, local.schemaVersion),
    };
  }

  private mergeProgressiveCounters(
    cloudCounters: Record<string, number>,
    localCounters: Record<string, number>,
  ): Record<string, number> {
    const merged: Record<string, number> = { ...cloudCounters };

    // Take the higher count for each achievement
    for (const [achievementId, localCount] of Object.entries(localCounters)) {
      merged[achievementId] = Math.max(merged[achievementId] || 0, localCount);
    }

    return merged;
  }

  private mergeWordCollections(
    cloudCollections: WordCollectionData,
    localCollections: WordCollectionData,
  ): WordCollectionData {
    const merged: WordCollectionData = { ...cloudCollections };

    // Merge collected words for each collection
    for (const [collectionId, localProgress] of Object.entries(
      localCollections,
    )) {
      const localData = localProgress as {
        collectedWords: string[];
        lastUpdated: number;
      };
      const cloudData = merged[collectionId] as
        | { collectedWords: string[]; lastUpdated: number }
        | undefined;

      if (!cloudData) {
        merged[collectionId] = localData;
      } else {
        // Combine collected words and use the latest timestamp
        merged[collectionId] = {
          collectedWords: [
            ...new Set([
              ...cloudData.collectedWords,
              ...localData.collectedWords,
            ]),
          ],
          lastUpdated: Math.max(cloudData.lastUpdated, localData.lastUpdated),
        };
      }
    }

    return merged;
  }

  private mergeWordCollectionStatus(
    cloudStatus: WordCollectionStatusData,
    localStatus: WordCollectionStatusData,
  ): WordCollectionStatusData {
    const defaultStatus = {
      completedIds: [],
      viewedIds: [],
      completionTimestamps: {},
      schemaVersion: 1,
    };

    const cloud = { ...defaultStatus, ...cloudStatus };
    const local = { ...defaultStatus, ...localStatus };

    return {
      completedIds: [
        ...new Set([...cloud.completedIds, ...local.completedIds]),
      ],
      viewedIds: [...new Set([...cloud.viewedIds, ...local.viewedIds])],
      completionTimestamps: {
        ...cloud.completionTimestamps,
        ...local.completionTimestamps,
      },
      schemaVersion: Math.max(cloud.schemaVersion, local.schemaVersion),
    };
  }

  private mergeStatistics(
    cloudStats: StatisticsData,
    localStats: StatisticsData,
  ): StatisticsData {
    const defaultStats = {
      totalGamesPlayed: 0,
      totalWins: 0,
      totalGaveUps: 0,
      achievementsUnlocked: 0,
      cumulativeMoveAccuracySum: 0,
    };

    const cloud = { ...defaultStats, ...cloudStats };
    const local = { ...defaultStats, ...localStats };

    return {
      totalGamesPlayed: Math.max(
        cloud.totalGamesPlayed,
        local.totalGamesPlayed,
      ),
      totalWins: Math.max(cloud.totalWins, local.totalWins),
      totalGaveUps: Math.max(cloud.totalGaveUps, local.totalGaveUps),
      achievementsUnlocked: Math.max(
        cloud.achievementsUnlocked,
        local.achievementsUnlocked,
      ),
      cumulativeMoveAccuracySum: Math.max(
        cloud.cumulativeMoveAccuracySum,
        local.cumulativeMoveAccuracySum,
      ),
    };
  }

  private mergeNewsStatus(
    cloudNews: NewsStatusData,
    localNews: NewsStatusData,
  ): NewsStatusData {
    const defaultNews = {
      readArticleIds: [],
      lastChecked: 0,
    };

    const cloud = { ...defaultNews, ...cloudNews };
    const local = { ...defaultNews, ...localNews };

    return {
      readArticleIds: [
        ...new Set([...cloud.readArticleIds, ...local.readArticleIds]),
      ],
      lastChecked: Math.max(cloud.lastChecked, local.lastChecked),
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  public isAuthenticated(): boolean {
    return !!this.currentAuthState.user;
  }

  public isPremiumUser(): boolean {
    return this.currentAuthState.profile?.is_premium || false;
  }

  public getUser(): User | null {
    return this.currentAuthState.user;
  }

  public getUserProfile(): UserProfile | null {
    return this.currentAuthState.profile;
  }

  public getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  public async invokeFunction<T = unknown>(
    functionName: string,
    body: Record<string, unknown>,
    jwtToken?: string, // Optional JWT token parameter
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      // Get environment variables at runtime to support testing
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        // Skip error in test environments (Jest sets NODE_ENV to 'test')
        if (process.env.NODE_ENV !== "test") {
          throw new Error(
            "Missing Supabase environment variables for function invocation",
          );
        }

        // Use default test values if in test environment
        const testUrl = supabaseUrl || "https://test.supabase.co";
        const testKey = supabaseAnonKey || "test-anon-key";

        const headers: HeadersInit = {
          apikey: testKey,
          "Content-Type": "application/json",
        };

        // Use provided JWT, or fallback to current session's JWT
        const tokenToUse =
          jwtToken || this.currentAuthState.session?.access_token;

        if (tokenToUse) {
          headers.Authorization = `Bearer ${tokenToUse}`;
        } else {
          // This case means no explicit JWT was passed AND no user is signed in.
          // Some functions might be designed to be called like this (fully public),
          // others (like create-checkout-session) will fail if no Auth header is present.
          console.warn(
            `Invoking function ${functionName} without a user session or explicit JWT.`,
          );
        }

        const response = await fetch(
          `${testUrl}/functions/v1/${functionName}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: response.statusText }));
          throw (
            errorData.error ||
            new Error(
              `Function ${functionName} failed with status ${response.status}`,
            )
          );
        }
        const responseData = await response.json();
        return { data: responseData, error: null };
      }

      const headers: HeadersInit = {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      };

      // Use provided JWT, or fallback to current session's JWT
      const tokenToUse =
        jwtToken || this.currentAuthState.session?.access_token;

      if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
      } else {
        // This case means no explicit JWT was passed AND no user is signed in.
        // Some functions might be designed to be called like this (fully public),
        // others (like create-checkout-session) will fail if no Auth header is present.
        console.warn(
          `Invoking function ${functionName} without a user session or explicit JWT.`,
        );
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw (
          errorData.error ||
          new Error(
            `Function ${functionName} failed with status ${response.status}`,
          )
        );
      }
      const responseData = await response.json();
      return { data: responseData, error: null };
    } catch (error) {
      console.error(`Error invoking function ${functionName}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  public async deleteAccount() {
    try {
      Logger.debug(
        "🗑️ SupabaseService.deleteAccount: Starting deletion process...",
      );

      // Get current user info for debugging
      const user = this.currentAuthState.user;
      const session = this.currentAuthState.session;
      Logger.debug(" Current user:", user?.id, user?.email);
      Logger.debug(" Session exists:", !!session);
      Logger.debug(" Access token exists:", !!session?.access_token);

      if (!session?.access_token) {
        throw new Error("No valid session found. Please sign in again.");
      }

      // Call edge function - try with current token first, then refresh if needed
      Logger.debug(" Calling delete-user-account edge function...");

      // Try with the current session first
      let { data, error } = await this.supabase.functions.invoke(
        "delete-user-account",
        {
          body: {},
        },
      );

      // If we get a 401 error, try refreshing the session and retry once
      if (
        error &&
        (error.context?.status === 401 || String(error.message).includes("401"))
      ) {
        Logger.debug(" Got 401 error, attempting session refresh...");

        // Explicitly pass the refresh token to be sure
        if (!session?.refresh_token) {
          throw new Error(
            "No refresh token available. Please sign out and sign back in.",
          );
        }

        const { data: refreshData, error: refreshError } =
          await this.supabase.auth.refreshSession({
            refresh_token: session.refresh_token,
          });

        if (refreshError) {
          console.warn("🗑️ Session refresh failed:", refreshError);
          throw new Error(
            "Your session has expired. Please sign in again and try deleting your account.",
          );
        }

        Logger.debug(" Session refreshed, retrying delete...");

        // Retry the function call with refreshed session
        const result = await this.supabase.functions.invoke(
          "delete-user-account",
          {
            body: {},
          },
        );

        data = result.data;
        error = result.error;
      }

      Logger.debug(" Edge function response:", { data, error });

      if (error) throw error;

      Logger.debug(
        "🗑️ Account deletion successful, now performing hard sign-out...",
      );
      await this.signOut({ accountDeleted: true });

      return { error: null };
    } catch (error) {
      console.error("🗑️ Error deleting account:", error);
      return { error };
    }
  }
}

export default SupabaseService;
