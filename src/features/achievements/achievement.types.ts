import type { GameState } from "../../stores/useGameStore";
import type { GameReport } from "../../utils/gameReportUtils";

export interface AchievementTier {
  name: string;
  description: string;
  requirement: string;
  threshold: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;

  // Versioning for safe updates
  version?: number; // Default to 1 if not specified
  deprecated?: boolean; // Mark achievements as deprecated instead of removing

  // For progressive achievements
  isProgressive?: boolean;
  tiers?: AchievementTier[];

  // Takes the game report and current game status, returns true if achieved
  check: (
    gameReport: GameReport,
    gameStatus: GameState["gameStatus"],
  ) => boolean;
}
