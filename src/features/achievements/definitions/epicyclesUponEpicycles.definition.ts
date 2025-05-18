import type { Achievement } from "../achievement.types";

export const epicyclesUponEpicyclesAchievement: Achievement = {
  id: "epicyclesUponEpicycles",
  name: "Epicycles Upon Epicycles",
  description:
    "Demonstrated a truly circuitous path by revisiting at least two different words.",
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      !gameReport.playerPath ||
      gameReport.playerPath.length < 5
    ) {
      // Min length for A->B->A -> C->B (5 words, 2 distinct revisits)
      return false;
    }

    const wordsEncounteredInPath = new Set<string>();
    const distinctRevisitedWords = new Set<string>();

    for (const word of gameReport.playerPath) {
      if (wordsEncounteredInPath.has(word)) {
        // This word is being revisited in the current path traversal
        distinctRevisitedWords.add(word);
      }
      wordsEncounteredInPath.add(word);
    }
    // Award if at least 2 *different* words were the subject of a revisit.
    return distinctRevisitedWords.size >= 2;
  },
};
