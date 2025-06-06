import type { GameState } from "../../../../stores/useGameStore";
import type {
  GameReport,
  OptimalChoice,
} from "../../../../utils/gameReportUtils";
import { dancingToADifferentBeatAchievement } from "../dancingToADifferentBeat.definition";

describe("Dancing to a Different Beat Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  const createOptimalChoice = (isGlobal: boolean): OptimalChoice => ({
    isGlobalOptimal: isGlobal,
    // Fill other required fields with defaults
    playerPosition: "anyPlayerPos",
    playerChose: "anyPlayerChoice",
    optimalChoice: "anyOptimalChoice",
    isLocalOptimal: false, // Not directly used by this achievement's logic but required by type
  });

  beforeEach(() => {
    mockGameStatus = "won"; // Default
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it("should return true if won and no move except the last was globally optimal", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false),
      createOptimalChoice(false),
      createOptimalChoice(true), // Last move, can be optimal
    ];
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if only two moves, first not global, second is global", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false),
      createOptimalChoice(true),
    ];
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if an early move was globally optimal", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(false),
      createOptimalChoice(true), // Early global optimal move
      createOptimalChoice(false),
      createOptimalChoice(true),
    ];
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices length is 1 or less", () => {
    mockGameReport.optimalChoices = [createOptimalChoice(true)]; // Length 1
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    mockGameReport.optimalChoices = []; // Length 0
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'won'", () => {
    mockGameStatus = "given_up";
    mockGameReport.optimalChoices = [
      createOptimalChoice(false),
      createOptimalChoice(true),
    ];
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices is missing or gameReport is null", () => {
    mockGameReport.optimalChoices = undefined;
    expect(
      dancingToADifferentBeatAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
    // @ts-expect-error testing null gameReport
    expect(dancingToADifferentBeatAchievement.check(null, "won")).toBe(false);
  });
});
