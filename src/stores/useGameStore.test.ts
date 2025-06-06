import { useGameStore } from "./useGameStore";

// Mock the dailyChallengesService
jest.mock("../services/DailyChallengesService", () => ({
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

// Mock the graph utils
jest.mock("../utils/graphUtils", () => ({
  findShortestPath: jest.fn((graphData, start, end) => {
    // Simple mock that returns a path if both words exist
    if (graphData && graphData[start] && graphData[end]) {
      return [start, "middle", end]; // Mock 3-word path
    }
    return [];
  }),
}));

// Mock the storage adapter
jest.mock("../services/StorageAdapter", () => ({
  loadCurrentGame: jest.fn().mockResolvedValue(null),
  saveCurrentGame: jest.fn().mockResolvedValue(undefined),
  clearCurrentGame: jest.fn().mockResolvedValue(undefined),
  saveTempGame: jest.fn().mockResolvedValue(undefined),
  restoreTempGame: jest.fn().mockResolvedValue(null),
  recordEndedGame: jest.fn().mockResolvedValue(undefined),
  checkAndRecordWordForCollections: jest.fn(),
}));

// Mock the data loader
jest.mock("../services/dataLoader", () => ({
  loadGraphData: jest.fn().mockResolvedValue({
    banana: { edges: { fruit: {} }, tsne: [0, 0] },
    fruit: { edges: { banana: {}, happy: {} }, tsne: [1, 1] },
    happy: { edges: { fruit: {} }, tsne: [2, 2] },
  }),
  loadDefinitionsData: jest.fn().mockResolvedValue({}),
  loadWordFrequencies: jest.fn().mockResolvedValue({}),
}));

// Mock the word collections
jest.mock("../features/wordCollections", () => ({
  getFilteredWordCollections: jest.fn().mockReturnValue([]),
  getAllWordCollectionsWithStatus: jest.fn().mockResolvedValue([]),
  allWordCollections: [],
}));

describe("useGameStore - Upgrade Prompt Behavior", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useGameStore.getState();
    store.clearSavedData();
    // Reset upgrade prompt state manually
    store.hideUpgradePrompt();
    store.resetUpgradePromptDismissal();
  });

  it("should set dismissal flag when hideUpgradePrompt is called", () => {
    let store = useGameStore.getState();

    // Initially should not be dismissed
    expect(store.upgradePromptDismissedThisSession).toBe(false);

    // Show upgrade prompt
    store.showUpgradePrompt("Test message");
    store = useGameStore.getState(); // Get fresh state
    expect(store.upgradePromptVisible).toBe(true);
    expect(store.upgradePromptDismissedThisSession).toBe(false);

    // Hide upgrade prompt should set dismissal flag
    store.hideUpgradePrompt();
    store = useGameStore.getState(); // Get fresh state
    expect(store.upgradePromptVisible).toBe(false);
    expect(store.upgradePromptDismissedThisSession).toBe(true);
  });

  it("should reset dismissal flag when resetUpgradePromptDismissal is called", () => {
    let store = useGameStore.getState();

    // Set up dismissed state
    store.hideUpgradePrompt();
    store = useGameStore.getState(); // Get fresh state
    expect(store.upgradePromptDismissedThisSession).toBe(true);

    // Reset dismissal (simulates user clicking upgrade)
    store.resetUpgradePromptDismissal();
    store = useGameStore.getState(); // Get fresh state

    expect(store.upgradePromptDismissedThisSession).toBe(false);
  });

  it("should show and hide upgrade prompt correctly", () => {
    let store = useGameStore.getState();

    // Initially should be hidden
    expect(store.upgradePromptVisible).toBe(false);
    expect(store.upgradePromptMessage).toBe("");

    // Show upgrade prompt
    const testMessage = "You've used all your free games for today!";
    store.showUpgradePrompt(testMessage);
    store = useGameStore.getState(); // Get fresh state

    expect(store.upgradePromptVisible).toBe(true);
    expect(store.upgradePromptMessage).toBe(testMessage);

    // Hide upgrade prompt
    store.hideUpgradePrompt();
    store = useGameStore.getState(); // Get fresh state

    expect(store.upgradePromptVisible).toBe(false);
    expect(store.upgradePromptMessage).toBe("");
    expect(store.upgradePromptDismissedThisSession).toBe(true);
  });

  it("should allow challenges to start regardless of upgrade prompt state", async () => {
    let store = useGameStore.getState();

    // Load initial data first to set up graph data
    await store.loadInitialData();
    store = useGameStore.getState();

    // Simulate having an upgrade prompt visible and dismissed
    store.showUpgradePrompt("No free games left");
    store.hideUpgradePrompt(); // This sets upgradePromptDismissedThisSession = true
    store = useGameStore.getState();

    expect(store.upgradePromptVisible).toBe(false);
    expect(store.upgradePromptDismissedThisSession).toBe(true);

    // Now start a challenge - this should work regardless of upgrade prompt state
    await store.startChallengeGame("banana", "happy");
    store = useGameStore.getState();

    // Challenge should start successfully
    expect(store.gameStatus).toBe("playing");
    expect(store.startWord).toBe("banana");
    expect(store.targetWord).toBe("happy");
    expect(store.isChallenge).toBe(true);
    expect(store.isDailyChallenge).toBe(false);

    // Upgrade prompt should be cleared
    expect(store.upgradePromptVisible).toBe(false);
    expect(store.upgradePromptMessage).toBe("");
    expect(store.upgradePromptDismissedThisSession).toBe(false); // Reset for challenges

    // Pending challenge state should be cleared
    expect(store.hasPendingChallenge).toBe(false);
    expect(store.pendingChallengeWords).toBe(null);
  });

  it("should clear pending challenge state on challenge start failure", async () => {
    let store = useGameStore.getState();

    // Load initial data first to set up graph data
    await store.loadInitialData();
    store = useGameStore.getState();

    // Set up pending challenge
    store.setHasPendingChallenge(true);
    store.setPendingChallengeWords({
      startWord: "banana",
      targetWord: "happy",
    });

    // Mock findShortestPath to return empty path (no connection) for this test only
    const { findShortestPath } = require("../utils/graphUtils");
    const originalMock = findShortestPath.mockImplementation;
    findShortestPath.mockImplementation((graphData, start, end) => {
      // Return empty path to simulate no connection
      return [];
    });

    // Try to start challenge with no path
    await store.startChallengeGame("banana", "happy");
    store = useGameStore.getState();

    // Should fail and clear pending state
    expect(store.gameStatus).toBe("idle");
    expect(store.errorLoadingData).toBe("No path exists for this challenge.");
    expect(store.hasPendingChallenge).toBe(false);
    expect(store.pendingChallengeWords).toBe(null);

    // Restore original mock
    findShortestPath.mockImplementation(originalMock);
  });
});
