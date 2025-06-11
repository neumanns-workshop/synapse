import { unifiedDataStore } from "../../services/UnifiedDataStore";
import type { GameState } from "../../stores/useGameStore";
import type { GameReport } from "../../utils/gameReportUtils";
import { allAchievements } from "./definitions"; // Adjusted path
import type { Achievement } from "./achievement.types"; // Adjusted path

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

// Function to handle progressive achievements - increment counters for achievements that were earned
export const handleProgressiveAchievements = async (
  gameReport: GameReport,
  gameStatus: GameState["gameStatus"],
): Promise<string[]> => {
  if (!gameReport) {
    return [];
  }

  const progressiveAchievementsTriggered: string[] = [];

  // Check each progressive achievement
  for (const achievement of allAchievements) {
    if (
      achievement.isProgressive &&
      achievement.check(gameReport, gameStatus)
    ) {
      // Increment the counter for this progressive achievement
      const newCount = await unifiedDataStore.incrementProgressiveAchievement(
        achievement.id,
      );
      progressiveAchievementsTriggered.push(achievement.id);
      console.log(
        `Progressive achievement ${achievement.id} incremented to ${newCount}x`,
      );
    }
  }

  return progressiveAchievementsTriggered;
};
