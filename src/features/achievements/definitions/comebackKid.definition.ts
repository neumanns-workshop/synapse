import type { Achievement } from "../achievement.types";

export const comebackKidAchievement: Achievement = {
  id: "comebackKid",
  name: "Comeback Kid",
  description:
    "Won the game after, at some point, being at least two steps further (in path length) from the target than when you started.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "won" ||
      !gameReport ||
      !gameReport.optimalPath ||
      gameReport.optimalPath.length === 0 ||
      !gameReport.optimalChoices ||
      gameReport.optimalChoices.length === 0
    ) {
      return false;
    }
    const initialHopsToEnd = gameReport.optimalPath.length - 1;
    for (const choice of gameReport.optimalChoices) {
      if (
        choice.hopsFromPlayerPositionToEnd !== undefined &&
        choice.hopsFromPlayerPositionToEnd > initialHopsToEnd + 1
      ) {
        return true;
      }
    }
    return false;
  },
};
