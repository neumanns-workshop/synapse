import React, { createContext, useState, useContext, useCallback } from 'react';
import { findShortestPath, findValidWordPair } from '../utils/graphUtils';
import { generateGameReport } from '../utils/gameReportUtils'; // Import the report generator

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
const MIN_PATH_MOVES = 3;
const MAX_PATH_MOVES = 8;
// Add minimum visual distance constraint (t-SNE/PCA units)
const MIN_COORD_DISTANCE_SQUARED = 30 * 30;
// Add minimum node degree constraint
const MIN_NODE_DEGREE = 2;

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
  // --- State for Move Accuracy ---
  const [optimalMovesMade, setOptimalMovesMade] = useState(0);
  const [moveAccuracy, setMoveAccuracy] = useState(null); // Percentage (0-100)
  // --- State for Semantic Distance ---
  const [playerSemanticDistance, setPlayerSemanticDistance] = useState(0);
  const [optimalSemanticDistance, setOptimalSemanticDistance] = useState(null);
  // --- State for End Game Report ---
  const [gameReport, setGameReport] = useState(null);
  // --- State for Optimal Remaining Path Length ---
  const [optimalRemainingLength, setOptimalRemainingLength] = useState(null);
  // --- State for Optimal Choices ---
  const [optimalChoices, setOptimalChoices] = useState([]); // Store optimal choices at each step
  // --- End State ---

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
    setOptimalMovesMade(0);
    setMoveAccuracy(null); 
    setPlayerSemanticDistance(0);
    setOptimalSemanticDistance(null);
    setGameReport(null); 
    setOptimalRemainingLength(null);
    setOptimalChoices([]);

    // Define constraints for word pair finding
    const pairConstraints = {
        minPathMoves: MIN_PATH_MOVES,
        maxPathMoves: MAX_PATH_MOVES,
        minCoordDistanceSquared: MIN_COORD_DISTANCE_SQUARED,
        minNodeDegree: MIN_NODE_DEGREE
    };

    const calculatedResult = findValidWordPair(nodes, pairConstraints);

    // Set state based on the result from findValidWordPair
    if (calculatedResult) {
        setStartWord(calculatedResult.startWord);
        setEndWord(calculatedResult.endWord);
        setCurrentWord(calculatedResult.startWord);
        setPlayerPath([calculatedResult.startWord]);
        setOptimalDistance(calculatedResult.distance);
        setOptimalPathLength(calculatedResult.moves);
        setOptimalPath(calculatedResult.path);
        setOptimalRemainingLength(calculatedResult.moves);
        setStatus(GameStatus.PLAYING);
        // Calculate Optimal Semantic Distance 
        if (calculatedResult.path && calculatedResult.path.length > 1) {
          let distanceSum = 0;
          for (let i = 0; i < calculatedResult.path.length - 1; i++) {
            const similarity = getSimilarity(nodes, calculatedResult.path[i], calculatedResult.path[i+1]);
            distanceSum += (1 - similarity);
          }
          setOptimalSemanticDistance(distanceSum);
        } else {
             setOptimalSemanticDistance(0); // Ensure it's set even for 0/1 length paths
        }
    } else {
        // Use more specific error based on constraints
        setError(`Could not find a suitable word pair matching constraints after multiple attempts.`); 
        setStatus(GameStatus.ERROR);
        // Error already logged by findValidWordPair
    }

  }, []); // Dependency array remains empty as nodes/constraints are passed in

  // Helper function to get similarity score (or 0 if missing)
  function getSimilarity(nodes, wordA, wordB) {
    return nodes?.[wordA]?.edges?.[wordB] ?? 0;
  }

  // selectWord now needs nodes passed in
  const selectWord = useCallback((selectedWord, nodes) => {
    if (status !== GameStatus.PLAYING || !nodes || !currentWord || !endWord) return;
    
    // const startNodeData = nodes[currentWord]; // Not used?
    // const endNodeData = nodes[endWord]; // Unused var
    // const selectedNodeData = nodes[selectedWord]; // Unused var

    // Restore core logic:
    const neighbors = nodes[currentWord]?.edges;
    if (!neighbors || !neighbors[selectedWord]) {
      console.warn(`Selected word "${selectedWord}" is not a valid neighbor of "${currentWord}".`);
      return; 
    }

    // --- Calculate if move was optimal (based on graph path) ---
    let wasOptimalMove = false;
    let optimalChoice = null;
    const pathResult = findShortestPath(nodes, currentWord, endWord); 
    if (pathResult.path && pathResult.path.length > 1) {
      optimalChoice = pathResult.path[1]; // Store the optimal choice
      if (pathResult.path[1] === selectedWord) {
        wasOptimalMove = true;
      }
    } else {
        // If no path exists from current, the move cannot be optimal in terms of path reduction
    }
    // --- End Optimal Move Check ---

    const newPath = [...playerPath, selectedWord];
    const currentMovesCount = newPath.length - 1;
    let updatedOptimalMoves = optimalMovesMade;

    if (wasOptimalMove) {
      updatedOptimalMoves++;
    }
    
    // Capture the NEW current word *after* the move
    const newCurrentWord = selectedWord;
    
    // Update optimal choices
    setOptimalChoices(prev => [...prev, { 
      playerPosition: currentWord, 
      playerChose: selectedWord, 
      optimalChoice: optimalChoice 
    }]);
    
    // Update state
    setPlayerPath(newPath);
    setCurrentWord(newCurrentWord); 
    setOptimalMovesMade(updatedOptimalMoves);

    // --- Update Player Semantic Distance ---
    const moveSimilarity = getSimilarity(nodes, currentWord, selectedWord);
    const moveDistance = 1 - moveSimilarity;
    setPlayerSemanticDistance(prev => prev + moveDistance);
    // --- End Update ---

    // Update accuracy
    if (currentMovesCount > 0) {
      setMoveAccuracy((updatedOptimalMoves / currentMovesCount) * 100);
    } else {
      setMoveAccuracy(null); // Or 100? If 0 moves, accuracy is undefined or perfect? Let's go with null.
    }

    // --- Calculate and Update Optimal Remaining Length ---
    const newRemainingResult = findShortestPath(nodes, newCurrentWord, endWord);
    if (newRemainingResult.path && newRemainingResult.path.length > 0) {
      // Path length is nodes - 1 for moves
      setOptimalRemainingLength(newRemainingResult.path.length - 1);
    } else {
      // No path found from the new position
      setOptimalRemainingLength(null); 
    }
    // --- End Update ---

    // Check for win condition
    if (newCurrentWord === endWord) {
      setStatus(GameStatus.WON);
      // --- Generate Report on Win ---
      const report = generateGameReport(nodes, newPath, optimalPath, updatedOptimalMoves, playerSemanticDistance + (1 - getSimilarity(nodes, currentWord, newCurrentWord)), optimalSemanticDistance, optimalChoices);
      setGameReport(report);
      setOptimalRemainingLength(0);
    }
  }, [status, currentWord, playerPath, endWord, optimalMovesMade, optimalPath, playerSemanticDistance, optimalSemanticDistance, optimalChoices]); // Removed generateGameReport from dependencies, added optimalChoices

  // giveUp now needs nodes passed in
  const giveUp = useCallback((nodes) => {
    if (status !== GameStatus.PLAYING) return;
    
    // --- Generate Report on Give Up --- 
    const report = generateGameReport(nodes, playerPath, optimalPath, optimalMovesMade, playerSemanticDistance, optimalSemanticDistance, optimalChoices);
    setGameReport(report);
    // --- End Report Generation ---

    setSuggestedPathFromCurrent([]);
    setSuggestedPathFromCurrentLength(null);
    
    if (nodes && currentWord && endWord && currentWord !== startWord) {
      const result = findShortestPath(nodes, currentWord, endWord);
      
      if (result.path && result.path.length > 1) { 
          const moves = result.path.length - 1;
          setSuggestedPathFromCurrent(result.path);
          setSuggestedPathFromCurrentLength(moves);
      } else {
          // Keep state as empty/null (already reset)
      }
      
    } else {
       // Log why calculation wasn't performed (copied from previous attempt)
        if (!nodes) console.log("Cannot calculate suggested path: Graph data not available.");
        else if (!currentWord || !endWord) console.log("Cannot calculate suggested path: Current or end word missing.");
        else if (currentWord === startWord) console.log("Not calculating suggested path: Player hasn't moved from start word.");
    }
    
    setStatus(GameStatus.GAVE_UP);
    // Set remaining to null when giving up?
    setOptimalRemainingLength(null);
  }, [status, currentWord, endWord, startWord, playerPath, optimalPath, optimalMovesMade, playerSemanticDistance, optimalSemanticDistance, optimalChoices]); // Removed generateGameReport from dependencies, added optimalChoices

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
    // --- Add Accuracy to Context ---
    optimalMovesMade,
    moveAccuracy,
    // --- End Accuracy Context ---
    // --- Add Semantic Distance to Context ---
    playerSemanticDistance,
    optimalSemanticDistance,
    // --- End Semantic Distance Context ---
    // --- Add Game Report to Context ---
    gameReport,
    // --- End Game Report Context ---
    optimalRemainingLength, // Used for Possible
    optimalChoices, // Add the optimal choices
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