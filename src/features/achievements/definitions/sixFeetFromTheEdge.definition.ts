import type { Achievement } from "../achievement.types";

export const sixFeetFromTheEdgeAchievement: Achievement = {
  id: "sixFeetFromTheEdge",
  name: "Six Feet From the Edge",
  description: "Gave up when just a step or two away from the target word.",
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "given_up" ||
      !gameReport ||
      !gameReport.suggestedPath ||
      gameReport.suggestedPath.length <= 1
    ) {
      // Path must exist and be longer than just the current word
      return false;
    }

    const movesRemaining = gameReport.suggestedPath.length - 1;

    // Award if 1 or 2 moves were remaining
    return movesRemaining === 1 || movesRemaining === 2;
  },
};
