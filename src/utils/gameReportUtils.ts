import type { Achievement } from "../features/achievements";
import { GraphData, WordFrequencies } from "../services/dataLoader";

// Mirroring PotentialRarestMove from useGameStore for clarity, or it could be imported
export interface PotentialRarestMove {
  word: string;
  frequency: number;
  playerChoseThisRarestOption: boolean;
}

// Interface for optimal choice tracking
export interface OptimalChoice {
  playerPosition: string;
  playerChose: string;
  optimalChoice: string;
  isGlobalOptimal: boolean;
  isLocalOptimal: boolean;
  usedAsCheckpoint?: boolean; // Track if this optimal move has been used as a checkpoint for backtracking
  hopsFromPlayerPositionToEnd?: number; // Hops from playerPosition on this choice to targetWord via suggested path
  choseMostSimilarNeighbor?: boolean; // Was this choice the most similar among available direct neighbors?
  choseLeastSimilarNeighbor?: boolean; // Was this choice the least similar among available direct neighbors?
  choseRarestNeighbor?: boolean; // Added field
}

export interface BacktrackReportEntry {
  jumpedFrom: string; // The word the player was at before backtracking
  landedOn: string; // The checkpoint word the player backtracked to
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
  earnedAchievements?: Achievement[]; // Added to store earned achievements
  potentialRarestMoves?: PotentialRarestMove[]; // Added for "Putting on the Dog"
  id: string;
  timestamp: number; // This is the end timestamp
  startTime?: number; // Added optional startTime
  startWord: string;
  targetWord: string; // Changed from targetWord to targetWord for consistency
  status: "won" | "given_up";
  pathEfficiency: number;
  // Daily challenge fields
  isDailyChallenge?: boolean; // Flag to identify daily challenge games
  dailyChallengeId?: string; // Store the daily challenge ID directly
  aiPath?: string[]; // AI solution path for daily challenges
  aiModel?: string | null; // AI model that generated the solution
}

// Helper to calculate semantic distance between two words
export const getSemanticDistance = (
  graphData: GraphData,
  word1: string,
  word2: string,
): number => {
  // Check if word1 exists and has an edges property, and if word2 is a key in those edges
  if (
    graphData[word1] &&
    graphData[word1].edges &&
    graphData[word1].edges[word2] !== undefined
  ) {
    return 1 - graphData[word1].edges[word2]; // Convert similarity to distance
  }
  return 1; // Max distance if no direct connection or word/edge doesn't exist
};

// Helper to calculate total semantic distance of a path
export const calculatePathDistance = (
  graphData: GraphData,
  path: string[],
): number => {
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += getSemanticDistance(graphData, path[i], path[i + 1]);
  }
  return totalDistance;
};

