import type { Achievement } from "../achievement.types";

export const juggernautAchievement: Achievement = {
  id: "juggernaut",
  name: "I'm the Juggernaut!",
  description: "Completed the game without using the backtrack feature.",
  isProgressive: true,
  check: (gameReport, gameStatus) => {
    if (gameStatus !== "won" || !gameReport) {
      return false;
    }
    // Achieved if no backtrack events are present or the array is empty
    return (
      !gameReport.backtrackEvents || gameReport.backtrackEvents.length === 0
    );
  },
};
