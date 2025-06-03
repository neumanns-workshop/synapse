import type { Achievement } from "../achievement.types";

export const sellingSeashellsAchievement: Achievement = {
  id: "sellingSeashells",
  name: "Selling Seashells",
  description:
    "Chose three words in a row that start with the same letter and won.",
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "won" ||
      !gameReport ||
      !gameReport.playerPath ||
      gameReport.playerPath.length < 3
    ) {
      return false;
    }

    const path = gameReport.playerPath;
    // Check if there are three consecutive words starting with the same letter
    for (let i = 0; i < path.length - 2; i++) {
      const firstLetter1 = path[i].charAt(0).toLowerCase();
      const firstLetter2 = path[i + 1].charAt(0).toLowerCase();
      const firstLetter3 = path[i + 2].charAt(0).toLowerCase();

      if (
        firstLetter1 && // Ensure not an empty string
        firstLetter1 === firstLetter2 &&
        firstLetter2 === firstLetter3
      ) {
        return true;
      }
    }

    return false;
  },
};
