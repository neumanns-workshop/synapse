import type { Achievement } from "../achievement.types";

export const forgotMyKeysAchievement: Achievement = {
  id: "forgotMyKeys",
  name: "Forgot My Keys",
  description:
    "Gave up when further (in terms of path length) from the target than when you started.",
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "given_up" ||
      !gameReport ||
      !gameReport.suggestedPath ||
      !gameReport.optimalPath ||
      gameReport.suggestedPath.length === 0 ||
      gameReport.optimalPath.length === 0
    ) {
      return false;
    }
    return gameReport.suggestedPath.length > gameReport.optimalPath.length;
  },
};
