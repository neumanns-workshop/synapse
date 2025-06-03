import { sorryWrongRoomAchievement } from '../sorryWrongRoom.definition';
import type { GameReport, BacktrackReportEntry } from '../../../../utils/gameReportUtils';
import type { GameState } from '../../../../stores/useGameStore';

describe('Sorry, Wrong Room Achievement', () => {
  let mockGameReport: Partial<GameReport>;
  let mockGameStatus: GameState['gameStatus'];

  const createBacktrackEvent = (id: number): BacktrackReportEntry => ({
    jumpedFrom: `word${id}A`,
    landedOn: `word${id}B`,
  });

  beforeEach(() => {
    mockGameStatus = 'won'; // Default
    mockGameReport = {
      backtrackEvents: [],
    };
  });

  it('should return true if game won and backtrackEvents length > 3', () => {
    mockGameReport.backtrackEvents = [
      createBacktrackEvent(1),
      createBacktrackEvent(2),
      createBacktrackEvent(3),
      createBacktrackEvent(4),
    ]; // Length 4
    mockGameStatus = 'won';
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return true if game given_up and backtrackEvents length > 3', () => {
    mockGameReport.backtrackEvents = Array(5).fill(null).map((_, i) => createBacktrackEvent(i)); // Length 5
    mockGameStatus = 'given_up';
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(true);
  });

  it('should return false if backtrackEvents length is 3 or less', () => {
    mockGameReport.backtrackEvents = Array(3).fill(null).map((_, i) => createBacktrackEvent(i)); // Length 3
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.backtrackEvents = [createBacktrackEvent(1)]; // Length 1
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
    mockGameReport.backtrackEvents = []; // Length 0
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if game status is not \'won\' or \'given_up\'', () => {
    mockGameStatus = 'playing';
    mockGameReport.backtrackEvents = Array(4).fill(null).map((_, i) => createBacktrackEvent(i));
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if backtrackEvents is missing', () => {
    mockGameReport.backtrackEvents = undefined;
    expect(sorryWrongRoomAchievement.check(mockGameReport as GameReport, mockGameStatus)).toBe(false);
  });

  it('should return false if gameReport is null', () => {
    // @ts-expect-error testing null gameReport
    expect(sorryWrongRoomAchievement.check(null, 'won')).toBe(false);
  });
}); 