// Helper to calculate average similarity per move
export const calculateAverageSimilarity = (
  graphData: GraphData,
  path: string[],
): number | null => {
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
  targetWord: string,
  findShortestPathFn: (
    graphData: GraphData | null,
    start: string,
    end: string,
  ) => string[],
  wordFrequencies: WordFrequencies | null,
): OptimalChoice => {
  // Calculate hops from playerPosition to targetWord via suggested path
  const suggestedPathFromPosition = findShortestPathFn(
    graphData,
    playerPosition,
    targetWord,
  );
  const hopsToEnd = suggestedPathFromPosition
    ? suggestedPathFromPosition.length - 1
    : -1;

  const optimalNextMove = optimalPath[optimalPath.indexOf(playerPosition) + 1];
  const suggestedNextMove =
    suggestedPath[suggestedPath.indexOf(playerPosition) + 1];

  let wasMostSimilar = false;
  let wasLeastSimilar = false;
  let wasRarest = false; // Added variable

  const directNeighborsEdges = graphData[playerPosition]?.edges;
  if (directNeighborsEdges && Object.keys(directNeighborsEdges).length > 0) {
    const neighborDetails = Object.entries(directNeighborsEdges).map(
      ([word, similarity]) => ({
        word,
        similarity,
        frequency:
          wordFrequencies && wordFrequencies[word] !== undefined
            ? wordFrequencies[word]
            : Infinity,
      }),
    );

    if (neighborDetails.length > 0) {
      // Similarity sorting
      const sortedBySimilarity = [...neighborDetails].sort(
        (a, b) => (b.similarity as number) - (a.similarity as number),
      );
      if (playerChoice === sortedBySimilarity[0].word) {
        wasMostSimilar = true;
      }
      if (
        playerChoice === sortedBySimilarity[sortedBySimilarity.length - 1].word
      ) {
        if (
          sortedBySimilarity.length === 1 ||
          sortedBySimilarity[0].similarity ===
            sortedBySimilarity[sortedBySimilarity.length - 1].similarity
        ) {
          wasMostSimilar = true; // Handles single neighbor or all same similarity
          wasLeastSimilar = true;
        } else if (playerChoice !== sortedBySimilarity[0].word) {
          wasLeastSimilar = true;
        }
      }

      // Frequency sorting (lower frequency is rarer)
      if (wordFrequencies) {
        const sortedByFrequency = [...neighborDetails].sort(
          (a, b) => a.frequency - b.frequency,
        );
        if (
          sortedByFrequency.length > 0 &&
          sortedByFrequency[0].frequency !== Infinity
        ) {
          const rarestFrequency = sortedByFrequency[0].frequency;
          const playerChoiceDetails = neighborDetails.find(
            (n) => n.word === playerChoice,
          );
          if (
            playerChoiceDetails &&
            playerChoiceDetails.frequency === rarestFrequency
          ) {
            wasRarest = true;
          }
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
    choseRarestNeighbor: wasRarest, // Added field
  };

  return result;
};

// Generate a game report
export const generateGameReport = (
  graphData: GraphData,
  playerPath: string[],
  optimalPathGlobal: string[],
  recordedOptimalChoices: OptimalChoice[],
  targetWord: string,
  findShortestPathByHopsFn: (
    graphData: GraphData | null,
    start: string,
    end: string,
  ) => string[],
  findShortestPathBySemanticDistanceFn: (
    graphData: GraphData | null,
    start: string,
    end: string,
  ) => string[],
  backtrackEvents: BacktrackReportEntry[],
  potentialRarestMovesInput?: PotentialRarestMove[], // Added parameter
  // New daily challenge parameters
  isDailyChallenge?: boolean,
  dailyChallengeId?: string, // Add dailyChallengeId parameter
  aiPath?: string[],
  aiModel?: string | null,
): GameReport => {
  const playerSemanticDistanceTotal = calculatePathDistance(
    graphData,
    playerPath,
  );

  const optimalSemanticDistance = calculatePathDistance(
    graphData,
    optimalPathGlobal,
  );
  const totalMoves = playerPath.length - 1;
  const optimalMovesMade = recordedOptimalChoices.filter(
    (oc) => oc.isGlobalOptimal || oc.isLocalOptimal,
  ).length;
  const moveAccuracy =
    totalMoves > 0 ? Math.min(100, (optimalMovesMade / totalMoves) * 100) : 0;
  const averageSimilarity = calculateAverageSimilarity(graphData, playerPath);

  const suggestedPathFromFinalPosition = findShortestPathByHopsFn(
    graphData,
    playerPath[playerPath.length - 1],
    targetWord,
  );
  const gameStatus: GameReport["status"] =
    playerPath[playerPath.length - 1] === targetWord ? "won" : "given_up"; // Assuming 'lost' is not used or handled elsewhere

  // Calculate metrics (simplified for brevity, assuming they exist)
  const pathEfficiency =
    optimalPathGlobal.length > 1 && playerPath.length > 1
      ? (optimalPathGlobal.length - 1) / (playerPath.length - 1)
      : 0;

  const missedOptimalMovesList: string[] = [];
  for (const choice of recordedOptimalChoices) {
    if (optimalPathGlobal.includes(choice.playerPosition)) {
      const optimalNextStep =
        optimalPathGlobal[optimalPathGlobal.indexOf(choice.playerPosition) + 1];
      if (optimalNextStep && choice.playerChose !== optimalNextStep) {
        missedOptimalMovesList.push(
          `At ${choice.playerPosition}, chose ${choice.playerChose} instead of optimal ${optimalNextStep}`,
        );
      }
    }
  }

  // If game is won, there's no suggested path needed from the end word.
  const finalSuggestedPath =
    gameStatus === "won" ? [] : suggestedPathFromFinalPosition;

  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    startTime: Date.now(),
    startWord: playerPath[0],
    targetWord,
    playerPath: playerPath,
    optimalPath: optimalPathGlobal,
    suggestedPath: finalSuggestedPath,
    optimalChoices: recordedOptimalChoices,
    status: gameStatus,
    totalMoves,
    optimalMovesMade,
    moveAccuracy,
    missedOptimalMoves: missedOptimalMovesList,
    playerSemanticDistance: playerSemanticDistanceTotal,
    optimalSemanticDistance,
    averageSimilarity,
    backtrackEvents: backtrackEvents.length > 0 ? backtrackEvents : undefined,
    earnedAchievements: [],
    pathEfficiency: pathEfficiency,
    potentialRarestMoves: potentialRarestMovesInput, // Assign to report
    isDailyChallenge,
    dailyChallengeId,
    aiPath,
    aiModel,
  };
};

// Helper function to calculate the total semantic distance of a given path
export const calculateTotalSemanticDistance = (
  path: string[],
  graphData: GraphData,
): number => {
  if (!path || path.length < 2) {
    return 0; // Or Infinity if no path / single word path implies no distance traveled
  }

  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const wordA = path[i];
    const wordB = path[i + 1];
    // Assuming getSemanticDistance exists and is appropriate here or graphData edge directly used if it means distance
    // For this example, let's use the raw edge value if it's distance, or 1-similarity if it's similarity
    const edgeValue = graphData[wordA]?.edges?.[wordB];
    if (typeof edgeValue === "number") {
      // If your graph stores SENSE (semantic similarity), convert to distance
      // If it already stores DISTANCE, use it directly.
      // This example assumes it stores SIMILARITY as per prior context.
      totalDistance += 1 - edgeValue;
    } else {
      // Handle missing edge - perhaps assign a high penalty or throw error
      totalDistance += 1; // Max distance penalty for unlinked words
    }
  }
  return totalDistance;
};

export type { GraphData } from "../services/dataLoader";
