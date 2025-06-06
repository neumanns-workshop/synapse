import {
  loadGraphData,
  loadDefinitionsData,
  loadWordFrequencies,
} from "../../services/dataLoader";
import {
  saveCurrentGame,
  recordEndedGame,
} from "../../services/StorageAdapter";
// import { wordCollections } from '../../data/wordCollections';

jest.mock("../../services/dataLoader");
jest.mock("../../services/StorageAdapter");
// jest.mock('../../data/wordCollections');

describe("Minimal test", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
