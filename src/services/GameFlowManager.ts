import { useGameStore } from "../stores/useGameStore";
import { Logger } from "../utils/logger";
import { unifiedDataStore } from "../services/UnifiedDataStore";
import { dailyChallengesService } from "./DailyChallengesService";
import { parseEnhancedGameLink, generateUrlHash } from "./SharingService";
import {
  loadGameHistory,
  loadCurrentGame,
  clearCurrentGame,
} from "./StorageAdapter";

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
    | "dailyChallenge"
    | "playerChallenge"
    | "randomGame"
    | "upgradePrompt"
    | "restoreGame"
    | "showMessage";
  challengeId?: string;
  startWord?: string;
  targetWord?: string;
  showUpgradePrompt?: boolean;
  message?: string;
}

interface ParsedEntryData {
  type: "challenge" | "dailychallenge";
  startWord: string;
  targetWord: string;
  challengeId?: string;
  theme?: string;
  isValid: boolean;
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

    // Handle player challenge entry (high priority but validates history)
    if (
      entryPoint === "playerChallenge" &&
      challengeData?.startWord &&
      challengeData?.targetWord
    ) {
      // --- HASH VALIDATION ---
      if (challengeData.isValid === false) {
        Logger.warn(
          "GameFlowManager: Player challenge link has invalid hash. Aborting.",
        );
        return {
          action: "showMessage",
          message:
            "This challenge link is invalid or has been tampered with. Please ask your friend to send a new one.",
        };
      }
      // --- END HASH VALIDATION ---

      // Check if this challenge has already been played
      const hasPlayedBefore = await this.hasPlayedChallenge(
        challengeData.startWord,
        challengeData.targetWord,
      );

      if (hasPlayedBefore) {
        Logger.info("Challenge already played, showing message");
        return {
          action: "showMessage",
          message: `You've already played the challenge from "${challengeData.startWord}" to "${challengeData.targetWord}". Check your game history to see your previous attempt!`,
        };
      }

      Logger.info("Starting new player challenge");
      return {
        action: "playerChallenge",
        startWord: challengeData.startWord,
        targetWord: challengeData.targetWord,
        message: "Starting new player challenge",
      };
    }

