import type { Achievement } from "../achievement.types";

export const wordCollectorAchievement: Achievement = {
  id: "word-collector",
  name: "Word Collector",
  description: "Complete diverse word collections to expand your vocabulary",
  icon: "book-open-variant",
  isProgressive: true,

  check: (gameReport, gameStatus) => {
    // This achievement is checked differently - it's based on word collection completion
    // The actual checking will be done in the word collection system
    return false;
  },
};
