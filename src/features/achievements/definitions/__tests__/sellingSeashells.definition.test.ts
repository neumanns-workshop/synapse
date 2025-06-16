import type { GameState } from "../../../../stores/useGameStore";
import type { GameReport } from "../../../../utils/gameReportUtils";
import { sellingSeashellsAchievement } from "../sellingSeashells.definition";

describe("Selling Seashells Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  beforeEach(() => {
    mockGameStatus = "won"; // Default
    mockGameReport = {
      playerPath: [],
    };
  });

  it("should return true if game won and five consecutive words start with the same letter (lowercase)", () => {
    mockGameReport.playerPath = [
      "apple",
      "apricot",
      "avocado",
      "almond",
      "alligator",
      "banana",
    ];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if game won and five consecutive words start with the same letter (mixed case)", () => {
    mockGameReport.playerPath = [
      "Pear",
      "peach",
      "PLUM",
      "passionfruit",
      "papaya",
      "grape",
    ];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if sequence is at the end of the path", () => {
    mockGameReport.playerPath = [
      "banana",
      "kiwi",
      "kumquat",
      "keylime",
      "kale",
      "kohlrabi",
    ];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if fewer than five consecutive words start with the same letter", () => {
    mockGameReport.playerPath = ["salt", "sugar", "pepper", "spice", "sage"];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if four consecutive, then a different one, then the same letter again", () => {
    mockGameReport.playerPath = ["cat", "car", "cup", "cart", "dog", "cab"];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if playerPath is too short (less than 5 words)", () => {
    mockGameReport.playerPath = ["a", "a", "a", "a"];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should handle empty strings in path gracefully (should not match or error)", () => {
    mockGameReport.playerPath = ["", "", "", "word"];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    mockGameReport.playerPath = ["apple", "", "", "apricot"];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'won'", () => {
    mockGameStatus = "given_up";
    mockGameReport.playerPath = ["yes", "yellow", "yummy"];
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if playerPath is missing or gameReport is null", () => {
    mockGameReport.playerPath = undefined;
    expect(
      sellingSeashellsAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    // @ts-expect-error testing null gameReport
    expect(sellingSeashellsAchievement.check(null, "won")).toBe(false);
  });
});
