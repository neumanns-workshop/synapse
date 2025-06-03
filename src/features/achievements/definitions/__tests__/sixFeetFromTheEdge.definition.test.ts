import { sixFeetFromTheEdgeAchievement } from '../sixFeetFromTheEdge.definition';
import type { GameReport } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Six Feet From the Edge Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  beforeEach(() => {
    mockGameStatus = 'given_up'; // Default
    mockGameReport = {
      suggestedPath: [],
    };
  });

  it('should return true if gave up with 1 move remaining', () => {
    mockGameReport.suggestedPath = ['current', 'end']; // 1 move remaining
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true if gave up with 2 moves remaining', () => {
    mockGameReport.suggestedPath = ['current', 'next', 'end']; // 2 moves remaining
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if gave up with 0 moves remaining (i.e. on target)', () => {
    mockGameReport.suggestedPath = ['end']; // 0 moves remaining
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gave up with > 2 moves remaining', () => {
    mockGameReport.suggestedPath = ['current', 'next1', 'next2', 'end']; // 3 moves remaining
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'given_up\'', () => {
    mockGameStatus = 'won';
    mockGameReport.suggestedPath = ['current', 'end'];
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if suggestedPath is empty or missing', () => {
    mockGameReport.suggestedPath = [];
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.suggestedPath = undefined;
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if suggestedPath has only one word (current word)', () => {
    mockGameReport.suggestedPath = ['current'];
    expect(sixFeetFromTheEdgeAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(sixFeetFromTheEdgeAchievement.check(null, 'given_up')).toBe(false);
  });
}); 