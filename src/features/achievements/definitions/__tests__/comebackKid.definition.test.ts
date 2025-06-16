import type { GameState } from "../../../../stores/useGameStore";
import type { GameReport } from "../../../../utils/gameReportUtils";
import { comebackKidAchievement } from "../comebackKid.definition";

describe("Comeback Kid Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  beforeEach(() => {
    mockGameStatus = "won";
    mockGameReport = {
      optimalPath: ["start", "mid1", "mid2", "end"], // initialHopsToEnd = 3
      optimalChoices: [],
    };
  });

  it("should return false if game is won and player was only one step further from target than at start", () => {
    mockGameReport.optimalChoices = [
      {
        playerPosition: "s",
        playerChose: "a",
        optimalChoice: "b",
        isGlobalOptimal: false,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 2,
      },
      {
        playerPosition: "a",
        playerChose: "x",
        optimalChoice: "y",
        isGlobalOptimal: false,
        isLocalOptimal: false,
        hopsFromPlayerPositionToEnd: 4,
      }, // Further than initial 3 hops
      {
        playerPosition: "x",
        playerChose: "e",
        optimalChoice: "e",
        isGlobalOptimal: true,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 1,
      },
    ];
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return true if game is won and player was at least two steps further from target", () => {
    mockGameReport.optimalChoices = [
      {
        playerPosition: "s",
        playerChose: "a",
        optimalChoice: "b",
        isGlobalOptimal: false,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 2,
      },
      {
        playerPosition: "a",
        playerChose: "x",
        optimalChoice: "y",
        isGlobalOptimal: false,
        isLocalOptimal: false,
        hopsFromPlayerPositionToEnd: 5,
      }, // 2 steps further than initial 3 hops
      {
        playerPosition: "x",
        playerChose: "e",
        optimalChoice: "e",
        isGlobalOptimal: true,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 1,
      },
    ];
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if game is won but player was never further from target than at start", () => {
    mockGameReport.optimalChoices = [
      {
        playerPosition: "s",
        playerChose: "a",
        optimalChoice: "b",
        isGlobalOptimal: false,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 2,
      },
      {
        playerPosition: "a",
        playerChose: "c",
        optimalChoice: "c",
        isGlobalOptimal: true,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 1,
      },
    ];
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if hopsFromPlayerPositionToEnd is never defined", () => {
    mockGameReport.optimalChoices = [
      {
        playerPosition: "s",
        playerChose: "a",
        optimalChoice: "b",
        isGlobalOptimal: false,
        isLocalOptimal: true,
      }, // hops undefined
    ];
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'won'", () => {
    mockGameStatus = "playing";
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if gameReport is null", () => {
    // @ts-expect-error testing null gameReport
    expect(comebackKidAchievement.check(null, "won")).toBe(false);
  });

  it("should return false if optimalPath is missing or empty", () => {
    mockGameReport.optimalPath = undefined;
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    mockGameReport.optimalPath = [];
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices is missing or empty", () => {
    mockGameReport.optimalChoices = undefined;
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    mockGameReport.optimalChoices = [];
    expect(
      comebackKidAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });
});
