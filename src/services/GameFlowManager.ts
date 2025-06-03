import { dailyChallengesService } from './DailyChallengesService';
import { useGameStore } from '../stores/useGameStore';
import { parseGameDeepLink, parseDailyChallengeDeepLink } from './SharingService';

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
  action: 'tutorial' | 'news' | 'dailyChallenge' | 'playerChallenge' | 'randomGame' | 'upgradePrompt' | 'restoreGame';
  challengeId?: string;
  startWord?: string;
  targetWord?: string;
  showUpgradePrompt?: boolean;
  message?: string;
}

export class GameFlowManager {
  private static instance: GameFlowManager;

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
    const dailyChallengeState = await dailyChallengesService.getDailyChallengeState();
    
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
      remainingFreeGames: dailyChallengeState.remainingFreeGames,
      shouldShowTutorial: !tutorialComplete && !hasGameHistory,
      shouldShowNews: await this.shouldShowNews()
    };
  }

  /**
   * Main flow decision engine based on entry point and current state
   */
  public async determineGameFlow(
    entryPoint: 'landing' | 'playerChallenge' | 'dailyChallenge',
    challengeData?: { startWord?: string; targetWord?: string; challengeId?: string }
  ): Promise<FlowDecision> {
    const state = await this.analyzePlayerState();

    // Handle player challenge entry (highest priority - bypasses everything)
    if (entryPoint === 'playerChallenge' && challengeData?.startWord && challengeData?.targetWord) {
      return {
        action: 'playerChallenge',
        startWord: challengeData.startWord,
        targetWord: challengeData.targetWord,
        message: 'Starting player challenge - bypassing other games'
      };
    }

    // Handle daily challenge entry (high priority but respects tutorial/news)
    if (entryPoint === 'dailyChallenge' && challengeData?.challengeId) {
      if (state.shouldShowTutorial) {
        return { action: 'tutorial' };
      }
      if (state.shouldShowNews) {
        return { action: 'news' };
      }
      return {
        action: 'dailyChallenge',
        challengeId: challengeData.challengeId,
        startWord: challengeData.startWord,
        targetWord: challengeData.targetWord
      };
    }

    // Handle landing page entry
    if (entryPoint === 'landing') {
      // First priority: Tutorial for new users
      if (state.shouldShowTutorial) {
        return { action: 'tutorial' };
      }

      // Second priority: News cards if no game history
      if (state.shouldShowNews) {
        return { action: 'news' };
      }

      // Third priority: Restore unfinished games
      if (state.hasUnfinishedGame) {
        return { action: 'restoreGame' };
      }

      // Fourth priority: Daily challenge if not completed and no game history
      if (!state.hasGameHistory && !state.hasUnfinishedDailyChallenge) {
        const dailyChallengeState = await dailyChallengesService.getDailyChallengeState();
        if (dailyChallengeState.todaysChallenge && !dailyChallengeState.hasPlayedToday) {
          return {
            action: 'dailyChallenge',
            challengeId: dailyChallengeState.todaysChallenge.id,
            startWord: dailyChallengeState.todaysChallenge.startWord,
            targetWord: dailyChallengeState.todaysChallenge.targetWord
          };
        }
      }

      // Fifth priority: Random game (respecting limits)
      if (state.remainingFreeGames > 0) {
        return { action: 'randomGame' };
      } else {
        return { 
          action: 'upgradePrompt',
          showUpgradePrompt: true,
          message: 'You\'ve reached your daily limit. Upgrade for unlimited play!'
        };
      }
    }

    // Default fallback
    return { action: 'randomGame' };
  }

  /**
   * Parse URL parameters for different entry types
   */
  public parseEntryUrl(url: string): { 
    entryType: 'landing' | 'playerChallenge' | 'dailyChallenge',
    challengeData?: { startWord?: string; targetWord?: string; challengeId?: string }
  } {
    // Check for daily challenge link
    const dailyChallengeParams = parseDailyChallengeDeepLink(url);
    if (dailyChallengeParams) {
      return {
        entryType: 'dailyChallenge',
        challengeData: {
          challengeId: dailyChallengeParams.challengeId,
          startWord: dailyChallengeParams.startWord,
          targetWord: dailyChallengeParams.targetWord
        }
      };
    }

    // Check for player challenge link
    const playerChallengeParams = parseGameDeepLink(url);
    if (playerChallengeParams) {
      return {
        entryType: 'playerChallenge',
        challengeData: {
          startWord: playerChallengeParams.startWord,
          targetWord: playerChallengeParams.targetWord
        }
      };
    }

    return { entryType: 'landing' };
  }

  /**
   * Execute the flow decision
   */
  public async executeFlowDecision(decision: FlowDecision): Promise<void> {
    const gameStore = useGameStore.getState();

    switch (decision.action) {
      case 'tutorial':
        // Tutorial will be handled by TutorialContext
        break;

      case 'news':
        // News cards will be handled by NewsContext (to be implemented)
        break;

      case 'playerChallenge':
        if (decision.startWord && decision.targetWord) {
          await gameStore.startChallengeGame(decision.startWord, decision.targetWord);
        }
        break;

      case 'dailyChallenge':
        await gameStore.startDailyChallengeGame();
        break;

      case 'randomGame':
        // Free game consumption is now handled in startGame function
        await gameStore.startGame();
        break;

      case 'restoreGame':
        // Game restoration is handled automatically by gameStore.loadInitialData
        break;

      case 'upgradePrompt':
        // Show upgrade prompt (to be implemented in UI)
        gameStore.showUpgradePrompt(decision.message || "You've reached your daily limit. Upgrade for unlimited play!");
        break;
    }
  }

  // Helper methods
  private async checkTutorialComplete(): Promise<boolean> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const tutorialComplete = await AsyncStorage.default.getItem('tutorialComplete');
      return tutorialComplete === 'true';
    } catch {
      return false;
    }
  }

  private async hasGameHistory(): Promise<boolean> {
    try {
      const { loadGameHistory } = await import('./StorageService');
      const history = await loadGameHistory();
      return history.length > 0;
    } catch {
      return false;
    }
  }

  private async hasUnfinishedGame(): Promise<boolean> {
    try {
      const { loadCurrentGame } = await import('./StorageService');
      const savedGame = await loadCurrentGame(false); // Regular game
      return savedGame !== null && savedGame.gameStatus === 'playing';
    } catch {
      return false;
    }
  }

  private async hasUnfinishedDailyChallenge(): Promise<boolean> {
    try {
      const { loadCurrentGame } = await import('./StorageService');
      const savedGame = await loadCurrentGame(true); // Challenge game
      return savedGame !== null && 
             savedGame.gameStatus === 'playing' && 
             savedGame.isDailyChallenge === true;
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