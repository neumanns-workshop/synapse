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

  // --- Helper Function: Generate Game Report ---
  const generateGameReport = useCallback((nodes, playerPath, optimalPath, optimalMovesMade, playerSemanticDistance, optimalSemanticDistance) => {
    if (!playerPath || playerPath.length <= 1) return null; // Need at least one move

    const numPlayerMoves = playerPath.length - 1;
    const finalAccuracy = (optimalMovesMade / numPlayerMoves) * 100;
    let greedyMoves = 0;
    let repositioningMoves = 0; // Renamed from jackknifeMoves
    let totalPlayerSimilarity = 0;

    for (let i = 0; i < numPlayerMoves; i++) {
      const current = playerPath[i];
      const selected = playerPath[i+1];
      const target = playerPath[playerPath.length - 1]; // End word
      const neighbors = nodes[current]?.edges;
      
      // --- Calculate Similarity & Greedy --- 
      if (neighbors) {
        const moveSimilarity = neighbors[selected] ?? 0;
        totalPlayerSimilarity += moveSimilarity;
        // Check if it was the most similar choice
        const maxSimilarity = Math.max(...Object.values(neighbors));
        if (moveSimilarity >= maxSimilarity * 0.999) { // Allow for floating point issues
          greedyMoves++;
        }
      }

      // --- Calculate Repositioning Moves --- 
      // Requires A, B, C - check index i >= 1
      if (i >= 1) {
        const nodeA = nodes[playerPath[i-1]]; // A
        const nodeB = nodes[current];          // B
        const nodeC = nodes[selected];         // C
        const nodeEnd = nodes[target];         // Target

        const distSq_B_End = calculateDistanceSquared(nodeB?.tsne, nodeEnd?.tsne);
        const distSq_C_End = calculateDistanceSquared(nodeC?.tsne, nodeEnd?.tsne);
        
        if (distSq_C_End > distSq_B_End) { // Cond 1: C further than B
          let minDistSq_neighbor_end = Infinity;
          let bestNextWord = null;
          const neighborsOfC = nodeC?.edges;
          if (neighborsOfC) {
            for (const neighborWord in neighborsOfC) {
               const neighborNodeData = nodes[neighborWord];
               const distSq = calculateDistanceSquared(neighborNodeData?.tsne, nodeEnd?.tsne);
               if (distSq < minDistSq_neighbor_end) {
                 minDistSq_neighbor_end = distSq;
                 bestNextWord = neighborWord; 
               }
            }
          }
          if (bestNextWord && minDistSq_neighbor_end < distSq_B_End) { // Cond 2: Best next from C closer than B
            repositioningMoves++; // Renamed from jackknifeMoves++
          }
        }
      }
    } // End loop through moves

    return {
      playerMoves: numPlayerMoves,
      optimalMoves: optimalPath?.length ? optimalPath.length - 1 : null,
      accuracy: finalAccuracy,
      optimalMovesMade: optimalMovesMade,
      subOptimalMoves: numPlayerMoves - optimalMovesMade,
      greedyMoves: greedyMoves,
      repositioningMoves: repositioningMoves, // Renamed property key
      playerDistance: playerSemanticDistance,
      optimalDistance: optimalSemanticDistance,
      averageSimilarity: numPlayerMoves > 0 ? totalPlayerSimilarity / numPlayerMoves : 0,
      optimalChoiceHistory: optimalChoices, // Add the optimal choices to the report
    };

  }, [optimalChoices]); // Add optimalChoices as a dependency

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
    // --- Reset Accuracy State ---
    setOptimalMovesMade(0);
    setMoveAccuracy(null); // Reset accuracy for new game
    // --- Reset Semantic Distance State ---
    setPlayerSemanticDistance(0);
    setOptimalSemanticDistance(null);
    setGameReport(null); // Reset report
    // Reset the new state variable too
    setOptimalRemainingLength(null);
    // Reset optimal choices
    setOptimalChoices([]);

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
    let calculatedResult = null;

    console.log(`Searching for word pair (Moves: ${MIN_PATH_MOVES}-${MAX_PATH_MOVES}, Min Coord Dist Sq: ${MIN_COORD_DISTANCE_SQUARED}, Min Degree: ${MIN_NODE_DEGREE})...`);

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

      // --- New: Check node degrees early --- 
      const startNodeData = nodes[potentialStart];
      const endNodeData = nodes[potentialEnd];
      const startDegree = startNodeData?.edges ? Object.keys(startNodeData.edges).length : 0;
      const endDegree = endNodeData?.edges ? Object.keys(endNodeData.edges).length : 0;

      if (startDegree < MIN_NODE_DEGREE || endDegree < MIN_NODE_DEGREE) {
        console.log(`Pair ${potentialStart}(${startDegree}) -> ${potentialEnd}(${endDegree}) rejected: Low node degree.`);
        continue; // Skip to next attempt if degree is too low
      }
      // --- End New Check ---

      const result = findShortestPath(nodes, potentialStart, potentialEnd);
      const moves = result.path ? result.path.length - 1 : 0;
      
      // Check path length first (cheaper check)
      if (result.path && moves >= MIN_PATH_MOVES && moves <= MAX_PATH_MOVES) {
        
        // Now check visual distance using t-SNE coordinates
        const startNodeData = nodes[potentialStart];
        const endNodeData = nodes[potentialEnd];

        if (startNodeData?.tsne && endNodeData?.tsne) {
          const [startX, startY] = startNodeData.tsne;
          const [endX, endY] = endNodeData.tsne;
          const dx = startX - endX;
          const dy = startY - endY;
          const distSq = dx * dx + dy * dy;

          if (distSq >= MIN_COORD_DISTANCE_SQUARED) {
            // --- New: Penultimate Node Check --- 
            let hasAlternateApproach = false;
            if (result.path.length >= 2) { // Should always be true given MIN_PATH_MOVES >= 3
              const penultimateNode = result.path[result.path.length - 2];
              const penultimateNeighbors = nodes[penultimateNode]?.edges;
              if (penultimateNeighbors) {
                for (const neighbor of Object.keys(penultimateNeighbors)) {
                  if (neighbor !== potentialEnd) { // Don't check the end node itself
                    const neighborNodeData = nodes[neighbor];
                    // Check if this neighbor connects back to the end node
                    if (neighborNodeData?.edges && neighborNodeData.edges[potentialEnd]) {
                      hasAlternateApproach = true;
                      // console.log(`   - Alt approach found: ${penultimateNode} -> ${neighbor} -> ${potentialEnd}`);
                      break; // Found one, no need to check further
                    }
                  }
                }
              }
            }
            // --- End Penultimate Node Check ---
            
            if (hasAlternateApproach) {
             // Valid pair found!
             console.log(`Found valid pair: ${potentialStart} -> ${potentialEnd}, Moves: ${moves}, DistSq: ${distSq.toFixed(2)}, Has Alt Approach`);
             calculatedResult = { potentialStart, potentialEnd, path: result.path, distance: result.distance, moves };
             foundPair = true;
            } else {
              console.log(`Pair ${potentialStart} -> ${potentialEnd} rejected: No alternate approach path near end.`);
            }
          } else {
            console.log(`Pair ${potentialStart} -> ${potentialEnd} rejected: Too close visually (DistSq: ${distSq.toFixed(2)}).`);
          }
        } else {
          console.log(`Pair ${potentialStart} -> ${potentialEnd} rejected: Missing t-SNE data.`);
        }
      } else {
        // Path length was invalid, log rejection
        if (!result.path) {
          console.log(`Pair ${potentialStart} -> ${potentialEnd} rejected: No path found.`);
        } else {
          console.log(`Pair ${potentialStart} -> ${potentialEnd} rejected: Path length ${moves} out of range (${MIN_PATH_MOVES}-${MAX_PATH_MOVES}).`);
        }
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
        // --- Set Initial Optimal Remaining Length ---
        // It's the same as the overall optimal length at the start
        setOptimalRemainingLength(calculatedResult.moves);
        // --- End Initial Set ---
        setStatus(GameStatus.PLAYING);
        // --- Calculate Optimal Semantic Distance --- 
        if (calculatedResult.path && calculatedResult.path.length > 1) {
          let distanceSum = 0;
          for (let i = 0; i < calculatedResult.path.length - 1; i++) {
            const similarity = getSimilarity(nodes, calculatedResult.path[i], calculatedResult.path[i+1]);
            distanceSum += (1 - similarity);
          }
          setOptimalSemanticDistance(distanceSum);
        }
        // --- End Calculation ---
    } else {
        setError(`Could not find a suitable word pair (moves ${MIN_PATH_MOVES}-${MAX_PATH_MOVES}, min coord dist sq ${MIN_COORD_DISTANCE_SQUARED}, min degree ${MIN_NODE_DEGREE}) after ${maxAttempts} attempts.`);
        setStatus(GameStatus.ERROR);
        console.error("Failed to find a suitable word pair for the game.");
    }

  }, []); // Dependency removed

  // --- Helper for Euclidean Distance (Squared) ---
  function calculateDistanceSquared(coord1, coord2) {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
      return Infinity; // Or null/undefined, handle appropriately
    }
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return dx * dx + dy * dy;
  }

  // Helper function to get similarity score (or 0 if missing)
  function getSimilarity(nodes, wordA, wordB) {
    return nodes?.[wordA]?.edges?.[wordB] ?? 0;
  }

  // selectWord now needs nodes passed in
  const selectWord = useCallback((selectedWord, nodes) => {
    if (status !== GameStatus.PLAYING || !nodes || !currentWord || !endWord) return;
    
    const startNodeData = nodes[currentWord];
    const endNodeData = nodes[endWord]; // Need end node data for distance
    const selectedNodeData = nodes[selectedWord];

    // Restore core logic:
    const neighbors = startNodeData?.edges;
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

    console.log(`Player selected: ${selectedWord}` + (optimalChoice ? `, Optimal choice was: ${optimalChoice}` : ''));
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
      const report = generateGameReport(nodes, newPath, optimalPath, updatedOptimalMoves, playerSemanticDistance + (1 - getSimilarity(nodes, currentWord, newCurrentWord)), optimalSemanticDistance);
      setGameReport(report);
      console.log("Player reached the end word! Report:", report);
      // When winning, the remaining path is 0
      setOptimalRemainingLength(0);
    }
  }, [status, currentWord, playerPath, endWord, optimalMovesMade, optimalPath, playerSemanticDistance, optimalSemanticDistance, generateGameReport, optimalChoices]); // Dependencies updated

  // giveUp now needs nodes passed in
  const giveUp = useCallback((nodes) => {
    if (status !== GameStatus.PLAYING) return;
    
    // --- Generate Report on Give Up --- 
    const report = generateGameReport(nodes, playerPath, optimalPath, optimalMovesMade, playerSemanticDistance, optimalSemanticDistance);
    setGameReport(report);
    console.log("Player gave up. Report:", report);
    // --- End Report Generation ---

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
    // Set remaining to null when giving up?
    setOptimalRemainingLength(null);
  }, [status, currentWord, endWord, startWord, playerPath, optimalPath, optimalMovesMade, playerSemanticDistance, optimalSemanticDistance, generateGameReport]); // Dependencies updated

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