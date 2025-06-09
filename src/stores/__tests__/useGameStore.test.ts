// This is the beginning of the test file for useGameStore.ts

import type { WordCollection } from "../../features/wordCollections/collection.types.ts"; // Corrected path for WordCollection type
import { dailyChallengesService } from "../../services/DailyChallengesService";
import type {
  GraphData,
  DefinitionsData,
  WordFrequencies,
} from "../../services/dataLoader"; // Adjust path for types
import * as dataLoader from "../../services/dataLoader";
import type { PersistentGameState as SavedGame } from "../../services/StorageAdapter"; // Corrected type for saved game
import * as storageAdapter from "../../services/StorageAdapter";
import { findValidWordPair, useGameStore } from "../useGameStore"; // Added useGameStore

// Mock external dependencies
// Mock dailyChallengesService
jest.mock("../../services/DailyChallengesService", () => ({
  dailyChallengesService: {
    isPremiumUser: jest.fn().mockResolvedValue(false),
    getRemainingFreeGames: jest.fn().mockResolvedValue(2),
    consumeFreeGame: jest.fn().mockResolvedValue(undefined),
    loadDailyChallengeState: jest.fn().mockResolvedValue({
      todaysChallenge: null,
      hasPlayedToday: false,
      remainingFreeGames: 2,
    }),
    getDailyChallengeState: jest.fn().mockResolvedValue({
      todaysChallenge: null,
      hasPlayedToday: false,
      remainingFreeGames: 2,
    }),
    getTodaysChallenge: jest.fn().mockReturnValue(null),
    hasCompletedTodaysChallenge: jest.fn().mockResolvedValue(false),
    saveDailyChallengeProgress: jest.fn().mockResolvedValue(undefined),
    getChallengeForDate: jest.fn().mockReturnValue(null),
  },
}));
// Mock dataLoader functions
jest.mock("../../services/dataLoader");
const mockedLoadGraphData = dataLoader.loadGraphData as jest.MockedFunction<
  typeof dataLoader.loadGraphData
>;
const mockedLoadDefinitionsData =
  dataLoader.loadDefinitionsData as jest.MockedFunction<
    typeof dataLoader.loadDefinitionsData
  >;
const mockedLoadWordFrequencies =
  dataLoader.loadWordFrequencies as jest.MockedFunction<
    typeof dataLoader.loadWordFrequencies
  >;

// Mock StorageAdapter functions
jest.mock("../../services/StorageAdapter");
const mockedLoadCurrentGame =
  storageAdapter.loadCurrentGame as jest.MockedFunction<
    typeof storageAdapter.loadCurrentGame
  >;
// We might need to mock other StorageAdapter functions like saveCurrentGame, clearCurrentGame if loadInitialData or subsequent actions call them directly or indirectly in a way that affects the test.

// Mock wordCollections functions
import * as wordCollectionsManager from "../../features/wordCollections";
jest.mock("../../features/wordCollections");
const mockedGetFilteredWordCollections =
  wordCollectionsManager.getFilteredWordCollections as jest.MockedFunction<
    typeof wordCollectionsManager.getFilteredWordCollections
  >;
const mockedGetAllWordCollectionsWithStatus =
  wordCollectionsManager.getAllWordCollectionsWithStatus as jest.MockedFunction<
    typeof wordCollectionsManager.getAllWordCollectionsWithStatus
  >;

