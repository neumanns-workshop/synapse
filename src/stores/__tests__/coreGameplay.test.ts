import { describe, it, expect, beforeEach, jest } from "@jest/globals";

import { dailyChallengesService } from "../../services/DailyChallengesService";
import type { GraphData, WordFrequencies } from "../../services/dataLoader";
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

describe("Core Gameplay Mechanics", () => {
  // Test graph with clear optimal paths
  const mockGraph: GraphData = {
    start: { edges: { middle1: 1, middle2: 1 }, tsne: [0, 0] },
    middle1: { edges: { start: 1, target: 1, middle2: 1 }, tsne: [10, 10] },
    middle2: { edges: { start: 1, middle1: 1, dead: 1 }, tsne: [10, -10] },
    target: { edges: { middle1: 1 }, tsne: [20, 10] },
    dead: { edges: { middle2: 1 }, tsne: [20, -10] }, // Dead end
  };

  const mockWordFrequencies: WordFrequencies = {
    start: 1000,
    middle1: 500,
    middle2: 800,
    target: 300,
    dead: 100, // Rarest word
  };

  const getInitialGameState = () => ({
    graphData: mockGraph,
    wordFrequencies: mockWordFrequencies,
    startWord: "start",
    targetWord: "target",
    currentWord: "start",
    playerPath: ["start"],
    optimalPath: ["start", "middle1", "target"],
    suggestedPathFromCurrent: ["start", "middle1", "target"],
    gameStatus: "playing" as const,
    optimalChoices: [],
    backtrackHistory: [],
    potentialRarestMovesThisGame: [],
    activeWordCollections: [],
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

  beforeEach(() => {
    // Reset store to initial state
    useGameStore.setState(getInitialGameState());

    // Reset mocks
    jest.clearAllMocks();
    mockedStorageAdapter.saveCurrentGame.mockResolvedValue(undefined);
    mockedStorageAdapter.clearCurrentGame.mockResolvedValue(undefined);
    mockedStorageAdapter.recordEndedGame.mockResolvedValue(undefined);
  });

  describe("selectWord", () => {
    it("should handle a valid move to an adjacent word", async () => {
      // Arrange
      const { selectWord } = useGameStore.getState();

      // Act
      await selectWord("middle1");

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("middle1");
      expect(state.playerPath).toEqual(["start", "middle1"]);
      expect(state.gameStatus).toBe("playing");
      expect(state.suggestedPathFromCurrent).toEqual(["middle1", "target"]);

      // Should save game state
      expect(mockedStorageAdapter.saveCurrentGame).toHaveBeenCalledTimes(1);

      // Should track optimal choice
      expect(state.optimalChoices).toHaveLength(1);
      expect(state.optimalChoices[0].playerPosition).toBe("start");
      expect(state.optimalChoices[0].playerChose).toBe("middle1");
    });

    it("should reject invalid moves to non-adjacent words", async () => {
      // Arrange
      const { selectWord } = useGameStore.getState();
      const initialState = useGameStore.getState();

      // Act
      await selectWord("target"); // Not adjacent to "start"

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("start"); // Should not change
      expect(state.playerPath).toEqual(["start"]); // Should not change
      expect(state.gameStatus).toBe("playing");

      // Should not save game state
      expect(mockedStorageAdapter.saveCurrentGame).not.toHaveBeenCalled();
    });

    it("should reject moves when game is not in playing state", async () => {
      // Arrange
      useGameStore.setState({ gameStatus: "won" });
      const { selectWord } = useGameStore.getState();

      // Act
      await selectWord("middle1");

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("start"); // Should not change
      expect(state.playerPath).toEqual(["start"]); // Should not change

      // Should not save game state
      expect(mockedStorageAdapter.saveCurrentGame).not.toHaveBeenCalled();
    });

    it("should handle winning the game", async () => {
      // Arrange - Set up a state where player is one move from winning
      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle1",
        playerPath: ["start", "middle1"],
        optimalChoices: [
          {
            playerPosition: "start",
            playerChose: "middle1",
            optimalChoice: "middle1",
            isGlobalOptimal: true,
            isLocalOptimal: true,
          },
        ],
      });
      const { selectWord } = useGameStore.getState();

      // Act
      await selectWord("target");

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("target");
      expect(state.playerPath).toEqual(["start", "middle1", "target"]);
      expect(state.gameStatus).toBe("won");
      expect(state.gameReport).toBeTruthy();
      expect(state.pathDisplayMode.optimal).toBe(false); // Should not auto-show optimal path on win (modal system)
      
      // Should show game report modal
      expect(state.gameReportModalVisible).toBe(true);
      expect(state.gameReportModalReport).toBeTruthy();
      expect(state.gameReportModalReport?.status).toBe("won");

      // Should clear saved game and record ended game
      expect(mockedStorageAdapter.clearCurrentGame).toHaveBeenCalledTimes(1);
      expect(mockedStorageAdapter.recordEndedGame).toHaveBeenCalledTimes(1);
    });

    it("should track rare word choices for achievements", async () => {
      // Arrange - Move to middle2 where "dead" is the rarest option
      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle2",
        playerPath: ["start", "middle2"],
      });
      const { selectWord } = useGameStore.getState();

      // Act - Choose the rare word "dead"
      await selectWord("dead");

      // Assert
      const state = useGameStore.getState();
      expect(state.potentialRarestMovesThisGame).toHaveLength(1);
      expect(state.potentialRarestMovesThisGame[0]).toEqual({
        word: "dead",
        frequency: 100,
        playerChoseThisRarestOption: true,
      });
    });

    it("should handle daily challenge completion on win", async () => {
      // Arrange - Set up daily challenge game
      const mockDailyChallenge: DailyChallenge = {
        id: "test-challenge",
        date: "2024-01-15",
        startWord: "start",
        targetWord: "target",
        optimalPathLength: 3,
        aiSolution: {
          path: ["start", "middle1", "target"],
          stepsTaken: 2,
          model: "test-model",
        },
      };

      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle1",
        playerPath: ["start", "middle1"],
        isDailyChallenge: true,
        currentDailyChallenge: mockDailyChallenge,
      });

      mockedDailyChallengesService.saveDailyChallengeProgress.mockResolvedValue(
        undefined,
      );
      const { selectWord } = useGameStore.getState();

      // Act
      await selectWord("target");

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("won");
      expect(state.hasPlayedTodaysChallenge).toBe(true);

      // Should save daily challenge progress
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).toHaveBeenCalledWith(
        "test-challenge",
        expect.objectContaining({
          status: "won",
          playerMoves: 2,
          playerPath: ["start", "middle1", "target"],
          completedAt: expect.any(String),
        }),
      );
    });
  });

  describe("giveUp", () => {
    it("should end the game and generate a report", async () => {
      // Arrange
      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle1",
        playerPath: ["start", "middle1"],
        optimalChoices: [
          {
            playerPosition: "start",
            playerChose: "middle1",
            optimalChoice: "middle1",
            isGlobalOptimal: true,
            isLocalOptimal: true,
          },
        ],
      });
      const { giveUp } = useGameStore.getState();

      // Act
      await giveUp();

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("given_up");
      expect(state.gameReport).toBeTruthy();
      expect(state.gameReport?.status).toBe("given_up");
      expect(state.pathDisplayMode.suggested).toBe(false); // Should not auto-show suggested path on give up (modal system)
      
      // Should show game report modal
      expect(state.gameReportModalVisible).toBe(true);
      expect(state.gameReportModalReport).toBeTruthy();
      expect(state.gameReportModalReport?.status).toBe("given_up");

      // Should clear saved game and record ended game
      expect(mockedStorageAdapter.clearCurrentGame).toHaveBeenCalledTimes(1);
      expect(mockedStorageAdapter.recordEndedGame).toHaveBeenCalledTimes(1);
    });

    it("should handle daily challenge give up", async () => {
      // Arrange
      const mockDailyChallenge: DailyChallenge = {
        id: "test-challenge",
        date: "2024-01-15",
        startWord: "start",
        targetWord: "target",
        optimalPathLength: 3,
        aiSolution: {
          path: ["start", "middle1", "target"],
          stepsTaken: 2,
          model: "test-model",
        },
      };

      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle1",
        playerPath: ["start", "middle1"],
        isDailyChallenge: true,
        currentDailyChallenge: mockDailyChallenge,
      });

      mockedDailyChallengesService.saveDailyChallengeProgress.mockResolvedValue(
        undefined,
      );
      const { giveUp } = useGameStore.getState();

      // Act
      await giveUp();

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("given_up");
      expect(state.hasPlayedTodaysChallenge).toBe(true);

      // Should save daily challenge progress
      expect(
        mockedDailyChallengesService.saveDailyChallengeProgress,
      ).toHaveBeenCalledWith(
        "test-challenge",
        expect.objectContaining({
          status: "given_up",
          playerMoves: 1,
          playerPath: ["start", "middle1"],
          completedAt: expect.any(String),
        }),
      );
    });

    it("should do nothing if no graph data or target word", async () => {
      // Arrange
      useGameStore.setState({
        ...getInitialGameState(),
        graphData: null,
      });
      const { giveUp } = useGameStore.getState();

      // Act
      await giveUp();

      // Assert
      const state = useGameStore.getState();
      expect(state.gameStatus).toBe("playing"); // Should not change
      expect(mockedStorageAdapter.clearCurrentGame).not.toHaveBeenCalled();
    });
  });

  describe("backtrackToWord", () => {
    it("should allow backtracking to an optimal word in the path", async () => {
      // Arrange - Set up a game state with some moves made
      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle2",
        playerPath: ["start", "middle1", "middle2"],
        optimalChoices: [
          {
            playerPosition: "start",
            playerChose: "middle1",
            optimalChoice: "middle1",
            isGlobalOptimal: true,
            isLocalOptimal: true,
          },
          {
            playerPosition: "middle1",
            playerChose: "middle2",
            optimalChoice: "target",
            isGlobalOptimal: false,
            isLocalOptimal: false,
          },
        ],
      });
      const { backtrackToWord } = useGameStore.getState();

      // Act - Backtrack to middle1 (index 1 in path)
      await backtrackToWord("middle1", 1);

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("middle1");
      expect(state.playerPath).toEqual(["start", "middle1"]);
      expect(state.optimalChoices).toHaveLength(1); // Should truncate optimal choices
      expect(state.backtrackHistory).toHaveLength(1);
      expect(state.backtrackHistory[0]).toEqual({
        jumpedFrom: "middle2",
        landedOn: "middle1",
      });

      // Should save the updated game state
      expect(mockedStorageAdapter.saveCurrentGame).toHaveBeenCalledTimes(1);
    });

    it("should prevent backtracking to the same word twice", async () => {
      // Arrange - Set up a state where player has already backtracked to middle1
      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle2",
        playerPath: ["start", "middle1", "middle2"],
        backtrackHistory: [
          {
            jumpedFrom: "dead",
            landedOn: "middle1",
          },
        ],
      });
      const { backtrackToWord } = useGameStore.getState();

      // Act - Try to backtrack to middle1 again
      await backtrackToWord("middle1", 1);

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("middle2"); // Should not change
      expect(state.playerPath).toEqual(["start", "middle1", "middle2"]); // Should not change
      expect(state.backtrackHistory).toHaveLength(1); // Should not add new entry

      // Should not save game state
      expect(mockedStorageAdapter.saveCurrentGame).not.toHaveBeenCalled();
    });

    it("should do nothing if game is not in playing state", async () => {
      // Arrange
      useGameStore.setState({
        ...getInitialGameState(),
        gameStatus: "won",
        currentWord: "target",
        playerPath: ["start", "middle1", "target"],
      });
      const { backtrackToWord } = useGameStore.getState();

      // Act
      await backtrackToWord("middle1", 1);

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("target"); // Should not change
      expect(state.playerPath).toEqual(["start", "middle1", "target"]); // Should not change

      // Should not save game state
      expect(mockedStorageAdapter.saveCurrentGame).not.toHaveBeenCalled();
    });

    it("should prevent backtracking to invalid indices", async () => {
      // Arrange
      useGameStore.setState({
        ...getInitialGameState(),
        currentWord: "middle1",
        playerPath: ["start", "middle1"],
      });
      const { backtrackToWord } = useGameStore.getState();

      // Act - Try to backtrack to index that doesn't exist
      await backtrackToWord("nonexistent", 5);

      // Assert
      const state = useGameStore.getState();
      expect(state.currentWord).toBe("middle1"); // Should not change
      expect(state.playerPath).toEqual(["start", "middle1"]); // Should not change

      // Should not save game state
      expect(mockedStorageAdapter.saveCurrentGame).not.toHaveBeenCalled();
    });
  });

  describe("Modal and UI State Management", () => {
    it("should manage path display mode", () => {
      // Arrange
      const { setPathDisplayMode } = useGameStore.getState();

      // Act
      setPathDisplayMode({ optimal: true, suggested: true });

      // Assert
      const state = useGameStore.getState();
      expect(state.pathDisplayMode.optimal).toBe(true);
      expect(state.pathDisplayMode.suggested).toBe(true);
      expect(state.pathDisplayMode.player).toBe(true); // Should preserve existing values
    });

    it("should manage modal visibility states", () => {
      // Arrange
      const {
        setQuickstartModalVisible,
        setNewsModalVisible,
        setContactModalVisible,
        setLabsModalVisible,
        setStatsModalVisible,
        setDailiesModalVisible,
      } = useGameStore.getState();

      // Act & Assert
      setQuickstartModalVisible(true);
      expect(useGameStore.getState().quickstartModalVisible).toBe(true);

      setNewsModalVisible(true);
      expect(useGameStore.getState().newsModalVisible).toBe(true);

      setContactModalVisible(true);
      expect(useGameStore.getState().contactModalVisible).toBe(true);

      setLabsModalVisible(true);
      expect(useGameStore.getState().labsModalVisible).toBe(true);

      setStatsModalVisible(true);
      expect(useGameStore.getState().statsModalVisible).toBe(true);

      setDailiesModalVisible(true);
      expect(useGameStore.getState().dailiesModalVisible).toBe(true);
    });

    it("should manage word definition dialog", () => {
      // Arrange
      const { showWordDefinition, hideWordDefinition } =
        useGameStore.getState();

      // Act
      showWordDefinition("test-word", 2);

      // Assert
      let state = useGameStore.getState();
      expect(state.definitionDialogWord).toBe("test-word");
      expect(state.definitionDialogPathIndex).toBe(2);
      expect(state.definitionDialogVisible).toBe(true);

      // Act
      hideWordDefinition();

      // Assert
      state = useGameStore.getState();
      expect(state.definitionDialogWord).toBeNull();
      expect(state.definitionDialogPathIndex).toBeNull();
      expect(state.definitionDialogVisible).toBe(false);
    });
  });
});
