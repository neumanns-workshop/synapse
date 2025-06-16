import type { Achievement } from "../achievement.types";

export const straightAndNarrowAchievement: Achievement = {
  id: "straightAndNarrow",
  name: "Straight and Narrow",
  description: "Won the game with a path exactly matching the optimal length.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    // Ensure gameReport is not null and playerPath/optimalPath are available
    if (
      gameStatus !== "won" ||
      !gameReport ||
      !gameReport.playerPath ||
      !gameReport.optimalPath
    ) {
      return false;
    }
    return gameReport.playerPath.length === gameReport.optimalPath.length;
  },
};
