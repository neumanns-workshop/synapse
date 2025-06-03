import { looseCannonWinsAchievement } from '../looseCannonWins.definition';
import type { GameReport, OptimalChoice } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Loose Cannon Wins Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  const createOptimalChoice = (isLeastSimilar: boolean): OptimalChoice => ({
    choseLeastSimilarNeighbor: isLeastSimilar,
    playerPosition: 'anyPlayerPos',
    playerChose: 'anyPlayerChoice',
    optimalChoice: 'anyOptimalChoice',
    isGlobalOptimal: false,
    isLocalOptimal: false,
  });

  beforeEach(() => {
    mockGameStatus = 'won'; // Default for this achievement
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it('should return true if won and chose least similar neighbor >= 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(true),
    ]; // 3 out of 4 = 75%
    expect(looseCannonWinsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true if won and chose least similar neighbor exactly 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(false),
    ]; // 2 out of 4 = 50%
    expect(looseCannonWinsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if won but chose least similar neighbor < 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(false),
      createOptimalChoice(false),
    ]; // 1 out of 4 = 25%
    expect(looseCannonWinsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'won\'', () => {
    mockGameStatus = 'given_up';
    mockGameReport.optimalChoices = [createOptimalChoice(true), createOptimalChoice(true)]; // 100%
    expect(looseCannonWinsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalChoices is empty', () => {
    mockGameReport.optimalChoices = [];
    expect(looseCannonWinsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalChoices is missing', () => {
    mockGameReport.optimalChoices = undefined;
    expect(looseCannonWinsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(looseCannonWinsAchievement.check(null, 'won')).toBe(false);
  });
}); 