import type { Achievement } from "../achievement.types";

export const sellingSeashellsAchievement: Achievement = {
  id: "sellingSeashells",
  name: "Selling Seashells",
  description:
    "Chose five words in a row that start with the same letter and won.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      gameStatus !== "won" ||
      !gameReport ||
      !gameReport.playerPath ||
      gameReport.playerPath.length < 5
    ) {
      return false;
    }

    const path = gameReport.playerPath;
    // Check if there are five consecutive words starting with the same letter
    for (let i = 0; i < path.length - 4; i++) {
      const firstLetter = path[i].charAt(0).toLowerCase();
      if (!firstLetter) continue;

      let alliterative = true;
      for (let j = 1; j < 5; j++) {
        if (path[i + j].charAt(0).toLowerCase() !== firstLetter) {
          alliterative = false;
          break;
        }
      }
      if (alliterative) return true;
    }

    return false;
  },
};
