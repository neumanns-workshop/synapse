import type { GameState } from "../../../../stores/useGameStore";
import type {
  GameReport,
  OptimalChoice,
} from "../../../../utils/gameReportUtils";
import { notAllWhoWanderAreLostAchievement } from "../notAllWhoWanderAreLost.definition";

describe("Not All Who Wander Are Lost Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  const createOptimalChoice = (
    isGlobal: boolean,
    isLocal: boolean,
  ): OptimalChoice => ({
    isGlobalOptimal: isGlobal,
    isLocalOptimal: isLocal,
    playerPosition: "anyPlayerPos",
    playerChose: "anyPlayerChoice",
    optimalChoice: "anyOptimalChoice",
    // Add other fields as needed, with sensible defaults
    choseLeastSimilarNeighbor: false,
  });

  beforeEach(() => {
    mockGameStatus = "won"; // Default
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it("should return true if game won and all moves (excluding last) were not optimal/suggested", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false, false),
      createOptimalChoice(false, false),
      createOptimalChoice(true, true), // This is the last winning move, should be ignored
    ];
    mockGameStatus = "won";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if game given_up and all moves were not optimal/suggested", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false, false),
      createOptimalChoice(false, false),
    ];
    mockGameStatus = "given_up";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if game won and an early move was optimal", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true, false), // Optimal move
      createOptimalChoice(false, false),
      createOptimalChoice(false, true), // Last move, ignored if won
    ];
    mockGameStatus = "won";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game won and an early move was suggested", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false, true), // Suggested move
      createOptimalChoice(false, false),
      createOptimalChoice(true, true), // Last move, ignored if won
    ];
    mockGameStatus = "won";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game given_up and any move was optimal/suggested", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false, false),
      createOptimalChoice(true, false), // Optimal move
    ];
    mockGameStatus = "given_up";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game won and only one move (the winning one) was made", () => {
    // The single winning move is popped, leaving no moves to evaluate.
    mockGameReport.optimalChoices = [createOptimalChoice(true, true)];
    mockGameStatus = "won";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return true if game won, two non-optimal moves, then winning move", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false, false),
      createOptimalChoice(false, false),
      createOptimalChoice(true, true), // Winning move
    ];
    mockGameStatus = "won";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if no choices to evaluate (e.g., game won, one move which is popped)", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(true, true)]; // Single winning move
    mockGameStatus = "won";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices is empty (given_up)", () => {
    mockGameReport.optimalChoices = [];
    mockGameStatus = "given_up";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'won' or 'given_up'", () => {
    mockGameStatus = "playing";
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if gameReport is null or optimalChoices missing", () => {
    // @ts-expect-error testing null gameReport
    expect(notAllWhoWanderAreLostAchievement.check(null, "won")).toBe(false);
    mockGameReport.optimalChoices = undefined;
    expect(
      notAllWhoWanderAreLostAchievement.check(
        mockGameReport as GameReport,
        "won",
      ),
    ).toBe(false);
  });
});
