import { useGameStore } from "../../stores/useGameStore";
import { dailyChallengesService } from "../DailyChallengesService";
import { GameFlowManager, gameFlowManager } from "../GameFlowManager";

// Mock dependencies
jest.mock("../../stores/useGameStore");
jest.mock("../DailyChallengesService");
jest.mock("../SharingService", () => ({
  parseEnhancedGameLink: jest.fn(),
}));
jest.mock("../UnifiedDataStore", () => ({
  unifiedDataStore: {
    isTutorialComplete: jest.fn(),
  },
}));
jest.mock("../StorageAdapter", () => ({
  loadGameHistory: jest.fn(),
  loadCurrentGame: jest.fn(),
  clearCurrentGame: jest.fn(),
}));

const mockedUseGameStore = useGameStore as jest.MockedFunction<
  typeof useGameStore
>;
const mockedDailyChallengesService = dailyChallengesService as jest.Mocked<
  typeof dailyChallengesService
>;

describe("GameFlowManager", () => {
  let manager: GameFlowManager;

  // Helper to create mock game store state
  const createMockGameState = (overrides = {}) => ({
    initialDataLoaded: true,
    currentDailyChallenge: null,
    hasPlayedTodaysChallenge: false,
    remainingFreeGames: 3,
    gameStatus: "idle" as const,
    isChallenge: false,
    isDailyChallenge: false,
    hasPendingChallenge: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance for testing
    (GameFlowManager as any).instance = undefined;
    manager = GameFlowManager.getInstance();

    // Mock useGameStore.getState()
    (mockedUseGameStore as any).getState = jest
      .fn()
      .mockReturnValue(createMockGameState());

    // Mock daily challenges service
    mockedDailyChallengesService.isPremiumUser.mockResolvedValue(false);
    mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Reset singleton to prevent state leakage between tests
    (GameFlowManager as any).instance = undefined;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = GameFlowManager.getInstance();
      const instance2 = GameFlowManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should export a singleton instance", () => {
      expect(gameFlowManager).toBeInstanceOf(GameFlowManager);
    });
  });

  describe("analyzePlayerState", () => {
    beforeEach(() => {
      // Mock storage adapter functions
      const { unifiedDataStore } = require("../UnifiedDataStore");
      const storageAdapter = require("../StorageAdapter");

      unifiedDataStore.isTutorialComplete.mockResolvedValue(true);
      storageAdapter.loadGameHistory.mockResolvedValue([]);
      storageAdapter.loadCurrentGame.mockResolvedValue(null);
    });

    it("should analyze player state correctly for new user", async () => {
      const { unifiedDataStore } = require("../UnifiedDataStore");
      const storageAdapter = require("../StorageAdapter");

      unifiedDataStore.isTutorialComplete.mockResolvedValue(false);
      storageAdapter.loadGameHistory.mockResolvedValue([]);

      (mockedUseGameStore as any).getState.mockReturnValue(
        createMockGameState({
          remainingFreeGames: 5,
          hasPendingChallenge: false,
        }),
      );

      const state = await manager.analyzePlayerState();

      expect(state).toEqual({
        isFirstTimeUser: true,
        hasGameHistory: false,
        hasPendingPlayerChallenge: false,
        hasPendingDailyChallenge: false,
        hasUnfinishedGame: false,
        hasUnfinishedDailyChallenge: false,
        remainingFreeGames: 5,
        shouldShowTutorial: true,
        shouldShowNews: false, // News is now handled via menu notifications
      });
    });

    it("should analyze player state correctly for returning user", async () => {
      const { unifiedDataStore } = require("../UnifiedDataStore");
      const storageAdapter = require("../StorageAdapter");

      unifiedDataStore.isTutorialComplete.mockResolvedValue(true);
      storageAdapter.loadGameHistory.mockResolvedValue([{ id: "game1" }]);

      (mockedUseGameStore as any).getState.mockReturnValue(
        createMockGameState({
          remainingFreeGames: 2,
          hasPendingChallenge: true,
        }),
      );

      const state = await manager.analyzePlayerState();

      expect(state).toEqual({
        isFirstTimeUser: false,
        hasGameHistory: true,
        hasPendingPlayerChallenge: true,
        hasPendingDailyChallenge: false,
        hasUnfinishedGame: false,
        hasUnfinishedDailyChallenge: false,
        remainingFreeGames: 2,
        shouldShowTutorial: false,
        shouldShowNews: false,
      });
    });

    it("should detect unfinished games", async () => {
      const storageAdapter = require("../StorageAdapter");

      storageAdapter.loadCurrentGame
        .mockResolvedValueOnce({ gameStatus: "playing" }) // Regular game
        .mockResolvedValueOnce(null); // Daily challenge

      const state = await manager.analyzePlayerState();

      expect(state.hasUnfinishedGame).toBe(true);
      expect(state.hasUnfinishedDailyChallenge).toBe(false);
    });

    it("should detect unfinished daily challenges", async () => {
      const storageAdapter = require("../StorageAdapter");

      storageAdapter.loadCurrentGame
        .mockResolvedValueOnce(null) // Regular game
        .mockResolvedValueOnce({
          gameStatus: "playing",
          isDailyChallenge: true,
          currentDailyChallengeId: "today-123",
        }); // Daily challenge

      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue({
        id: "today-123",
        date: "2024-01-01",
        startWord: "start",
        targetWord: "target",
        optimalPathLength: 3,
      });

      const state = await manager.analyzePlayerState();

      expect(state.hasUnfinishedGame).toBe(false);
      expect(state.hasUnfinishedDailyChallenge).toBe(true);
    });

    it("should clear expired daily challenges", async () => {
      const storageAdapter = require("../StorageAdapter");

      storageAdapter.loadCurrentGame
        .mockResolvedValueOnce(null) // Regular game
        .mockResolvedValueOnce({
          gameStatus: "playing",
          isDailyChallenge: true,
          currentDailyChallengeId: "yesterday-123",
        }); // Expired daily challenge

      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue({
        id: "today-456",
        date: "2024-01-02",
        startWord: "start",
        targetWord: "target",
        optimalPathLength: 4,
      });

      const state = await manager.analyzePlayerState();

      expect(state.hasUnfinishedDailyChallenge).toBe(false);
      expect(storageAdapter.clearCurrentGame).toHaveBeenCalledWith(true);
    });
  });

  describe("determineGameFlow", () => {
    beforeEach(() => {
      // Mock analyzePlayerState to return a default state
      jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
        isFirstTimeUser: false,
        hasGameHistory: true,
        hasPendingPlayerChallenge: false,
        hasPendingDailyChallenge: false,
        hasUnfinishedGame: false,
        hasUnfinishedDailyChallenge: false,
        remainingFreeGames: 3,
        shouldShowTutorial: false,
        shouldShowNews: false,
      });
    });

    describe("Player Challenge Entry", () => {
      it("should prioritize player challenge over everything when not already played", async () => {
        // Arrange - Mock empty game history
        const storageAdapter = require("../StorageAdapter");
        storageAdapter.loadGameHistory.mockResolvedValue([]);

        const decision = await manager.determineGameFlow("playerChallenge", {
          startWord: "start",
          targetWord: "target",
          isValid: true,
        });

        expect(decision).toEqual({
          action: "playerChallenge",
          startWord: "start",
          targetWord: "target",
          message: "Starting new player challenge",
        });
      });

      it("should not start player challenge without valid words", async () => {
        const decision = await manager.determineGameFlow("playerChallenge", {
          startWord: "",
          targetWord: "target",
        });

        expect(decision.action).not.toBe("playerChallenge");
      });

      it("should show message for already played challenge", async () => {
        // Arrange - Mock loadGameHistory to return a challenge with matching words
        const storageAdapter = require("../StorageAdapter");
        storageAdapter.loadGameHistory.mockResolvedValue([
          {
            id: "test-game-1",
            startWord: "start",
            targetWord: "target",
            isDailyChallenge: false,
            status: "won",
            timestamp: Date.now(),
          },
        ]);

        // Act
        const decision = await manager.determineGameFlow("playerChallenge", {
          startWord: "start",
          targetWord: "target",
          isValid: true,
        });

        // Assert
        expect(decision).toEqual({
          action: "showMessage",
          message: `You've already played the challenge from "start" to "target". Check your game history to see your previous attempt!`,
        });
      });

      it("should start challenge for new word combination", async () => {
        // Arrange - Mock loadGameHistory to return empty history
        const storageAdapter = require("../StorageAdapter");
        storageAdapter.loadGameHistory.mockResolvedValue([]);

        // Act
        const decision = await manager.determineGameFlow("playerChallenge", {
          startWord: "hello",
          targetWord: "world",
          isValid: true,
        });

        // Assert
        expect(decision).toEqual({
          action: "playerChallenge",
          startWord: "hello",
          targetWord: "world",
          message: "Starting new player challenge",
        });
      });
    });

    describe("Daily Challenge Entry", () => {
      it("should start daily challenge when tutorial is complete", async () => {
        const decision = await manager.determineGameFlow("dailyChallenge", {
          challengeId: "daily-123",
          startWord: "start",
          targetWord: "target",
        });

        expect(decision).toEqual({
          action: "dailyChallenge",
          challengeId: "daily-123",
          startWord: "start",
          targetWord: "target",
        });
      });

      it("should show tutorial first for new users", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: true,
          hasGameHistory: false,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 3,
          shouldShowTutorial: true,
          shouldShowNews: false,
        });

        const decision = await manager.determineGameFlow("dailyChallenge", {
          challengeId: "daily-123",
        });

        expect(decision).toEqual({ action: "tutorial" });
      });

      it("should start daily challenge without forced news", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: false,
          hasGameHistory: false,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 3,
          shouldShowTutorial: false,
          shouldShowNews: false, // News is no longer forced
        });

        const decision = await manager.determineGameFlow("dailyChallenge", {
          challengeId: "daily-123",
          startWord: "start",
          targetWord: "target",
        });

        expect(decision).toEqual({
          action: "dailyChallenge",
          challengeId: "daily-123",
          startWord: "start",
          targetWord: "target",
        });
      });
    });

    describe("Landing Page Entry", () => {
      it("should show tutorial for new users", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: true,
          hasGameHistory: false,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 3,
          shouldShowTutorial: true,
          shouldShowNews: false,
        });

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({ action: "tutorial" });
      });

      it("should not show forced news (now handled via menu)", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: false,
          hasGameHistory: false,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 3,
          shouldShowTutorial: false,
          shouldShowNews: false, // News is no longer forced
        });

        const decision = await manager.determineGameFlow("landing");

        // Should go to daily challenge or random game, not news
        expect(decision.action).not.toBe("news");
      });

      it("should restore unfinished regular game", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: false,
          hasGameHistory: true,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: true,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 3,
          shouldShowTutorial: false,
          shouldShowNews: false,
        });

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({ action: "restoreGame" });
      });

      it("should restore unfinished daily challenge", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: false,
          hasGameHistory: true,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: true,
          remainingFreeGames: 3,
          shouldShowTutorial: false,
          shouldShowNews: false,
        });

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({ action: "restoreGame" });
      });

      it("should start daily challenge when available and not completed", async () => {
        (mockedUseGameStore as any).getState.mockReturnValue(
          createMockGameState({
            currentDailyChallenge: {
              id: "daily-123",
              date: "2024-01-01",
              startWord: "start",
              targetWord: "target",
              optimalPathLength: 3,
            },
            hasPlayedTodaysChallenge: false,
          }),
        );

        // Mock persistent storage showing challenge is NOT completed
        mockedDailyChallengesService.hasCompletedTodaysChallenge.mockResolvedValue(
          false,
        );

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({
          action: "dailyChallenge",
          challengeId: "daily-123",
          startWord: "start",
          targetWord: "target",
        });
      });

      it("should skip daily challenge when completed in persistent storage", async () => {
        (mockedUseGameStore as any).getState.mockReturnValue(
          createMockGameState({
            currentDailyChallenge: {
              id: "daily-123",
              date: "2024-01-01",
              startWord: "start",
              targetWord: "target",
              optimalPathLength: 3,
            },
            hasPlayedTodaysChallenge: false, // Store state says not completed
          }),
        );

        // Mock persistent storage showing challenge IS completed (authoritative)
        mockedDailyChallengesService.hasCompletedTodaysChallenge.mockResolvedValue(
          true,
        );

        const decision = await manager.determineGameFlow("landing");

        // Should skip daily challenge and go to random game
        expect(decision).toEqual({ action: "randomGame" });
      });

      it("should start random game for premium user", async () => {
        mockedDailyChallengesService.isPremiumUser.mockResolvedValue(true);

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({ action: "randomGame" });
      });

      it("should start random game when free games available", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: false,
          hasGameHistory: true,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 2,
          shouldShowTutorial: false,
          shouldShowNews: false,
        });

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({ action: "randomGame" });
      });

      it("should show upgrade prompt when no free games left", async () => {
        jest.spyOn(manager, "analyzePlayerState").mockResolvedValue({
          isFirstTimeUser: false,
          hasGameHistory: true,
          hasPendingPlayerChallenge: false,
          hasPendingDailyChallenge: false,
          hasUnfinishedGame: false,
          hasUnfinishedDailyChallenge: false,
          remainingFreeGames: 0,
          shouldShowTutorial: false,
          shouldShowNews: false,
        });

        mockedDailyChallengesService.isPremiumUser.mockResolvedValue(false);

        const decision = await manager.determineGameFlow("landing");

        expect(decision).toEqual({
          action: "upgradePrompt",
          showUpgradePrompt: true,
          message:
            "You've reached your daily limit. Upgrade to a Galaxy Brain account for unlimited play!",
        });
      });
    });

    it("should default to random game for unknown entry points", async () => {
      const decision = await manager.determineGameFlow("unknown" as any);

      expect(decision).toEqual({ action: "randomGame" });
    });
  });

  describe("parseEntryUrl", () => {
    beforeEach(() => {
      const sharingService = require("../SharingService");
      sharingService.parseEnhancedGameLink.mockReturnValue(null);
    });

    it("should parse daily challenge URL", () => {
      const sharingService = require("../SharingService");
      sharingService.parseEnhancedGameLink.mockReturnValue({
        type: "dailychallenge",
        startWord: "start",
        targetWord: "target",
        challengeId: "daily-123",
        hash: "abc123",
      });

      const result = manager.parseEntryUrl(
        "https://example.com/challenge?type=dailychallenge&id=daily-123",
      );

      expect(result).toEqual({
        type: "dailychallenge",
        startWord: "start",
        targetWord: "target",
        challengeId: "daily-123",
        theme: undefined,
        isValid: true,
      });
    });

    it("should parse player challenge URL", () => {
      const sharingService = require("../SharingService");
      sharingService.parseEnhancedGameLink.mockReturnValue({
        type: "challenge",
        startWord: "start",
        targetWord: "target",
        hash: "abc123",
      });

      const result = manager.parseEntryUrl(
        "https://example.com/challenge?type=challenge&start=start&target=target",
      );

      expect(result).toEqual({
        type: "challenge",
        startWord: "start",
        targetWord: "target",
        challengeId: undefined,
        theme: undefined,
        isValid: true,
      });
    });

    it("should return null for invalid URLs", () => {
      const result = manager.parseEntryUrl("https://example.com");

      expect(result).toBeNull();
    });
  });

  describe("executeFlowDecision", () => {
    let mockGameStore: any;

    beforeEach(() => {
      mockGameStore = {
        startChallengeGame: jest.fn(),
        startDailyChallengeGame: jest.fn(),
        startGame: jest.fn(),
        showUpgradePrompt: jest.fn(),
      };
      (mockedUseGameStore as any).getState.mockReturnValue(mockGameStore);
    });

    it("should execute tutorial decision", async () => {
      await manager.executeFlowDecision({ action: "tutorial" });
      // Tutorial execution is handled by TutorialContext, so no direct calls expected
    });

    // Note: "news" action removed - news is now handled via menu notifications

    it("should execute player challenge decision", async () => {
      await manager.executeFlowDecision({
        action: "playerChallenge",
        startWord: "start",
        targetWord: "target",
      });

      expect(mockGameStore.startChallengeGame).toHaveBeenCalledWith(
        "start",
        "target",
      );
    });

    it("should not execute player challenge without words", async () => {
      await manager.executeFlowDecision({
        action: "playerChallenge",
      });

      expect(mockGameStore.startChallengeGame).not.toHaveBeenCalled();
    });

    it("should execute daily challenge decision", async () => {
      await manager.executeFlowDecision({
        action: "dailyChallenge",
        challengeId: "daily-123",
      });

      expect(mockGameStore.startDailyChallengeGame).toHaveBeenCalled();
    });

    it("should execute random game decision", async () => {
      await manager.executeFlowDecision({ action: "randomGame" });

      expect(mockGameStore.startGame).toHaveBeenCalled();
    });

    it("should execute restore game decision", async () => {
      await manager.executeFlowDecision({ action: "restoreGame" });
      // Game restoration is handled automatically by loadInitialData
    });

    it("should execute upgrade prompt decision", async () => {
      await manager.executeFlowDecision({
        action: "upgradePrompt",
        message: "Custom upgrade message",
      });

      expect(mockGameStore.showUpgradePrompt).toHaveBeenCalledWith(
        "Custom upgrade message",
        "freeGamesLimited",
      );
    });

    it("should execute upgrade prompt with default message", async () => {
      await manager.executeFlowDecision({ action: "upgradePrompt" });

      expect(mockGameStore.showUpgradePrompt).toHaveBeenCalledWith(
        "You've reached your daily limit. Upgrade to a Galaxy Brain account for unlimited play!",
        "freeGamesLimited",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully in analyzePlayerState", async () => {
      const { unifiedDataStore } = require("../UnifiedDataStore");
      const storageAdapter = require("../StorageAdapter");

      unifiedDataStore.isTutorialComplete.mockRejectedValue(
        new Error("Storage error"),
      );
      storageAdapter.loadGameHistory.mockRejectedValue(
        new Error("Storage error"),
      );
      storageAdapter.loadCurrentGame.mockRejectedValue(
        new Error("Storage error"),
      );

      const state = await manager.analyzePlayerState();

      // Should return safe defaults when storage fails
      expect(state.isFirstTimeUser).toBe(true); // Safe default when tutorial check fails
      expect(state.hasGameHistory).toBe(false); // Safe default when history check fails
      expect(state.hasUnfinishedGame).toBe(false); // Safe default when game check fails
      expect(state.hasUnfinishedDailyChallenge).toBe(false); // Safe default when challenge check fails
    });

    it("should handle missing daily challenge gracefully", async () => {
      const storageAdapter = require("../StorageAdapter");

      storageAdapter.loadCurrentGame
        .mockResolvedValueOnce(null) // Regular game
        .mockResolvedValueOnce({
          gameStatus: "playing",
          isDailyChallenge: true,
          currentDailyChallengeId: "missing-123",
        }); // Daily challenge with missing today's challenge

      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(null);

      const state = await manager.analyzePlayerState();

      expect(state.hasUnfinishedDailyChallenge).toBe(false);
      expect(storageAdapter.clearCurrentGame).toHaveBeenCalledWith(true);
    });
  });
});
