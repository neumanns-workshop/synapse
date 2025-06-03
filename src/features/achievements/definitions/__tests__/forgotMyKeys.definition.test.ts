import { forgotMyKeysAchievement } from '../forgotMyKeys.definition';
import type { GameReport } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Forgot My Keys Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  beforeEach(() => {
    mockGameStatus = 'given_up'; // Default status
    mockGameReport = {
      optimalPath: ['start', 'mid', 'end'], // Length 3
      suggestedPath: ['current', 'next', 'next_again', 'end'], // Length 4, longer than optimal
    };
  });

  it('should return true if game given_up and suggestedPath is longer than optimalPath', () => {
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if game given_up but suggestedPath is not longer than optimalPath', () => {
    mockGameReport.suggestedPath = ['current', 'end']; // Length 2, not longer
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.suggestedPath = ['current', 'next', 'end']; // Length 3, same as optimal
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'given_up\'', () => {
    mockGameStatus = 'won';
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameStatus = 'playing';
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(forgotMyKeysAchievement.check(null, 'given_up')).toBe(false);
  });

  it('should return false if suggestedPath is missing or empty', () => {
    mockGameReport.suggestedPath = undefined;
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.suggestedPath = [];
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalPath is missing or empty', () => {
    mockGameReport.optimalPath = undefined;
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.optimalPath = [];
    expect(forgotMyKeysAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });
}); 