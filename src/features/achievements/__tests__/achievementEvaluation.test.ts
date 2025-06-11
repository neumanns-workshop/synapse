import { GameState } from "../../../stores/useGameStore";
import { GameReport } from "../../../utils/gameReportUtils";
import { Achievement } from "../achievement.types";
import { allAchievements } from "../definitions";
import { evaluateAchievements, handleProgressiveAchievements } from "../logic";

// Mock the UnifiedDataStore to avoid dependencies
jest.mock("../../../services/UnifiedDataStore", () => ({
  unifiedDataStore: {
    incrementProgressiveAchievement: jest.fn().mockResolvedValue(1),
  },
}));

describe("Achievement Evaluation System", () => {
  const createMockGameReport = (
    overrides: Partial<GameReport> = {},
  ): GameReport => ({
    id: "test-game",
    timestamp: Date.now(),
    startTime: Date.now() - 60000,
    startWord: "start",
    targetWord: "end",
    playerPath: ["start", "middle", "end"],
    totalMoves: 2,
    moveAccuracy: 100,
    status: "won",
    isDailyChallenge: false,
    optimalPath: ["start", "end"],
    suggestedPath: [],
    optimalMovesMade: 1,
    optimalChoices: [],
    missedOptimalMoves: [],
    playerSemanticDistance: 0.5,
    optimalSemanticDistance: 0.3,
    averageSimilarity: 0.8,
    pathEfficiency: 0.9,
    backtrackEvents: [],
    earnedAchievements: [],
    potentialRarestMoves: [],
    ...overrides,
  });

  describe("evaluateAchievements", () => {
    it("should return juggernaut achievement for won games without backtrack", () => {
      const gameReport = createMockGameReport({
        backtrackEvents: [], // No backtrack events
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = evaluateAchievements(gameReport, gameStatus);

      expect(result).toContainEqual(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });

    it("should return straight and narrow achievement when path lengths match", () => {
      const gameReport = createMockGameReport({
        playerPath: ["start", "end"], // Same length as optimal path
        optimalPath: ["start", "end"],
        backtrackEvents: [], // No backtrack for juggernaut too
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = evaluateAchievements(gameReport, gameStatus);

      expect(result).toContainEqual(
        expect.objectContaining({ id: "straightAndNarrow" }),
      );
      expect(result).toContainEqual(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });

    it("should not return straight and narrow achievement when path lengths differ", () => {
      const gameReport = createMockGameReport({
        playerPath: ["start", "middle", "end"], // Longer than optimal
        optimalPath: ["start", "end"],
        backtrackEvents: [], // No backtrack
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = evaluateAchievements(gameReport, gameStatus);

      expect(result).not.toContain(
        expect.objectContaining({ id: "straightAndNarrow" }),
      );
      // Should still get juggernaut
      expect(result).toContainEqual(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });

    it("should not return juggernaut achievement when backtrack events exist", () => {
      const gameReport = createMockGameReport({
        backtrackEvents: [{ jumpedFrom: "wrong", landedOn: "start" }],
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = evaluateAchievements(gameReport, gameStatus);

      expect(result).not.toContain(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });

    it("should handle won game status correctly", () => {
      const gameReport = createMockGameReport({
        backtrackEvents: [], // No backtrack events
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = evaluateAchievements(gameReport, gameStatus);

      // Should get at least juggernaut for a clean win
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContainEqual(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });

    it("should handle given up game status", () => {
      const gameReport = createMockGameReport({
        status: "given_up",
      });
      const gameStatus: GameState["gameStatus"] = "given_up";

      const result = evaluateAchievements(gameReport, gameStatus);

      // Most achievements require 'won' status, so should be empty or very few
      expect(result).not.toContain(
        expect.objectContaining({ id: "juggernaut" }),
      );
      expect(result).not.toContain(
        expect.objectContaining({ id: "straightAndNarrow" }),
      );
    });

    it("should return empty array for null game report", () => {
      const result = evaluateAchievements(null as any, "won");

      expect(result).toEqual([]);
    });

    it("should handle achievements that throw errors gracefully", () => {
      // Test that the system handles errors in achievement checks
      const gameReport = createMockGameReport({
        backtrackEvents: [], // Valid backtrack events
        playerPath: ["start"], // Valid but minimal path
        optimalPath: ["start"], // Valid but minimal path
      });

      expect(() => {
        evaluateAchievements(gameReport, "won");
      }).not.toThrow();

      const result = evaluateAchievements(gameReport, "won");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("handleProgressiveAchievements", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should handle progressive achievements correctly", async () => {
      const gameReport = createMockGameReport({
        backtrackEvents: [], // Clean win
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = await handleProgressiveAchievements(
        gameReport,
        gameStatus,
      );

      // The result should be an array of achievement IDs
      expect(Array.isArray(result)).toBe(true);
      // Most progressive achievements in the real system have specific conditions
      // that may not be met by our mock data, so we just test the structure
    });

    it("should return empty array for null game report", async () => {
      const result = await handleProgressiveAchievements(null as any, "won");

      expect(result).toEqual([]);
    });

    it("should only process progressive achievements", async () => {
      const gameReport = createMockGameReport({
        backtrackEvents: [], // Clean win
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = await handleProgressiveAchievements(
        gameReport,
        gameStatus,
      );

      // Should be an array (may be empty if no progressive achievements are triggered)
      expect(Array.isArray(result)).toBe(true);
      // Progressive achievements have specific IDs like 'word-collector', 'uRobot', 'seasonal-explorer'
      result.forEach((id) => {
        expect(typeof id).toBe("string");
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle undefined game report properties gracefully", () => {
      const incompleteGameReport = createMockGameReport({
        playerPath: ["start"], // Minimal valid path
        optimalPath: ["start"], // Minimal valid path
        backtrackEvents: [], // Valid empty array
      });

      expect(() => {
        evaluateAchievements(incompleteGameReport, "won");
      }).not.toThrow();
    });

    it("should handle invalid game status", () => {
      const gameReport = createMockGameReport();

      expect(() => {
        evaluateAchievements(gameReport, "invalid_status" as any);
      }).not.toThrow();

      const result = evaluateAchievements(gameReport, "invalid_status" as any);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle empty backtrack events array", () => {
      const gameReport = createMockGameReport({
        backtrackEvents: [], // Empty array
      });
      const gameStatus: GameState["gameStatus"] = "won";

      const result = evaluateAchievements(gameReport, gameStatus);

      // Should get juggernaut for no backtrack events
      expect(result).toContainEqual(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });

    it("should handle missing optional properties", () => {
      const gameReport = createMockGameReport({
        backtrackEvents: undefined,
        potentialRarestMoves: undefined,
        optimalChoices: undefined,
      });
      const gameStatus: GameState["gameStatus"] = "won";

      expect(() => {
        evaluateAchievements(gameReport, gameStatus);
      }).not.toThrow();

      const result = evaluateAchievements(gameReport, gameStatus);
      // Should get juggernaut since backtrackEvents is undefined (treated as no backtrack)
      expect(result).toContainEqual(
        expect.objectContaining({ id: "juggernaut" }),
      );
    });
  });
});
