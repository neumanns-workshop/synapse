import type { GameState } from "../../../../stores/useGameStore";
import type { GameReport } from "../../../../utils/gameReportUtils";
import { epicyclesUponEpicyclesAchievement } from "../epicyclesUponEpicycles.definition";

describe("Epicycles Upon Epicycles Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  beforeEach(() => {
    mockGameStatus = "won"; // Default status
    mockGameReport = {
      playerPath: [],
    };
  });

  it("should return true if at least two different words are revisited (game won)", () => {
    mockGameReport.playerPath = ["a", "b", "c", "a", "d", "b", "e"]; // 'a' and 'b' revisited
    mockGameStatus = "won";
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if at least two different words are revisited (game given_up)", () => {
    mockGameReport.playerPath = ["x", "y", "z", "y", "x", "w"]; // 'x' and 'y' revisited
    mockGameStatus = "given_up";
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if only one distinct word is revisited multiple times", () => {
    mockGameReport.playerPath = ["fee", "fi", "fo", "fum", "fi", "fi"]; // Only 'fi' revisited
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if only one word is revisited once", () => {
    mockGameReport.playerPath = ["one", "two", "three", "one", "four"]; // Only 'one' revisited
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if no words are revisited", () => {
    mockGameReport.playerPath = ["q", "w", "e", "r", "t", "y"];
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if playerPath is too short (less than 5 words)", () => {
    mockGameReport.playerPath = ["a", "b", "a", "c"]; // Length 4
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'won' or 'given_up'", () => {
    mockGameReport.playerPath = ["a", "b", "c", "a", "d", "b", "e"];
    mockGameStatus = "playing";
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if gameReport is null", () => {
    // @ts-expect-error testing null gameReport
    expect(epicyclesUponEpicyclesAchievement.check(null, "won")).toBe(false);
  });

  it("should return false if playerPath is missing", () => {
    mockGameReport.playerPath = undefined;
    expect(
      epicyclesUponEpicyclesAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });
});
