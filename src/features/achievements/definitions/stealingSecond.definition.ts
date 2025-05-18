import type { Achievement } from "../achievement.types";

export const stealingSecondAchievement: Achievement = {
  id: "stealing-second",
  name: "Stealing Second with a Foot on First",
  description:
    "Gave up, having chosen the most semantically similar neighbor at least 50% of the time.",
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "given_up" || // Ensure game was given up
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
    return totalMoves > 0 && mostSimilarChoiceMoves / totalMoves >= 0.5;
  },
};
