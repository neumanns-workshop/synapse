import type { Achievement } from "../achievement.types";

export const looseCannonWinsAchievement: Achievement = {
  id: "looseCannonWins",
  name: "The Best We've Got",
  description:
    "Despite a wild course, choosing the least similar neighbor at least 50% of the time, you still managed to win!",
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "won" ||
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
