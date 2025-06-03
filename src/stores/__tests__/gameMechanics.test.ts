import { loadGraphData, loadDefinitionsData, loadWordFrequencies } from '../../services/dataLoader';
import { saveCurrentGame, recordEndedGame } from '../../services/StorageService';
// import { wordCollections } from '../../data/wordCollections';

jest.mock('../../services/dataLoader');
jest.mock('../../services/StorageService');
// jest.mock('../../data/wordCollections');

describe('Minimal test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
}); 