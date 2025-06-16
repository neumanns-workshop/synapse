import type { Achievement } from "../achievement.types";

export const looseCannonAchievement: Achievement = {
  id: "looseCannon",
  name: "Loose Cannon",
  description:
    "Gave up the game having charted a wild course, choosing the least similar neighbor at least 50% of the time.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "given_up" || // Ensure game was given up
      !gameReport ||
      !gameReport.optimalChoices ||
      gameReport.optimalChoices.length === 0
    ) {
      return false;
    }
    let leastSimilarChoices = 0;
    for (const choice of gameReport.optimalChoices) {
      if (choice.choseLeastSimilarNeighbor) {
        leastSimilarChoices++;
      }
    }
    return leastSimilarChoices / gameReport.optimalChoices.length >= 0.5;
  },
};
