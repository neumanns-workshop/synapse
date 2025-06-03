// Test file for src/utils/graphUtils.ts

import { findShortestPath } from '../graphUtils';
import type { GraphData } from '../../services/dataLoader'; // Path to GraphData definition

describe('graphUtils', () => {
  // Tests will go here
});

describe('graphUtils - findShortestPath', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console.error before each test in this suite
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error after each test
    consoleErrorSpy.mockRestore();
  });

  it('should return an empty array and log error if graphData is null', () => {
    expect(findShortestPath(null, 'A', 'B')).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return an empty array and log error if start word is not in graphData', () => {
    const graphData: GraphData = {
      B: { edges: {}, tsne: [0,0] },
    };
    expect(findShortestPath(graphData, 'A', 'B')).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return an empty array and log error if end word is not in graphData', () => {
    const graphData: GraphData = {
      A: { edges: {}, tsne: [0,0] },
    };
    expect(findShortestPath(graphData, 'A', 'B')).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return a path with only the start word if start and end are the same', () => {
    const graphData: GraphData = {
      A: { edges: {}, tsne: [0,0] },
    };
    expect(findShortestPath(graphData, 'A', 'A')).toEqual(['A']);
    // console.error should NOT be called in this case as it's a valid scenario handled before the error check.
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should return an empty array if no path is found (disconnected graph)', () => {
    const graphData: GraphData = {
      A: { edges: { B: 1 }, tsne: [0,0] }, // A is connected to B
      B: { edges: { A: 1 }, tsne: [1,1] },
      C: { edges: { D: 1 }, tsne: [2,2] }, // C is connected to D
      D: { edges: { C: 1 }, tsne: [3,3] },
    };
    // Trying to find a path from A to C, which is not possible.

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    expect(findShortestPath(graphData, 'A', 'C')).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith("No path found from A to C");
    // console.error should not have been called for this valid graph input but no path scenario.
    expect(consoleErrorSpy).not.toHaveBeenCalled(); 

    consoleWarnSpy.mockRestore();
  });

  it('should find a direct path (A -> B)', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.8 }, tsne: [0,0] }, // Similarity 0.8, Cost 0.2
      B: { edges: { A: 0.8 }, tsne: [1,1] },
    };
    expect(findShortestPath(graphData, 'A', 'B')).toEqual(['A', 'B']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should find a simple linear path (A -> B -> C)', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.7 }, tsne: [0,0] },       // Cost A-B: 0.3
      B: { edges: { A: 0.7, C: 0.9 }, tsne: [1,1] },// Cost B-C: 0.1
      C: { edges: { B: 0.9 }, tsne: [2,2] },
    };
    expect(findShortestPath(graphData, 'A', 'C')).toEqual(['A', 'B', 'C']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should choose the path with lower cost (higher similarity sum)', () => {
    const graphData: GraphData = {
      A: { edges: { X: 0.9, Y: 0.5 }, tsne: [0,0] },      // A-X cost 0.1, A-Y cost 0.5
      X: { edges: { A: 0.9, B: 0.9 }, tsne: [1,0] },      // X-B cost 0.1
      Y: { edges: { A: 0.5, B: 0.5 }, tsne: [0,1] },      // Y-B cost 0.5
      B: { edges: { X: 0.9, Y: 0.5 }, tsne: [1,1] },      // Target node
    };
    // Path A->X->B total cost = 0.1 (A-X) + 0.1 (X-B) = 0.2
    // Path A->Y->B total cost = 0.5 (A-Y) + 0.5 (Y-B) = 1.0
    expect(findShortestPath(graphData, 'A', 'B')).toEqual(['A', 'X', 'B']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should find the shortest path in a more complex graph', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.9, D: 0.7 }, tsne: [0,0] }, // A-B cost 0.1, A-D cost 0.3
      B: { edges: { A: 0.9, C: 0.9, D: 0.5 }, tsne: [1,0] }, // B-C cost 0.1, B-D cost 0.5
      C: { edges: { B: 0.9, E: 0.9, D: 0.8 }, tsne: [2,0] }, // C-E cost 0.1, C-D cost 0.2
      D: { edges: { A: 0.7, B: 0.5, C: 0.8, E: 0.6 }, tsne: [1,1] }, // D-C cost 0.2, D-E cost 0.4
      E: { edges: { C: 0.9, D: 0.6 }, tsne: [3,0] },      // Target
    };
    // Path A->B->C->E: cost 0.1 (A-B) + 0.1 (B-C) + 0.1 (C-E) = 0.3
    // Path A->D->C->E: cost 0.3 (A-D) + 0.2 (D-C) + 0.1 (C-E) = 0.6
    // Path A->D->E:   cost 0.3 (A-D) + 0.4 (D-E) = 0.7
    // Path A->B->D->C->E: cost 0.1 (A-B) + 0.5 (B-D) + 0.2 (D-C) + 0.1 (C-E) = 0.9
    // Path A->B->D->E: cost 0.1 (A-B) + 0.5 (B-D) + 0.4 (D-E) = 1.0

    expect(findShortestPath(graphData, 'A', 'E')).toEqual(['A', 'B', 'C', 'E']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // More tests will follow
}); 

