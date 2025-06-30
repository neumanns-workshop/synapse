import { useGameStore } from "../stores/useGameStore";
import { Logger } from "../utils/logger";
import {
  parseGameDeepLink,
  parseDailyChallengeDeepLink,
  parseEnhancedGameLink,
} from "./SharingService";
import { dailyChallengesService } from "./DailyChallengesService";

export interface GameFlowState {
  isFirstTimeUser: boolean;
  hasGameHistory: boolean;
  hasPendingPlayerChallenge: boolean;
  hasPendingDailyChallenge: boolean;
  hasUnfinishedGame: boolean;
  hasUnfinishedDailyChallenge: boolean;
  remainingFreeGames: number;
  shouldShowTutorial: boolean;
  shouldShowNews: boolean;
}

export interface FlowDecision {
  action:
    | "tutorial"
    | "news"
    | "dailyChallenge"
    | "playerChallenge"
    | "randomGame"
    | "upgradePrompt"
    | "restoreGame";
  challengeId?: string;
  startWord?: string;
  targetWord?: string;
  showUpgradePrompt?: boolean;
  message?: string;
}

export class GameFlowManager {
  private static instance: GameFlowManager;

  // Private constructor for singleton pattern
  private constructor() {}

  public static getInstance(): GameFlowManager {
    if (!GameFlowManager.instance) {
      GameFlowManager.instance = new GameFlowManager();
    }
    return GameFlowManager.instance;
  }

  /**
   * Analyze current player state to determine what should happen next
   */
  public async analyzePlayerState(): Promise<GameFlowState> {
    const gameStore = useGameStore.getState();

    Logger.debug("GameFlowManager.analyzePlayerState: Game store state", {
      initialDataLoaded: gameStore.initialDataLoaded,
      currentDailyChallenge: !!gameStore.currentDailyChallenge,
      challengeId: gameStore.currentDailyChallenge?.id,
      hasPlayedTodaysChallenge: gameStore.hasPlayedTodaysChallenge,
      remainingFreeGames: gameStore.remainingFreeGames,
      gameStatus: gameStore.gameStatus,
      isChallenge: gameStore.isChallenge,
      isDailyChallenge: gameStore.isDailyChallenge,
    });

    // Use the store's data instead of making independent calls
    // This ensures we're using the same data that was loaded by loadInitialData
    const remainingFreeGames = gameStore.remainingFreeGames;

    // Check tutorial completion
    const tutorialComplete = await this.checkTutorialComplete();
    const hasGameHistory = await this.hasGameHistory();

    return {
      isFirstTimeUser: !tutorialComplete,
      hasGameHistory,
      hasPendingPlayerChallenge: gameStore.hasPendingChallenge,
      hasPendingDailyChallenge: false, // Will be set when parsing daily challenge links
      hasUnfinishedGame: await this.hasUnfinishedGame(),
      hasUnfinishedDailyChallenge: await this.hasUnfinishedDailyChallenge(),
      remainingFreeGames: remainingFreeGames,
      shouldShowTutorial: !tutorialComplete && !hasGameHistory,
      shouldShowNews: await this.shouldShowNews(),
    };
  }

