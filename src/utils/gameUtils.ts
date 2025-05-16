// Utility functions related to the game logic
import graphData from '../data/graph.json';
import definitionsData from '../data/definitions.json';

/**
 * Load game data from JSON files
 * @returns Graph data structure
 */
export const loadGameData = () => {
  try {
    // Convert graph data structure to nodes and edges format
    const nodeNames = Object.keys(graphData.nodes);
    const edges: Array<[string, string]> = [];
    
    // Extract edges from the graph structure
    Object.entries(graphData.nodes).forEach(([word, data]) => {
      const nodeData = data as any;
      if (nodeData.edges) {
        Object.keys(nodeData.edges).forEach(neighbor => {
          edges.push([word, neighbor]);
        });
      }
    });
    
    return {
      nodes: nodeNames,
      edges,
      definitions: definitionsData,
    };
  } catch (error) {
    console.error('Error loading game data:', error);
    throw error;
  }
};

/**
 * Select random start and target words from the graph
 * @param nodes Array of words in the graph
 * @returns Object with start and target words
 */
export const selectRandomWords = (nodes: string[]) => {
  if (nodes.length < 2) {
    throw new Error('Not enough nodes to select start and target words');
  }
  
  // TODO: Implement more intelligent selection that ensures a valid path exists
  const startIndex = Math.floor(Math.random() * nodes.length);
  let targetIndex;
  
  do {
    targetIndex = Math.floor(Math.random() * nodes.length);
  } while (targetIndex === startIndex);
  
  return {
    startWord: nodes[startIndex],
    targetWord: nodes[targetIndex]
  };
};

/**
 * Check if a word can be selected (is connected to the current word)
 * @param currentWord Current word
 * @param newWord Word to select
 * @param edges Graph edges
 * @returns Boolean indicating if selection is valid
 */
export const isValidWordSelection = (
  currentWord: string,
  newWord: string,
  edges: Array<[string, string]>
): boolean => {
  return edges.some(([from, to]) => 
    (from === currentWord && to === newWord) || 
    (from === newWord && to === currentWord)
  );
};

/**
 * Get available words that can be selected from the current word
 * @param currentWord Current word
 * @param edges Graph edges
 * @returns Array of available words
 */
export const getAvailableWords = (
  currentWord: string,
  edges: Array<[string, string]>
): string[] => {
  return edges
    .filter(([from, to]) => from === currentWord || to === currentWord)
    .map(([from, to]) => from === currentWord ? to : from);
};

/**
 * Format milliseconds into a readable time string
 * @param ms Milliseconds
 * @returns Formatted time string (mm:ss)
 */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}; 