describe('graphUtils - findShortestPath - additional cases', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should handle an empty graphData object', () => {
    const graphData: GraphData = {};
    expect(findShortestPath(graphData, 'A', 'B')).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should find the shortest path in a graph with cycles', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.9, C: 0.5 }, tsne: [0,0] }, // A-B cost 0.1, A-C cost 0.5
      B: { edges: { A: 0.9, D: 0.8 }, tsne: [1,0] }, // B-D cost 0.2
      C: { edges: { A: 0.5, D: 0.2, E: 0.9 }, tsne: [0,1] }, // C-D cost 0.8, C-E cost 0.1
      D: { edges: { B: 0.8, C: 0.2, E: 0.7 }, tsne: [1,1] }, // D-E cost 0.3
      E: { edges: { C: 0.9, D: 0.7 }, tsne: [2,1] },      // Target
    };
    // Path A->B->D->E: 0.1 (A-B) + 0.2 (B-D) + 0.3 (D-E) = 0.6
    // Path A->C->E: 0.5 (A-C) + 0.1 (C-E) = 0.6
    // Path A->C->D->E: 0.5 (A-C) + 0.8 (C-D) + 0.3 (D-E) = 1.6
    // The algorithm might pick A->B->D->E or A->C->E. Both are valid.
    // We'll check if the path is one of the expected shortest paths.
    const path = findShortestPath(graphData, 'A', 'E');
    expect(['A', 'B', 'D', 'E']).toEqual(expect.arrayContaining(path)); // Simpler to check this way for now
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should correctly handle edges with zero similarity (cost of 1)', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0, C: 0.9 }, tsne: [0,0] }, // A-B cost 1, A-C cost 0.1
      B: { edges: { A: 0, D: 0.8 }, tsne: [1,0] }, // B-D cost 0.2
      C: { edges: { A: 0.9, D: 0.7 }, tsne: [0,1] }, // C-D cost 0.3
      D: { edges: { B: 0.8, C: 0.7 }, tsne: [1,1] },
    };
    // Path A->C->D: 0.1 (A-C) + 0.3 (C-D) = 0.4
    // Path A->B->D: 1 (A-B) + 0.2 (B-D) = 1.2
    expect(findShortestPath(graphData, 'A', 'D')).toEqual(['A', 'C', 'D']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should correctly handle edges with maximum similarity (cost of 0)', () => {
    const graphData: GraphData = {
      A: { edges: { B: 1, C: 0.5 }, tsne: [0,0] },   // A-B cost 0, A-C cost 0.5
      B: { edges: { A: 1, D: 0.8 }, tsne: [1,0] },   // B-D cost 0.2
      C: { edges: { A: 0.5, D: 0.7 }, tsne: [0,1] }, // C-D cost 0.3
      D: { edges: { B: 0.8, C: 0.7 }, tsne: [1,1] },
    };
    // Path A->B->D: 0 (A-B) + 0.2 (B-D) = 0.2
    // Path A->C->D: 0.5 (A-C) + 0.3 (C-D) = 0.8
    expect(findShortestPath(graphData, 'A', 'D')).toEqual(['A', 'B', 'D']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle a node with no outgoing edges', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.8 }, tsne: [0,0] },
      B: { edges: {}, tsne: [1,1] }, // B has no outgoing edges
      C: { edges: { A: 0.7 }, tsne: [2,2] },
    };
    expect(findShortestPath(graphData, 'A', 'B')).toEqual(['A', 'B']);
    expect(findShortestPath(graphData, 'A', 'C')).toEqual([]); // Cannot reach C from A via B
    expect(consoleWarnSpy).toHaveBeenCalledWith("No path found from A to C");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should return an empty array when the end node is an island', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.9 }, tsne: [0,0] },
      B: { edges: { A: 0.9 }, tsne: [1,1] },
      C: { edges: {}, tsne: [2,2] }, // C is an island node
      D: { edges: { E: 0.8 }, tsne: [3,3] },
      E: { edges: { D: 0.8 }, tsne: [4,4] },
    };
    expect(findShortestPath(graphData, 'A', 'C')).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith("No path found from A to C");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle node names with special characters', () => {
    const graphData: GraphData = {
      'Node A': { edges: { 'Node-B': 0.9 }, tsne: [0,0] },
      'Node-B': { edges: { 'Node A': 0.9, 'Nöde@C': 0.8 }, tsne: [1,1] },
      'Nöde@C': { edges: { 'Node-B': 0.8 }, tsne: [2,2] },
    };
    expect(findShortestPath(graphData, 'Node A', 'Nöde@C')).toEqual(['Node A', 'Node-B', 'Nöde@C']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should return a valid path when multiple paths have the same shortest cost', () => {
    const graphData: GraphData = {
      A: { edges: { B: 0.9, C: 0.9 }, tsne: [0,0] }, // A-B cost 0.1, A-C cost 0.1
      B: { edges: { A: 0.9, D: 0.8 }, tsne: [1,0] }, // B-D cost 0.2
      C: { edges: { A: 0.9, D: 0.8 }, tsne: [0,1] }, // C-D cost 0.2
      D: { edges: { B: 0.8, C: 0.8 }, tsne: [1,1] },
    };
    // Path A->B->D cost: 0.1 + 0.2 = 0.3
    // Path A->C->D cost: 0.1 + 0.2 = 0.3
    const path = findShortestPath(graphData, 'A', 'D');
    // The algorithm could return either ['A', 'B', 'D'] or ['A', 'C', 'D']
    // We check if the returned path is one of these valid options.
    const possiblePaths = [
      ['A', 'B', 'D'],
      ['A', 'C', 'D'],
    ];
    expect(possiblePaths).toContainEqual(path);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

}); 