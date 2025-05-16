import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { View } from 'react-native';
import { loadGameData, getAvailableWords, selectRandomWords, isValidWordSelection } from '@utils/gameUtils';
import * as StorageService from '@services/StorageService';
import * as SharingService from '@services/SharingService';

// Define types for our game state
interface GameState {
  isLoading: boolean;
  currentWord: string | null;
  targetWord: string | null;
  currentPath: string[];
  availableWords: string[];
  isGameWon: boolean;
  movesCount: number;
  startTime: number | null;
  endTime: number | null;
  graph: {
    nodes: string[];
    edges: Array<[string, string]>;
    definitions: Record<string, string>;
  } | null;
}

// Define types for our context
interface GameContextType extends GameState {
  startGame: () => void;
  selectWord: (word: string) => void;
  resetGame: () => void;
  getHint: () => string | null;
  saveGameScore: () => Promise<boolean>;
  shareResults: () => Promise<boolean>;
  loadSavedGame: () => Promise<boolean>;
  settings: StorageService.GameSettings;
  updateSettings: (settings: Partial<StorageService.GameSettings>) => Promise<boolean>;
  gameViewRef: React.RefObject<View>;
}

// Create the context
const GameContext = createContext<GameContextType | null>(null);

// Define props for provider component
interface GameProviderProps {
  children: ReactNode;
}

// Initial state
const initialState: GameState = {
  isLoading: false,
  currentWord: null,
  targetWord: null,
  currentPath: [],
  availableWords: [],
  isGameWon: false,
  movesCount: 0,
  startTime: null,
  endTime: null,
  graph: null,
};

export const GameContextProvider = ({ children }: GameProviderProps) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [settings, setSettings] = useState<StorageService.GameSettings>({
    soundEnabled: true,
    hapticFeedbackEnabled: true,
    theme: 'system',
  });
  
  // Reference to the game view for screenshots when sharing
  const gameViewRef = useRef<View>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await StorageService.getSettings();
      setSettings(savedSettings);
    };
    
    loadSettings();
    
    // Check for saved game
    checkForSavedGame();
  }, []);
  
  // Check if there's a saved game to resume
  const checkForSavedGame = async () => {
    const savedGame = await StorageService.getSavedGameState();
    if (savedGame) {
      // TODO: Show UI to ask if user wants to resume the game
      console.log('Found saved game:', savedGame);
    }
  };
  
  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<StorageService.GameSettings>): Promise<boolean> => {
    const success = await StorageService.saveSettings(newSettings);
    if (success) {
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
    return success;
  }, []);
  
  // Load a saved game
  const loadSavedGame = useCallback(async (): Promise<boolean> => {
    try {
      const savedGame = await StorageService.getSavedGameState();
      if (savedGame) {
        setGameState(savedGame);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading saved game:', error);
      return false;
    }
  }, []);

  // Start a new game
  const startGame = useCallback(async () => {
    setGameState(prev => ({
      ...initialState,
      isLoading: true,
    }));
    
    try {
      // Load graph data (in a real implementation, this would be from assets)
      const graphData = await loadGameData();
      
      // Select random start and target words
      const { startWord, targetWord } = selectRandomWords(graphData.nodes);
      
      // Calculate available words from the start word
      const availableWords = getAvailableWords(startWord, graphData.edges);
      
      // Set up the new game state
      const newGameState = {
        ...initialState,
        isLoading: false,
        currentWord: startWord,
        targetWord,
        currentPath: [startWord],
        availableWords,
        startTime: Date.now(),
        graph: graphData,
      };
      
      setGameState(newGameState);
      
      // Save the game state for potential resuming later
      await StorageService.saveGameState(newGameState);
      
    } catch (error) {
      console.error('Error starting game:', error);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Select a word during gameplay
  const selectWord = useCallback((word: string) => {
    if (!gameState.graph) return;
    
    setGameState(prev => {
      // Validate the word selection
      if (!prev.currentWord || !isValidWordSelection(prev.currentWord, word, prev.graph?.edges || [])) {
        return prev;
      }
      
      // Calculate new available words
      const newAvailableWords = getAvailableWords(word, prev.graph?.edges || []);
      
      // Check if the player won
      const isWin = word === prev.targetWord;
      const endTime = isWin ? Date.now() : null;
      
      // Create new state
      const newState = {
        ...prev,
        currentWord: word,
        currentPath: [...prev.currentPath, word],
        availableWords: newAvailableWords,
        movesCount: prev.movesCount + 1,
        isGameWon: isWin,
        endTime,
      };
      
      // Save game state if not won
      if (!isWin) {
        StorageService.saveGameState(newState);
      } else {
        // Clear saved game if won
        StorageService.clearSavedGameState();
      }
      
      return newState;
    });
  }, []);

  // Reset the current game
  const resetGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // Provide a hint
  const getHint = useCallback((): string | null => {
    // TODO: Implement intelligent hint system based on the graph
    // For now, just return a random available word
    if (gameState.availableWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * gameState.availableWords.length);
      return gameState.availableWords[randomIndex];
    }
    return null;
  }, [gameState.availableWords]);

  // Save the current game score
  const saveGameScore = useCallback(async (): Promise<boolean> => {
    if (!gameState.isGameWon || !gameState.endTime || !gameState.startTime) {
      return false;
    }
    
    const score: StorageService.GameScore = {
      date: new Date().toISOString(),
      pathLength: gameState.currentPath.length - 1, // Subtract 1 because the path includes the start word
      timeInSeconds: Math.floor((gameState.endTime - gameState.startTime) / 1000),
      startWord: gameState.currentPath[0],
      targetWord: gameState.targetWord || '',
      path: gameState.currentPath,
    };
    
    return StorageService.saveScore(score);
  }, [gameState]);
  
  // Share game results
  const shareResults = useCallback(async (): Promise<boolean> => {
    if (!gameState.isGameWon || !gameState.endTime || !gameState.startTime) {
      return false;
    }
    
    const score: StorageService.GameScore = {
      date: new Date().toISOString(),
      pathLength: gameState.currentPath.length - 1, // Subtract 1 because the path includes the start word
      timeInSeconds: Math.floor((gameState.endTime - gameState.startTime) / 1000),
      startWord: gameState.currentPath[0],
      targetWord: gameState.targetWord || '',
      path: gameState.currentPath,
    };
    
    return SharingService.shareGameResults({
      score,
      screenshotRef: gameViewRef,
      includeScreenshot: true,
    });
  }, [gameState]);

  const contextValue: GameContextType = {
    ...gameState,
    startGame,
    selectWord,
    resetGame,
    getHint,
    saveGameScore,
    shareResults,
    loadSavedGame,
    settings,
    updateSettings,
    gameViewRef,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameContextProvider');
  }
  return context;
}; 