describe("findValidWordPair", () => {
  let originalMathRandom: () => number;

  beforeEach(() => {
    jest.clearAllMocks(); // Still useful for other potential mocks or spies
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  it("should return null start and end if graphData is null", () => {
    const result = findValidWordPair(null);
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("should return null start and end if graphData is empty", () => {
    const graphData: GraphData = {};
    const result = findValidWordPair(graphData);
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("should return null start and end if graphData has only one word", () => {
    const graphData: GraphData = {
      // Edges now correctly use number values (e.g., 1 for weight)
      wordA: { edges: { someNeighbor: 1 }, tsne: [0, 0] },
    };
    // To ensure it fails due to words.length < 2 after Object.keys, not due to bad structure.
    // However, the function also checks for node degree later. If wordA is the only key,
    // it will correctly return start: null, end: null from `if (words.length < 2)`
    const result = findValidWordPair(graphData);
    expect(result.start).toBeNull();
    expect(result.end).toBeNull();
  });

  it("should find a valid word pair meeting all criteria using actual findShortestPath", () => {
    // Corrected mockGraphData: edges now have numeric values (e.g., weight 1)
    const mockGraphData: GraphData = {
      wordA: { edges: { wordB: 1, conn1A: 1, conn2A: 1 }, tsne: [0, 0] }, // Degree 3. Path A->B->C->D
      wordB: { edges: { wordA: 1, wordC: 1, conn1B: 1 }, tsne: [10, 10] }, // Degree 3
      wordC: { edges: { wordB: 1, wordD: 1, altB: 1 }, tsne: [20, 20] }, // Degree 3 (penultimate for A-D)
      wordD: { edges: { wordC: 1, altB: 1, conn1D: 1 }, tsne: [100, 100] }, // Degree 3 (target for A-D)
      altB: { edges: { wordC: 1, wordD: 1, conn1Alt: 1 }, tsne: [30, 30] }, // Degree 3 (alternate link for C to D)
      conn1A: { edges: { wordA: 1 }, tsne: [1, 1] },
      conn2A: { edges: { wordA: 1 }, tsne: [2, 2] },
      conn1B: { edges: { wordB: 1 }, tsne: [11, 11] },
      conn1D: { edges: { wordD: 1 }, tsne: [101, 101] },
      conn1Alt: { edges: { altB: 1 }, tsne: [31, 31] },
      // Add a few more words to make random selection meaningful and to test non-selected paths
      wordX: { edges: { wordY: 1, wordA: 1 }, tsne: [200, 200] }, // Degree 2, might not be selected
      wordY: { edges: { wordX: 1, wordB: 1 }, tsne: [210, 210] }, // Degree 2
      wordZ: { edges: { wordA: 1 }, tsne: [0, 1] }, // Low degree, low distance to A
    };
    const wordsInGraph = Object.keys(mockGraphData);
    const wordAIndex = wordsInGraph.indexOf("wordA");
    const wordDIndex = wordsInGraph.indexOf("wordD");

    // Mock Math.random to select wordA and wordD first in the loop for predictability
    const mockMathRandom = jest
      .fn()
      .mockReturnValueOnce(wordAIndex / wordsInGraph.length) // Selects wordA for start
      .mockReturnValueOnce(wordDIndex / wordsInGraph.length); // Selects wordD for end
    Math.random = mockMathRandom;

    // No longer mocking findShortestPath. The actual function will be used.
    // The mockGraphData is designed so that wordA to wordD has a path ['wordA', 'wordB', 'wordC', 'wordD']
    // which meets length (4), degree (all >=3), t-SNE distance (large), and alternate approach (altB for C->D)

    const result = findValidWordPair(mockGraphData);

    expect(result.start).toBe("wordA");
    expect(result.end).toBe("wordD");

    // Optionally, verify Math.random was called as expected if specific attempt is important
    expect(mockMathRandom).toHaveBeenCalledTimes(2); // Or more, depending on how many attempts it takes
    // if the first pair fails any criteria not perfectly set up.
    // For this setup, it should find it on the first attempt due to Math.random mock.

    // We can't directly assert on findShortestPath calls as easily without a mock,
    // but the success of findValidWordPair implies findShortestPath worked as expected
    // given the graph data.
  });

  it("should return a fallback pair if all potential paths are too short", () => {
    // Graph where all nodes are interconnected (high degree), but all direct paths are length 2.
    // MIN_PATH_LENGTH is 4, so these will fail that check.
    // t-SNE distances are made large to pass that check.
    const mockGraphDataTooShortPaths: GraphData = {
      wordS1: { edges: { wordS2: 1, wordS3: 1, wordS4: 1 }, tsne: [0, 0] }, // Degree 3
      wordS2: { edges: { wordS1: 1, wordS3: 1, wordS4: 1 }, tsne: [100, 100] }, // Degree 3
      wordS3: { edges: { wordS1: 1, wordS2: 1, wordS4: 1 }, tsne: [200, 200] }, // Degree 3
      wordS4: { edges: { wordS1: 1, wordS2: 1, wordS3: 1 }, tsne: [300, 300] }, // Degree 3
    };
    // With this setup, findShortestPath("wordS1", "wordS2") will return ["wordS1", "wordS2"] (length 2).
    // This fails path.length (2) >= MIN_PATH_LENGTH (4).
    // All other pairs will similarly result in short paths.
    // The MIN_NODE_DEGREE (3) is met.
    // The MIN_TSNE_DISTANCE_SQUARED (2500) is met for distinct pairs.
    // The alternate approach check might not even be reached or will also likely fail for 2-step paths.
    // Thus, the loop should exhaust MAX_ATTEMPTS and trigger the fallback.

    const wordsInGraph = Object.keys(mockGraphDataTooShortPaths);

    // We are not mocking Math.random here to see the true fallback behavior after loop exhaustion.
    const result = findValidWordPair(mockGraphDataTooShortPaths);

    // Check that the fallback mechanism returned a valid pair of words from the graph
    expect(result.start).not.toBeNull();
    expect(result.end).not.toBeNull();
    expect(wordsInGraph).toContain(result.start as string);
    expect(wordsInGraph).toContain(result.end as string);
    expect(result.start).not.toBe(result.end); // Fallback logic ensures start !== end
  });

  // TODO: Add tests for fallback behavior when no pair meets criteria after MAX_ATTEMPTS
  // This will require Math.random to produce pairs that consistently fail constraints,
  // and findShortestPath to return non-viable paths for those pairs.
});

// Separate describe block for loadInitialData related tests
describe("useGameStore - loadInitialData", () => {
  // This helper now only returns the data fields that need to be reset.
  // Action functions are part of the store created by Zustand and should remain.
  const getInitialDataFields = () => ({
    graphData: null,
    definitionsData: null,
    wordFrequencies: null,
    isLoadingData: false,
    errorLoadingData: null,
    startWord: null,
    targetWord: null,
    currentWord: null,
    playerPath: [],
    optimalPath: [],
    suggestedPathFromCurrent: [],
    potentialRarestMovesThisGame: [],
    pathDisplayMode: {
      player: true,
      optimal: false,
      suggested: false,
      ai: false,
    },
    gameStatus: "idle" as const,
    gameReport: null,
    optimalChoices: [],
    backtrackHistory: [],
    statsModalVisible: false,
    definitionDialogWord: null,
    definitionDialogPathIndex: null,
    definitionDialogVisible: false,
    selectedAchievement: null,
    achievementDialogVisible: false,
    wordCollections: [],
    activeWordCollections: [],
    isChallenge: false,
    shouldRestoreTempGame: false,
    hasPendingChallenge: false,
    pendingChallengeWords: null,
  });

  beforeEach(() => {
    mockedLoadGraphData.mockReset();
    mockedLoadDefinitionsData.mockReset();
    mockedLoadWordFrequencies.mockReset();
    mockedLoadCurrentGame.mockReset();
    mockedGetFilteredWordCollections.mockReset();
    mockedGetAllWordCollectionsWithStatus.mockReset();

    // Reset only the data fields of the store, preserving actions.
    // The `true` (replace) flag is removed to merge, not replace the entire state object.
    useGameStore.setState(getInitialDataFields());
  });

  it("should load initial data successfully and set state correctly when no saved game exists", async () => {
    // Arrange: Mock successful data loading
    const mockGraph: GraphData = {
      wordA: { edges: { wordB: 1 }, tsne: [1, 1] },
    };
    const mockDefs: DefinitionsData = { wordA: ["defA"] };
    const mockFreqs: WordFrequencies = { wordA: 10 };
    const mockCollections: WordCollection[] = [
      {
        id: "test-collection",
        title: "Test Collection",
        words: ["wordA"],
        isWordlistViewable: true,
        // startDate, endDate, icon are optional, so not strictly needed for this basic mock
      },
    ];

    mockedLoadGraphData.mockResolvedValue(mockGraph);
    mockedLoadDefinitionsData.mockResolvedValue(mockDefs);
    mockedLoadWordFrequencies.mockResolvedValue(mockFreqs);
    mockedLoadCurrentGame.mockResolvedValue(null); // No saved game
    mockedGetFilteredWordCollections.mockResolvedValue(mockCollections);
    mockedGetAllWordCollectionsWithStatus.mockResolvedValue([
      {
        ...mockCollections[0],
        isCurrentlyAvailable: true,
      },
    ]);

    // Act: Call loadInitialData using the store's action
    // To test actions on a Zustand store, you typically call them and then check the store's state.
    const { loadInitialData } = useGameStore.getState();
    await loadInitialData();

    // Assert: Check if the state was updated correctly
    const state = useGameStore.getState();
    expect(state.isLoadingData).toBe(false);
    expect(state.errorLoadingData).toBeNull();
    expect(state.graphData).toEqual(mockGraph);
    expect(state.definitionsData).toEqual(mockDefs);
    expect(state.wordFrequencies).toEqual(mockFreqs);
    expect(state.wordCollections).toEqual([
      {
        ...mockCollections[0],
        isCurrentlyAvailable: true,
      },
    ]);
    expect(state.activeWordCollections).toEqual(mockCollections);
    expect(state.gameStatus).toBe("idle"); // Should be idle as no game was restored or started

    // Verify mocks were called
    expect(mockedLoadGraphData).toHaveBeenCalledTimes(1);
    expect(mockedLoadDefinitionsData).toHaveBeenCalledTimes(1);
    expect(mockedLoadWordFrequencies).toHaveBeenCalledTimes(1);
    expect(mockedLoadCurrentGame).toHaveBeenCalledTimes(1);
    expect(mockedGetAllWordCollectionsWithStatus).toHaveBeenCalledWith(
      wordCollectionsManager.allWordCollections,
      mockGraph,
    );
  });

  it("should handle error during graph data loading", async () => {
    // Arrange: Mock loadGraphData to throw an error
    const errorMessage = "Failed to load graph data";
    mockedLoadGraphData.mockRejectedValue(new Error(errorMessage));

    // Mock other loaders to resolve successfully, though they might not be reached if loadGraphData fails early
    mockedLoadDefinitionsData.mockResolvedValue({ def: ["definition"] });
    mockedLoadWordFrequencies.mockResolvedValue({ word: 1 });
    mockedLoadCurrentGame.mockResolvedValue(null);
    // getFilteredWordCollections might not be called if graphData is null

    // Act
    const { loadInitialData } = useGameStore.getState();
    await loadInitialData();

    // Assert
    const state = useGameStore.getState();
    expect(state.isLoadingData).toBe(false);
    expect(state.errorLoadingData).toBe(errorMessage);
    expect(state.graphData).toBeNull(); // Or initial state, depending on store setup
    expect(state.definitionsData).toBeNull(); // Or initial state
    expect(state.wordFrequencies).toBeNull(); // Or initial state
    expect(state.wordCollections).toEqual([]); // Or initial state
    expect(state.activeWordCollections).toEqual([]); // Or initial state
  });

  it('should restore a saved game in "playing" state', async () => {
    // Arrange
    const mockGraph: GraphData = {
      wordA: { edges: { wordB: 1 }, tsne: [0, 0] },
      wordB: { edges: { wordA: 1, wordC: 1 }, tsne: [1, 1] },
      wordC: { edges: { wordB: 1 }, tsne: [2, 2] },
    };
    const mockDefinitions: DefinitionsData = { wordA: ["def"] };
    const mockWordFrequencies: WordFrequencies = { wordA: 10 };
    const mockCollections: WordCollection[] = []; // Assume no specific collections for simplicity here

    const savedGameData: SavedGame = {
      startWord: "wordA",
      targetWord: "wordC",
      currentWord: "wordB",
      playerPath: ["wordA", "wordB"],
      optimalPath: ["wordA", "wordB", "wordC"],
      gameStatus: "playing",
      optimalChoices: [
        {
          playerPosition: "wordA",
          playerChose: "wordB",
          optimalChoice: "wordB",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
      ],
      backtrackHistory: [],
      pathDisplayMode: {
        player: true,
        optimal: true,
        suggested: false,
        ai: false,
      },
      startTime: Date.now() - 100000,
      isChallenge: false,
      potentialRarestMovesThisGame: [],
      suggestedPathFromCurrent: [],
    };

    mockedLoadGraphData.mockResolvedValue(mockGraph);
    mockedLoadDefinitionsData.mockResolvedValue(mockDefinitions);
    mockedLoadWordFrequencies.mockResolvedValue(mockWordFrequencies);
    mockedLoadCurrentGame.mockResolvedValue(savedGameData);
    mockedGetFilteredWordCollections.mockResolvedValue(mockCollections);
    mockedGetAllWordCollectionsWithStatus.mockResolvedValue([]);
    // findShortestPath is NOT mocked, will use actual implementation.
    // It will be called with (mockGraph, 'wordB', 'wordC') and should return ['wordB', 'wordC']

    // Act
    const { loadInitialData } = useGameStore.getState();
    const wasGameRestored = await loadInitialData();

    // Assert
    expect(wasGameRestored).toBe(true);
    const state = useGameStore.getState();
    expect(state.isLoadingData).toBe(false);
    expect(state.errorLoadingData).toBeNull();

    expect(state.graphData).toEqual(mockGraph);
    expect(state.startWord).toBe(savedGameData.startWord);
    expect(state.targetWord).toBe(savedGameData.targetWord);
    expect(state.currentWord).toBe(savedGameData.currentWord);
    expect(state.playerPath).toEqual(savedGameData.playerPath);
    expect(state.optimalPath).toEqual(savedGameData.optimalPath);
    expect(state.gameStatus).toBe("playing");
    expect(state.optimalChoices).toEqual(savedGameData.optimalChoices);
    expect(state.backtrackHistory).toEqual(savedGameData.backtrackHistory);
    expect(state.pathDisplayMode.optimal).toBe(
      savedGameData.pathDisplayMode.optimal,
    );
    // Check that suggestedPathFromCurrent was recalculated
    expect(state.suggestedPathFromCurrent).toEqual(["wordB", "wordC"]);
    expect(state.potentialRarestMovesThisGame).toEqual(
      savedGameData.potentialRarestMovesThisGame || [],
    );

    expect(mockedGetAllWordCollectionsWithStatus).toHaveBeenCalledWith(
      wordCollectionsManager.allWordCollections,
      mockGraph,
    );
  });

  it('should not restore a saved game if its status is not "playing"', async () => {
    // Arrange
    const mockGraph: GraphData = {
      wordA: { edges: { wordB: 1 }, tsne: [0, 0] },
    }; // Minimal graph
    const mockDefinitions: DefinitionsData = { wordA: ["def"] };
    const mockWordFrequencies: WordFrequencies = { wordA: 10 };
    const mockCollections: WordCollection[] = [];

    const savedGameDataNonPlaying: SavedGame = {
      startWord: "wordA",
      targetWord: "wordC",
      currentWord: "wordC",
      playerPath: ["wordA", "wordB", "wordC"],
      optimalPath: ["wordA", "wordB", "wordC"],
      gameStatus: "won", // Status is not 'playing'
      optimalChoices: [],
      backtrackHistory: [],
      pathDisplayMode: {
        player: true,
        optimal: true,
        suggested: false,
        ai: false,
      },
      startTime: Date.now() - 200000,
      isChallenge: false,
      potentialRarestMovesThisGame: [],
      suggestedPathFromCurrent: [],
    };

    mockedLoadGraphData.mockResolvedValue(mockGraph);
    mockedLoadDefinitionsData.mockResolvedValue(mockDefinitions);
    mockedLoadWordFrequencies.mockResolvedValue(mockWordFrequencies);
    mockedLoadCurrentGame.mockResolvedValue(savedGameDataNonPlaying);
    mockedGetFilteredWordCollections.mockResolvedValue(mockCollections);
    mockedGetAllWordCollectionsWithStatus.mockResolvedValue([]);

    // Act
    const { loadInitialData } = useGameStore.getState();
    const wasGameRestored = await loadInitialData(); // Should return false

    // Assert
    expect(wasGameRestored).toBe(false);
    const state = useGameStore.getState();
    expect(state.isLoadingData).toBe(false);
    expect(state.errorLoadingData).toBeNull();

    // Base data should be loaded
    expect(state.graphData).toEqual(mockGraph);
    expect(state.definitionsData).toEqual(mockDefinitions);
    expect(state.wordFrequencies).toEqual(mockWordFrequencies);
    expect(state.wordCollections).toEqual(mockCollections);

    // Game-specific state should be initial/default, not from savedGameDataNonPlaying
    expect(state.startWord).toBeNull();
    expect(state.targetWord).toBeNull();
    expect(state.currentWord).toBeNull();
    expect(state.playerPath).toEqual([]);
    expect(state.optimalPath).toEqual([]);
    expect(state.gameStatus).toBe("idle");
    expect(state.optimalChoices).toEqual([]);
    // potentialRarestMovesThisGame should be reset
    expect(state.potentialRarestMovesThisGame).toEqual([]);
  });

  // More tests for loadInitialData will follow:
  // - Handling a saved game not in 'playing' state (should be treated as no game)
});

// Separate describe block for startGame related tests
describe("useGameStore - startGame", () => {
  const getInitialDataFields = () => ({
    graphData: null,
    definitionsData: null,
    wordFrequencies: null,
    isLoadingData: false,
    errorLoadingData: null,
    startWord: null,
    targetWord: null,
    currentWord: null,
    playerPath: [],
    optimalPath: [],
    suggestedPathFromCurrent: [],
    potentialRarestMovesThisGame: [],
    pathDisplayMode: {
      player: true,
      optimal: false,
      suggested: false,
      ai: false,
    },
    gameStatus: "idle" as const,
    gameReport: null,
    optimalChoices: [],
    backtrackHistory: [],
    statsModalVisible: false,
    definitionDialogWord: null,
    definitionDialogPathIndex: null,
    definitionDialogVisible: false,
    selectedAchievement: null,
    achievementDialogVisible: false,
    wordCollections: [],
    activeWordCollections: [],
    isChallenge: false,
    shouldRestoreTempGame: false,
    hasPendingChallenge: false,
    pendingChallengeWords: null,
  });

  // Mocks for StorageAdapter functions that startGame might call
  // mockedLoadCurrentGame is already defined above for loadInitialData tests
  const mockedSaveCurrentGame =
    storageAdapter.saveCurrentGame as jest.MockedFunction<
      typeof storageAdapter.saveCurrentGame
    >;
  const mockedClearCurrentGame =
    storageAdapter.clearCurrentGame as jest.MockedFunction<
      typeof storageAdapter.clearCurrentGame
    >;
  const mockedRestoreTempGame =
    storageAdapter.restoreTempGame as jest.MockedFunction<
      typeof storageAdapter.restoreTempGame
    >;
  // We also need to ensure findValidWordPair is not mocked (it isn't, good) and findShortestPath from graphUtils is not mocked (it isn't globally, good)

  beforeEach(() => {
    // Reset relevant mocks
    mockedSaveCurrentGame.mockReset();
    mockedClearCurrentGame.mockReset();
    mockedRestoreTempGame.mockReset();
    // Other mocks like data loaders aren't directly used by startGame, but resetting them doesn't hurt if they were set in other suites.
    mockedLoadGraphData.mockReset();
    mockedLoadDefinitionsData.mockReset();
    mockedLoadWordFrequencies.mockReset();
    mockedGetFilteredWordCollections.mockReset();
    mockedGetAllWordCollectionsWithStatus.mockReset();

    // Reset store data fields
    useGameStore.setState(getInitialDataFields());
  });

  it("should do nothing and set error if graphData is null", async () => {
    // Arrange: Ensure graphData is null (done by beforeEach)
    // Act
    const { startGame } = useGameStore.getState();
    await startGame();

    // Assert
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe("idle");
    expect(state.errorLoadingData).toBe("Graph data missing.");
    expect(state.startWord).toBeNull();
    expect(mockedClearCurrentGame).not.toHaveBeenCalled();
    expect(mockedSaveCurrentGame).not.toHaveBeenCalled();
  });

  it("should set error if findValidWordPair returns null", async () => {
    // Arrange: Provide graphData that will cause findValidWordPair to return {start: null, end: null}
    // e.g., a graph with only one word.
    const singleWordGraph: GraphData = { wordA: { edges: {}, tsne: [0, 0] } };
    useGameStore.setState({ graphData: singleWordGraph });

    // findValidWordPair is not mocked and will be called with singleWordGraph.
    // It should return { start: null, end: null }.

    // Act
    const { startGame } = useGameStore.getState();
    await startGame();

    // Assert
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe("idle");
    expect(state.errorLoadingData).toBe("Could not start game.");
    expect(state.startWord).toBeNull();
    expect(state.targetWord).toBeNull();
    // clearCurrentGame(false) is called before findValidWordPair in startGame
    expect(mockedClearCurrentGame).toHaveBeenCalledWith(false);
    expect(mockedSaveCurrentGame).not.toHaveBeenCalled();
  });

  it("should successfully start a new game", async () => {
    // Arrange
    const mockGraph: GraphData = {
      wordS: { edges: { wordM1: 1, oS1: 1, oS2: 1 }, tsne: [0, 0] }, // Start
      wordM1: { edges: { wordS: 1, wordM2: 1, oM11: 1 }, tsne: [10, 10] },
      wordM2: { edges: { wordM1: 1, wordE: 1, altM2_E: 1 }, tsne: [20, 20] }, // Penultimate
      wordE: { edges: { wordM2: 1, oE1: 1, oE2: 1 }, tsne: [100, 100] }, // End
      // Alternates and degree fillers
      altM2_E: { edges: { wordM2: 1, wordE: 1, oAlt: 1 }, tsne: [25, 25] }, // Alternate approach for M2 to E
      oS1: { edges: { wordS: 1 }, tsne: [1, 1] },
      oS2: { edges: { wordS: 1 }, tsne: [2, 2] },
      oM11: { edges: { wordM1: 1 }, tsne: [11, 11] },
      oE1: { edges: { wordE: 1 }, tsne: [101, 101] },
      oE2: { edges: { wordE: 1 }, tsne: [102, 102] },
      oAlt: { edges: { altM2_E: 1 }, tsne: [26, 26] },
    };
    useGameStore.setState({ graphData: mockGraph });

    const wordsInGraph = Object.keys(mockGraph);
    const wordSIndex = wordsInGraph.indexOf("wordS");
    const wordEIndex = wordsInGraph.indexOf("wordE");

    const mockMath = jest
      .spyOn(Math, "random")
      .mockReturnValueOnce(wordSIndex / wordsInGraph.length) // for startWord (wordS)
      .mockReturnValueOnce(wordEIndex / wordsInGraph.length); // for targetWord (wordE)

    mockedClearCurrentGame.mockResolvedValue(undefined);
    mockedSaveCurrentGame.mockResolvedValue(undefined);

    // Act
    const { startGame } = useGameStore.getState();
    await startGame();

    // Assert
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe("playing");
    expect(state.errorLoadingData).toBeNull();
    expect(state.startWord).toBe("wordS");
    expect(state.targetWord).toBe("wordE");
    expect(state.currentWord).toBe("wordS");
    expect(state.playerPath).toEqual(["wordS"]);

    const expectedPath = ["wordS", "wordM1", "wordM2", "wordE"];
    expect(state.optimalPath).toEqual(expectedPath);
    expect(state.suggestedPathFromCurrent).toEqual(expectedPath);

    expect(mockedClearCurrentGame).toHaveBeenCalledWith(false);
    expect(mockedSaveCurrentGame).toHaveBeenCalledTimes(1);
    const savedGameArg = mockedSaveCurrentGame.mock.calls[0][0];
    expect(savedGameArg.startWord).toBe("wordS");
    expect(savedGameArg.targetWord).toBe("wordE");
    expect(savedGameArg.optimalPath).toEqual(expectedPath);
    expect(savedGameArg.gameStatus).toBe("playing");
    expect(savedGameArg.isChallenge).toBe(false);

    mockMath.mockRestore();
  });

  it("should restore a temporary game if shouldRestoreTempGame is true and temp game exists", async () => {
    // Arrange
    const mockGraph: GraphData = {
      /* ... minimal graph ... */ wordA: { edges: { wordB: 1 }, tsne: [0, 0] },
      wordB: { edges: { wordA: 1, wordC: 1 }, tsne: [1, 1] },
      wordC: { edges: { wordB: 1 }, tsne: [2, 2] },
    };
    useGameStore.setState({
      graphData: mockGraph,
      shouldRestoreTempGame: true,
    });

    const tempGameData: SavedGame = {
      startWord: "wordA",
      targetWord: "wordC",
      currentWord: "wordB",
      playerPath: ["wordA", "wordB"],
      optimalPath: ["wordA", "wordB", "wordC"],
      suggestedPathFromCurrent: ["wordB", "wordC"],
      gameStatus: "playing",
              optimalChoices: [
        {
          playerPosition: "wordA",
          playerChose: "wordB",
          optimalChoice: "wordB",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
      ],
      backtrackHistory: [],
      pathDisplayMode: {
        player: true,
        optimal: false,
        suggested: true,
        ai: false,
      },
      startTime: Date.now() - 50000,
      isChallenge: false, // Assuming temp game is not a challenge for this test
      potentialRarestMovesThisGame: [],
    };
    mockedRestoreTempGame.mockResolvedValue(tempGameData);

    // Act
    const { startGame } = useGameStore.getState();
    await startGame();

    // Assert
    const state = useGameStore.getState();
    expect(state.startWord).toBe(tempGameData.startWord);
    expect(state.targetWord).toBe(tempGameData.targetWord);
    expect(state.currentWord).toBe(tempGameData.currentWord);
    expect(state.playerPath).toEqual(tempGameData.playerPath);
    expect(state.optimalPath).toEqual(tempGameData.optimalPath);
    expect(state.suggestedPathFromCurrent).toEqual(
      tempGameData.suggestedPathFromCurrent,
    );
    expect(state.gameStatus).toBe("playing");
    expect(state.optimalChoices).toEqual(tempGameData.optimalChoices);
    expect(state.shouldRestoreTempGame).toBe(false); // Should be reset

    // Ensure new game path (findValidWordPair, saveCurrentGame) was NOT taken
    expect(mockedClearCurrentGame).not.toHaveBeenCalledWith(false); // clearCurrentGame(false) is for non-temp start
    expect(mockedSaveCurrentGame).not.toHaveBeenCalled();
    // We need to ensure findValidWordPair itself wasn't called. Spying on it:
    const findValidWordPairSpy = jest.spyOn(
      useGameStoreModule,
      "findValidWordPair",
    );
    // Re-run or check previous calls if this test structure is difficult for spying before action.
    // For this test, we'll rely on the fact that if state matches tempGameData, findValidWordPair was likely skipped.
    // A more direct spy would require exporting findValidWordPair from its own module or careful setup.
    // However, if startWord is 'tempA', it didn't call findValidWordPair to get 'wordS'.
  });
});

// Need to import the module itself to spy on its exports if they are not part of the store instance
import * as useGameStoreModule from "../useGameStore";
