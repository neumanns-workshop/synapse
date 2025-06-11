// Mock environment variables FIRST, before any imports
const originalEnv = process.env;
process.env = {
  ...originalEnv,
  EXPO_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
};

import { createClient } from "@supabase/supabase-js";

import { useGameStore } from "../../stores/useGameStore";
import { SupabaseService } from "../SupabaseService";
import { UnifiedDataStore } from "../UnifiedDataStore";

// Mock dependencies
jest.mock("@supabase/supabase-js");
jest.mock("../UnifiedDataStore");
jest.mock("../../stores/useGameStore");

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const MockedUnifiedDataStore = UnifiedDataStore as jest.Mocked<
  typeof UnifiedDataStore
>;
const mockUseGameStore = useGameStore as jest.MockedFunction<
  typeof useGameStore
>;

describe("SupabaseService", () => {
  let service: SupabaseService;
  let mockSupabaseClient: any;
  let mockUnifiedStore: any;

  afterAll(() => {
    process.env = originalEnv;
  });

  afterEach(async () => {
    // Clean up any open connections or listeners
    if (service) {
      // If there are any auth listeners, unsubscribe them
      const currentState = (service as any).currentAuthState;
      if (currentState && currentState.subscription) {
        currentState.subscription.unsubscribe();
      }

      // Reset the singleton to prevent state leakage
      (SupabaseService as any).instance = undefined;
    }

    // Clear any remaining timers or promises
    jest.clearAllTimers();
    await new Promise(setImmediate); // Flush promise queue
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (SupabaseService as any).instance = undefined;

    // Mock localStorage for Node.js environment
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock window.location.reload
    Object.defineProperty(global, "window", {
      value: {
        location: {
          reload: jest.fn(),
        },
      },
      writable: true,
    });

    // Create a consistent mock for database operations
    const mockFromChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Ensure all chained methods return the same object for proper chaining
    mockFromChain.select.mockReturnValue(mockFromChain);
    mockFromChain.insert.mockReturnValue(mockFromChain);
    mockFromChain.upsert.mockReturnValue(mockFromChain);
    mockFromChain.update.mockReturnValue(mockFromChain);
    mockFromChain.delete.mockReturnValue(mockFromChain);
    mockFromChain.eq.mockReturnValue(mockFromChain);

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
        signUp: jest.fn(),
        signInAnonymously: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        updateUser: jest.fn(),
      },
      from: jest.fn(() => mockFromChain),
    };

    mockCreateClient.mockReturnValue(mockSupabaseClient);

    // Mock UnifiedDataStore
    mockUnifiedStore = {
      exportData: jest.fn(),
      exportCompressedData: jest.fn(),
      importData: jest.fn(),
      importCompressedData: jest.fn(),
      clearAllData: jest.fn(),
      updateSyncMetadata: jest.fn(),
      resetForNewAnonymousSession: jest.fn(),
      anonymizeDataOnAccountDeletion: jest.fn(),
      setPurchaseInfo: jest.fn(),
      decompressData: jest.fn().mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        dailyChallenges: { progress: {} },
        gameHistory: [],
        achievements: { unlockedIds: [] },
        collections: {},
        wordCollections: {},
        stats: {},
        news: {},
        currentGames: { regular: null, challenge: null, temp: null },
      }),
      getData: jest.fn().mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        dailyChallenges: { progress: {} },
        gameHistory: [],
        achievements: { unlockedIds: [] },
        collections: {},
        wordCollections: {},
        stats: {},
        news: {},
        currentGames: { regular: null, challenge: null, temp: null },
      }),
      reset: jest.fn(),
    };
    (
      MockedUnifiedDataStore.getInstance as jest.MockedFunction<
        typeof UnifiedDataStore.getInstance
      >
    ).mockReturnValue(mockUnifiedStore);

    // Mock useGameStore
    (useGameStore as any).getState = jest.fn().mockReturnValue({
      reset: jest.fn(),
    });

    // Mock successful session initialization
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    // Set up default mock returns for database operations
    // Note: Each test should override these as needed

    // Create service instance after all mocks are set up
    service = SupabaseService.getInstance();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = SupabaseService.getInstance();
      const instance2 = SupabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Authentication", () => {
    describe("signUp", () => {
      it("should sign up user successfully", async () => {
        const mockUser = { id: "user-123", email: "test@example.com" };
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock profile creation
        const mockFrom = mockSupabaseClient.from();
        mockFrom.insert.mockResolvedValue({ error: null });

        const result = await service.signUp(
          "test@example.com",
          "password123",
          true,
        );

        expect(result.user).toEqual(mockUser);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_profiles");
      });

      it("should handle sign up errors", async () => {
        const mockError = new Error("Email already exists");
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null },
          error: mockError,
        });

        const result = await service.signUp("test@example.com", "password123");

        expect(result.user).toBeNull();
        expect(result.error).toBe(mockError);
      });
    });

    describe("signInAnonymously", () => {
      it("should sign in anonymously successfully", async () => {
        const mockUser = { id: "anon-123", is_anonymous: true };
        const mockSession = { user: mockUser, access_token: "token" };

        mockSupabaseClient.auth.signInAnonymously.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

        // Mock profile fetch for anonymous user
        const mockFrom = mockSupabaseClient.from();
        mockFrom.single.mockResolvedValue({
          data: {
            id: "anon-123",
            email: "",
            is_premium: false,
            privacy_settings: {},
          },
          error: null,
        });

        const result = await service.signInAnonymously();

        expect(result.data.user).toEqual(mockUser);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signInAnonymously).toHaveBeenCalledWith({
          options: { captchaToken: undefined },
        });
      });

      it("should handle anonymous sign in with captcha", async () => {
        const mockUser = { id: "anon-123", is_anonymous: true };
        const mockSession = { user: mockUser, access_token: "token" };

        mockSupabaseClient.auth.signInAnonymously.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

        const mockFrom = mockSupabaseClient.from();
        mockFrom.single.mockResolvedValue({
          data: {
            id: "anon-123",
            email: "",
            is_premium: false,
            privacy_settings: {},
          },
          error: null,
        });

        const result = await service.signInAnonymously("captcha-token");

        expect(mockSupabaseClient.auth.signInAnonymously).toHaveBeenCalledWith({
          options: { captchaToken: "captcha-token" },
        });
      });

      it("should handle anonymous sign in errors", async () => {
        const mockError = new Error("Anonymous sign in failed");
        mockSupabaseClient.auth.signInAnonymously.mockResolvedValue({
          data: { user: null, session: null },
          error: mockError,
        });

        const result = await service.signInAnonymously();

        expect(result.data.user).toBeNull();
        expect(result.error).toBe(mockError);
      });
    });

    describe("signIn", () => {
      it("should sign in user successfully", async () => {
        const mockUser = { id: "user-123", email: "test@example.com" };
        const mockSession = { user: mockUser, access_token: "token" };

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

        const result = await service.signIn("test@example.com", "password123");

        expect(result.user).toEqual(mockUser);
        expect(result.session).toEqual(mockSession);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(
          {
            email: "test@example.com",
            password: "password123",
          },
        );
      });

      it("should sign in with captcha token", async () => {
        const mockUser = { id: "user-123", email: "test@example.com" };
        const mockSession = { user: mockUser, access_token: "token" };

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

        const result = await service.signIn(
          "test@example.com",
          "password123",
          "captcha-token",
        );

        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(
          {
            email: "test@example.com",
            password: "password123",
            options: { captchaToken: "captcha-token" },
          },
        );
      });

      it("should handle sign in errors", async () => {
        const mockError = new Error("Invalid credentials");
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: mockError,
        });

        const result = await service.signIn(
          "test@example.com",
          "wrongpassword",
        );

        expect(result.user).toBeNull();
        expect(result.error).toBe(mockError);
      });
    });

    describe("signOut", () => {
      it("should sign out successfully", async () => {
        mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });
        mockUnifiedStore.resetForNewAnonymousSession.mockResolvedValue(
          undefined,
        );

        const result = await service.signOut();

        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
        expect(mockUnifiedStore.resetForNewAnonymousSession).toHaveBeenCalled();
      });

      it("should handle sign out errors", async () => {
        const mockError = new Error("Sign out failed");
        mockSupabaseClient.auth.signOut.mockResolvedValue({ error: mockError });
        mockUnifiedStore.resetForNewAnonymousSession.mockResolvedValue(
          undefined,
        );

        const result = await service.signOut();

        // The service handles auth.signOut errors gracefully and still returns success
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      });

      it("should reload page when account is deleted", async () => {
        mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });
        mockUnifiedStore.clearAllData.mockResolvedValue(undefined);

        // Mock window.location.reload
        const mockReload = jest.fn();
        Object.defineProperty(window, "location", {
          value: { reload: mockReload },
          writable: true,
        });

        await service.signOut({ accountDeleted: true });

        expect(mockReload).toHaveBeenCalled();
      });
    });
  });

  describe("User Profile Management", () => {
    describe("getIsPremium", () => {
      it("should return premium status", async () => {
        const mockFrom = mockSupabaseClient.from();
        mockFrom.single.mockResolvedValue({
          data: { is_premium: true },
          error: null,
        });

        const result = await service.getIsPremium("user-123");

        expect(result).toBe(true);
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_profiles");
        expect(mockFrom.select).toHaveBeenCalledWith("is_premium");
        expect(mockFrom.eq).toHaveBeenCalledWith("id", "user-123");
      });

      it("should return false for non-existent user", async () => {
        const mockFrom = mockSupabaseClient.from();
        mockFrom.single.mockResolvedValue({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        });

        const result = await service.getIsPremium("user-123");

        expect(result).toBe(false);
      });

      it("should return null for database errors", async () => {
        const mockFrom = mockSupabaseClient.from();
        mockFrom.single.mockResolvedValue({
          data: null,
          error: { code: "PGRST500", message: "Database error" },
        });

        const result = await service.getIsPremium("user-123");

        expect(result).toBeNull();
      });
    });

    describe("updateEmailPreferences", () => {
      beforeEach(() => {
        // Set up authenticated state with profile
        (service as any).currentAuthState = {
          user: { id: "user-123" },
          session: { access_token: "token" },
          profile: {
            id: "user-123",
            email: "test@example.com",
            privacy_settings: {
              allow_challenge_sharing: true,
              allow_stats_sharing: true,
              allow_leaderboards: true,
              data_collection: false,
              email_updates: false,
            },
          },
          isLoading: false,
        };
      });

      it("should update email preferences", async () => {
        const mockFrom = mockSupabaseClient.from();
        mockFrom.update.mockReturnValue(mockFrom);
        mockFrom.eq.mockResolvedValue({
          data: { id: "user-123" },
          error: null,
        });

        const result = await service.updateEmailPreferences(true);

        expect(result.error).toBeNull();
        expect(mockFrom.update).toHaveBeenCalledWith({
          privacy_settings: {
            allow_challenge_sharing: true,
            allow_stats_sharing: true,
            allow_leaderboards: true,
            data_collection: false,
            email_updates: true,
          },
        });
      });

      it("should throw error if no profile exists", async () => {
        (service as any).currentAuthState.profile = null;

        await expect(service.updateEmailPreferences(true)).rejects.toThrow(
          "No user profile found",
        );
      });
    });

    describe("createPremiumProfile", () => {
      it("should create premium profile successfully", async () => {
        const mockFrom = mockSupabaseClient.from();
        mockFrom.upsert.mockResolvedValue({ error: null });

        const result = await service.createPremiumProfile(
          "user-123",
          "test@example.com",
        );

        expect(result.error).toBeNull();
        expect(mockFrom.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "user-123",
            email: "test@example.com",
            is_premium: true,
            platform_purchase_data: expect.objectContaining({
              platform: "stripe",
              validated: false,
            }),
          }),
          { onConflict: "id" },
        );
      });

      it("should handle premium profile creation errors", async () => {
        const mockError = new Error("Database error");
        const mockFrom = mockSupabaseClient.from();
        mockFrom.upsert.mockResolvedValue({ error: mockError });

        const result = await service.createPremiumProfile(
          "user-123",
          "test@example.com",
        );

        expect(result.error).toBe(mockError);
      });
    });
  });

  describe("Data Synchronization", () => {
    beforeEach(() => {
      // Set up authenticated state
      (service as any).currentAuthState = {
        user: { id: "user-123" },
        session: { access_token: "token" },
        profile: { id: "user-123", email: "test@example.com" },
        isLoading: false,
      };
    });

    describe("syncLocalDataToCloud", () => {
      it("should sync local data to cloud successfully", async () => {
        const mockLocalData = {
          user: { id: "local-123" },
          meta: { deviceId: "device-123", schemaVersion: 1 },
          gameHistory: [],
        };
        const mockCompressedData = "compressed-data";

        mockUnifiedStore.exportData.mockResolvedValue(mockLocalData);
        mockUnifiedStore.exportCompressedData.mockResolvedValue(
          mockCompressedData,
        );

        const mockFrom = mockSupabaseClient.from();
        mockFrom.upsert.mockResolvedValue({ error: null });

        await service.syncLocalDataToCloud();

        expect(mockUnifiedStore.exportData).toHaveBeenCalled();
        expect(mockUnifiedStore.exportCompressedData).toHaveBeenCalled();
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_data");
        expect(mockFrom.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: "user-123",
            data: mockCompressedData,
            device_id: "device-123",
            schema_version: 1,
            is_compressed: true,
          }),
          { onConflict: "user_id" },
        );
      });

      it("should skip sync if user is not authenticated", async () => {
        (service as any).currentAuthState.user = null;

        await service.syncLocalDataToCloud();

        expect(mockUnifiedStore.exportData).not.toHaveBeenCalled();
      });
    });

    describe("syncCloudDataToLocal", () => {
      it("should sync cloud data to local successfully", async () => {
        const mockCloudData = {
          data: "compressed-cloud-data",
          is_compressed: true,
        };

        const mockFrom = mockSupabaseClient.from();

        // First call for user_data
        mockFrom.single.mockResolvedValueOnce({
          data: mockCloudData,
          error: null,
        });

        // Second call for user_profiles
        mockFrom.single.mockResolvedValueOnce({
          data: { email: "test@example.com", is_premium: false },
          error: null,
        });

        mockUnifiedStore.importData.mockResolvedValue(undefined);

        const result = await service.syncCloudDataToLocal();

        expect(result?.error).toBeNull();
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_data");
        expect(mockUnifiedStore.importData).toHaveBeenCalled();
      });

      it("should handle missing cloud data gracefully", async () => {
        const mockFrom = mockSupabaseClient.from();

        // First call for user_data - no data found
        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        });

        // Second call for user_profiles - no data found
        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116" }, // No rows found
        });

        const result = await service.syncCloudDataToLocal();

        // When both user data and profile are missing, service signs out user
        expect(result?.error).toEqual(
          expect.objectContaining({
            message: expect.stringContaining("signed out for consistency"),
          }),
        );
      });

      it("should handle sync errors", async () => {
        const mockError = new Error("Database error");
        const mockFrom = mockSupabaseClient.from();
        mockFrom.single.mockResolvedValue({
          data: null,
          error: mockError,
        });

        const result = await service.syncCloudDataToLocal();

        expect(result?.error).toBe(mockError);
      });
    });
  });

  describe("Utility Methods", () => {
    beforeEach(() => {
      (service as any).currentAuthState = {
        user: { id: "user-123" },
        session: { access_token: "token" },
        profile: {
          id: "user-123",
          email: "test@example.com",
          is_premium: true,
        },
        isLoading: false,
      };
    });

    describe("isAuthenticated", () => {
      it("should return true when user is authenticated", () => {
        expect(service.isAuthenticated()).toBe(true);
      });

      it("should return false when user is not authenticated", () => {
        (service as any).currentAuthState.user = null;
        expect(service.isAuthenticated()).toBe(false);
      });
    });

    describe("isPremiumUser", () => {
      it("should return true for premium user", () => {
        expect(service.isPremiumUser()).toBe(true);
      });

      it("should return false for non-premium user", () => {
        (service as any).currentAuthState.profile.is_premium = false;
        expect(service.isPremiumUser()).toBe(false);
      });

      it("should return false when no profile exists", () => {
        (service as any).currentAuthState.profile = null;
        expect(service.isPremiumUser()).toBe(false);
      });
    });

    describe("getUser", () => {
      it("should return current user", () => {
        const user = service.getUser();
        expect(user).toEqual({ id: "user-123" });
      });

      it("should return null when no user", () => {
        (service as any).currentAuthState.user = null;
        const user = service.getUser();
        expect(user).toBeNull();
      });
    });

    describe("getUserProfile", () => {
      it("should return current user profile", () => {
        const profile = service.getUserProfile();
        expect(profile).toEqual(
          expect.objectContaining({
            id: "user-123",
            email: "test@example.com",
            is_premium: true,
          }),
        );
      });

      it("should return null when no profile", () => {
        (service as any).currentAuthState.profile = null;
        const profile = service.getUserProfile();
        expect(profile).toBeNull();
      });
    });
  });

  describe("Auth State Management", () => {
    it("should notify listeners of auth state changes", () => {
      const listener = jest.fn();
      const unsubscribe = service.onAuthStateChange(listener);

      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          user: null,
          session: null,
          profile: null,
          isLoading: false, // After initialization, isLoading becomes false
        }),
      );

      // Update auth state
      (service as any).updateAuthState({
        user: { id: "user-123" },
        isLoading: false,
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: "user-123" },
          isLoading: false,
        }),
      );

      // Unsubscribe should work
      unsubscribe();
      (service as any).updateAuthState({ isLoading: true });

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should return current auth state", () => {
      const authState = service.getCurrentAuthState();
      expect(authState).toEqual(
        expect.objectContaining({
          user: null,
          session: null,
          profile: null,
          isLoading: false, // After initialization, isLoading becomes false
        }),
      );
    });
  });

  describe("Function Invocation", () => {
    it("should invoke Supabase function successfully", async () => {
      const mockResponse = { data: { success: true } };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.invokeFunction("test-function", {
        param: "value",
      });

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeNull();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/test-function"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ param: "value" }),
        }),
      );
    });

    it("should include authorization header when user is authenticated", async () => {
      (service as any).currentAuthState = {
        user: { id: "user-123" },
        session: { access_token: "user-token" },
        profile: null,
        isLoading: false,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: "success" }),
      });

      await service.invokeFunction("test-function", { param: "value" });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/test-function"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer user-token",
          }),
        }),
      );
    });

    it("should use provided JWT token", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: "success" }),
      });

      await service.invokeFunction(
        "test-function",
        { param: "value" },
        "custom-jwt",
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/test-function"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer custom-jwt",
          }),
        }),
      );
    });

    it("should handle function invocation errors", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: jest.fn().mockResolvedValue({ error: "Function failed" }),
      });

      const result = await service.invokeFunction("test-function", {
        param: "value",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe("Function failed");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      global.fetch = jest.fn().mockRejectedValue(networkError);

      const result = await service.invokeFunction("test-function", {
        param: "value",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe(networkError);
    });
  });
});
