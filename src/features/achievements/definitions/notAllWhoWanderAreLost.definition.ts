import type { Achievement } from "../achievement.types";

export const notAllWhoWanderAreLostAchievement: Achievement = {
  id: "notAllWhoWanderAreLost",
  name: "Not All Who Wander Are Lost",
  description:
    "Reached the end (or gave up) having made no optimal or suggested moves, except possibly the final winning one.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      !gameReport ||
      !gameReport.optimalChoices ||
      !["won", "given_up"].includes(gameStatus)
    ) {
      return false;
    }

    const choicesToEvaluate = [...gameReport.optimalChoices];

    if (gameStatus === "won" && choicesToEvaluate.length > 0) {
      choicesToEvaluate.pop(); // Exclude the final winning move from the check
    }

    // Must have made at least one move that is subject to the check
    if (choicesToEvaluate.length === 0) {
      return false;
    }

    for (const choice of choicesToEvaluate) {
      if (choice.isGlobalOptimal || choice.isLocalOptimal) {
        return false; // This move was either globally or locally optimal
      }
    }

    return true; // All evaluated moves were neither optimal nor suggested
  },
};
