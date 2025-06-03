import { slowAndSteadyAchievement } from '../slowAndSteady.definition';
import type { GameReport, OptimalChoice } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Slow and Steady Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  const createOptimalChoice = (isMostSimilar: boolean): OptimalChoice => ({
    choseMostSimilarNeighbor: isMostSimilar,
    // Fill other required fields with defaults
    playerPosition: 'anyPlayerPos',
    playerChose: 'anyPlayerChoice',
    optimalChoice: 'anyOptimalChoice',
    isGlobalOptimal: false,
    isLocalOptimal: false,
    // Ensure other optional boolean fields that might affect logic are explicitly set if necessary
    // For this achievement, only choseMostSimilarNeighbor is key.
  });

  beforeEach(() => {
    mockGameStatus = 'won'; // Default for this achievement
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it('should return true if won and chose most similar neighbor >= 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(true),
    ]; // 3 out of 4 = 75%
    expect(slowAndSteadyAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true if won and chose most similar neighbor exactly 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(false),
    ]; // 2 out of 4 = 50%
    expect(slowAndSteadyAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if won but chose most similar neighbor < 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(false),
      createOptimalChoice(false),
    ]; // 1 out of 4 = 25%
    expect(slowAndSteadyAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'won\'', () => {
    mockGameStatus = 'given_up';
    mockGameReport.optimalChoices = [createOptimalChoice(true), createOptimalChoice(true)]; // 100%
    expect(slowAndSteadyAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalChoices is empty', () => {
    mockGameReport.optimalChoices = [];
    expect(slowAndSteadyAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalChoices is missing', () => {
    mockGameReport.optimalChoices = undefined;
    expect(slowAndSteadyAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(slowAndSteadyAchievement.check(null, 'won')).toBe(false);
  });
}); 