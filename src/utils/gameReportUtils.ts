import { GraphData } from '../services/dataLoader';
import { findShortestPath } from './graphUtils';
import type { Achievement } from '../features/achievements/achievements';

// Interface for optimal choice tracking
export interface OptimalChoice {
  playerPosition: string;
  playerChose: string;
  optimalChoice: string;
  isGlobalOptimal: boolean;
  isLocalOptimal: boolean;
  usedAsCheckpoint?: boolean; // Track if this optimal move has been used as a checkpoint for backtracking
  hopsFromPlayerPositionToEnd?: number; // Hops from playerPosition on this choice to endWord via suggested path
  choseMostSimilarNeighbor?: boolean; // Was this choice the most similar among available direct neighbors?
  choseLeastSimilarNeighbor?: boolean; // Was this choice the least similar among available direct neighbors?
}

export interface BacktrackReportEntry {
  jumpedFrom: string; // The word the player was at before backtracking
  landedOn: string;   // The checkpoint word the player backtracked to
}

// Interface for game report
export interface GameReport {
  playerPath: string[];
  optimalPath: string[];
  suggestedPath: string[];
  optimalMovesMade: number;
  totalMoves: number;
  moveAccuracy: number;
  optimalChoices: OptimalChoice[];
  missedOptimalMoves: string[];
  playerSemanticDistance: number;
  optimalSemanticDistance: number;
  averageSimilarity: number | null;
  backtrackEvents?: BacktrackReportEntry[]; // Renamed and using new type
  semanticPathEfficiency?: number; // Added for the new efficiency metric
  earnedAchievements?: Achievement[]; // Added to store earned achievements
  id: string;
  timestamp: number;
  startWord: string;
  endWord: string;
  status: 'won' | 'given_up';
  pathEfficiency: number;
}

// Helper to calculate semantic distance between two words
const getSemanticDistance = (graphData: GraphData, word1: string, word2: string): number => {
  if (!graphData[word1]?.edges[word2]) return 1; // Max distance if no direct connection
  return 1 - graphData[word1].edges[word2]; // Convert similarity to distance
};

// Helper to calculate total semantic distance of a path
const calculatePathDistance = (graphData: GraphData, path: string[]): number => {
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += getSemanticDistance(graphData, path[i], path[i + 1]);
  }
  return totalDistance;
};

// Helper to calculate average similarity per move
const calculateAverageSimilarity = (graphData: GraphData, path: string[]): number | null => {
  if (path.length < 2) return null;
  let totalSimilarity = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const wordA = path[i];
    const wordB = path[i + 1];
    const similarity = graphData?.[wordA]?.edges?.[wordB] ?? 0;
    totalSimilarity += similarity;
  }
  return totalSimilarity / (path.length - 1);
};

