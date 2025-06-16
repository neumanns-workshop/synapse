import type { Achievement } from "../achievement.types";

export const dancingToADifferentBeatAchievement: Achievement = {
  id: "dancingToADifferentBeat",
  name: "Dancing to a Different Beat",
  description:
    "Won the game by forging your own path, never treading the optimal route until the final step.",
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
    if (gameReport.optimalChoices.length <= 1) {
      return false;
    }
    for (let i = 0; i < gameReport.optimalChoices.length - 1; i++) {
      if (gameReport.optimalChoices[i].isGlobalOptimal) {
        return false;
      }
    }
    return true;
  },
};
