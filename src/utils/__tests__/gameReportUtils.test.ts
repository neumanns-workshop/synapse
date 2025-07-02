import type { GraphData, WordFrequencies } from "../../services/dataLoader";
import {
  getSemanticDistance,
  calculatePathDistance,
  calculateAverageSimilarity,
  trackOptimalChoice,
  generateGameReport,
  calculateTotalSemanticDistance,
} from "../gameReportUtils";
import type {
  OptimalChoice,
  PotentialRarestMove,
  BacktrackReportEntry,
  GameReport,
} from "../gameReportUtils";
import { findShortestPath } from "../graphUtils"; // Adjust path if necessary

// Mock data to be used across tests
const mockGraphData: GraphData = {
  wordA: {
    edges: {
      wordB: 0.8, // similarity, distance 0.2
      wordC: 0.5, // similarity, distance 0.5
    },
    tsne: [0.1, 0.2],
  },
  wordB: {
    edges: {
      wordA: 0.8, // similarity, distance 0.2
      wordD: 0.9, // similarity, distance 0.1
    },
    tsne: [0.3, 0.4],
  },
  wordC: {
    edges: {
      wordA: 0.5, // similarity, distance 0.5
      wordD: 0.3, // similarity, distance 0.7
    },
    tsne: [0.5, 0.6],
  },
  wordD: {
    edges: {
      wordB: 0.9, // similarity, distance 0.1
      wordC: 0.3, // similarity, distance 0.7
    },
    tsne: [0.7, 0.8],
  },
  noEdgeWord: {
    // Word exists but has no outgoing edges in its 'edges' object
    edges: {},
    tsne: [0.9, 1.0],
  },
  wordWithNoEdgesField: {
    // Word exists but is missing the 'edges' field entirely (requires type assertion for mock)
    tsne: [0.95, 1.05],
  } as any, // Type assertion to allow missing 'edges' for test purposes
};

const mockWordFrequencies: WordFrequencies = {
  wordA: 100,
  wordB: 50,
  wordC: 200,
  wordD: 10,
  rareWord: 5,
};

