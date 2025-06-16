import type { Achievement } from "../achievement.types";

export const dejaVuAchievement: Achievement = {
  id: "dejaVu",
  name: "Déjà Vu",
  description: "Revisited a word you had already been to at least twice.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      !gameReport.playerPath ||
      gameReport.playerPath.length < 4 // e.g. A -> B -> A -> B
    ) {
      return false;
    }

    const visitedWords = new Set<string>();
    let revisitCount = 0;
    for (const word of gameReport.playerPath) {
      if (visitedWords.has(word)) {
        revisitCount++;
        if (revisitCount >= 2) {
          return true; // Found at least two revisits
        }
      }
      visitedWords.add(word);
    }
    return false; // Not enough revisits
  },
};
