import type { Achievement } from "../achievement.types";

export const sorryWrongRoomAchievement: Achievement = {
  id: "sorryWrongRoom",
  name: "Sorry, Wrong Room",
  description:
    "Won or gave up the game after using the backtrack feature more than 3 times. A true journey of second (and third, and fourth...) guesses!",
  isProgressive: true,
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