describe("gameReportUtils", () => {
  describe("getSemanticDistance", () => {
    it("should return 1 - similarity for direct connections", () => {
      expect(getSemanticDistance(mockGraphData, "wordA", "wordB")).toBeCloseTo(
        0.2,
      );
      expect(getSemanticDistance(mockGraphData, "wordA", "wordC")).toBeCloseTo(
        0.5,
      );
      expect(getSemanticDistance(mockGraphData, "wordB", "wordD")).toBeCloseTo(
        0.1,
      );
    });

    it("should return 1 if words are not directly connected in graphData.edges", () => {
      expect(getSemanticDistance(mockGraphData, "wordA", "wordD")).toBe(1);
    });

    it("should return 1 if the source word is not in graphData", () => {
      expect(getSemanticDistance(mockGraphData, "unknownWord", "wordA")).toBe(
        1,
      );
    });

    it("should return 1 if the target word is not in the source word's edges", () => {
      expect(getSemanticDistance(mockGraphData, "wordA", "unknownWord")).toBe(
        1,
      );
    });

    it("should return 1 if both words are not in graphData", () => {
      expect(getSemanticDistance(mockGraphData, "unknown1", "unknown2")).toBe(
        1,
      );
    });

    it("should return 1 if source word exists but has no outgoing edges object for the target", () => {
      expect(getSemanticDistance(mockGraphData, "noEdgeWord", "wordA")).toBe(1);
    });

    it("should return 1 if source word exists but is missing the edges field entirely", () => {
      expect(
        getSemanticDistance(mockGraphData, "wordWithNoEdgesField", "wordA"),
      ).toBe(1);
    });
  });

  describe("calculatePathDistance", () => {
    it("should return 0 for an empty path", () => {
      expect(calculatePathDistance(mockGraphData, [])).toBe(0);
    });

    it("should return 0 for a path with a single word", () => {
      expect(calculatePathDistance(mockGraphData, ["wordA"])).toBe(0);
    });

    it("should correctly calculate distance for a valid path with direct connections", () => {
      // wordA -(0.2)-> wordB -(0.1)-> wordD. Total distance = 0.2 + 0.1 = 0.3
      const path = ["wordA", "wordB", "wordD"];
      expect(calculatePathDistance(mockGraphData, path)).toBeCloseTo(0.3);
    });

    it("should correctly sum distances including 1 for missing direct links", () => {
      // wordA -(1.0)-> wordD (not directly connected) -(0.1)-> wordB. Total = 1.0 + 0.1 = 1.1
      // Note: wordD to wordB is direct (similarity 0.9, distance 0.1)
      const path = ["wordA", "wordD", "wordB"];
      expect(calculatePathDistance(mockGraphData, path)).toBeCloseTo(1.1);
    });

    it("should handle paths with unknown words, treating segments involving them as distance 1", () => {
      // wordA -(1.0)-> unknownWord -(1.0)-> wordB. Total = 1.0 + 1.0 = 2.0
      const path = ["wordA", "unknownWord", "wordB"];
      expect(calculatePathDistance(mockGraphData, path)).toBe(2);
    });

    it("should handle path segments where a word has no edges defined", () => {
      // wordA -(0.2)-> wordB -(1.0)-> noEdgeWord -(1.0)-> wordA. Total = 0.2 + 1.0 + 1.0 = 2.2
      const path = ["wordA", "wordB", "noEdgeWord", "wordA"];
      expect(calculatePathDistance(mockGraphData, path)).toBeCloseTo(2.2);
    });
  });

  describe("calculateAverageSimilarity", () => {
    it("should return null for paths with less than 2 words", () => {
      expect(calculateAverageSimilarity(mockGraphData, [])).toBeNull();
      expect(calculateAverageSimilarity(mockGraphData, ["wordA"])).toBeNull();
    });

    it("should correctly calculate average similarity for a valid path", () => {
      // wordA -> wordB (sim 0.8), wordB -> wordD (sim 0.9)
      // Average = (0.8 + 0.9) / 2 = 0.85
      const path = ["wordA", "wordB", "wordD"];
      expect(calculateAverageSimilarity(mockGraphData, path)).toBeCloseTo(0.85);
    });

    it("should use 0 similarity for missing direct links in path segments", () => {
      // wordA -> wordD (no direct link, sim 0), wordD -> wordB (sim 0.9)
      // Average = (0 + 0.9) / 2 = 0.45
      const path = ["wordA", "wordD", "wordB"];
      expect(calculateAverageSimilarity(mockGraphData, path)).toBeCloseTo(0.45);
    });

    it("should handle paths with unknown words, using 0 similarity for such segments", () => {
      // wordA -> unknownWord (sim 0), unknownWord -> wordB (sim 0)
      // Average = (0 + 0) / 2 = 0
      const path = ["wordA", "unknownWord", "wordB"];
      expect(calculateAverageSimilarity(mockGraphData, path)).toBe(0);
    });

    it("should handle segments where a word has no defined edges, resulting in 0 similarity", () => {
      // wordA -> noEdgeWord (sim 0), noEdgeWord -> wordB (sim 0)
      const path = ["wordA", "noEdgeWord", "wordB"];
      expect(calculateAverageSimilarity(mockGraphData, path)).toBe(0);
    });

    it("should handle segments where a word is missing the edges field, resulting in 0 similarity", () => {
      // wordA -> wordWithNoEdgesField (sim 0) -> wordB (sim 0)
      const path = ["wordA", "wordWithNoEdgesField", "wordB"];
      expect(calculateAverageSimilarity(mockGraphData, path)).toBe(0);
    });
  });

  describe("calculateTotalSemanticDistance", () => {
    it("should return 0 for an empty path", () => {
      expect(calculateTotalSemanticDistance([], mockGraphData)).toBe(0);
    });

    it("should return 0 for a path with a single word", () => {
      expect(calculateTotalSemanticDistance(["wordA"], mockGraphData)).toBe(0);
    });

    it("should correctly calculate distance for a valid path with direct connections", () => {
      // wordA -(sim 0.8 => dist 0.2)-> wordB -(sim 0.9 => dist 0.1)-> wordD. Total distance = 0.3
      const path = ["wordA", "wordB", "wordD"];
      expect(calculateTotalSemanticDistance(path, mockGraphData)).toBeCloseTo(
        0.3,
      );
    });

    it("should sum distances including 1 for missing direct links", () => {
      // wordA -(no link => dist 1)-> wordD -(sim 0.9 => dist 0.1)-> wordB. Total = 1.1
      const path = ["wordA", "wordD", "wordB"];
      expect(calculateTotalSemanticDistance(path, mockGraphData)).toBeCloseTo(
        1.1,
      );
    });

    it("should handle paths with unknown words (segments involving them as distance 1)", () => {
      // wordA -(dist 1)-> unknownWord -(dist 1)-> wordB. Total = 2.0
      const path = ["wordA", "unknownWord", "wordB"];
      expect(calculateTotalSemanticDistance(path, mockGraphData)).toBe(2);
    });

    it("should handle path segments where a word has no edges defined", () => {
      // wordA -(dist 0.2)-> wordB -(dist 1)-> noEdgeWord -(dist 1)-> wordA. Total = 2.2
      const path = ["wordA", "wordB", "noEdgeWord", "wordA"];
      expect(calculateTotalSemanticDistance(path, mockGraphData)).toBeCloseTo(
        2.2,
      );
    });

    it("should handle path segments where a word is missing the edges field entirely", () => {
      // wordA -(dist 1)-> wordWithNoEdgesField -(dist 1)-> wordB. Total = 2.0
      const path = ["wordA", "wordWithNoEdgesField", "wordB"];
      expect(calculateTotalSemanticDistance(path, mockGraphData)).toBe(2.0);
    });

    // Compare with calculatePathDistance to ensure consistency (optional, but good check)
    it("should produce same results as calculatePathDistance for various paths", () => {
      const pathsToTest: string[][] = [
        [],
        ["wordA"],
        ["wordA", "wordB", "wordD"],
        ["wordA", "wordD", "wordB"],
        ["wordA", "unknownWord", "wordB"],
        ["wordA", "wordB", "noEdgeWord", "wordA"],
        ["wordA", "wordWithNoEdgesField", "wordB"],
      ];
      pathsToTest.forEach((path) => {
        expect(calculateTotalSemanticDistance(path, mockGraphData)).toBe(
          calculatePathDistance(mockGraphData, path),
        );
      });
    });
  });

  describe("trackOptimalChoice", () => {
    const targetWord = "wordD"; // Consistent end word for these tests

    it("should identify a globally and locally optimal move", () => {
      const playerPosition = "wordA";
      const playerChoice = "wordB"; // wordA -> wordB is part of a shortest path to wordD
      const optimalPathToD = ["wordA", "wordB", "wordD"]; // Assumes this is a global optimal
      const suggestedPathToD = ["wordA", "wordB", "wordD"]; // And also local optimal

      const result = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        optimalPathToD,
        suggestedPathToD,
        targetWord,
        findShortestPath, // Using actual pathfinder
        mockWordFrequencies,
      );

      expect(result.isGlobalOptimal).toBe(true);
      expect(result.isLocalOptimal).toBe(true);
      expect(result.optimalChoice).toBe("wordB");
    });

    it("should identify a move that is locally optimal but not globally", () => {
      const playerPosition = "wordA";
      const playerChoice = "wordC"; // Player chose A->C
      const globalOptimalPath = ["wordA", "wordB", "wordD"]; // Global optimal is A->B->D
      const suggestedPathIfAtA = ["wordA", "wordC", "wordD"]; // Assume A->C->D is a valid local/suggested path

      // We need to ensure findShortestPath called by trackOptimalChoice for hopsToEnd reflects suggestedPathIfAtA
      // The findShortestPathFn is used by trackOptimalChoice to calculate hopsFromPlayerPositionToEnd using the *suggestedPath* logic.
      // However, trackOptimalChoice itself determines local/global optimality based on the provided optimalPath and suggestedPath arrays directly.
      // The mock for findShortestPathFn (or using the real one) is more about ensuring trackOptimalChoice *can* call it.

      const result = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        globalOptimalPath,
        suggestedPathIfAtA, // Player followed this suggested (but not global) path
        targetWord,
        findShortestPath, // Real pathfinder
        mockWordFrequencies,
      );

      expect(result.isGlobalOptimal).toBe(false);
      expect(result.isLocalOptimal).toBe(true); // Because playerChoice (wordC) is the next step in suggestedPathIfAtA
      expect(result.optimalChoice).toBe("wordB"); // Global optimal choice was wordB
      expect(result.playerChose).toBe("wordC");
    });

    it("should identify a move that is neither locally nor globally optimal", () => {
      const playerPosition = "wordB";
      const playerChoice = "wordA"; // Player chose B->A (going backward)
      const globalOptimalPath = ["wordA", "wordB", "wordD"];
      const suggestedPathIfAtB = ["wordB", "wordD"];

      const result = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        globalOptimalPath,
        suggestedPathIfAtB,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(result.isGlobalOptimal).toBe(false);
      expect(result.isLocalOptimal).toBe(false);
      expect(result.optimalChoice).toBe("wordD"); // From B, global optimal is D
      expect(result.playerChose).toBe("wordA");
    });

    it("should correctly identify choseMostSimilarNeighbor", () => {
      // wordA has neighbors B (sim 0.8) and C (sim 0.5). B is most similar.
      const playerPosition = "wordA";
      const playerChoiceMostSimilar = "wordB";
      const playerChoiceNotMostSimilar = "wordC";
      const optimalPath = ["wordA", "wordB", "wordD"];
      const suggestedPath = ["wordA", "wordB", "wordD"];

      const resultMostSimilar = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoiceMostSimilar,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultMostSimilar.choseMostSimilarNeighbor).toBe(true);

      const resultNotMostSimilar = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoiceNotMostSimilar,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultNotMostSimilar.choseMostSimilarNeighbor).toBe(false);
    });

    it("should correctly identify choseLeastSimilarNeighbor", () => {
      // wordA has neighbors B (sim 0.8) and C (sim 0.5). C is least similar.
      const playerPosition = "wordA";
      const playerChoiceLeastSimilar = "wordC";
      const playerChoiceNotLeastSimilar = "wordB";
      const optimalPath = ["wordA", "wordB", "wordD"];
      const suggestedPath = ["wordA", "wordB", "wordD"];

      const resultLeastSimilar = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoiceLeastSimilar,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultLeastSimilar.choseLeastSimilarNeighbor).toBe(true);

      const resultNotLeastSimilar = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoiceNotLeastSimilar,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultNotLeastSimilar.choseLeastSimilarNeighbor).toBe(false);
    });

    it("should handle a single neighbor correctly for similar/least similar checks", () => {
      // wordD has neighbors wordB (sim 0.9) and wordC (sim 0.3)
      // Let's test wordB which has only wordA (0.8) and wordD (0.9) in mockGraphData
      // For this test, let's make a node with only one neighbor in its edges
      const graphSingleNeighbor: GraphData = {
        ...mockGraphData,
        wordSingle: { edges: { wordNeighbor: 0.7 }, tsne: [0, 0] },
        wordNeighbor: { edges: { wordSingle: 0.7 }, tsne: [1, 1] },
      };
      const playerPosition = "wordSingle";
      const playerChoice = "wordNeighbor";
      const optimalPath = ["wordSingle", "wordNeighbor", "end"];
      const suggestedPath = ["wordSingle", "wordNeighbor", "end"];

      const result = trackOptimalChoice(
        graphSingleNeighbor,
        playerPosition,
        playerChoice,
        optimalPath,
        suggestedPath,
        "end",
        findShortestPath,
        mockWordFrequencies,
      );
      expect(result.choseMostSimilarNeighbor).toBe(true);
      expect(result.choseLeastSimilarNeighbor).toBe(true); // If only one neighbor, it's both most and least similar
    });

    it("should correctly identify choseRarestNeighbor", () => {
      // Neighbors of wordA: wordB (freq 50), wordC (freq 200)
      // Neighbors of wordB: wordA (freq 100), wordD (freq 10) -> wordD is rarest for B
      const playerPosition = "wordB";
      const playerChoiceRarest = "wordD"; // wordD has frequency 10
      const playerChoiceNotRarest = "wordA"; // wordA has frequency 100
      const optimalPath = ["wordB", "wordD"];
      const suggestedPath = ["wordB", "wordD"];

      const resultRarest = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoiceRarest,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultRarest.choseRarestNeighbor).toBe(true);

      const resultNotRarest = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoiceNotRarest,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultNotRarest.choseRarestNeighbor).toBe(false);
    });

    it("should handle no direct neighbors for similarity/rarity checks", () => {
      const playerPosition = "noEdgeWord"; // This word has an empty edges object
      const playerChoice = "wordA"; // Arbitrary choice, won't matter
      const optimalPath = ["noEdgeWord", "wordA", "wordD"];
      const suggestedPath = ["noEdgeWord", "wordA", "wordD"];

      const result = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(result.choseMostSimilarNeighbor).toBe(false);
      expect(result.choseLeastSimilarNeighbor).toBe(false);
      expect(result.choseRarestNeighbor).toBe(false);
    });

    it("should handle missing wordFrequencies data gracefully for rarity check", () => {
      const playerPosition = "wordB";
      const playerChoice = "wordD"; // Rarest if frequencies are present
      const optimalPath = ["wordB", "wordD"];
      const suggestedPath = ["wordB", "wordD"];

      const result = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        null /* no wordFrequencies */,
      );
      expect(result.choseRarestNeighbor).toBe(false); // Should default to false if no frequency data
    });

    it("should calculate hopsFromPlayerPositionToEnd based on findShortestPath", () => {
      const playerPosition = "wordA";
      const playerChoice = "wordB";
      const optimalPath = ["wordA", "wordB", "wordC", "wordD"];
      // The implementation calls findShortestPath(graphData, "wordA", "wordD") which returns ["wordA", "wordB", "wordD"] (3 words = 2 hops)
      const suggestedPath = ["wordA", "wordB", "wordC", "wordD"];

      const result = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        optimalPath,
        suggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(result.hopsFromPlayerPositionToEnd).toBe(2);

      const suggestedPathShorter = ["wordA", "wordX", "wordD"]; // This parameter is ignored by the implementation
      const resultShorter = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        optimalPath,
        suggestedPathShorter,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultShorter.hopsFromPlayerPositionToEnd).toBe(2); // Same result as above since implementation ignores suggestedPath parameter

      const emptySuggestedPath: string[] = [];
      const resultEmptySuggested = trackOptimalChoice(
        mockGraphData,
        playerPosition,
        playerChoice,
        optimalPath,
        emptySuggestedPath,
        targetWord,
        findShortestPath,
        mockWordFrequencies,
      );
      expect(resultEmptySuggested.hopsFromPlayerPositionToEnd).toBe(2); // Same as above since implementation ignores suggestedPath parameter
    });
  });

  describe("generateGameReport", () => {
    // NOTE: The tests below currently use 'findShortestPath' (which calculates paths by semantic distance)
    // for both the 'findShortestPathByHopsFn' and 'findShortestPathBySemanticDistanceFn' parameters.
    // This reflects a scenario where the application might be using the same semantic distance pathfinder for both.
    // If a distinct hops-based pathfinder is implemented and used in the application for 'findShortestPathByHopsFn',
    // these tests (especially for 'suggestedPath' and related metrics) would need to be updated
    // to use that specific hops-based pathfinder for the corresponding argument.
    const targetWord = "wordD";
    const mockRecordedOptimalChoices: OptimalChoice[] = [
      {
        playerPosition: "wordA",
        playerChose: "wordB",
        optimalChoice: "wordB",
        isGlobalOptimal: true,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 2,
        choseMostSimilarNeighbor: true,
        choseLeastSimilarNeighbor: false,
        choseRarestNeighbor: false,
      },
      {
        playerPosition: "wordB",
        playerChose: "wordD",
        optimalChoice: "wordD",
        isGlobalOptimal: true,
        isLocalOptimal: true,
        hopsFromPlayerPositionToEnd: 0,
        choseMostSimilarNeighbor: false,
        choseLeastSimilarNeighbor: false,
        choseRarestNeighbor: true,
      },
    ];
    const mockBacktrackEvents: BacktrackReportEntry[] = [];
    const mockPotentialRarestMoves: PotentialRarestMove[] = [];

    it("should generate a correct report for a winning game path", () => {
      const playerPath = ["wordA", "wordB", "wordD"]; // Player reached targetWord
      const optimalPathGlobal = ["wordA", "wordB", "wordD"];

      const report = generateGameReport(
        mockGraphData,
        playerPath,
        optimalPathGlobal,
        mockRecordedOptimalChoices,
        targetWord,
        findShortestPath, // findShortestPathByHopsFn
        findShortestPath, // findShortestPathBySemanticDistanceFn
        mockBacktrackEvents,
        mockPotentialRarestMoves,
        false, // isDailyChallenge
        undefined, // dailyChallengeId
        undefined, // aiPath
        null, // aiModel
        false, // isChallenge
      );

      expect(report.status).toBe("won");
      expect(report.playerPath).toEqual(playerPath);
      expect(report.optimalPath).toEqual(optimalPathGlobal);
      expect(report.totalMoves).toBe(2);
      expect(report.optimalMovesMade).toBe(mockRecordedOptimalChoices.length);
      expect(report.moveAccuracy).toBeCloseTo(100);
      // playerSemanticDistance: wordA -(0.2)-> wordB -(0.1)-> wordD. Total = 0.3
      expect(report.playerSemanticDistance).toBeCloseTo(0.3);
      // optimalSemanticDistance: wordA -(0.2)-> wordB -(0.1)-> wordD. Total = 0.3
      expect(report.optimalSemanticDistance).toBeCloseTo(0.3);
      // averageSimilarity: (0.8 + 0.9) / 2 = 0.85
      expect(report.averageSimilarity).toBeCloseTo(0.85);
      // pathEfficiency: (optimalLength-1)/(playerLength-1) = (3-1)/(3-1) = 1
      expect(report.pathEfficiency).toBeCloseTo(1);
      expect(report.missedOptimalMoves.length).toBe(0);
      expect(report.suggestedPath).toEqual([]); // Empty for won game
    });

    it("should generate a correct report for a game given up before reaching targetWord", () => {
      const playerPath = ["wordA", "wordC"]; // Player stopped at wordC, did not reach wordD
      const optimalPathGlobal = ["wordA", "wordB", "wordD"];
      const recordedChoicesPartial: OptimalChoice[] = [
        {
          playerPosition: "wordA",
          playerChose: "wordC",
          optimalChoice: "wordB",
          isGlobalOptimal: false,
          isLocalOptimal: true, // Assuming wordC was locally suggested
          hopsFromPlayerPositionToEnd: 1, // e.g. if suggested path from A via C was A-C-D
          choseMostSimilarNeighbor: false,
          choseLeastSimilarNeighbor: true,
          choseRarestNeighbor: false,
        },
      ];

      const report = generateGameReport(
        mockGraphData,
        playerPath, // Player path: A -> C
        optimalPathGlobal, // Global: A -> B -> D
        recordedChoicesPartial,
        targetWord, // Target was D
        findShortestPath,
        findShortestPath,
        mockBacktrackEvents,
        mockPotentialRarestMoves,
        false, // isDailyChallenge
        undefined, // dailyChallengeId
        undefined, // aiPath
        null, // aiModel
        false, // isChallenge
      );

      expect(report.status).toBe("given_up");
      expect(report.totalMoves).toBe(1);
      expect(report.optimalMovesMade).toBe(1); // Based on isLocalOptimal = true for the one move
      expect(report.moveAccuracy).toBeCloseTo(100);
      // playerSemanticDistance: wordA -(0.5)-> wordC. Total = 0.5
      expect(report.playerSemanticDistance).toBeCloseTo(0.5);
      // optimalSemanticDistance: wordA -(0.2)-> wordB -(0.1)-> wordD. Total = 0.3
      expect(report.optimalSemanticDistance).toBeCloseTo(0.3);
      // averageSimilarity: (0.5)/1 = 0.5
      expect(report.averageSimilarity).toBeCloseTo(0.5);
      // pathEfficiency: (optimalMovesForGlobalPath-1)/(playerMoves-1) = (3-1)/(2-1) = 2/1 = 2. This formula seems to be about raw path length efficiency. Optimal path is 2 moves. Player made 1 move.
      // The formula is (optimalPathGlobal.length - 1) / (playerPath.length - 1) : (3-1)/(2-1) = 2
      expect(report.pathEfficiency).toBe(2);

      expect(report.missedOptimalMoves.length).toBe(1); // Chose C instead of B at wordA
      expect(report.missedOptimalMoves[0]).toContain(
        "At wordA, chose wordC instead of optimal wordB",
      );
      expect(report.suggestedPath).toEqual(["wordC", "wordD"]); // Path from last player position (wordC) to targetWord (wordD)
    });

    it("should handle zero optimal semantic distance (e.g. start=end)", () => {
      const playerPath = ["wordA"]; // Game ended at start or one move to itself
      const optimalPathGlobal = ["wordA"];
      const report = generateGameReport(
        mockGraphData,
        playerPath,
        optimalPathGlobal,
        [],
        "wordA",
        findShortestPath,
        findShortestPath,
        [],
        [],
        false, // isDailyChallenge
        undefined, // dailyChallengeId
        undefined, // aiPath
        null, // aiModel
        false, // isChallenge
      );
      expect(report.status).toBe("won");
    });

    it("should handle zero player path distance if optimal is non-zero", () => {
      const playerPath = ["wordA"];
      const optimalPathGlobal = ["wordA", "wordB"]; // Optimal distance 0.2
      const report = generateGameReport(
        mockGraphData,
        playerPath,
        optimalPathGlobal,
        [],
        "wordB",
        findShortestPath,
        findShortestPath,
        [],
        [],
        false, // isDailyChallenge
        undefined, // dailyChallengeId
        undefined, // aiPath
        null, // aiModel
        false, // isChallenge
      );
      expect(report.status).toBe("given_up");
    });

    // TODO: Add tests for backtrackEvents, potentialRarestMoves if their processing affects the report beyond just being passed through.
    // For now, they are just passed through.
  });
});
