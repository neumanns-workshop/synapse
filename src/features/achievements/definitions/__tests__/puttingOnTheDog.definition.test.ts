import { puttingOnTheDogAchievement } from '../puttingOnTheDog.definition';
import type { GameReport, PotentialRarestMove } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Putting on the Dog Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  const createPotentialRarestMove = (
    word: string,
    frequency: number,
    playerChose: boolean,
  ): PotentialRarestMove => ({
    word,
    frequency,
    playerChoseThisRarestOption: playerChose,
  });

  beforeEach(() => {
    mockGameStatus = 'won'; // Default
    mockGameReport = {
      potentialRarestMoves: [],
    };
  });

  it('should return true if game won and player chose one of the overall rarest words offered', () => {
    mockGameReport.potentialRarestMoves = [
      createPotentialRarestMove('common', 100, false),
      createPotentialRarestMove('rare1', 10, true), // Player chose this rarest one
      createPotentialRarestMove('rare2', 10, false),
      createPotentialRarestMove('medium', 50, false),
    ];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true if multiple words had the same overall rarest frequency and player chose one', () => {
    mockGameReport.potentialRarestMoves = [
      createPotentialRarestMove('rareA', 5, false),
      createPotentialRarestMove('rareB', 5, true), // Player chose this one
      createPotentialRarestMove('commonC', 20, false),
    ];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if player chose a rare word, but not THE overall rarest offered', () => {
    mockGameReport.potentialRarestMoves = [
      createPotentialRarestMove('ultra_rare', 1, false), // Overall rarest, not chosen
      createPotentialRarestMove('very_rare', 5, true),  // Chosen, but not the overall rarest
      createPotentialRarestMove('common', 100, false),
    ];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if player never chose any of the overall rarest words', () => {
    mockGameReport.potentialRarestMoves = [
      createPotentialRarestMove('rareX', 7, false),
      createPotentialRarestMove('rareY', 7, false),
      createPotentialRarestMove('not_so_rare', 15, true), // Player chose this, but not the rarest
    ];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if all offered words have Infinity frequency (edge case, though unlikely)', () => {
    mockGameReport.potentialRarestMoves = [
      createPotentialRarestMove('inf1', Infinity, true),
      createPotentialRarestMove('inf2', Infinity, false),
    ];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'won\'', () => {
    mockGameStatus = 'given_up';
    mockGameReport.potentialRarestMoves = [createPotentialRarestMove('any', 10, true)];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if potentialRarestMoves is empty or missing', () => {
    mockGameReport.potentialRarestMoves = [];
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.potentialRarestMoves = undefined;
    expect(puttingOnTheDogAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(puttingOnTheDogAchievement.check(null, 'won')).toBe(false);
  });
}); 