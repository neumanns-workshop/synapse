import type { Achievement } from "../achievement.types";

export const slowAndSteadyAchievement: Achievement = {
  id: "slowAndSteady",
  name: "Slow and Steady",
  description:
    "Win by choosing the most semantically similar neighbor at least 66% of the time.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "won" ||
      !gameReport ||
      !gameReport.optimalChoices ||
      gameReport.optimalChoices.length === 0
    ) {
      return false;
    }
    const mostSimilarChoiceMoves = gameReport.optimalChoices.filter(
      (oc) => oc.choseMostSimilarNeighbor,
    ).length;
    const totalMoves = gameReport.optimalChoices.length;
    return totalMoves > 0 && mostSimilarChoiceMoves / totalMoves >= 0.66;
  },
};
