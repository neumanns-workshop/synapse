import type { Achievement } from "../achievement.types";

export const epicyclesUponEpicyclesAchievement: Achievement = {
  id: "epicyclesUponEpicycles",
  name: "Epicycles Upon Epicycles",
  description:
    "Demonstrated a truly circuitous path by revisiting at least four different words.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      !gameReport.playerPath ||
      gameReport.playerPath.length < 8
    ) {
      // Min length for A->B->A -> C->D->C -> E->F->E -> G->H->G
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
    // Award if at least 4 *different* words were the subject of a revisit.
    return distinctRevisitedWords.size >= 4;
  },
};
