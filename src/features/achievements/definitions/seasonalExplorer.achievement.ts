import type { Achievement } from "../achievement.types";

// Note: This achievement will need special handling since it's based on 
// word collection completion rather than game reports
export const seasonalExplorerAchievement: Achievement = {
  id: "seasonal-explorer",
  name: "Seasonal Explorer",
  description: "Complete seasonal word collections throughout the year",
  icon: "calendar-star",
  isProgressive: true,
  
  tiers: [
    {
      name: "Spring Awakener",
      description: "Complete your first seasonal collection",
      requirement: "Complete 1 seasonal word collection",
      threshold: 1
    },
    {
      name: "Seasonal Wanderer", 
      description: "Experience the rhythm of multiple seasons",
      requirement: "Complete 3 seasonal word collections",
      threshold: 3
    },
    {
      name: "Nature's Chronicler",
      description: "Witness the full cycle of nature's moods", 
      requirement: "Complete 6 seasonal word collections",
      threshold: 6
    },
    {
      name: "Master of Seasons",
      description: "Become one with the eternal dance of time",
      requirement: "Complete 9 seasonal word collections", 
      threshold: 9
    },
    {
      name: "Eternal Cycle Keeper",
      description: "Transcend seasons - you are the rhythm itself",
      requirement: "Complete 12 seasonal word collections",
      threshold: 12
    }
  ],
  
  check: (gameReport, gameStatus) => {
    // This achievement is checked differently - it's based on word collection completion
    // The actual checking will be done in the word collection system
    // For now, return false as this will be handled separately
    return false;
  }
}; 