// Track optimal choices during gameplay
export const trackOptimalChoice = (
  graphData: GraphData,
  playerPosition: string,
  playerChoice: string,
  optimalPath: string[],
  suggestedPath: string[],
  endWord: string,
  findShortestPathFn: (graphData: GraphData | null, start: string, end: string) => string[]
): OptimalChoice => {
  const functionStartTime = performance.now();

  const hopsToEnd = suggestedPath.length > 0 ? suggestedPath.length - 1 : Infinity;

  const optimalNextMove = optimalPath[optimalPath.indexOf(playerPosition) + 1];
  const suggestedNextMove = suggestedPath[suggestedPath.indexOf(playerPosition) + 1];

  // Determine if chosen word was most/least similar among current direct neighbors
  let wasMostSimilar = false;
  let wasLeastSimilar = false;
  const directNeighbors = graphData[playerPosition]?.edges;
  if (directNeighbors && Object.keys(directNeighbors).length > 0) {
    const neighborSimilarities = Object.entries(directNeighbors).map(([word, similarity]) => ({ word, similarity }));
    
    if (neighborSimilarities.length > 0) {
      neighborSimilarities.sort((a, b) => b.similarity - a.similarity); // Sort descending by similarity
      
      if (playerChoice === neighborSimilarities[0].word) {
        wasMostSimilar = true;
      }
      // To be the least similar, it must also not be the most similar if there's only one neighbor
      if (playerChoice === neighborSimilarities[neighborSimilarities.length - 1].word) {
        if (neighborSimilarities.length === 1) { // Only one neighbor, it's both most and least
            wasMostSimilar = true; // Ensure it's marked if only one option
            wasLeastSimilar = true;
        } else if (playerChoice !== neighborSimilarities[0].word) { // If multiple, ensure it's not also the most similar
            wasLeastSimilar = true;
        } else if (neighborSimilarities[0].similarity === neighborSimilarities[neighborSimilarities.length -1].similarity) {
            // If all neighbors have the same similarity, the chosen one is both most and least
            wasMostSimilar = true;
            wasLeastSimilar = true;
        }
      }
    }
  }

  const result: OptimalChoice = {
    playerPosition,
    playerChose: playerChoice,
    optimalChoice: optimalNextMove,
    isGlobalOptimal: playerChoice === optimalNextMove,
    isLocalOptimal: playerChoice === suggestedNextMove,
    hopsFromPlayerPositionToEnd: hopsToEnd,
    choseMostSimilarNeighbor: wasMostSimilar,
    choseLeastSimilarNeighbor: wasLeastSimilar,
  };

  const functionEndTime = performance.now();
  console.log(`[PERF] trackOptimalChoice for ${playerPosition} -> ${playerChoice} took ${(functionEndTime - functionStartTime).toFixed(2)}ms (Simplified)`);

  return result;
};

// Helper function to get shortest path length between two words
function getShortestPathLength(graphData: GraphData, startWord: string, endWord: string, pathfinder: (graphData: GraphData | null, start: string, end: string) => string[]): number {
  const path = pathfinder(graphData, startWord, endWord);
  return path.length > 0 ? path.length - 1 : Infinity;
}

