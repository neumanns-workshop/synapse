import React, { createContext, useContext, useState, useEffect } from "react";
import { ImageSourcePropType } from "react-native";

import SocialLeaderboardIcon from "../components/icons/SocialLeaderboardIcon";
import { unifiedDataStore } from "../services/UnifiedDataStore";

export type TutorialStep = {
  id: string;
  title: string;
  content: string;
  target?: string; // Optional target element to highlight
  image?: ImageSourcePropType; // Optional image for the step
  iconComponent?: React.ComponentType<Record<string, unknown>>; // Optional icon component for the step
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synapse!",
    content:
      "Synapse is a word navigation game where you connect words through their meanings. Your goal is to find a path from the start word to the target word.",
    image: require("../assets/tutorial_1.png"),
  },
  {
    id: "making-moves",
    title: "Making Your First Move",
    content:
      "Click on any connected word to move to it. Words are connected if they share a similar meaning. The available moves are shown as buttons below your path, ordered from most to least similar (top left to bottom right).",
    target: "available-words",
    image: require("../assets/tutorial_2.png"),
  },
  {
    id: "path-display",
    title: "Your Journey",
    content:
      "Your path is shown in an accordion-style display. Words are color-coded: green for start, blue for current, red for end. The dots in the display correspond to the number of moves left in the suggested path from the current word.",
    target: "player-path",
    image: require("../assets/tutorial_3.png"),
  },
  {
    id: "definitions",
    title: "Word Meanings in Your Path",
    content:
      "Tap on any word in your path to see its definition. This helps you understand the connections you've made and plan your next move towards the target word.",
    target: "word-definition",
    image: require("../assets/tutorial_4.png"),
  },
  {
    id: "path-checkpoints",
    title: "Path Checkpoints",
    content:
      "Some words in your path may be highlighted in yellow (optimal) or purple (suggested). These were good moves! They also act as special, single-use checkpoints, allowing you to backtrack to them once.",
    target: "player-path",
    image: require("../assets/tutorial_5.png"),
  },
  {
    id: "game-completion",
    title: "Completing the Game",
    content:
      "After completing a game, you'll see a detailed game report. This includes your path, the optimal path, move accuracy, and other statistics. You can also share your challenge with friends or start a new game.",
    target: "game-report",
    image: require("../assets/tutorial_6.png"),
  },
  {
    id: "achievements",
    title: "Track Your Progress",
    content:
      "Complete games to earn achievements and collect words in themed collections. Track your statistics and discover new word connections!",
    target: "stats-modal",
    image: require("../assets/tutorial_7.png"),
  },
  {
    id: "premium-features",
    title: "Compete, Collect, and Unlock More!",
    content:
      "Upgrade to Galaxy Brain for:\n\n- Unlimited random games every day\n- Access to all past daily challenges\n- Unique themed word collections\n\nDaily and player challenges are always free for everyone!",
    iconComponent: SocialLeaderboardIcon,
  },
];

interface TutorialContextType {
  isTutorialComplete: boolean;
  currentStep: number;
  steps: TutorialStep[];
  showTutorial: boolean;
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  isFirstTimeUser: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined,
);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isTutorialComplete, setIsTutorialComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const tutorialComplete = await unifiedDataStore.isTutorialComplete();
        const data = await unifiedDataStore.getData();
        const hasPlayedBefore = data.user.hasPlayedBefore;

        setIsTutorialComplete(tutorialComplete);
        setIsFirstTimeUser(!hasPlayedBefore);

        // Show tutorial for first-time users
        if (!hasPlayedBefore) {
          setShowTutorial(true);
        }
      } catch (error) {
        console.error("Error checking tutorial status:", error);
      }
    };

    checkTutorialStatus();
  }, []);

  const startTutorial = () => {
    setShowTutorial(true);
    setCurrentStep(0);
  };

  const skipTutorial = async () => {
    setShowTutorial(false);
    setIsTutorialComplete(true);
    try {
      await unifiedDataStore.setTutorialComplete(true);
    } catch (error) {
      console.error("Error saving tutorial status:", error);
    }
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      skipTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isTutorialComplete,
        currentStep,
        steps: TUTORIAL_STEPS,
        showTutorial,
        startTutorial,
        skipTutorial,
        nextStep,
        previousStep,
        isFirstTimeUser,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
};
