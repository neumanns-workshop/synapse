import * as StorageAdapter from "../StorageAdapter";
import { unifiedDataStore } from "../UnifiedDataStore";
import type { GameReport } from "../../utils/gameReportUtils";
import type { WordCollection } from "../../features/wordCollections";

// Mock the UnifiedDataStore
jest.mock("../UnifiedDataStore", () => ({
  unifiedDataStore: {
    addGameToHistory: jest.fn(),
    getGameHistory: jest.fn(),
    getLifetimeStats: jest.fn(),
    updateStatsOnGameEnd: jest.fn(),
    getUnlockedAchievements: jest.fn(),
    unlockAchievement: jest.fn(),
    getCollectionProgress: jest.fn(),
    recordWordForCollection: jest.fn(),
    getData: jest.fn(),
    saveData: jest.fn(),
    saveCurrentGame: jest.fn(),
    loadCurrentGame: jest.fn(),
    clearCurrentGame: jest.fn(),
    resetAllData: jest.fn(),
  },
}));

// Mock progressive achievements handler
jest.mock("../../features/achievements/logic", () => ({
  handleProgressiveAchievements: jest.fn().mockResolvedValue([]),
}));

const mockUnifiedDataStore = unifiedDataStore as jest.Mocked<typeof unifiedDataStore>;

