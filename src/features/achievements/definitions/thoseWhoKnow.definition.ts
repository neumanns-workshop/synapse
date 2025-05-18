import type { Achievement } from "../achievement.types";

export const thoseWhoKnowAchievement: Achievement = {
  id: "thoseWhoKnow",
  name: "Those Who Know",
  description:
    "Selected a word that was both the rarest available option and an optimal move.",
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      !gameReport.optimalChoices
    ) {
      return false;
    }
    return gameReport.optimalChoices.some(
      (choice) =>
        choice.choseRarestNeighbor === true &&
        (choice.isGlobalOptimal === true || choice.isLocalOptimal === true),
    );
  },
};
