import type { Achievement } from "../achievement.types";

export const dejaVuAchievement: Achievement = {
  id: "dejaVu",
  name: "Déjà Vu",
  description: "Revisited a word you had already been to in your current path.",
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      !gameReport.playerPath ||
      gameReport.playerPath.length < 3
    ) {
      // Need at least A -> B -> A to have a revisit
      return false;
    }

    const visitedWords = new Set<string>();
    for (const word of gameReport.playerPath) {
      if (visitedWords.has(word)) {
        return true; // Found a revisited word
      }
      visitedWords.add(word);
    }
    return false; // No word was revisited
  },
};