describe("StorageAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  describe("Game History Functions", () => {
    describe("saveGameToHistory", () => {
      it("should delegate to unifiedDataStore.addGameToHistory", async () => {
        const gameReport: GameReport = {
          id: "game-1",
          timestamp: Date.now(),
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

        await StorageAdapter.saveGameToHistory(gameReport);

        expect(mockUnifiedDataStore.addGameToHistory).toHaveBeenCalledWith(gameReport);
      });
    });

    describe("loadGameHistory", () => {
      it("should delegate to unifiedDataStore.getGameHistory", async () => {
        const mockHistory: GameReport[] = [
          {
            id: "game-1",
            timestamp: Date.now(),
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
          },
        ];

        mockUnifiedDataStore.getGameHistory.mockResolvedValue(mockHistory);

        const result = await StorageAdapter.loadGameHistory();

        expect(mockUnifiedDataStore.getGameHistory).toHaveBeenCalled();
        expect(result).toEqual(mockHistory);
      });
    });
  });

  describe("Lifetime Stats Functions", () => {
    describe("getLifetimeStats", () => {
      it("should delegate to unifiedDataStore.getLifetimeStats", async () => {
        const mockStats = {
          totalGamesPlayed: 10,
          totalWins: 8,
          totalGaveUps: 2,
          achievementsUnlocked: 5,
          cumulativeMoveAccuracySum: 850,
        };

        mockUnifiedDataStore.getLifetimeStats.mockResolvedValue(mockStats);

        const result = await StorageAdapter.getLifetimeStats();

        expect(mockUnifiedDataStore.getLifetimeStats).toHaveBeenCalled();
        expect(result).toEqual(mockStats);
      });
    });

    describe("updateLifetimeStatsOnGameEnd", () => {
      it("should delegate to unifiedDataStore.updateStatsOnGameEnd", async () => {
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

        await StorageAdapter.updateLifetimeStatsOnGameEnd(gameReport);

        expect(mockUnifiedDataStore.updateStatsOnGameEnd).toHaveBeenCalledWith(gameReport);
      });
    });
  });

  describe("Achievement Functions", () => {
    describe("getUnlockedAchievementIds", () => {
      it("should delegate to unifiedDataStore.getUnlockedAchievements", async () => {
        const mockAchievements = ["achievement1", "achievement2"];
        mockUnifiedDataStore.getUnlockedAchievements.mockResolvedValue(mockAchievements);

        const result = await StorageAdapter.getUnlockedAchievementIds();

        expect(mockUnifiedDataStore.getUnlockedAchievements).toHaveBeenCalled();
        expect(result).toEqual(mockAchievements);
      });
    });

    describe("markAchievementAsUnlocked", () => {
      it("should delegate to unifiedDataStore.unlockAchievement", async () => {
        await StorageAdapter.markAchievementAsUnlocked("test-achievement");

        expect(mockUnifiedDataStore.unlockAchievement).toHaveBeenCalledWith("test-achievement");
      });
    });
  });

  describe("Game Recording Function", () => {
    describe("recordEndedGame", () => {
      it("should record a regular game with proper defaults", async () => {
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

        await StorageAdapter.recordEndedGame(gameReport);

        expect(mockUnifiedDataStore.addGameToHistory).toHaveBeenCalledWith({
          ...gameReport,
          isChallenge: false,
          isDailyChallenge: false,
        });
        expect(mockUnifiedDataStore.updateStatsOnGameEnd).toHaveBeenCalledWith({
          ...gameReport,
          isChallenge: false,
          isDailyChallenge: false,
        });
      });

      it("should record a challenge game", async () => {
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

        await StorageAdapter.recordEndedGame(gameReport, true, false);

        expect(mockUnifiedDataStore.addGameToHistory).toHaveBeenCalledWith({
          ...gameReport,
          isChallenge: true,
          isDailyChallenge: false,
        });
      });

      it("should record a daily challenge game", async () => {
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

        await StorageAdapter.recordEndedGame(gameReport, false, true);

        expect(mockUnifiedDataStore.addGameToHistory).toHaveBeenCalledWith({
          ...gameReport,
          isChallenge: false,
          isDailyChallenge: true,
        });
      });

      it("should generate id and timestamp if missing", async () => {
        const gameReport: Partial<GameReport> = {
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

        const beforeCall = Date.now();
        await StorageAdapter.recordEndedGame(gameReport as GameReport);
        const afterCall = Date.now();

        const addHistoryCall = mockUnifiedDataStore.addGameToHistory.mock.calls[0][0];
        expect(addHistoryCall.id).toBeDefined();
        expect(addHistoryCall.timestamp).toBeGreaterThanOrEqual(beforeCall);
        expect(addHistoryCall.timestamp).toBeLessThanOrEqual(afterCall);
      });

      it("should handle earned achievements", async () => {
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
          earnedAchievements: [
            { 
              id: "achievement1", 
              name: "Test Achievement", 
              description: "Test",
              check: () => true,
            },
            { 
              id: "achievement2", 
              name: "Another Achievement", 
              description: "Test",
              check: () => true,
            },
          ],
        };

        await StorageAdapter.recordEndedGame(gameReport);

        expect(mockUnifiedDataStore.unlockAchievement).toHaveBeenCalledWith("achievement1");
        expect(mockUnifiedDataStore.unlockAchievement).toHaveBeenCalledWith("achievement2");
      });
    });
  });

  describe("Word Collections Functions", () => {
    describe("getWordCollectionsProgress", () => {
      it("should delegate to unifiedDataStore.getCollectionProgress", async () => {
        const mockProgress = {
          "collection1": {
            collectedWords: ["word1", "word2"],
            lastUpdated: Date.now(),
          },
        };

        mockUnifiedDataStore.getCollectionProgress.mockResolvedValue(mockProgress);

        const result = await StorageAdapter.getWordCollectionsProgress();

        expect(mockUnifiedDataStore.getCollectionProgress).toHaveBeenCalled();
        expect(result).toEqual(mockProgress);
      });
    });

    describe("recordWordForCollection", () => {
      it("should delegate to unifiedDataStore.recordWordForCollection", async () => {
        await StorageAdapter.recordWordForCollection("collection1", "word1");

        expect(mockUnifiedDataStore.recordWordForCollection).toHaveBeenCalledWith("collection1", "word1");
      });
    });

    describe("resetCollectionProgress", () => {
      it("should reset collection progress", async () => {
        const mockData = {
          collections: {
            "collection1": {
              collectedWords: ["word1", "word2"],
              lastUpdated: Date.now() - 1000,
            },
          },
        };

        mockUnifiedDataStore.getData.mockResolvedValue(mockData as any);

        const beforeReset = Date.now();
        await StorageAdapter.resetCollectionProgress("collection1");
        const afterReset = Date.now();

        expect(mockData.collections["collection1"].collectedWords).toEqual([]);
        expect(mockData.collections["collection1"].lastUpdated).toBeGreaterThanOrEqual(beforeReset);
        expect(mockData.collections["collection1"].lastUpdated).toBeLessThanOrEqual(afterReset);
        expect(mockUnifiedDataStore.saveData).toHaveBeenCalled();
      });

      it("should handle non-existent collection gracefully", async () => {
        const mockData = {
          collections: {},
        };

        mockUnifiedDataStore.getData.mockResolvedValue(mockData as any);

        await StorageAdapter.resetCollectionProgress("non-existent");

        // Should not throw and should not call saveData
        expect(mockUnifiedDataStore.saveData).not.toHaveBeenCalled();
      });
    });

    describe("checkAndRecordWordForCollections", () => {
      it("should record word for matching collections", async () => {
        const activeCollections: WordCollection[] = [
          {
            id: "collection1",
            title: "Test Collection 1",
            words: ["word1", "word2", "word3"],
            isWordlistViewable: true,
          },
          {
            id: "collection2",
            title: "Test Collection 2",
            words: ["word4", "word5", "word6"],
            isWordlistViewable: true,
          },
        ];

        await StorageAdapter.checkAndRecordWordForCollections("word1", activeCollections);

        expect(mockUnifiedDataStore.recordWordForCollection).toHaveBeenCalledWith("collection1", "word1");
        expect(mockUnifiedDataStore.recordWordForCollection).not.toHaveBeenCalledWith("collection2", "word1");
      });

      it("should record word for multiple matching collections", async () => {
        const activeCollections: WordCollection[] = [
          {
            id: "collection1",
            title: "Test Collection 1",
            words: ["word1", "word2"],
            isWordlistViewable: true,
          },
          {
            id: "collection2",
            title: "Test Collection 2",
            words: ["word1", "word3"],
            isWordlistViewable: true,
          },
        ];

        await StorageAdapter.checkAndRecordWordForCollections("word1", activeCollections);

        expect(mockUnifiedDataStore.recordWordForCollection).toHaveBeenCalledWith("collection1", "word1");
        expect(mockUnifiedDataStore.recordWordForCollection).toHaveBeenCalledWith("collection2", "word1");
      });

      it("should not record word if not in any collection", async () => {
        const activeCollections: WordCollection[] = [
          {
            id: "collection1",
            title: "Test Collection 1",
            words: ["word2", "word3"],
            isWordlistViewable: true,
          },
        ];

        await StorageAdapter.checkAndRecordWordForCollections("word1", activeCollections);

        expect(mockUnifiedDataStore.recordWordForCollection).not.toHaveBeenCalled();
      });
    });
  });

  describe("Current Game Persistence Functions", () => {
    describe("saveCurrentGame", () => {
      it("should save playing game", async () => {
        const gameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
        };

        await StorageAdapter.saveCurrentGame(gameState);

        expect(mockUnifiedDataStore.saveCurrentGame).toHaveBeenCalledWith(gameState, "regular");
      });

      it("should save challenge game", async () => {
        const gameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
          isChallenge: true,
        };

        await StorageAdapter.saveCurrentGame(gameState);

        expect(mockUnifiedDataStore.saveCurrentGame).toHaveBeenCalledWith(gameState, "challenge");
      });

      it("should not save non-playing games", async () => {
        const gameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "end",
          playerPath: ["start", "end"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: [],
          gameStatus: "won",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
        };

        await StorageAdapter.saveCurrentGame(gameState);

        expect(mockUnifiedDataStore.saveCurrentGame).not.toHaveBeenCalled();
      });

      it("should add startTime if missing", async () => {
        const gameState: Partial<StorageAdapter.PersistentGameState> = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          // startTime missing
        };

        const beforeCall = Date.now();
        await StorageAdapter.saveCurrentGame(gameState as StorageAdapter.PersistentGameState);
        const afterCall = Date.now();

        const savedGameState = mockUnifiedDataStore.saveCurrentGame.mock.calls[0][0];
        expect(savedGameState.startTime).toBeGreaterThanOrEqual(beforeCall);
        expect(savedGameState.startTime).toBeLessThanOrEqual(afterCall);
      });
    });

    describe("loadCurrentGame", () => {
      it("should load regular game by default", async () => {
        const mockGameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
        };

        mockUnifiedDataStore.loadCurrentGame.mockResolvedValue(mockGameState);

        const result = await StorageAdapter.loadCurrentGame();

        expect(mockUnifiedDataStore.loadCurrentGame).toHaveBeenCalledWith("regular");
        expect(result).toEqual(mockGameState);
      });

      it("should load challenge game when specified", async () => {
        const mockGameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
          isChallenge: true,
        };

        mockUnifiedDataStore.loadCurrentGame.mockResolvedValue(mockGameState);

        const result = await StorageAdapter.loadCurrentGame(true);

        expect(mockUnifiedDataStore.loadCurrentGame).toHaveBeenCalledWith("challenge");
        expect(result).toEqual(mockGameState);
      });
    });

    describe("clearCurrentGame", () => {
      it("should clear regular game by default", async () => {
        await StorageAdapter.clearCurrentGame();

        expect(mockUnifiedDataStore.clearCurrentGame).toHaveBeenCalledWith("regular");
      });

      it("should clear challenge game when specified", async () => {
        await StorageAdapter.clearCurrentGame(true);

        expect(mockUnifiedDataStore.clearCurrentGame).toHaveBeenCalledWith("challenge");
      });
    });

    describe("saveTempGame", () => {
      it("should save temp game", async () => {
        const gameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
        };

        await StorageAdapter.saveTempGame(gameState);

        expect(mockUnifiedDataStore.saveCurrentGame).toHaveBeenCalledWith(gameState, "temp");
      });
    });

    describe("hasTempSavedGame", () => {
      it("should return true if temp game exists", async () => {
        const mockGameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
        };

        mockUnifiedDataStore.loadCurrentGame.mockResolvedValue(mockGameState);

        const result = await StorageAdapter.hasTempSavedGame();

        expect(mockUnifiedDataStore.loadCurrentGame).toHaveBeenCalledWith("temp");
        expect(result).toBe(true);
      });

      it("should return false if no temp game exists", async () => {
        mockUnifiedDataStore.loadCurrentGame.mockResolvedValue(null);

        const result = await StorageAdapter.hasTempSavedGame();

        expect(mockUnifiedDataStore.loadCurrentGame).toHaveBeenCalledWith("temp");
        expect(result).toBe(false);
      });
    });

    describe("restoreTempGame", () => {
      it("should load and clear temp game", async () => {
        const mockGameState: StorageAdapter.PersistentGameState = {
          startWord: "start",
          targetWord: "end",
          currentWord: "middle",
          playerPath: ["start", "middle"],
          optimalPath: ["start", "end"],
          suggestedPathFromCurrent: ["middle", "end"],
          gameStatus: "playing",
          optimalChoices: [],
          backtrackHistory: [],
          pathDisplayMode: { player: true, optimal: false, suggested: false, ai: false },
          startTime: Date.now(),
        };

        mockUnifiedDataStore.loadCurrentGame.mockResolvedValue(mockGameState);

        const result = await StorageAdapter.restoreTempGame();

        expect(mockUnifiedDataStore.loadCurrentGame).toHaveBeenCalledWith("temp");
        expect(mockUnifiedDataStore.clearCurrentGame).toHaveBeenCalledWith("temp");
        expect(result).toEqual(mockGameState);
      });

      it("should return null if no temp game exists", async () => {
        mockUnifiedDataStore.loadCurrentGame.mockResolvedValue(null);

        const result = await StorageAdapter.restoreTempGame();

        expect(mockUnifiedDataStore.loadCurrentGame).toHaveBeenCalledWith("temp");
        expect(mockUnifiedDataStore.clearCurrentGame).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });
  });

  describe("Data Management Functions", () => {
    describe("resetAllPlayerData", () => {
      it("should delegate to unifiedDataStore.resetAllData", async () => {
        await StorageAdapter.resetAllPlayerData();

        expect(mockUnifiedDataStore.resetAllData).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in recordEndedGame gracefully", async () => {
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

      mockUnifiedDataStore.addGameToHistory.mockRejectedValue(new Error("Storage error"));

      // Should not throw
      await expect(StorageAdapter.recordEndedGame(gameReport)).resolves.not.toThrow();
    });

    it("should handle progressive achievements errors gracefully", async () => {
      const { handleProgressiveAchievements } = require("../../features/achievements/logic");
      handleProgressiveAchievements.mockRejectedValue(new Error("Progressive achievements error"));

      // Make sure the main storage operations succeed so we reach the progressive achievements section
      mockUnifiedDataStore.addGameToHistory.mockResolvedValue(undefined);
      mockUnifiedDataStore.updateStatsOnGameEnd.mockResolvedValue(undefined);

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

      // Should not throw
      await expect(StorageAdapter.recordEndedGame(gameReport)).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledWith("Error handling progressive achievements:", expect.any(Error));
    });
  });
}); 