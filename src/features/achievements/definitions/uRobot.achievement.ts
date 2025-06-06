import type { Achievement } from "../achievement.types";

export const uRobotAchievement: Achievement = {
  id: "uRobot",
  name: "uRobot",
  description:
    "Beat the AI in daily challenges by completing them in fewer moves",
  icon: "robot-outline",
  isProgressive: true,

  check: (gameReport, gameStatus) => {
    // Check if this is a daily challenge where the player beat the AI
    if (
      gameStatus !== "won" ||
      !gameReport ||
      !gameReport.isDailyChallenge ||
      !gameReport.aiPath ||
      gameReport.aiPath.length === 0
    ) {
      return false;
    }

    // Calculate player moves and AI moves
    const playerMoves = gameReport.playerPath.length - 1; // Subtract 1 because path includes start word
    const aiMoves = gameReport.aiPath.length - 1; // Subtract 1 because path includes start word

    // Player beats AI if they completed the challenge in fewer or equal moves
    return playerMoves <= aiMoves && playerMoves > 0;
  },
};
