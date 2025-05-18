import type { Achievement } from "../achievement.types";

export const puttingOnTheDogAchievement: Achievement = {
  id: "puttingOnTheDog",
  name: "Putting on the Dog",
  description:
    "Selected the rarest word that was offered as an option throughout the entire game and won.",
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "won" || // Require win
      !gameReport ||
      !gameReport.potentialRarestMoves ||
      gameReport.potentialRarestMoves.length === 0
    ) {
      return false;
    }

    let overallRarestFrequency = Infinity;
    for (const potentialMove of gameReport.potentialRarestMoves) {
      if (potentialMove.frequency < overallRarestFrequency) {
        overallRarestFrequency = potentialMove.frequency;
      }
    }

    if (overallRarestFrequency === Infinity) {
      return false;
    }

    return gameReport.potentialRarestMoves.some(
      (potentialMove) =>
        potentialMove.frequency === overallRarestFrequency &&
        potentialMove.playerChoseThisRarestOption === true,
    );
  },
};
