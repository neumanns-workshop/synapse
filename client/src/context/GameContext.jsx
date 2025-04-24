import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { findShortestPath } from '../utils/graphUtils';

// Define game status constants
export const GameStatus = {
  IDLE: 'idle',
  LOADING: 'loading', // For async operations like finding path
  PLAYING: 'playing',
  WON: 'won',
  GAVE_UP: 'gave_up', // New status
  ERROR: 'error',
};

// Path length constraints
const MIN_PATH_MOVES = 2;
const MAX_PATH_MOVES = 15;

// Create the context
const GameContext = createContext(null);

// Default K value (can be moved to App.jsx)
// const DEFAULT_K = 6;

// Accept props: selectedKProp, changeKProp -> REMOVED
export const GameProvider = ({ children }) => {
  
  const [status, setStatus] = useState(GameStatus.IDLE);
  const [startWord, setStartWord] = useState(null);
  const [endWord, setEndWord] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [playerPath, setPlayerPath] = useState([]);
  const [optimalDistance, setOptimalDistance] = useState(null);
  const [optimalPathLength, setOptimalPathLength] = useState(null);
  const [optimalPath, setOptimalPath] = useState([]);
  const [suggestedPathFromCurrent, setSuggestedPathFromCurrent] = useState([]);
  const [suggestedPathFromCurrentLength, setSuggestedPathFromCurrentLength] = useState(null);
  const [error, setError] = useState(null); // Game-specific errors

  // REMOVED: Effect to reset game state when selectedKProp changes
  // useEffect(() => { ... }, [selectedKProp]); 

  // --- Game Logic Functions ---

  const startGame = useCallback(async (nodes) => {
    if (!nodes) {
      setError('Graph data not available for starting game.');
      setStatus(GameStatus.ERROR);
      console.error("Attempted to start game without nodes.");
      return;
    }
    // Reset game state HERE
    setStatus(GameStatus.LOADING);
    setError(null);
    setStartWord(null); // Reset start/end words
    setEndWord(null);
    setCurrentWord(null);
    setPlayerPath([]);
    setOptimalPath([]);
    setOptimalPathLength(null);
    setOptimalDistance(null);
    setSuggestedPathFromCurrent([]);
    setSuggestedPathFromCurrentLength(null);

    // Restore the core logic for finding a word pair
    const allWords = Object.keys(nodes);
    if (allWords.length < 2) {
      setError('Not enough words in the graph to start a game.');
      setStatus(GameStatus.ERROR);
      return;
    }

    let attempts = 0;
    const maxAttempts = 200;
    let foundPair = false;
    let calculatedResult = null; // Store the successful result

    console.log(`Searching for word pair with optimal path between ${MIN_PATH_MOVES} and ${MAX_PATH_MOVES} moves...`);

    while (attempts < maxAttempts && !foundPair) {
      attempts++;
      // Select two distinct random words
      let randomIndex1 = Math.floor(Math.random() * allWords.length);
      let randomIndex2 = Math.floor(Math.random() * allWords.length);
      while (randomIndex1 === randomIndex2) {
        randomIndex2 = Math.floor(Math.random() * allWords.length);
      }
      const potentialStart = allWords[randomIndex1]; // Define potentialStart
      const potentialEnd = allWords[randomIndex2];   // Define potentialEnd

      const result = findShortestPath(nodes, potentialStart, potentialEnd);
      const moves = result.path ? result.path.length - 1 : 0;

      if (result.path && moves >= MIN_PATH_MOVES && moves <= MAX_PATH_MOVES) {
        console.log(`Found valid pair: ${potentialStart} -> ${potentialEnd}, Optimal Moves: ${moves}, Distance: ${result.distance}`);
        // Store result and words, set state *after* loop
        calculatedResult = { potentialStart, potentialEnd, path: result.path, distance: result.distance, moves };
        foundPair = true;
      } 
    }

    // Set state based on loop outcome
    if (foundPair && calculatedResult) {
        setStartWord(calculatedResult.potentialStart);
        setEndWord(calculatedResult.potentialEnd);
        setCurrentWord(calculatedResult.potentialStart);
        setPlayerPath([calculatedResult.potentialStart]);
        setOptimalDistance(calculatedResult.distance);
        setOptimalPathLength(calculatedResult.moves);
        setOptimalPath(calculatedResult.path);
        setStatus(GameStatus.PLAYING);
    } else {
        setError(`Could not find a suitable word pair (moves ${MIN_PATH_MOVES}-${MAX_PATH_MOVES}) after ${maxAttempts} attempts.`);
        setStatus(GameStatus.ERROR);
        console.error("Failed to find a suitable word pair for the game.");
    }

  }, []); // Dependency removed

  // selectWord now needs nodes passed in
  const selectWord = useCallback((selectedWord, nodes) => {
    if (status !== GameStatus.PLAYING || !nodes || !currentWord) return;
    
    // Restore core logic:
    const neighbors = nodes[currentWord]?.edges;
    // Check if the selected word is a valid neighbor of the current word
    if (!neighbors || !neighbors[selectedWord]) {
      console.warn(`Selected word "${selectedWord}" is not a valid neighbor of "${currentWord}".`);
      // Optionally set an error state or just return
      return; 
    }

    console.log(`Player selected: ${selectedWord}`);
    const newPath = [...playerPath, selectedWord];
    setPlayerPath(newPath);
    setCurrentWord(selectedWord);

    // Check for win condition
    if (selectedWord === endWord) {
      setStatus(GameStatus.WON);
      console.log("Player reached the end word!");
    }
    // No change: // ... (rest of selectWord logic) ...
  }, [status, currentWord, playerPath, endWord]); // Dependencies: status, currentWord, playerPath, endWord

  // giveUp now needs nodes passed in
  const giveUp = useCallback((nodes) => {
    if (status !== GameStatus.PLAYING) return;
    setSuggestedPathFromCurrent([]);
    setSuggestedPathFromCurrentLength(null);
    
    if (nodes && currentWord && endWord && currentWord !== startWord) {
      console.log(`Calculating suggested path from ${currentWord} to ${endWord}`); // Log attempt
      const result = findShortestPath(nodes, currentWord, endWord);
      
      if (result.path && result.path.length > 1) { 
          const moves = result.path.length - 1;
          console.log(`Found suggested path (${moves} moves):`, result.path);
          setSuggestedPathFromCurrent(result.path);
          setSuggestedPathFromCurrentLength(moves);
      } else {
          console.log(`No valid path found from ${currentWord} to ${endWord}`); // Log if no path
          // Keep state as empty/null (already reset)
      }
      
    } else {
       // Log why calculation wasn't performed (copied from previous attempt)
        if (!nodes) console.log("Cannot calculate suggested path: Graph data not available.");
        else if (!currentWord || !endWord) console.log("Cannot calculate suggested path: Current or end word missing.");
        else if (currentWord === startWord) console.log("Not calculating suggested path: Player hasn't moved from start word.");
    }
    
    setStatus(GameStatus.GAVE_UP);
    
  }, [status, currentWord, endWord, startWord]); // Removed nodes/graphData dependency

  // --- Context Value --- 
  const value = {
    status,
    startWord,
    endWord,
    currentWord,
    playerPath,
    optimalDistance,
    optimalPathLength,
    optimalPath,
    suggestedPathFromCurrent,
    suggestedPathFromCurrentLength,
    error, // Game specific error
    startGame,
    selectWord,
    giveUp,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined || context === null) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}; 