  /**
   * Main flow decision engine based on entry point and current state
   */
  public async determineGameFlow(
    entryPoint: "landing" | "playerChallenge" | "dailyChallenge",
    challengeData?: {
      startWord?: string;
      targetWord?: string;
      challengeId?: string;
      isValid?: boolean;
    },
  ): Promise<FlowDecision> {
    const state = await this.analyzePlayerState();

    Logger.debug(" GameFlowManager.determineGameFlow:", {
      entryPoint,
      challengeData,
      state: {
        shouldShowTutorial: state.shouldShowTutorial,
        shouldShowNews: state.shouldShowNews,
        hasUnfinishedGame: state.hasUnfinishedGame,
        hasUnfinishedDailyChallenge: state.hasUnfinishedDailyChallenge,
        remainingFreeGames: state.remainingFreeGames,
      },
    });

    // Handle player challenge entry (highest priority - bypasses everything)
    if (
      entryPoint === "playerChallenge" &&
      challengeData?.startWord &&
      challengeData?.targetWord
    ) {
      Logger.info("Starting validated player challenge");
      return {
        action: "playerChallenge",
        startWord: challengeData.startWord,
        targetWord: challengeData.targetWord,
        message: "Starting player challenge - bypassing other games",
      };
    }

    // Handle daily challenge entry (high priority but respects tutorial/news)
    if (entryPoint === "dailyChallenge" && challengeData?.challengeId) {
      if (state.shouldShowTutorial) {
        Logger.debug(" Daily challenge entry but showing tutorial first");
        return { action: "tutorial" };
      }
      if (state.shouldShowNews) {
        Logger.debug(" Daily challenge entry but showing news first");
        return { action: "news" };
      }
      Logger.debug(" Starting daily challenge from entry");
      return {
        action: "dailyChallenge",
        challengeId: challengeData.challengeId,
        startWord: challengeData.startWord,
        targetWord: challengeData.targetWord,
      };
    }

    // Handle landing page entry
    if (entryPoint === "landing") {
      // First priority: Tutorial for new users
      if (state.shouldShowTutorial) {
        Logger.debug(" Showing tutorial for new user");
        return { action: "tutorial" };
      }

      // Second priority: News cards if no game history
      if (state.shouldShowNews) {
        Logger.debug(" Showing news");
        return { action: "news" };
      }

      // Third priority: Restore unfinished games
      if (state.hasUnfinishedGame) {
        Logger.debug(" Restoring unfinished regular game");
        return { action: "restoreGame" };
      }

      // Fourth priority: Restore unfinished daily challenges
      if (state.hasUnfinishedDailyChallenge) {
        Logger.debug(" Restoring unfinished daily challenge");
        return { action: "restoreGame" };
      }

      // Fifth priority: Daily challenge if not completed (regardless of game history)
      const gameStore = useGameStore.getState();
      const todaysChallenge = gameStore.currentDailyChallenge;
      const hasPlayedToday = gameStore.hasPlayedTodaysChallenge;

      Logger.debug(" Checking daily challenge priority:", {
        todaysChallenge: !!todaysChallenge,
        hasPlayedToday,
        challengeId: todaysChallenge?.id,
        startWord: todaysChallenge?.startWord,
        targetWord: todaysChallenge?.targetWord,
      });

      if (todaysChallenge && !hasPlayedToday) {
        Logger.debug(" Starting today's daily challenge");
        return {
          action: "dailyChallenge",
          challengeId: todaysChallenge.id,
          startWord: todaysChallenge.startWord,
          targetWord: todaysChallenge.targetWord,
        };
      }

      // Sixth priority: Random game (respecting limits for non-premium users)
      const isPremium = await dailyChallengesService.isPremiumUser();

      if (isPremium || state.remainingFreeGames > 0) {
        console.log(
          "🎮 Starting random game",
          isPremium
            ? "(premium user)"
            : `(${state.remainingFreeGames} free games remaining)`,
        );
        return { action: "randomGame" };
      } else {
        Logger.debug(
          "🎮 Showing upgrade prompt - no free games and not premium",
        );
        return {
          action: "upgradePrompt",
          showUpgradePrompt: true,
          message:
            "You've reached your daily limit. Upgrade to a Galaxy Brain account for unlimited play!",
        };
      }
    }

    // Default fallback
    Logger.debug(" Default fallback to random game");
    return { action: "randomGame" };
  }

  /**
   * Parse URL parameters for different entry types
   */
  public parseEntryUrl(url: string): {
    entryType: "landing" | "playerChallenge" | "dailyChallenge";
    challengeData?: {
      startWord?: string;
      targetWord?: string;
      challengeId?: string;
      isValid?: boolean;
    };
  } {
    Logger.debug(" GameFlowManager.parseEntryUrl: Parsing URL:", url);

    // First, check for enhanced format URLs (new format with type parameter)
    const enhancedParams = parseEnhancedGameLink(url);
    Logger.debug(
      "🎮 GameFlowManager.parseEntryUrl: Enhanced params:",
      enhancedParams,
    );
    if (enhancedParams) {
      if (enhancedParams.type === "dailychallenge") {
        return {
          entryType: "dailyChallenge",
          challengeData: {
            challengeId: enhancedParams.date,
            startWord: enhancedParams.startWord,
            targetWord: enhancedParams.targetWord,
            isValid: enhancedParams.isValid || false,
          },
        };
      } else if (enhancedParams.type === "challenge") {
        return {
          entryType: "playerChallenge",
          challengeData: {
            startWord: enhancedParams.startWord,
            targetWord: enhancedParams.targetWord,
            isValid: enhancedParams.isValid || false,
          },
        };
      }
    }

    // Fallback to old format parsers for backward compatibility
    // Check for daily challenge link (old format)
    const dailyChallengeParams = parseDailyChallengeDeepLink(url);
    Logger.debug(
      "🎮 GameFlowManager.parseEntryUrl: Daily challenge params (old format):",
      dailyChallengeParams,
    );
    if (dailyChallengeParams) {
      return {
        entryType: "dailyChallenge",
        challengeData: {
          challengeId: dailyChallengeParams.challengeId,
          startWord: dailyChallengeParams.startWord,
          targetWord: dailyChallengeParams.targetWord,
          isValid: dailyChallengeParams.isValid || false,
        },
      };
    }

    // Check for player challenge link (old format)
    const playerChallengeParams = parseGameDeepLink(url);
    Logger.debug(
      "🎮 GameFlowManager.parseEntryUrl: Player challenge params (old format):",
      playerChallengeParams,
    );
    if (playerChallengeParams) {
      return {
        entryType: "playerChallenge",
        challengeData: {
          startWord: playerChallengeParams.startWord,
          targetWord: playerChallengeParams.targetWord,
          isValid: playerChallengeParams.isValid,
        },
      };
    }

    Logger.debug(
      "🎮 GameFlowManager.parseEntryUrl: No challenge detected, defaulting to landing",
    );
    return { entryType: "landing" };
  }

