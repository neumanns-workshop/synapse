import type { Achievement } from "../achievement.types";

// Note: This achievement will need special handling since it's based on
// word collection completion rather than game reports
export const seasonalExplorerAchievement: Achievement = {
  id: "seasonalExplorer",
  name: "Seasonal Explorer",
  description: "Complete seasonal word collections throughout the year",
  icon: "calendar-star",
  isProgressive: true,

  check: () => {
    // This achievement is checked differently - it's based on word collection completion
    // The actual checking will be done in the word collection system
    // For now, return false as this will be handled separately
    return false;
  },
};
