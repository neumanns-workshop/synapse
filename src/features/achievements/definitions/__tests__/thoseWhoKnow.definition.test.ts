import type { GameState } from "../../../../stores/useGameStore";
import type {
  GameReport,
  OptimalChoice,
} from "../../../../utils/gameReportUtils";
import { thoseWhoKnowAchievement } from "../thoseWhoKnow.definition";

describe("Those Who Know Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  const createOptimalChoice = (
    choseRarest: boolean,
    isGlobal: boolean,
    isLocal: boolean,
  ): OptimalChoice => ({
    choseRarestNeighbor: choseRarest,
    isGlobalOptimal: isGlobal,
    isLocalOptimal: isLocal,
    // Fill other required fields with defaults
    playerPosition: "anyPlayerPos",
    playerChose: "anyPlayerChoice",
    optimalChoice: "anyOptimalChoice",
  });

  beforeEach(() => {
    mockGameStatus = "won"; // Default
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it("should return true if a move was rarest AND global optimal (game won)", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(true, true, false)];
    mockGameStatus = "won";
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if a move was rarest AND local optimal (game given_up)", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(true, false, true)];
    mockGameStatus = "given_up";
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if a move was rarest AND both global and local optimal", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(true, true, true)];
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if rarest choice was not optimal", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(true, false, false)];
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimal choice was not rarest", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(false, true, true)];
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if no move meets the criteria", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false, false, false),
      createOptimalChoice(true, false, false),
      createOptimalChoice(false, true, false),
    ];
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'won' or 'given_up'", () => {
    mockGameStatus = "playing";
    mockGameReport.optimalChoices = [createOptimalChoice(true, true, true)];
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices is empty or missing", () => {
    mockGameReport.optimalChoices = [];
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    mockGameReport.optimalChoices = undefined;
    expect(
      thoseWhoKnowAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if gameReport is null", () => {
    // @ts-expect-error testing null gameReport
    expect(thoseWhoKnowAchievement.check(null, "won")).toBe(false);
  });
});
