// Test file for src/services/dataLoader.ts
import {
  loadGraphData,
  loadDefinitionsData,
  loadWordFrequencies,
  type GraphData,
  type DefinitionsData,
  type WordFrequencies
} from '../dataLoader';

// Mock the JSON imports
jest.mock('../../data/definitions.json', () => ({
  word1: ['Definition 1', 'Definition 2'],
  word2: ['Another definition']
}), { virtual: true });

jest.mock('../../data/filtered_word_frequencies.json', () => ({
  word1: 100,
  word2: 50,
  word3: 25
}), { virtual: true });

jest.mock('../../data/graph.json', () => ({
  nodes: {
    word1: {
      edges: { word2: 0.8 },
      tsne: [0.1, 0.2]
    },
    word2: {
      edges: { word1: 0.8, word3: 0.5 },
      tsne: [0.3, 0.4]
    },
    word3: {
      edges: { word2: 0.5 },
      tsne: [0.5, 0.6]
    }
  }
}), { virtual: true });

describe('dataLoader', () => {
  describe('loadGraphData', () => {
    it('should load graph data successfully from nested "nodes" structure', async () => {
      const graphData = await loadGraphData();
      
      // Check structure
      expect(graphData).toBeDefined();
      expect(Object.keys(graphData).length).toBe(3);
      
      // Check one node in detail
      expect(graphData.word1).toEqual({
        edges: { word2: 0.8 },
        tsne: [0.1, 0.2]
      });
      
      // Check connections
      expect(graphData.word2.edges).toHaveProperty('word1');
      expect(graphData.word2.edges).toHaveProperty('word3');
      expect(graphData.word3.edges).toHaveProperty('word2');
    });
  });
  
  describe('loadDefinitionsData', () => {
    it('should load definitions data successfully', async () => {
      const definitionsData = await loadDefinitionsData();
      
      // Check structure
      expect(definitionsData).toBeDefined();
      expect(Object.keys(definitionsData).length).toBe(2);
      
      // Check content
      expect(definitionsData.word1).toEqual(['Definition 1', 'Definition 2']);
      expect(definitionsData.word2).toEqual(['Another definition']);
    });
  });
  
  describe('loadWordFrequencies', () => {
    it('should load word frequencies data successfully', async () => {
      const wordFrequencies = await loadWordFrequencies();
      
      // Check structure
      expect(wordFrequencies).toBeDefined();
      expect(Object.keys(wordFrequencies).length).toBe(3);
      
      // Check content
      expect(wordFrequencies.word1).toBe(100);
      expect(wordFrequencies.word2).toBe(50);
      expect(wordFrequencies.word3).toBe(25);
    });
  });
}); 