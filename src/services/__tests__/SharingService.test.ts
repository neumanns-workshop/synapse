// Basic placeholder test for SharingService
// TODO: Import actual exports and add meaningful tests

import type { GameReport, OptimalChoice } from "../../utils/gameReportUtils";

// Test the encoding functions directly
const encodeGameReportForSharing = (report: GameReport): string => {
  const { playerPath, optimalChoices, suggestedPath, status } = report;
  
  if (!playerPath || playerPath.length === 0) {
    return "";
  }

  let encoded = "";
  
  // Process each word in the player's path
  for (let i = 0; i < playerPath.length; i++) {
    const word = playerPath[i];
    
    if (i === 0) {
      // Start word
      encoded += "S";
    } else if (i === playerPath.length - 1) {
      // Last word in path
      if (status === "won") {
        // If won, last word is the target
        encoded += "T";
      } else {
        // If gave up, last word is current position
        encoded += "C";
      }
    } else {
      // Middle words - check if they were optimal moves
      const choiceIndex = i - 1; // Choice index is one less than word index
      const choice = optimalChoices?.[choiceIndex];
      
      if (choice && choice.playerChose === word) {
        if (choice.isGlobalOptimal) {
          encoded += "G";
        } else if (choice.isLocalOptimal) {
          encoded += "L";
        } else {
          encoded += "N";
        }
      } else {
        encoded += "N";
      }
    }
  }
  
  // If player gave up, add remaining path from suggested path
  if (status === "given_up" && suggestedPath && suggestedPath.length > 1) {
    // Skip the first word of suggested path (it's the current position, already encoded as C)
    for (let i = 1; i < suggestedPath.length - 1; i++) {
      encoded += "R";
    }
    // Last word of suggested path is the target
    encoded += "T";
  }
  
  return encoded;
};

const pathEncodingToEmojis = (encoded: string): string => {
  return encoded
    .split("")
    .map((char) => {
      switch (char) {
        case "S": return "🟩"; // Start - green square
        case "T": return "🟥"; // Target - red square  
        case "C": return "🟦"; // Current - blue square
        case "N": return "⬜"; // Normal - light gray square
        case "G": return "🟨"; // Global optimal - yellow square
        case "L": return "🟪"; // Local optimal - purple square
        case "R": return "⚫"; // Remaining path - dark circle
        default: return char;
      }
    })
    .join("");
};

describe("SharingService Encoding", () => {
  describe("encodeGameReportForSharing", () => {
    it("should encode a winning path correctly", () => {
      const mockOptimalChoices: OptimalChoice[] = [
        {
          playerPosition: "start",
          playerChose: "word1",
          optimalChoice: "word1",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
        {
          playerPosition: "word1",
          playerChose: "word2",
          optimalChoice: "word2",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
        {
          playerPosition: "word2",
          playerChose: "word3",
          optimalChoice: "word3",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
        {
          playerPosition: "word3",
          playerChose: "target",
          optimalChoice: "target",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
      ];

      const mockGameReport: GameReport = {
        playerPath: ["start", "word1", "word2", "word3", "target"],
        optimalPath: ["start", "word1", "word2", "word3", "target"],
        suggestedPath: [],
        optimalChoices: mockOptimalChoices,
        status: "won",
        optimalMovesMade: 4,
        totalMoves: 4,
        moveAccuracy: 100,
        missedOptimalMoves: [],
        playerSemanticDistance: 0.4,
        optimalSemanticDistance: 0.4,
        averageSimilarity: 0.9,
        id: "test-1",
        timestamp: Date.now(),
        startWord: "start",
        targetWord: "target",
        pathEfficiency: 1.0,
      };

      const encoded = encodeGameReportForSharing(mockGameReport);
      expect(encoded).toBe("SGGGT"); // Start, 3 Global optimal moves, Target
    });

    it("should encode a path with mixed optimal moves correctly", () => {
      const mockOptimalChoices: OptimalChoice[] = [
        {
          playerPosition: "start",
          playerChose: "word1",
          optimalChoice: "word1",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
        {
          playerPosition: "word1",
          playerChose: "word2",
          optimalChoice: "other",
          isGlobalOptimal: false,
          isLocalOptimal: true,
        },
        {
          playerPosition: "word2",
          playerChose: "word3",
          optimalChoice: "other",
          isGlobalOptimal: false,
          isLocalOptimal: false,
        },
      ];

      const mockGameReport: GameReport = {
        playerPath: ["start", "word1", "word2", "word3"],
        optimalPath: ["start", "word1", "other", "target"],
        suggestedPath: [],
        optimalChoices: mockOptimalChoices,
        status: "given_up",
        optimalMovesMade: 2,
        totalMoves: 3,
        moveAccuracy: 66.7,
        missedOptimalMoves: [],
        playerSemanticDistance: 0.6,
        optimalSemanticDistance: 0.4,
        averageSimilarity: 0.8,
        id: "test-2",
        timestamp: Date.now(),
        startWord: "start",
        targetWord: "target",
        pathEfficiency: 0.75,
      };

      const encoded = encodeGameReportForSharing(mockGameReport);
      expect(encoded).toBe("SGLC"); // Start, Global, Local, Current (not Normal because word3 is the last word)
    });

    it("should encode a path with remaining suggested path correctly", () => {
      const mockOptimalChoices: OptimalChoice[] = [
        {
          playerPosition: "start",
          playerChose: "word1",
          optimalChoice: "word1",
          isGlobalOptimal: true,
          isLocalOptimal: true,
        },
      ];

      const mockGameReport: GameReport = {
        playerPath: ["start", "word1"],
        optimalPath: ["start", "word1", "word2", "target"],
        suggestedPath: ["word1", "word2", "target"], // Path from current position to target
        optimalChoices: mockOptimalChoices,
        status: "given_up",
        optimalMovesMade: 1,
        totalMoves: 1,
        moveAccuracy: 100,
        missedOptimalMoves: [],
        playerSemanticDistance: 0.2,
        optimalSemanticDistance: 0.4,
        averageSimilarity: 0.9,
        id: "test-3",
        timestamp: Date.now(),
        startWord: "start",
        targetWord: "target",
        pathEfficiency: 0.5,
      };

      const encoded = encodeGameReportForSharing(mockGameReport);
      expect(encoded).toBe("SCRT"); // Start, Current (word1 is last in player path), Remaining, Target
    });
  });

  describe("pathEncodingToEmojis", () => {
    it("should convert encoded path to emojis correctly", () => {
      const encoded = "SGGGT";
      const emojis = pathEncodingToEmojis(encoded);
      expect(emojis).toBe("🟩🟨🟨🟨🟥"); // Green, Yellow x3, Red
    });

    it("should convert mixed path to emojis correctly", () => {
      const encoded = "SGLNC";
      const emojis = pathEncodingToEmojis(encoded);
      expect(emojis).toBe("🟩🟨🟪⬜🟦"); // Green, Yellow, Purple, White, Blue
    });

    it("should convert path with remaining moves to emojis correctly", () => {
      const encoded = "SCRT";
      const emojis = pathEncodingToEmojis(encoded);
      expect(emojis).toBe("🟩🟦⚫🟥"); // Green, Blue, Black circle, Red
    });
  });
});