// Generate a game report
export const generateGameReport = (
  graphData: GraphData,
  playerPath: string[],
  optimalPathGlobal: string[],
  minimalOptimalChoices: OptimalChoice[],
  endWord: string,
  findShortestPathByHopsFn: (graphData: GraphData | null, start: string, end: string) => string[],
  findShortestPathBySemanticDistanceFn: (graphData: GraphData | null, start: string, end: string) => string[],
  backtrackEvents: BacktrackReportEntry[]
): GameReport => {
  const enrichedOptimalChoices: OptimalChoice[] = [];
  let playerSemanticDistanceTotal = 0;

  // This loop correctly enriches choices based on the final playerPath and minimalOptimalChoices
  for (let i = 0; i < playerPath.length - 1; i++) {
    const playerPosition = playerPath[i];
    const playerChose = playerPath[i + 1];
    const baseChoice = minimalOptimalChoices.find(oc => oc.playerPosition === playerPosition && oc.playerChose === playerChose && oc.playerPosition === playerPath[i]) || 
                       { playerPosition, playerChose, optimalChoice: optimalPathGlobal[optimalPathGlobal.indexOf(playerPosition) + 1] || '', isGlobalOptimal: false, isLocalOptimal: false };

    playerSemanticDistanceTotal += getSemanticDistance(graphData, playerPosition, playerChose);

    enrichedOptimalChoices.push({
      ...baseChoice,
    });
  }

  const optimalSemanticDistance = calculatePathDistance(graphData, optimalPathGlobal);
  const totalMoves = playerPath.length - 1;
  const optimalMovesMade = enrichedOptimalChoices.filter(oc => oc.isGlobalOptimal || oc.isLocalOptimal).length;
  const moveAccuracy = totalMoves > 0 ? Math.min(100, (optimalMovesMade / totalMoves) * 100) : 0;
  const averageSimilarity = calculateAverageSimilarity(graphData, playerPath);
  
  const suggestedPathFromFinalPosition = findShortestPathByHopsFn(graphData, playerPath[playerPath.length - 1], endWord);
  const gameStatus: GameReport['status'] = playerPath[playerPath.length -1] === endWord ? 'won' : 'given_up'; // Assuming 'lost' is not used or handled elsewhere

  // Calculate metrics (simplified for brevity, assuming they exist)
  const pathEfficiency = optimalPathGlobal.length > 1 && playerPath.length > 1 ? (optimalPathGlobal.length - 1) / (playerPath.length - 1) : 0;

  const missedOptimalMovesList: string[] = [];
  for (const choice of enrichedOptimalChoices) {
    if (optimalPathGlobal.includes(choice.playerPosition)) {
      const optimalNextStep = optimalPathGlobal[optimalPathGlobal.indexOf(choice.playerPosition) + 1];
      if (optimalNextStep && choice.playerChose !== optimalNextStep) {
        missedOptimalMovesList.push(`At ${choice.playerPosition}, chose ${choice.playerChose} instead of optimal ${optimalNextStep}`);
      }
    }
  }

  // Determine the denominator for efficiency calculation
  let efficiencyDenominator = playerSemanticDistanceTotal;
  const playerReachedEnd = playerPath[playerPath.length - 1] === endWord;

  if (!playerReachedEnd && suggestedPathFromFinalPosition.length > 0) {
    // Construct hypothetical full path: player's actual path up to the last word, then the suggested path from there.
    // Ensure no duplication of the last common word.
    // finalSuggestedPath starts with the player's last position.
    const hypotheticalFullPath = playerPath.slice(0, playerPath.length - 1).concat(suggestedPathFromFinalPosition);
    efficiencyDenominator = calculatePathDistance(graphData, hypotheticalFullPath);
  }
  
  // Calculate Semantic Path Efficiency
  let calculatedSemanticPathEfficiency: number;
  if (efficiencyDenominator === 0) {
    if (optimalSemanticDistance === 0) {
      calculatedSemanticPathEfficiency = 100.0; 
    } else {
      calculatedSemanticPathEfficiency = 0.0;   
    }
  } else {
    calculatedSemanticPathEfficiency = (optimalSemanticDistance / efficiencyDenominator) * 100.0;
  }

  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    startWord: playerPath[0],
    endWord: endWord,
    playerPath: playerPath,
    optimalPath: optimalPathGlobal,
    suggestedPath: suggestedPathFromFinalPosition,
    optimalChoices: enrichedOptimalChoices,
    status: gameStatus,
    totalMoves,
    optimalMovesMade,
    moveAccuracy,
    playerSemanticDistance: playerSemanticDistanceTotal,
    optimalSemanticDistance,
    averageSimilarity,
    backtrackEvents: backtrackEvents.length > 0 ? backtrackEvents : undefined,
    semanticPathEfficiency: calculatedSemanticPathEfficiency,
    earnedAchievements: [],
    pathEfficiency: pathEfficiency,
  };
};

// Helper function to calculate the total semantic distance of a given path
export const calculateTotalSemanticDistance = (
  path: string[],
  graphData: GraphData
): number => {
  if (!path || path.length < 2) {
    return 0; // Or Infinity if no path / single word path implies no distance traveled
  }

  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const wordA = path[i];
    const wordB = path[i + 1];
    const similarity = graphData?.[wordA]?.edges?.[wordB];

    if (typeof similarity === 'number') {
      totalDistance += (1 - similarity);
    } else {
      // This case should ideally not happen if the path is valid and from findShortestPath
      // Consider how to handle missing edges in a path: error, or assume max distance (1)?
      // For now, let's assume valid paths and that edges exist.
      // If an edge were missing, it implies an issue with path generation or graph data.
      // To be robust, one might add a large penalty or throw an error.
      // Given findShortestPath should only return paths with valid edges, this is more a safety.
      console.warn(`calculateTotalSemanticDistance: Missing similarity between ${wordA} and ${wordB}.`);
      totalDistance += 1; // Assume max distance for this segment
    }
  }
  return totalDistance;
};

export type { GraphData } from '../services/dataLoader'; 