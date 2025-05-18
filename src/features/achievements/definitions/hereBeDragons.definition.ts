import type { Achievement } from "../achievement.types";

export const hereBeDragonsAchievement: Achievement = {
  id: "hereBeDragons",
  name: "Here Be Dragons",
  description:
    "Deviated from the optimal path after making at least one optimal move, and then successfully found your way back to an optimal word.",
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      gameReport.playerPath.length < 2 ||
      !gameReport.optimalPath ||
      gameReport.optimalPath.length < 1
    ) {
      return false;
    }

    let hasMadeOptimalStep = false;
    let hasQualifiedDeviation = false;

    for (let i = 1; i < gameReport.playerPath.length; i++) {
      const prevPlayerWord = gameReport.playerPath[i - 1];
      const currentPlayerWord = gameReport.playerPath[i];

      const prevWordOptimalIndex =
        gameReport.optimalPath.indexOf(prevPlayerWord);
      const currentPlayerIsOnOptimalPath =
        gameReport.optimalPath.includes(currentPlayerWord);

      if (prevWordOptimalIndex !== -1) {
        // Previous word was on the optimal path.
        const expectedOptimalNextWord =
          prevWordOptimalIndex + 1 < gameReport.optimalPath.length
            ? gameReport.optimalPath[prevWordOptimalIndex + 1]
            : null;

        if (
          expectedOptimalNextWord &&
          currentPlayerWord === expectedOptimalNextWord
        ) {
          // Player continued optimally.
          hasMadeOptimalStep = true;
          if (hasQualifiedDeviation) {
            // Was deviated (qualifiedly) and now back on an optimal sequence.
            return true;
          }
        } else {
          // Player deviated from an optimal word (or moved past the end of optimal path).
          if (hasMadeOptimalStep) {
            // This deviation counts because they had previously made an optimal step.
            hasQualifiedDeviation = true;
          }
          // If !hasMadeOptimalStep, this is a deviation from the startWord on the first move.
          // hasQualifiedDeviation is not set, so it doesn't count yet.
        }
      } else {
        // Previous word was NOT on the optimal path.
        if (hasMadeOptimalStep) {
          // If they were on an optimal path, made an optimal step, then went off,
          // this means they are in a qualified deviated state.
          hasQualifiedDeviation = true;
        }
      }

      // General check for returning to any optimal word after a qualified deviation.
      // This covers cases where they jump back onto the optimal path from an off-path word.
      if (hasQualifiedDeviation && currentPlayerIsOnOptimalPath) {
        return true;
      }
    }
    return false;
  },
};
