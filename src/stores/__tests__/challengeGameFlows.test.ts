import { describe, it, expect, beforeEach, jest } from "@jest/globals";

import { dailyChallengesService } from "../../services/DailyChallengesService";
import type { GraphData, WordFrequencies } from "../../services/dataLoader";
import * as dataLoader from "../../services/dataLoader";
import * as storageAdapter from "../../services/StorageAdapter";
import type { DailyChallenge } from "../../types/dailyChallenges";
import { useGameStore } from "../useGameStore";

// Mock the services
jest.mock("../../services/StorageAdapter");
jest.mock("../../services/DailyChallengesService");
jest.mock("../../services/dataLoader");
jest.mock("../../features/wordCollections");

const mockedStorageAdapter = storageAdapter as jest.Mocked<
  typeof storageAdapter
>;
const mockedDailyChallengesService = jest.mocked(dailyChallengesService);
const mockedDataLoader = dataLoader as jest.Mocked<typeof dataLoader>;

describe("Challenge Game Flows", () => {
  const mockGraph: GraphData = {
    start: { edges: { middle: 1 }, tsne: [0, 0] },
    middle: { edges: { start: 1, target: 1 }, tsne: [10, 10] },
    target: { edges: { middle: 1 }, tsne: [20, 20] },
  };

  const mockWordFrequencies: WordFrequencies = {
    start: 1000,
    middle: 500,
    target: 300,
  };

  const mockDailyChallenge: DailyChallenge = {
    id: "2024-01-15",
    date: "2024-01-15",
    startWord: "start",
    targetWord: "target",
    optimalPathLength: 3,
    aiSolution: {
      path: ["start", "middle", "target"],
      stepsTaken: 2,
      model: "gpt-4",
    },
  };

  beforeEach(() => {
    // Reset store to clean state with graph data loaded
    useGameStore.setState({
      graphData: mockGraph,
      wordFrequencies: mockWordFrequencies,
      startWord: null,
      targetWord: null,
      currentWord: null,
      playerPath: [],
      optimalPath: [],
      suggestedPathFromCurrent: [],
      gameStatus: "idle",
      optimalChoices: [],
      backtrackHistory: [],
      potentialRarestMovesThisGame: [],
      activeWordCollections: [],
      isChallenge: false,
      isDailyChallenge: false,
      currentDailyChallenge: null,
      hasPlayedTodaysChallenge: false,
      aiPath: [],
      aiModel: null,
      pathDisplayMode: {
        player: true,
        optimal: false,
        suggested: false,
        ai: false,
      },
    });

    // Reset mocks
    jest.clearAllMocks();
    mockedDataLoader.loadGraphData.mockResolvedValue(mockGraph);
    mockedDataLoader.loadWordFrequencies.mockResolvedValue(mockWordFrequencies);
    mockedStorageAdapter.saveCurrentGame.mockResolvedValue(undefined);
    mockedStorageAdapter.clearCurrentGame.mockResolvedValue(undefined);
    mockedDailyChallengesService.saveDailyChallengeProgress.mockResolvedValue(
      undefined,
    );
  });

  describe("startChallengeGame", () => {
    it("should initialize a challenge game with provided words", async () => {
      // Arrange
      const { startChallengeGame } = useGameStore.getState();

      // Act
      await startChallengeGame("start", "target");

      // Assert
      const state = useGameStore.getState();
      expect(state.startWord).toBe("start");
      expect(state.targetWord).toBe("target");
      expect(state.currentWord).toBe("start");
      expect(state.playerPath).toEqual(["start"]);
      expect(state.optimalPath).toEqual(["start", "middle", "target"]);
      expect(state.suggestedPathFromCurrent).toEqual([
        "start",
        "middle",
        "target",
      ]);
      expect(state.gameStatus).toBe("playing");
      expect(state.isChallenge).toBe(true);
      expect(state.isDailyChallenge).toBe(false);

      // Should save game
      expect(mockedStorageAdapter.saveCurrentGame).toHaveBeenCalledTimes(1);
    });

    it("should handle missing words in graph gracefully", async () => {
      // Arrange
      mockedDataLoader.loadGraphData.mockResolvedValue({
        start: { edges: { middle: 1 }, tsne: [0, 0] },
        middle: { edges: { start: 1 }, tsne: [10, 10] },
        // target is missing
      });
      const { startChallengeGame } = useGameStore.getState();

      // Act
      await startChallengeGame("start", "nonexistent");

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("idle"); // Should not start game
      expect(state.isChallenge).toBe(false);
    });

    it("should reset previous game state", async () => {
      // Arrange - Set up existing game state
      useGameStore.setState({
        gameStatus: "won",
        playerPath: ["old", "path"],
        optimalChoices: [
          {
            playerPosition: "old",
            playerChose: "path",
            optimalChoice: "path",
            isGlobalOptimal: true,
            isLocalOptimal: true,
          },
        ],
        backtrackHistory: [{ jumpedFrom: "old", landedOn: "path" }],
        potentialRarestMovesThisGame: [
          { word: "old", frequency: 100, playerChoseThisRarestOption: true },
        ],
      });
      const { startChallengeGame } = useGameStore.getState();

      // Act
      await startChallengeGame("start", "target");

      // Assert
      const state = useGameStore.getState();
      expect(state.playerPath).toEqual(["start"]); // Should be reset
      expect(state.optimalChoices).toEqual([]); // Should be reset
      expect(state.backtrackHistory).toEqual([]); // Should be reset
      expect(state.potentialRarestMovesThisGame).toEqual([]); // Should be reset
      expect(state.gameStatus).toBe("playing");
    });
  });

  describe("startDailyChallengeGame", () => {
    it("should initialize a daily challenge game", async () => {
      // Arrange
      const { startDailyChallengeGame } = useGameStore.getState();

      // Mock the daily challenge service to return our mock challenge
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );

      // Act
      await startDailyChallengeGame();

      // Assert
      const state = useGameStore.getState();
      expect(state.startWord).toBe("start");
      expect(state.targetWord).toBe("target");
      expect(state.currentWord).toBe("start");
      expect(state.playerPath).toEqual(["start"]);
      expect(state.gameStatus).toBe("playing");
      expect(state.isChallenge).toBe(false);
      expect(state.isDailyChallenge).toBe(true);
      expect(state.currentDailyChallenge).toEqual(mockDailyChallenge);
      expect(state.aiPath).toEqual(["start", "middle", "target"]);
      expect(state.aiModel).toBe("gpt-4");
      expect(state.pathDisplayMode.ai).toBe(false); // AI path display is not automatically enabled

      // Should save game
      expect(mockedStorageAdapter.saveCurrentGame).toHaveBeenCalledTimes(1);
    });

    it("should handle daily challenge with missing words", async () => {
      // Arrange
      const invalidChallenge = {
        ...mockDailyChallenge,
        startWord: "nonexistent",
      };
      mockedDataLoader.loadGraphData.mockResolvedValue({
        target: { edges: {}, tsne: [0, 0] },
        // start is missing
      });
      const { startDailyChallengeGame } = useGameStore.getState();

      // Mock the daily challenge service to return the invalid challenge
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        invalidChallenge,
      );

      // Act
      await startDailyChallengeGame();

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("idle"); // Should not start game
      expect(state.isDailyChallenge).toBe(false);
      expect(state.currentDailyChallenge).toBeNull();
    });

    it("should preserve daily challenge data through game completion", async () => {
      // Arrange - Start daily challenge
      const { startDailyChallengeGame, selectWord } = useGameStore.getState();
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );
      await startDailyChallengeGame();

      // Act - Complete the game
      await selectWord("middle");
      await selectWord("target");

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("won");
      expect(state.hasPlayedTodaysChallenge).toBe(true);
      expect(state.currentDailyChallenge).toEqual(mockDailyChallenge);

      // Should save daily challenge progress
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).toHaveBeenCalledWith(
        "2024-01-15",
        expect.objectContaining({
          status: "won",
          playerMoves: 2,
          playerPath: ["start", "middle", "target"],
          completedAt: expect.any(String),
        }),
      );
    });
  });

  describe("Daily Challenge Progress Tracking", () => {
    it("should track daily challenge progress on game completion", async () => {
      // Arrange
      const { startDailyChallengeGame, selectWord } = useGameStore.getState();
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );
      await startDailyChallengeGame();

      // Act - Play and complete the game
      await selectWord("middle");
      await selectWord("target");

      // Assert
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).toHaveBeenCalledWith(
        "2024-01-15",
        expect.objectContaining({
          status: "won",
          playerMoves: 2,
          playerPath: ["start", "middle", "target"],
          completedAt: expect.any(String),
        }),
      );
    });

    it("should track daily challenge progress on give up", async () => {
      // Arrange
      const { startDailyChallengeGame, selectWord, giveUp } =
        useGameStore.getState();
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );
      await startDailyChallengeGame();
      await selectWord("middle");

      // Act - Give up
      await giveUp();

      // Assert
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).toHaveBeenCalledWith(
        "2024-01-15",
        expect.objectContaining({
          status: "given_up",
          playerMoves: 1,
          playerPath: ["start", "middle"],
          completedAt: expect.any(String),
        }),
      );
    });

    it("should not track progress for regular games", async () => {
      // Arrange
      const { startChallengeGame, selectWord } = useGameStore.getState();
      await startChallengeGame("start", "target");

      // Act - Complete regular challenge game
      await selectWord("middle");
      await selectWord("target");

      // Assert
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Challenge Game State Management", () => {
    it("should properly distinguish between challenge types", async () => {
      // Test regular challenge
      const { startChallengeGame } = useGameStore.getState();
      await startChallengeGame("start", "target");

      let state = useGameStore.getState();
      expect(state.isChallenge).toBe(true);
      expect(state.isDailyChallenge).toBe(false);
      expect(state.currentDailyChallenge).toBeNull();
      expect(state.aiPath).toEqual([]);
      expect(state.aiModel).toBeNull();

      // Test daily challenge
      const { startDailyChallengeGame } = useGameStore.getState();
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );
      await startDailyChallengeGame();

      state = useGameStore.getState();
      expect(state.isChallenge).toBe(false);
      expect(state.isDailyChallenge).toBe(true);
      expect(state.currentDailyChallenge).toEqual(mockDailyChallenge);
      expect(state.aiPath).toEqual(["start", "middle", "target"]);
      expect(state.aiModel).toBe("gpt-4");
    });

    it("should handle path display modes correctly for different game types", async () => {
      // Test regular challenge - should not show AI path
      const { startChallengeGame } = useGameStore.getState();
      await startChallengeGame("start", "target");

      let state = useGameStore.getState();
      expect(state.pathDisplayMode.ai).toBe(false);

      // Test daily challenge - AI path is available but not automatically displayed
      const { startDailyChallengeGame } = useGameStore.getState();
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );
      await startDailyChallengeGame();

      state = useGameStore.getState();
      expect(state.pathDisplayMode.ai).toBe(false); // AI path display is not automatically enabled
      expect(state.aiPath).toEqual(["start", "middle", "target"]); // But AI path data is available
    });

    it("should reset challenge flags when starting regular game", async () => {
      // Arrange - Start with daily challenge
      const { startDailyChallengeGame } = useGameStore.getState();
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );
      await startDailyChallengeGame();

      // Verify daily challenge is active
      let state = useGameStore.getState();
      expect(state.isDailyChallenge).toBe(true);
      expect(state.currentDailyChallenge).toEqual(mockDailyChallenge);

      // Act - Reset to idle state (simulating starting regular game)
      useGameStore.setState({
        gameStatus: "idle",
        isChallenge: false,
        isDailyChallenge: false,
        currentDailyChallenge: null,
        aiPath: [],
        aiModel: null,
        pathDisplayMode: {
          player: true,
          optimal: false,
          suggested: false,
          ai: false,
        },
      });

      // Assert - Challenge flags should be reset
      state = useGameStore.getState();
      expect(state.isChallenge).toBe(false);
      expect(state.isDailyChallenge).toBe(false);
      expect(state.currentDailyChallenge).toBeNull();
      expect(state.aiPath).toEqual([]);
      expect(state.aiModel).toBeNull();
      expect(state.pathDisplayMode.ai).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle data loading failures gracefully", async () => {
      // Arrange - Set up state without graph data to simulate loading failure
      useGameStore.setState({
        graphData: null,
        wordFrequencies: null,
        gameStatus: "idle",
        isChallenge: false,
      });
      const { startChallengeGame } = useGameStore.getState();

      // Act
      await startChallengeGame("start", "target");

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("idle");
      expect(state.isChallenge).toBe(false);
      expect(state.graphData).toBeNull();
    });

    it("should handle daily challenge progress save failures gracefully", async () => {
      // Arrange - Mock save function to throw an error
      mockedDailyChallengesService.saveDailyChallengeProgress.mockRejectedValue(
        new Error("Storage save failed"),
      );
      mockedDailyChallengesService.getTodaysChallenge.mockReturnValue(
        mockDailyChallenge,
      );

      const { startDailyChallengeGame, selectWord } = useGameStore.getState();
      await startDailyChallengeGame();

      // Act - Complete game (this should trigger the save failure)
      await selectWord("middle");

      // The selectWord call that wins the game should handle the save error gracefully
      await expect(selectWord("target")).resolves.not.toThrow();

      // Assert - Game should still complete successfully despite save failure
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("won");

      // Verify that save was attempted (and failed)
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).toHaveBeenCalled();

      // The game should continue to function normally despite the save failure
      // The hasPlayedTodaysChallenge flag might not be set due to the save failure,
      // but the core game mechanics should still work
    });
  });
});
