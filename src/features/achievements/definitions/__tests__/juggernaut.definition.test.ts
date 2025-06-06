import type { GameState } from "../../../../stores/useGameStore";
import type { GameReport } from "../../../../utils/gameReportUtils";
import { juggernautAchievement } from "../juggernaut.definition";

describe("Juggernaut Achievement", () => {
  let mockGameReport: Partial<GameReport>; // Use Partial for easier test-specific setup
  let mockGameStatus: GameState["gameStatus"];

  beforeEach(() => {
    // Basic setup, customize in each test
    mockGameReport = {
      // no backtrackEvents by default
    };
    mockGameStatus = "won"; // Default to won status
  });

  it("should return true if game is won and no backtrack events exist (undefined)", () => {
    mockGameReport.backtrackEvents = undefined;
    expect(
      juggernautAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(true);
  });

  it("should return true if game is won and backtrackEvents array is empty", () => {
    mockGameReport.backtrackEvents = [];
    expect(
      juggernautAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(true);
  });

  it("should return false if game is won but backtrack events exist", () => {
    mockGameReport.backtrackEvents = [
      { jumpedFrom: "wordA", landedOn: "wordB" },
    ];
    expect(
      juggernautAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });

  it("should return false if game status is not 'won'", () => {
    mockGameStatus = "playing";
    mockGameReport.backtrackEvents = [];
    expect(
      juggernautAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);

    mockGameStatus = "lost";
    expect(
      juggernautAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);

    mockGameStatus = "given_up";
    expect(
      juggernautAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });

  it("should return false if gameReport is null", () => {
    // @ts-expect-error testing null gameReport
    expect(juggernautAchievement.check(null, "won")).toBe(false);
  });
});
