import type { GameState } from "../../../../stores/useGameStore";
import type { GameReport } from "../../../../utils/gameReportUtils";
import { dejaVuAchievement } from "../dejaVu.definition";

describe("Déjà Vu Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  beforeEach(() => {
    mockGameStatus = "won"; // Default status
    mockGameReport = {
      playerPath: [], // Default empty path
    };
  });

  it("should return true if at least two words are revisited (game won)", () => {
    mockGameReport.playerPath = [
      "apple",
      "banana",
      "apple",
      "cherry",
      "banana",
    ];
    mockGameStatus = "won";
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(true);
  });

  it("should return true if at least two words are revisited (game given_up)", () => {
    mockGameReport.playerPath = ["one", "two", "one", "three", "two"];
    mockGameStatus = "given_up";
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(true);
  });

  it("should return false if only one word is revisited", () => {
    mockGameReport.playerPath = ["alpha", "beta", "alpha", "gamma"];
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });

  it("should return false if no word is revisited", () => {
    mockGameReport.playerPath = ["alpha", "beta", "gamma", "delta"];
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });

  it("should return false if playerPath is too short (less than 4 words)", () => {
    mockGameReport.playerPath = ["a", "b", "a"];
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
    mockGameReport.playerPath = ["a", "b"];
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
    mockGameReport.playerPath = [];
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });

  it("should return false if game status is not 'won' or 'given_up'", () => {
    mockGameReport.playerPath = ["x", "y", "x"];
    mockGameStatus = "playing";
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
    mockGameStatus = "lost";
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });

  it("should return false if gameReport is null", () => {
    // @ts-expect-error testing null gameReport
    expect(dejaVuAchievement.check(null, "won")).toBe(false);
  });

  it("should return false if playerPath is missing", () => {
    mockGameReport.playerPath = undefined;
    expect(
      dejaVuAchievement.check(mockGameReport as GameReport, mockGameStatus),
    ).toBe(false);
  });
});
