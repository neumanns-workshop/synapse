import { evaluateAchievements } from '../logic';
import type { Achievement } from '../achievement.types';
import type { GameReport } from '../../../utils/gameReportUtils';
import type { GameState } from '../../../stores/useGameStore';

// Mock a single achievement
const mockAchievement = (id: string, shouldPass: boolean): Achievement => ({
  id,
  name: `Test Achievement ${id}`,
  description: `This is a test achievement: ${id}`,
  check: jest.fn(() => shouldPass),
});

describe('evaluateAchievements', () => {
  let mockGameReport: GameReport;
  let mockGameStatus: GameState['gameStatus'];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock game report (can be customized per test)
    mockGameReport = {
      playerPath: ['start', 'middle', 'end'],
      optimalPath: ['start', 'optimal', 'end'],
      suggestedPath: ['start', 'optimal', 'end'],
      optimalMovesMade: 1,
      totalMoves: 2,
      moveAccuracy: 0.5,
      optimalChoices: [],
      missedOptimalMoves: ['middle'],
      playerSemanticDistance: 2,
      optimalSemanticDistance: 1.5,
      averageSimilarity: 0.75,
      id: 'test-game-123',
      timestamp: Date.now(),
      startTime: Date.now() - 10000,
      startWord: 'start',
      targetWord: 'end',
      status: 'won',
      pathEfficiency: 0.75,
      // Ensure all required fields are present, even if empty or default
      backtrackEvents: [],
      potentialRarestMoves: [],
      earnedAchievements: [],
    };

    mockGameStatus = 'won';
  });

  it('should return an empty array if gameReport is null or undefined', () => {
    // @ts-expect-error testing null case
    expect(evaluateAchievements(null, mockGameStatus)).toEqual([]);
    // @ts-expect-error testing undefined case
    expect(evaluateAchievements(undefined, mockGameStatus)).toEqual([]);
  });

  it('should call the check method for each achievement', () => {
    const ach1 = mockAchievement('ach1', true);
    const ach2 = mockAchievement('ach2', false);
    const ach3 = mockAchievement('ach3', true);
    const mockAllAchievements = [ach1, ach2, ach3];

    // Mocking the imported allAchievements
    jest.doMock('../definitions', () => ({
      allAchievements: mockAllAchievements,
    }));

    // We need to re-require evaluateAchievements or ensure the module system
    // picks up the mock before this evaluateAchievements is defined.
    // For simplicity in this example, let's assume jest.doMock handles it,
    // or we would structure it to import after mocking.
    // A more robust way is to pass allAchievements as an argument if possible,
    // or use jest.isolateModules to re-import.

    // To ensure the mock is used, we'll use requireActual and then spy.
    // This is a bit of a workaround for direct import and jest.doMock timing.
    const actualLogic = jest.requireActual('../logic');
    const achievementsModule = jest.requireActual('../definitions');
    achievementsModule.allAchievements = mockAllAchievements; // Override

    const result = actualLogic.evaluateAchievements(mockGameReport, mockGameStatus);

    expect(ach1.check).toHaveBeenCalledWith(mockGameReport, mockGameStatus);
    expect(ach2.check).toHaveBeenCalledWith(mockGameReport, mockGameStatus);
    expect(ach3.check).toHaveBeenCalledWith(mockGameReport, mockGameStatus);
  });

  it('should return only achievements whose check method returns true', () => {
    const ach1 = mockAchievement('ach1', true);
    const ach2 = mockAchievement('ach2', false);
    const ach3 = mockAchievement('ach3', true);
    const mockAllAchievements = [ach1, ach2, ach3];

    const actualLogic = jest.requireActual('../logic');
    const achievementsModule = jest.requireActual('../definitions');
    achievementsModule.allAchievements = mockAllAchievements;


    const result = actualLogic.evaluateAchievements(mockGameReport, mockGameStatus);

    expect(result).toEqual([ach1, ach3]);
    expect(result.length).toBe(2);
  });

  it('should handle an empty allAchievements array', () => {
     const actualLogic = jest.requireActual('../logic');
    const achievementsModule = jest.requireActual('../definitions');
    achievementsModule.allAchievements = []; // Override with empty

    const result = actualLogic.evaluateAchievements(mockGameReport, mockGameStatus);
    expect(result).toEqual([]);
  });
});

// --- Tests for Individual Achievements --- // THIS SECTION WILL BE REMOVED
// ... (all the describe blocks for Juggernaut, Straight and Narrow, Comeback Kid will be removed) ... 