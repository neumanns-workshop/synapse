import type { GameState } from "../../../../stores/useGameStore";
import type {
  GameReport,
  OptimalChoice,
} from "../../../../utils/gameReportUtils";
import { looseCannonAchievement } from "../looseCannon.definition";

describe("Loose Cannon Achievement", () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState["gameStatus"];

  // Helper to create a complete OptimalChoice object for testing this achievement
  const createOptimalChoice = (isLeastSimilar: boolean): OptimalChoice => ({
    choseLeastSimilarNeighbor: isLeastSimilar,
    // Fill other required OptimalChoice fields with defaults
    playerPosition: "anyPlayerPos",
    playerChose: "anyPlayerChoice",
    optimalChoice: "anyOptimalChoice",
    isGlobalOptimal: false,
    isLocalOptimal: false,
    // Optional fields can be omitted or set to defaults if needed for other tests
    // choseMostSimilarNeighbor: false, // Example if needed
    // choseRarestNeighbor: false, // Example if needed
    // hopsFromPlayerPositionToEnd: 0, // Example if needed
  });

  beforeEach(() => {
    mockGameStatus = "given_up"; // Default
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it("should return true if gave up and chose least similar neighbor >= 50% of moves", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(true),
    ]; // 3 out of 4 = 75%
    expect(
      looseCannonAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return true if gave up and chose least similar neighbor exactly 50% of moves", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(false),
    ]; // 2 out of 4 = 50%
    expect(
      looseCannonAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(true);
  });

  it("should return false if gave up but chose least similar neighbor < 50% of moves", () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(false),
      createOptimalChoice(false),
    ]; // 1 out of 4 = 25%
    expect(
      looseCannonAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if game status is not 'given_up'", () => {
    mockGameStatus = "won";
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(true),
    ]; // 100%
    expect(
      looseCannonAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices is empty", () => {
    mockGameReport.optimalChoices = [];
    expect(
      looseCannonAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if optimalChoices is missing", () => {
    mockGameReport.optimalChoices = undefined;
    expect(
      looseCannonAchievement.check(
        mockGameReport as GameReport,
        mockGameStatus,
      ),
    ).toBe(false);
  });

  it("should return false if gameReport is null", () => {
    // @ts-expect-error testing null gameReport
    expect(looseCannonAchievement.check(null, "given_up")).toBe(false);
  });
});
