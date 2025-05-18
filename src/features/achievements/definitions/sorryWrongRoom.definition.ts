import type { Achievement } from "../achievement.types";

export const sorryWrongRoomAchievement: Achievement = {
  id: "sorry-wrong-room",
  name: "Sorry, Wrong Room",
  description:
    "Won or gave up the game after using the backtrack feature more than 3 times. A true journey of second (and third, and fourth...) guesses!",
  // icon: '↪️', // Placeholder icon
  check: (gameReport, gameStatus) => {
    if (
      !["won", "given_up"].includes(gameStatus) ||
      !gameReport ||
      !gameReport.backtrackEvents
    ) {
      return false;
    }
    return gameReport.backtrackEvents.length > 3;
  },
};