    // Handle daily challenge entry (high priority but respects tutorial/news)
    if (entryPoint === "dailyChallenge" && challengeData?.challengeId) {
      // --- HASH VALIDATION ---
      if (challengeData.isValid === false) {
        Logger.warn(
          "GameFlowManager: Daily challenge link has invalid hash. Aborting.",
        );
        return {
          action: "showMessage",
          message:
            "This daily challenge link is invalid or has been tampered with. Please try the link from the main site.",
        };
      }
      // --- END HASH VALIDATION ---

      if (state.shouldShowTutorial) {
        Logger.debug(" Daily challenge entry but showing tutorial first");
        return { action: "tutorial" };
      }
      // News is no longer forced - handled via menu notifications
      // if (state.shouldShowNews) {
      //   Logger.debug(" Daily challenge entry but showing news first");
      //   return { action: "news" };
      // }
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

      // Second priority: News cards (deprecated - now handled via menu notifications)
      // if (state.shouldShowNews) {
      //   Logger.debug(" Showing news");
      //   return { action: "news" };
      // }

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

      Logger.debug(" Checking daily challenge priority:", {
        todaysChallenge: !!todaysChallenge,
        challengeId: todaysChallenge?.id,
        startWord: todaysChallenge?.startWord,
        targetWord: todaysChallenge?.targetWord,
      });

      if (todaysChallenge) {
        // Check persistent storage FIRST to get the authoritative completion status
        // This fixes the bug where users are taken to completed daily challenges after sync
        const hasCompletedPersistent =
          await dailyChallengesService.hasCompletedTodaysChallenge();
        const hasPlayedToday = gameStore.hasPlayedTodaysChallenge;

        Logger.debug(" Daily challenge completion check:", {
          hasPlayedToday,
          hasCompletedPersistent,
          willAutoStart: !hasCompletedPersistent,
        });

        // Use persistent storage as the authoritative source
        if (!hasCompletedPersistent) {
          Logger.debug(" Starting today's daily challenge");
          return {
            action: "dailyChallenge",
            challengeId: todaysChallenge.id,
            startWord: todaysChallenge.startWord,
            targetWord: todaysChallenge.targetWord,
          };
        } else {
          Logger.debug(
            " Daily challenge already completed, skipping auto-start",
          );
        }
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
   * Parse URL parameters to extract entry information
   */
  public parseEntryUrl = (url: string): ParsedEntryData | null => {
    try {
      Logger.debug("🎮 GameFlowManager: Parsing entry URL:", url);

      // Try enhanced format first (with type parameter)
      const enhancedData = parseEnhancedGameLink(url);
      if (
        enhancedData &&
        enhancedData.type &&
        enhancedData.startWord &&
        enhancedData.targetWord &&
        enhancedData.hash
      ) {
        Logger.debug("🎮 GameFlowManager: Using enhanced URL format");

        // --- HASH VALIDATION ---
        const { type, startWord, targetWord, challengeId, hash } = enhancedData;
        const challengeData =
          type === "dailychallenge" && challengeId
            ? `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`
            : `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;

        const expectedHash = generateUrlHash(challengeData);
        const isValid = expectedHash === hash;

        if (!isValid) {
          Logger.warn("🎮 GameFlowManager: Invalid hash detected!", {
            received: hash,
            expected: expectedHash,
            data: challengeData,
          });
        }
        // --- END HASH VALIDATION ---

        return {
          type: enhancedData.type as "challenge" | "dailychallenge",
          startWord: enhancedData.startWord,
          targetWord: enhancedData.targetWord,
          challengeId: enhancedData.challengeId,
          theme: enhancedData.theme,
          isValid,
        };
      }

      Logger.debug("🎮 GameFlowManager: No valid URL format found");
      return null;
    } catch (error) {
      console.error("🎮 GameFlowManager: Error parsing entry URL:", error);
      return null;
    }
  };

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

      // Note: "news" action removed - news is now handled via menu notifications

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
        gameStore.showUpgradePrompt(
          decision.message ||
            "You've reached your daily limit. Upgrade to a Galaxy Brain account for unlimited play!",
          "freeGamesLimited",
        );
        break;

      case "showMessage":
        Logger.debug(" Executing: showMessage");
        Logger.info(" Challenge info message:", decision.message);
        // For now, just log to console. In a full implementation,
        // you could show a toast, modal, or snackbar
        console.log("ℹ️ Challenge Info:", decision.message);
        break;
    }
  }

  // Helper methods
  private async checkTutorialComplete(): Promise<boolean> {
    try {
      // Use UnifiedDataStore instead of AsyncStorage for consistency
      return await unifiedDataStore.isTutorialComplete();
    } catch {
      return false;
    }
  }

  private async hasGameHistory(): Promise<boolean> {
    try {
      const history = await loadGameHistory();
      return history.length > 0;
    } catch {
      return false;
    }
  }

  private async hasUnfinishedGame(): Promise<boolean> {
    try {
      const savedGame = await loadCurrentGame(false); // Regular game
      return savedGame !== null && savedGame.gameStatus === "playing";
    } catch {
      return false;
    }
  }

  private async hasUnfinishedDailyChallenge(): Promise<boolean> {
    try {
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
        await clearCurrentGame(true); // Clear challenge game storage
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async shouldShowNews(): Promise<boolean> {
    // News is now handled through notifications in the menu, not forced on users
    return false;
  }

  /**
   * Check if a specific player challenge (start/target word combination) has been played before
   */
  private async hasPlayedChallenge(
    startWord: string,
    targetWord: string,
  ): Promise<boolean> {
    try {
      const history = await loadGameHistory();
      // Filter for regular player challenges (not daily challenges)
      const challengeHistory = history.filter(
        (game) => !game.isDailyChallenge, // Regular challenges are NOT daily challenges
      );

      // Check if this exact start/target combination has been played
      const hasPlayed = challengeHistory.some(
        (game) =>
          game.startWord?.toLowerCase() === startWord.toLowerCase() &&
          game.targetWord?.toLowerCase() === targetWord.toLowerCase(),
      );

      Logger.debug("🎮 GameFlowManager: Challenge history check:", {
        startWord,
        targetWord,
        hasPlayed,
        totalChallenges: challengeHistory.length,
      });

      return hasPlayed;
    } catch (error) {
      Logger.debug(
        "🎮 GameFlowManager: Error checking challenge history:",
        error,
      );
      return false; // Default to allow playing if we can't check
    }
  }
}

export const gameFlowManager = GameFlowManager.getInstance();
