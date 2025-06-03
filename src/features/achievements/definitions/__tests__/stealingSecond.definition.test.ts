import { stealingSecondAchievement } from '../stealingSecond.definition';
import type { GameReport, OptimalChoice } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Stealing Second Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  const createOptimalChoice = (isMostSimilar: boolean): OptimalChoice => ({
    choseMostSimilarNeighbor: isMostSimilar,
    playerPosition: 'anyPlayerPos',
    playerChose: 'anyPlayerChoice',
    optimalChoice: 'anyOptimalChoice',
    isGlobalOptimal: false,
    isLocalOptimal: false,
  });

  beforeEach(() => {
    mockGameStatus = 'given_up'; // Default for this achievement
    mockGameReport = {
      optimalChoices: [],
    };
  });

  it('should return true if gave up and chose most similar neighbor >= 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(true),
    ]; // 3 out of 4 = 75%
    expect(stealingSecondAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true if gave up and chose most similar neighbor exactly 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(true),
      createOptimalChoice(false),
    ]; // 2 out of 4 = 50%
    expect(stealingSecondAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if gave up but chose most similar neighbor < 50% of moves', () => {
    mockGameReport.optimalChoices = [
      createOptimalChoice(true),
      createOptimalChoice(false),
      createOptimalChoice(false),
      createOptimalChoice(false),
    ]; // 1 out of 4 = 25%
    expect(stealingSecondAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'given_up\'', () => {
    mockGameStatus = 'won';
    mockGameReport.optimalChoices = [createOptimalChoice(true), createOptimalChoice(true)]; // 100%
    expect(stealingSecondAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalChoices is empty', () => {
    mockGameReport.optimalChoices = [];
    expect(stealingSecondAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalChoices is missing', () => {
    mockGameReport.optimalChoices = undefined;
    expect(stealingSecondAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(stealingSecondAchievement.check(null, 'given_up')).toBe(false);
  });
}); 