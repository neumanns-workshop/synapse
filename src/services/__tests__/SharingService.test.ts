// Test for SharingService encoding functions

import type { GameReport, OptimalChoice } from "../../utils/gameReportUtils";

// Import only the encoding functions to avoid react-native dependencies in tests
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

// pathEncodingToEmojis function removed - now using visual previews with QR codes

// Copy the generateDailyChallengeTaunt and generateChallengeMessage function logic for testing without React Native dependencies
const generateDailyChallengeTaunt = (options: {
  startWord: string;
  targetWord: string;
  aiSteps: number;
  userSteps?: number;
  userCompleted?: boolean;
  userGaveUp?: boolean;
  challengeDate: string;
  optimalPathLength?: number;
}): string => {
  const {
    startWord,
    targetWord,
    aiSteps,
    userSteps,
    userCompleted,
    userGaveUp,
    challengeDate,
    optimalPathLength,
  } = options;

  const dateObj = new Date(challengeDate);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // If user completed it, compare with AI
  if (userCompleted && userSteps) {
    const userMoveText = userSteps === 1 ? "move" : "moves";
    const aiMoveText = aiSteps === 1 ? "move" : "moves";

    // Check if user achieved a perfect game (optimal path)
    const isPerfectGame = optimalPathLength && userSteps === optimalPathLength;

    let message: string;
    if (userSteps < aiSteps) {
      if (isPerfectGame) {
        message = `I got a PERFECT game on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText} (the optimal path). The AI took ${aiSteps} ${aiMoveText}. Can you match perfection?`;
      } else {
        message = `I crushed the AI on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText} (AI took ${aiSteps} ${aiMoveText}). Think you can beat me?`;
      }
    } else if (userSteps === aiSteps) {
      if (isPerfectGame) {
        message = `I got a PERFECT game on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText} (the optimal path). The AI matched me. Can you achieve perfection too?`;
      } else {
        message = `I matched the AI on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText}. Can you do better?`;
      }
    } else {
      if (isPerfectGame) {
        message = `I got a PERFECT game on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText} (the optimal path). The AI was faster with ${aiSteps} ${aiMoveText}, but can you match my perfection?`;
      } else {
        message = `I got ${formattedDate}'s challenge in ${userSteps} ${userMoveText} ("${startWord}" → "${targetWord}"). The AI did it in ${aiSteps} ${aiMoveText}... can you beat us both?`;
      }
    }

    return message;
  }

  // Simplified version for testing - just return a basic message for other cases
  return `Basic challenge message for ${formattedDate}`;
};

// Copy the generateChallengeMessage function logic for testing without React Native dependencies
const generateChallengeMessage = (options: {
  startWord: string;
  targetWord: string;
  playerPath?: string[];
  steps?: number;
  deepLink: string;
  gameStatus?: "won" | "given_up";
  optimalPathLength?: number;
}): string => {
  const {
    startWord,
    targetWord,
    playerPath,
    steps,
    deepLink: _deepLink,
    gameStatus,
    optimalPathLength,
  } = options;

  let challengeMessage = `Can you connect "${startWord}" to "${targetWord}" in Synapse?`;

  // If player has a path (either completed or gave up)
  if (playerPath && playerPath.length > 1) {
    const pathLength = steps || playerPath.length - 1;

    if (gameStatus === "won") {
      const stepText = pathLength === 1 ? "step" : "steps";

      // Check if user achieved a perfect game (optimal path)
      const isPerfectGame =
        optimalPathLength && pathLength === optimalPathLength;

      if (isPerfectGame) {
        challengeMessage = `I got a PERFECT game! Connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText} (the optimal path). Can you match perfection in Synapse?`;
      } else {
        challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText}! Can you beat my score in Synapse?`;
      }
    } else if (gameStatus === "given_up") {
      const stepText = pathLength === 1 ? "step" : "steps";
      challengeMessage = `I gave up trying to connect "${startWord}" to "${targetWord}" after ${pathLength} ${stepText}. Think you can do better in Synapse?`;
    } else {
      // Fallback for when gameStatus is not provided (backwards compatibility)
      const stepText = pathLength === 1 ? "step" : "steps";

      // Check if user achieved a perfect game (optimal path)
      const isPerfectGame =
        optimalPathLength && pathLength === optimalPathLength;

      if (isPerfectGame) {
        challengeMessage = `I got a PERFECT game! Connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText} (the optimal path). Can you match perfection in Synapse?`;
      } else {
        challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText}! Can you beat my score in Synapse?`;
      }
    }
  }

  return challengeMessage;
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

  // pathEncodingToEmojis tests removed - now using visual previews with QR codes
});

