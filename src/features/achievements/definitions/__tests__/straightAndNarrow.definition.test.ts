import { straightAndNarrowAchievement } from '../straightAndNarrow.definition';
import type { GameReport } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Straight and Narrow Achievement', () => {
  let mockGameReport: Partial<GameReport>; // Use Partial for easier test-specific setup
  let mockGameStatus: GameState['gameStatus'];

  beforeEach(() => {
    mockGameStatus = 'won'; // Default to won status
    mockGameReport = {
      playerPath: ['a', 'b', 'c'], // Default player path
      optimalPath: ['a', 'b', 'c'], // Default optimal path, same length
    };
  });

  it('should return true if game is won and playerPath length equals optimalPath length', () => {
    expect(straightAndNarrowAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if game is won but playerPath length does not equal optimalPath length', () => {
    mockGameReport.playerPath = ['a', 'b', 'x', 'c']; // Player took a longer path
    expect(straightAndNarrowAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'won\'', () => {
    mockGameStatus = 'playing';
    expect(straightAndNarrowAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameStatus = 'lost';
    expect(straightAndNarrowAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(straightAndNarrowAchievement.check(null, 'won')).toBe(false);
  });

  it('should return false if playerPath is missing', () => {
    mockGameReport.playerPath = undefined;
    expect(straightAndNarrowAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if optimalPath is missing', () => {
    mockGameReport.optimalPath = undefined;
    expect(straightAndNarrowAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });
}); 