  /**
   * Execute the flow decision
   */
  public async executeFlowDecision(decision: FlowDecision): Promise<void> {
    const gameStore = useGameStore.getState();

    Logger.debug(" GameFlowManager.executeFlowDecision:", decision);

    switch (decision.action) {
      case "tutorial":
        Logger.debug(" Executing: tutorial");
        // Tutorial will be handled by TutorialContext
        break;

      case "news":
        Logger.debug(" Executing: news");
        // News cards will be handled by NewsContext (to be implemented)
        break;

      case "playerChallenge":
        Logger.debug(" Executing: playerChallenge");
        if (decision.startWord && decision.targetWord) {
          await gameStore.startChallengeGame(
            decision.startWord,
            decision.targetWord,
          );
        }
        break;

      case "dailyChallenge":
        Logger.debug(" Executing: dailyChallenge");
        await gameStore.startDailyChallengeGame();
        break;

      case "randomGame":
        Logger.debug(" Executing: randomGame");
        // Free game consumption is now handled in startGame function
        await gameStore.startGame();
        break;

      case "restoreGame":
        Logger.debug(" Executing: restoreGame");
        // Game restoration is handled automatically by gameStore.loadInitialData
        break;

      case "upgradePrompt":
        Logger.debug(" Executing: upgradePrompt");
        // Show upgrade prompt (to be implemented in UI)
        gameStore.showUpgradePrompt(
          decision.message ||
            "You've reached your daily limit. Upgrade to a Galaxy Brain account for unlimited play!",
          "freeGamesLimited",
        );
        break;
    }
  }

  // Helper methods
  private async checkTutorialComplete(): Promise<boolean> {
    try {
      // Use UnifiedDataStore instead of AsyncStorage for consistency
      const { unifiedDataStore } = await import("../services/UnifiedDataStore");
      return await unifiedDataStore.isTutorialComplete();
    } catch {
      return false;
    }
  }

  private async hasGameHistory(): Promise<boolean> {
    try {
      const { loadGameHistory } = await import("./StorageAdapter");
      const history = await loadGameHistory();
      return history.length > 0;
    } catch {
      return false;
    }
  }

  private async hasUnfinishedGame(): Promise<boolean> {
    try {
      const { loadCurrentGame } = await import("./StorageAdapter");
      const savedGame = await loadCurrentGame(false); // Regular game
      return savedGame !== null && savedGame.gameStatus === "playing";
    } catch {
      return false;
    }
  }

  private async hasUnfinishedDailyChallenge(): Promise<boolean> {
    try {
      const { loadCurrentGame } = await import("./StorageAdapter");
      const savedGame = await loadCurrentGame(true); // Challenge game

      if (
        savedGame === null ||
        savedGame.gameStatus !== "playing" ||
        savedGame.isDailyChallenge !== true ||
        !savedGame.currentDailyChallengeId
      ) {
        return false;
      }

      // Check if the saved daily challenge is still valid for today
      const todaysChallenge = dailyChallengesService.getTodaysChallenge();

      // If there's no today's challenge or the saved challenge is not today's challenge,
      // then the saved challenge is expired
      if (
        !todaysChallenge ||
        savedGame.currentDailyChallengeId !== todaysChallenge.id
      ) {
        // Clear the expired daily challenge
        const { clearCurrentGame } = await import("./StorageAdapter");
        await clearCurrentGame(true); // Clear challenge game storage
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async shouldShowNews(): Promise<boolean> {
    // Implement news logic here
    // For now, return false but this could check for:
    // - New features to announce
    // - Important updates
    // - Seasonal content
    return false;
  }
}

export const gameFlowManager = GameFlowManager.getInstance();
