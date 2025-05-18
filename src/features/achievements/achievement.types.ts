import type { GameState } from "../../stores/useGameStore";
import type { GameReport } from "../../utils/gameReportUtils";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  // Takes the game report and current game status, returns true if achieved
  check: (
    gameReport: GameReport,
    gameStatus: GameState["gameStatus"],
  ) => boolean;
}
