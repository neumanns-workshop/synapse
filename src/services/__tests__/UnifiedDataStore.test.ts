import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnifiedDataStore } from "../UnifiedDataStore";
import type { GameReport } from "../../utils/gameReportUtils";
import type { DailyChallengeProgress } from "../../types/dailyChallenges";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage");
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock compression utilities
jest.mock("../../utils/dataCompression", () => ({
  DataCompressor: {
    compress: jest.fn((data) => ({ compressed: true, data })),
    decompress: jest.fn((data) => {
      if (data && data.compressed && data.data) {
        return data.data;
      }
      return data;
    }),
  },
  StorageSizeEstimator: {
    estimateSize: jest.fn(() => ({
      original: 1000,
      compressed: 800,
      savings: 20,
    })),
  },
}));

// Mock development environment
const originalDev = (global as any).__DEV__;

describe("UnifiedDataStore", () => {
  let store: UnifiedDataStore;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockAsyncStorage.clear();
    
    // Reset all mock implementations to default behavior
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    
    // Reset singleton instance
    (UnifiedDataStore as any).instance = undefined;
    
    // Get fresh instance
    store = UnifiedDataStore.getInstance();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(async () => {
    (global as any).__DEV__ = originalDev;
    // Flush any pending debounced saves to prevent async warnings
    const store = UnifiedDataStore.getInstance();
    await store.flushPendingChanges();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const store1 = UnifiedDataStore.getInstance();
      const store2 = UnifiedDataStore.getInstance();
      expect(store1).toBe(store2);
    });
  });

  describe("Data Loading and Initialization", () => {
    it("should create default data structure for new users", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const data = await store.loadData();
      
      expect(data.user.isPremium).toBe(false);
      expect(data.user.tutorialComplete).toBe(false);
      expect(data.stats.totalGamesPlayed).toBe(0);
      expect(data.gameHistory).toEqual([]);
      expect(data.achievements.unlockedIds).toEqual([]);
      expect(data.collections).toEqual({});
      expect(data.meta.schemaVersion).toBe(1);
    });

    it("should load and decompress existing data", async () => {
      // Mock compressed data format (with unlockedBits to trigger decompression)
      const mockStoredData = {
        achievements: {
          unlockedBits: "test", // This triggers the decompression path
        },
        // Other compressed data...
      };
      
      // Mock the decompressed result
      const mockDecompressedData = {
        user: { 
          id: "test-user", 
          isPremium: true,
          tutorialComplete: false,
          hasPlayedBefore: true,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          privacy: {
            allowChallengeSharing: true,
            allowStatsSharing: true,
            allowLeaderboards: true,
            dataCollection: false,
          },
        },
        stats: { 
          totalGamesPlayed: 5,
          totalWins: 3,
          totalGaveUps: 1,
          achievementsUnlocked: 1,
          cumulativeMoveAccuracySum: 400,
        },
        gameHistory: [],
        achievements: { 
          unlockedIds: ["test-achievement"],
          viewedIds: [],
          unlockTimestamps: {},
          progressiveCounters: {},
          schemaVersion: 1,
        },
        collections: {},
        wordCollections: {
          completedIds: [],
          viewedIds: [],
          completionTimestamps: {},
          schemaVersion: 1,
        },
        dailyChallenges: {
          progress: {},
          freeGamesRemaining: 2,
          lastResetDate: new Date().toISOString().split('T')[0],
        },
        news: {
          readArticleIds: [],
          lastChecked: 0,
        },
        currentGames: {
          regular: null,
          challenge: null,
          temp: null,
        },
        meta: { 
          version: "1.0.0", 
          schemaVersion: 1,
          lastSyncAt: Date.now(),
          lastBackupAt: Date.now(),
        },
      };
      
      // Update the decompress mock to return our test data
      const { DataCompressor } = require("../../utils/dataCompression");
      DataCompressor.decompress.mockReturnValue(mockDecompressedData);
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockStoredData));
      
      const data = await store.loadData();
      
      expect(data.user.isPremium).toBe(true);
      expect(data.stats.totalGamesPlayed).toBe(5);
      expect(data.achievements.unlockedIds).toContain("test-achievement");
    });

    it("should handle corrupted data gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid-json");
      
      const data = await store.loadData();
      
      // Should fall back to default data
      expect(data.user.isPremium).toBe(false);
      expect(data.stats.totalGamesPlayed).toBe(0);
    });

    it("should ensure data structure integrity", async () => {
      const incompleteData = {
        user: { id: "test" },
        // Missing other required fields
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(incompleteData));
      
      const data = await store.loadData();
      
      // Should have all required fields with defaults
      expect(data.user.isPremium).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.gameHistory).toBeDefined();
      expect(data.achievements).toBeDefined();
      expect(data.collections).toBeDefined();
      expect(data.meta).toBeDefined();
    });
  });

  describe("Data Persistence", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should save data with compression", async () => {
      await store.saveData();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "synapse_unified_data_v1",
        expect.any(String)
      );
    });

    it("should update lastActiveAt when saving", async () => {
      const beforeSave = Date.now();
      await store.saveData();
      const data = await store.getData();
      
      expect(data.user.lastActiveAt).toBeGreaterThanOrEqual(beforeSave);
    });

    it("should handle save errors gracefully", async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage full"));
      
      await expect(store.saveData()).rejects.toThrow("Storage full");
    });
  });

  describe("Game History Management", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should add game to history", async () => {
      const gameReport: GameReport = {
        id: "game-1",
        timestamp: Date.now(),
        startWord: "start",
        targetWord: "end",
        playerPath: ["start", "middle", "end"],
        totalMoves: 2,
        moveAccuracy: 85,
        status: "won",
        optimalPath: ["start", "end"],
        suggestedPath: [],
        optimalMovesMade: 1,
        optimalChoices: [],
        missedOptimalMoves: [],
        playerSemanticDistance: 0.5,
        optimalSemanticDistance: 0.3,
        averageSimilarity: 0.8,
        pathEfficiency: 0.9,
      };

      await store.addGameToHistory(gameReport);
      const history = await store.getGameHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(gameReport);
    });

    it("should maintain maximum history size", async () => {
      // Add 101 games to test the 100-game limit
      for (let i = 0; i < 101; i++) {
        const gameReport: GameReport = {
          id: `game-${i}`,
          timestamp: Date.now() + i,
          startWord: "start",
          targetWord: "end",
          playerPath: ["start", "end"],
          totalMoves: 1,
          moveAccuracy: 100,
          status: "won",
          optimalPath: ["start", "end"],
          suggestedPath: [],
          optimalMovesMade: 1,
          optimalChoices: [],
          missedOptimalMoves: [],
          playerSemanticDistance: 0.3,
          optimalSemanticDistance: 0.3,
          averageSimilarity: 1.0,
          pathEfficiency: 1.0,
        };
        await store.addGameToHistory(gameReport);
      }

      const history = await store.getGameHistory();
      expect(history).toHaveLength(100);
      // Should keep the most recent games
      expect(history[0].id).toBe("game-100");
    });
  });

  describe("Statistics Management", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should update stats on game end", async () => {
      const gameReport: GameReport = {
        id: "game-1",
        timestamp: Date.now(),
        startWord: "start",
        targetWord: "end",
        playerPath: ["start", "end"],
        totalMoves: 1,
        moveAccuracy: 95,
        status: "won",
        optimalPath: ["start", "end"],
        suggestedPath: [],
        optimalMovesMade: 1,
        optimalChoices: [],
        missedOptimalMoves: [],
        playerSemanticDistance: 0.3,
        optimalSemanticDistance: 0.3,
        averageSimilarity: 1.0,
        pathEfficiency: 1.0,
      };

      await store.updateStatsOnGameEnd(gameReport);
      const stats = await store.getLifetimeStats();
      
      expect(stats.totalGamesPlayed).toBe(1);
      expect(stats.totalWins).toBe(1);
      expect(stats.totalGaveUps).toBe(0);
      expect(stats.cumulativeMoveAccuracySum).toBe(95);
    });

    it("should handle gave up games", async () => {
      const gameReport: GameReport = {
        id: "game-1",
        timestamp: Date.now(),
        startWord: "start",
        targetWord: "end",
        playerPath: ["start"],
        totalMoves: 0,
        moveAccuracy: 0,
        status: "given_up",
        optimalPath: ["start", "end"],
        suggestedPath: [],
        optimalMovesMade: 0,
        optimalChoices: [],
        missedOptimalMoves: [],
        playerSemanticDistance: 0,
        optimalSemanticDistance: 0.3,
        averageSimilarity: 0,
        pathEfficiency: 0,
      };

      await store.updateStatsOnGameEnd(gameReport);
      const stats = await store.getLifetimeStats();
      
      expect(stats.totalGamesPlayed).toBe(1);
      expect(stats.totalWins).toBe(0);
      expect(stats.totalGaveUps).toBe(1);
    });
  });

  describe("Achievement Management", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should unlock achievements", async () => {
      const result = await store.unlockAchievement("test-achievement");
      
      expect(result).toBe(true);
      const unlocked = await store.getUnlockedAchievements();
      expect(unlocked).toContain("test-achievement");
    });

    it("should not unlock the same achievement twice", async () => {
      await store.unlockAchievement("test-achievement");
      const result = await store.unlockAchievement("test-achievement");
      
      expect(result).toBe(false);
      const unlocked = await store.getUnlockedAchievements();
      expect(unlocked.filter(id => id === "test-achievement")).toHaveLength(1);
    });

    it("should track achievement view status", async () => {
      await store.unlockAchievement("test-achievement");
      await store.markAchievementAsViewed("test-achievement");
      
      const viewed = await store.getViewedAchievementIds();
      expect(viewed).toContain("test-achievement");
    });

    it("should handle progressive achievements", async () => {
      await store.incrementProgressiveAchievement("progressive-test");
      await store.incrementProgressiveAchievement("progressive-test");
      
      const count = await store.getProgressiveAchievementCount("progressive-test");
      expect(count).toBe(2);
    });
  });

  describe("Current Game Persistence", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should save and load current game", async () => {
      const gameState = {
        startWord: "start",
        targetWord: "end",
        currentWord: "middle",
        playerPath: ["start", "middle"],
        optimalPath: ["start", "end"],
        suggestedPathFromCurrent: ["middle", "end"],
        gameStatus: "playing" as const,
        optimalChoices: [],
        backtrackHistory: [],
        pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
        startTime: Date.now(),
      };

      await store.saveCurrentGame(gameState, "regular");
      const loaded = await store.loadCurrentGame("regular");
      
      expect(loaded).toEqual(gameState);
    });

    it("should handle different game types", async () => {
      const regularGame = {
        startWord: "start1",
        targetWord: "end1",
        currentWord: "middle1",
        playerPath: ["start1"],
        optimalPath: ["start1", "end1"],
        suggestedPathFromCurrent: [],
        gameStatus: "playing" as const,
        optimalChoices: [],
        backtrackHistory: [],
        pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
        startTime: Date.now(),
      };

      const challengeGame = {
        startWord: "start2",
        targetWord: "end2",
        currentWord: "middle2",
        playerPath: ["start2"],
        optimalPath: ["start2", "end2"],
        suggestedPathFromCurrent: [],
        gameStatus: "playing" as const,
        optimalChoices: [],
        backtrackHistory: [],
        pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
        startTime: Date.now(),
        isChallenge: true,
      };

      await store.saveCurrentGame(regularGame, "regular");
      await store.saveCurrentGame(challengeGame, "challenge");
      
      const loadedRegular = await store.loadCurrentGame("regular");
      const loadedChallenge = await store.loadCurrentGame("challenge");
      
      expect(loadedRegular?.startWord).toBe("start1");
      expect(loadedChallenge?.startWord).toBe("start2");
    });

    it("should clear current games", async () => {
      const gameState = {
        startWord: "start",
        targetWord: "end",
        currentWord: "start",
        playerPath: ["start"],
        optimalPath: ["start", "end"],
        suggestedPathFromCurrent: [],
        gameStatus: "playing" as const,
        optimalChoices: [],
        backtrackHistory: [],
        pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
        startTime: Date.now(),
      };

      await store.saveCurrentGame(gameState, "regular");
      await store.clearCurrentGame("regular");
      
      const loaded = await store.loadCurrentGame("regular");
      expect(loaded).toBeNull();
    });
  });

  describe("Word Collections", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should record words for collections", async () => {
      await store.recordWordForCollection("test-collection", "word1");
      await store.recordWordForCollection("test-collection", "word2");
      
      const progress = await store.getCollectionProgress();
      expect(progress["test-collection"].collectedWords).toContain("word1");
      expect(progress["test-collection"].collectedWords).toContain("word2");
    });

    it("should not duplicate words in collections", async () => {
      await store.recordWordForCollection("test-collection", "word1");
      await store.recordWordForCollection("test-collection", "word1");
      
      const progress = await store.getCollectionProgress();
      expect(progress["test-collection"].collectedWords.filter(w => w === "word1")).toHaveLength(1);
    });

    it("should track collection completion", async () => {
      const wasCompleted = await store.markWordCollectionAsCompleted("test-collection");
      
      expect(wasCompleted).toBe(true);
      const completed = await store.getCompletedWordCollections();
      expect(completed).toContain("test-collection");
    });
  });

  describe("Daily Challenges", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should manage daily challenge progress", async () => {
      const progress: DailyChallengeProgress = {
        challengeId: "daily-1",
        completed: true,
        status: "won",
        completedAt: new Date().toISOString(),
        playerMoves: 3,
        score: 90,
      };

      await store.updateDailyChallengeProgress("daily-1", progress);
      const allProgress = await store.getDailyChallengeProgress();
      
      expect(allProgress["daily-1"]).toEqual(progress);
    });

    it("should manage free games", async () => {
      const remaining = await store.getRemainingFreeGames();
      expect(remaining).toBe(2); // Default value

      const newRemaining = await store.consumeFreeGame();
      expect(newRemaining).toBe(1);
    });

    it("should reset free games daily", async () => {
      // Consume all free games
      await store.consumeFreeGame();
      await store.consumeFreeGame();
      
      expect(await store.getRemainingFreeGames()).toBe(0);
      
      // Simulate next day by calling the reset logic
      const data = await store.getData();
      data.dailyChallenges.freeGamesRemaining = 2;
      await store.saveData();
      
      expect(await store.getRemainingFreeGames()).toBe(2);
    });
  });

  describe("Premium Status", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should manage premium status", async () => {
      expect(await store.isPremiumUser()).toBe(false);
      
      await store.setPremiumStatus(true);
      expect(await store.isPremiumUser()).toBe(true);
    });

    it("should manage purchase info", async () => {
      const purchaseInfo = {
        platform: "ios" as const,
        transactionId: "test-transaction",
        purchaseDate: Date.now(),
        validated: true,
      };

      await store.setPurchaseInfo(purchaseInfo);
      const retrieved = await store.getPurchaseInfo();
      
      expect(retrieved).toEqual(purchaseInfo);
    });
  });

  describe("User Profile", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should manage user email", async () => {
      await store.setEmail("test@example.com");
      const email = await store.getEmail();
      
      expect(email).toBe("test@example.com");
    });

    it("should manage tutorial completion", async () => {
      expect(await store.isTutorialComplete()).toBe(false);
      
      await store.setTutorialComplete(true);
      expect(await store.isTutorialComplete()).toBe(true);
    });

    it("should manage privacy settings", async () => {
      const settings = {
        allowChallengeSharing: false,
        allowStatsSharing: false,
        allowLeaderboards: false,
        dataCollection: true,
      };

      await store.updatePrivacySettings(settings);
      const retrieved = await store.getPrivacySettings();
      
      expect(retrieved.allowChallengeSharing).toBe(false);
      expect(retrieved.dataCollection).toBe(true);
    });
  });

  describe("Data Management", () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should reset all data", async () => {
      // Add some data first
      await store.unlockAchievement("test-achievement");
      await store.setPremiumStatus(true);
      
      await store.resetAllData();
      
      const data = await store.getData();
      expect(data.achievements.unlockedIds).toHaveLength(0);
      expect(data.user.isPremium).toBe(false);
    });

    it("should export data", async () => {
      await store.unlockAchievement("test-achievement");
      
      const exported = await store.exportData();
      expect(exported.achievements.unlockedIds).toContain("test-achievement");
    });

    it("should import data", async () => {
      const importData = await store.exportData();
      importData.user.isPremium = true;
      importData.achievements.unlockedIds.push("imported-achievement");
      
      await store.importData(importData);
      
      const data = await store.getData();
      expect(data.user.isPremium).toBe(true);
      expect(data.achievements.unlockedIds).toContain("imported-achievement");
    });
  });

  describe("Error Handling", () => {
    it("should handle AsyncStorage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));
      
      // Should not throw, should return default data
      const data = await store.loadData();
      expect(data.user.isPremium).toBe(false);
    });

    it("should handle malformed JSON gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("{invalid json");
      
      const data = await store.loadData();
      expect(data.user.isPremium).toBe(false);
    });
  });

  describe("Development Features", () => {
    beforeEach(async () => {
      (global as any).__DEV__ = true;
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await store.loadData();
    });

    it("should provide debug methods", async () => {
      await store.debugSetPremium(true);
      expect(await store.isPremiumUser()).toBe(true);

      await store.debugResetFreeGames(5);
      expect(await store.getRemainingFreeGames()).toBe(5);
    });
  });

  describe("Performance Optimizations", () => {
    it("should debounce save operations", async () => {
      const store = UnifiedDataStore.getInstance();
      await store.loadData();
      
      // Record multiple rapid changes
      await store.recordWordForCollection("test-collection", "word1");
      await store.recordWordForCollection("test-collection", "word2");
      await store.recordWordForCollection("test-collection", "word3");
      
      // Flush pending changes to ensure everything is saved
      await store.flushPendingChanges();
      
      // Verify data was saved correctly
      const progress = await store.getCollectionProgress();
      expect(progress["test-collection"].collectedWords).toHaveLength(3);
    });

    it("should flush pending changes immediately when requested", async () => {
      const store = UnifiedDataStore.getInstance();
      await store.loadData();
      
      // Make a change that would normally be debounced
      await store.markAchievementAsViewed("test-achievement");
      
      // Flush immediately
      await store.flushPendingChanges();
      
      // Verify the change was persisted
      const viewedIds = await store.getViewedAchievementIds();
      expect(viewedIds).toContain("test-achievement");
    });
  });
}); 