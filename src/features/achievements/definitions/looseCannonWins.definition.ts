import type { Achievement } from "../achievement.types";

export const looseCannonWinsAchievement: Achievement = {
  id: "looseCannonWins",
  name: "Loose Cannon Wins",
  description:
    "Won by choosing the least semantically similar neighbor at least 50% of the time.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (gameStatus !== "won" || !gameReport || !gameReport.optimalChoices) {
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
