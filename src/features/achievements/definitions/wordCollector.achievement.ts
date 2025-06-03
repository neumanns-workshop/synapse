import type { Achievement } from "../achievement.types";

export const wordCollectorAchievement: Achievement = {
  id: "word-collector",
  name: "Word Collector",
  description: "Complete diverse word collections to expand your vocabulary",
  icon: "book-open-variant",
  isProgressive: true,
  
  tiers: [
    {
      name: "Curious Beginner",
      description: "Start your collection journey",
      requirement: "Complete 1 word collection",
      threshold: 1
    },
    {
      name: "Eager Gatherer", 
      description: "Build momentum in your word quest",
      requirement: "Complete 3 word collections",
      threshold: 3
    },
    {
      name: "Dedicated Scholar",
      description: "Show true commitment to learning", 
      requirement: "Complete 5 word collections",
      threshold: 5
    },
    {
      name: "Vocabulary Master",
      description: "Demonstrate expertise across many domains",
      requirement: "Complete 8 word collections", 
      threshold: 8
    },
    {
      name: "Lexicon Sage",
      description: "Achieve mastery over the world of words",
      requirement: "Complete 12 word collections",
      threshold: 12
    },
    {
      name: "Grand Lexicographer",
      description: "Transcend ordinary vocabulary - you are the word itself",
      requirement: "Complete 15 word collections",
      threshold: 15
    }
  ],
  
  check: (gameReport, gameStatus) => {
    // This achievement is checked differently - it's based on word collection completion
    // The actual checking will be done in the word collection system
    return false;
  }
}; 