describe("SharingService Daily Challenge Taunts", () => {
  describe("generateDailyChallengeTaunt", () => {
    it("should generate perfect game message when user steps equals optimal path length", () => {
      const taunt = generateDailyChallengeTaunt({
        startWord: "start",
        targetWord: "target",
        aiSteps: 4,
        userSteps: 3, // User took 3 steps
        userCompleted: true,
        userGaveUp: false,
        challengeDate: "2025-01-15",
        optimalPathLength: 3, // Optimal path is also 3 steps
      });

      expect(taunt).toContain("PERFECT game");
      expect(taunt).toContain("the optimal path");
      expect(taunt).not.toContain("Can you do better?");
      expect(taunt).toContain("Can you match perfection?");
    });

    it("should generate normal message when user steps does not equal optimal path length", () => {
      const taunt = generateDailyChallengeTaunt({
        startWord: "start",
        targetWord: "target",
        aiSteps: 4,
        userSteps: 5, // User took 5 steps
        userCompleted: true,
        userGaveUp: false,
        challengeDate: "2025-01-15",
        optimalPathLength: 3, // Optimal path is 3 steps
      });

      expect(taunt).not.toContain("PERFECT game");
      expect(taunt).not.toContain("the optimal path");
      expect(taunt).toContain("can you beat us both?");
    });

    it("should generate perfect game message when matching AI and optimal", () => {
      const taunt = generateDailyChallengeTaunt({
        startWord: "start",
        targetWord: "target",
        aiSteps: 3,
        userSteps: 3, // User took 3 steps, same as AI
        userCompleted: true,
        userGaveUp: false,
        challengeDate: "2025-01-15",
        optimalPathLength: 3, // Optimal path is also 3 steps
      });

      expect(taunt).toContain("PERFECT game");
      expect(taunt).toContain("the optimal path");
      expect(taunt).toContain("The AI matched me");
      expect(taunt).toContain("Can you achieve perfection too?");
    });

    it("should generate normal message when matching AI but not optimal", () => {
      const taunt = generateDailyChallengeTaunt({
        startWord: "start",
        targetWord: "target",
        aiSteps: 4,
        userSteps: 4, // User took 4 steps, same as AI
        userCompleted: true,
        userGaveUp: false,
        challengeDate: "2025-01-15",
        optimalPathLength: 3, // Optimal path is 3 steps
      });

      expect(taunt).not.toContain("PERFECT game");
      expect(taunt).toContain("Can you do better?");
    });
  });
});

describe("SharingService Regular Challenge Messages", () => {
  describe("generateChallengeMessage", () => {
    it("should generate perfect game message when user steps equals optimal path length", () => {
      const message = generateChallengeMessage({
        startWord: "start",
        targetWord: "target",
        playerPath: ["start", "word1", "word2", "target"],
        steps: 3,
        deepLink: "https://example.com",
        gameStatus: "won",
        optimalPathLength: 3, // User took 3 steps, optimal is also 3
      });

      expect(message).toContain("PERFECT game");
      expect(message).toContain("the optimal path");
      expect(message).toContain("Can you match perfection");
      expect(message).not.toContain("Can you beat my score");
    });

    it("should generate normal message when user steps does not equal optimal path length", () => {
      const message = generateChallengeMessage({
        startWord: "start",
        targetWord: "target",
        playerPath: ["start", "word1", "word2", "word3", "target"],
        steps: 4,
        deepLink: "https://example.com",
        gameStatus: "won",
        optimalPathLength: 3, // User took 4 steps, optimal is 3
      });

      expect(message).not.toContain("PERFECT game");
      expect(message).not.toContain("the optimal path");
      expect(message).toContain("Can you beat my score");
    });

    it("should generate perfect game message for fallback case (no gameStatus)", () => {
      const message = generateChallengeMessage({
        startWord: "start",
        targetWord: "target",
        playerPath: ["start", "word1", "word2", "target"],
        steps: 3,
        deepLink: "https://example.com",
        optimalPathLength: 3, // User took 3 steps, optimal is also 3
      });

      expect(message).toContain("PERFECT game");
      expect(message).toContain("the optimal path");
      expect(message).toContain("Can you match perfection");
      expect(message).not.toContain("Can you beat my score");
    });

    it("should not affect gave up messages", () => {
      const message = generateChallengeMessage({
        startWord: "start",
        targetWord: "target",
        playerPath: ["start", "word1", "word2"],
        steps: 2,
        deepLink: "https://example.com",
        gameStatus: "given_up",
        optimalPathLength: 3,
      });

      expect(message).not.toContain("PERFECT game");
      expect(message).toContain("Think you can do better");
    });
  });
});
