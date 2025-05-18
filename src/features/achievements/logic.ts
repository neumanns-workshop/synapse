import type { Achievement } from "./achievement.types"; // Adjusted path
import { allAchievements } from "./definitions"; // Adjusted path
import type { GameState } from "../../stores/useGameStore";
import type { GameReport } from "../../utils/gameReportUtils";

// Function to evaluate all achievements for a given game report and status
export const evaluateAchievements = (
  gameReport: GameReport,
  gameStatus: GameState["gameStatus"],
): Achievement[] => {
  if (!gameReport) {
    return [];
  }
  // Only evaluate for 'won' status, or if an achievement itself doesn't depend on winning.
  // For now, most will, so this is a general guard.
  // Individual achievement 'check' functions are responsible for their specific win condition logic.
  return allAchievements.filter((achievement) =>
    achievement.check(gameReport, gameStatus),
  );
};
