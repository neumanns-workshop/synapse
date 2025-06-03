import { hereBeDragonsAchievement } from '../hereBeDragons.definition';
import type { GameReport } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Here Be Dragons Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  beforeEach(() => {
    mockGameStatus = 'won'; // Default
    mockGameReport = {
      playerPath: [],
      optimalPath: [],
    };
  });

  // S = Start, O = Optimal, P = Player Path, E = End
  // Optimal: S -> O1 -> O2 -> O3 -> E

  it('should return true for: Optimal -> Deviate -> Return to Optimal (won)', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'O3', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'P_Deviate1', 'O2', 'O3', 'E']; // S->O1 (optimal), O1->P_Deviate1 (deviate), P_Deviate1->O2 (return)
    mockGameStatus = 'won';
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true for: Optimal -> Deviate -> Return to different Optimal (given_up)', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'O3', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'P_Deviate1', 'P_Deviate2', 'O3']; // S->O1 (optimal), O1->P_Deviate1 (deviate), P_Deviate2->O3 (return to later optimal)
    mockGameStatus = 'given_up';
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true for: Optimal -> Optimal -> Deviate -> Return to Optimal', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'O3', 'O4', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'O2', 'P_Deviate1', 'O3', 'O4', 'E']; // S->O1->O2 (optimal), O2->P_Deviate1 (deviate), P_Deviate1->O3 (return)
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if never makes an optimal step before deviating', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'E'];
    mockGameReport.playerPath = ['S', 'P_Deviate1', 'O1', 'O2', 'E']; // Deviated from S immediately
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if makes optimal step, deviates, but never returns to optimal path', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'P_Deviate1', 'P_Deviate2', 'P_End']; // S->O1 (optimal), O1->P_Deviate1 (deviate), never returns
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if player path is entirely optimal', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'O2', 'E'];
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if player deviates but never made an initial optimal move', () => {
    // Optimal: A -> B -> C. Player: A -> X -> B (Deviation A->X is not qualified)
    mockGameReport.optimalPath = ['A', 'B', 'C'];
    mockGameReport.playerPath = ['A', 'X', 'B'];
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return true if returns to an earlier optimal word after deviation', () => {
    // Optimal: S -> O1 -> O2 -> O3 -> E. Player: S -> O1 -> P_Deviate -> O1
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'O3', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'P_Deviate1', 'O1', 'O2', 'E'];
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false for game status not \'won\' or \'given_up\'', () => {
    mockGameReport.optimalPath = ['S', 'O1', 'O2', 'O3', 'E'];
    mockGameReport.playerPath = ['S', 'O1', 'P_Deviate1', 'O2', 'O3', 'E'];
    mockGameStatus = 'playing';
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false for short playerPath or optimalPath', () => {
    mockGameReport.playerPath = ['S'];
    mockGameReport.optimalPath = ['S', 'E'];
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.playerPath = ['S', 'E'];
    mockGameReport.optimalPath = [];
    expect(hereBeDragonsAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(hereBeDragonsAchievement.check(null, 'won')).toBe(false);
  });
}); 