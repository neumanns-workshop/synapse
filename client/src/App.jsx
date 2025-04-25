import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { GraphDataProvider, useGraphData } from './context/GraphDataContext';
// Import GameProvider and useGame hook
import { GameProvider, useGame, GameStatus } from './context/GameContext';
// Remove findShortestPath import if no longer directly used here
import { findShortestPath } from './utils/graphUtils';
// Import the new component
import GraphVisualization from './components/GraphVisualization';

// Helper function to map similarity to a background color (adjust as needed)
function getButtonStyle(rank, totalOptions) {
  // Normalize rank (0 is highest rank/most similar)
  // Avoid division by zero if totalOptions is 1 (shouldn't happen with K>1)
  const normalizedRank = totalOptions > 1 ? rank / (totalOptions - 1) : 0;

  // Use HSL color: Vary Lightness. Lower rank (more similar) = lower lightness (darker)
  const hue = 200; // Blueish
  const saturation = 50; // Moderate saturation
  const darkestLightness = 50; // Darkest end for rank 0
  const lightestLightness = 70; // Lightest end for last rank (Reduced from 85 for better contrast)
  // Interpolate lightness based on normalized rank (0 -> darkest, 1 -> lightest)
  const lightness = darkestLightness + (normalizedRank * (lightestLightness - darkestLightness));

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

// Main Game Component
function Game() {
  // Get state/actions from GameContext
  const {
    status, startWord, endWord, currentWord, playerPath, 
    optimalPath, 
    optimalPathLength, // Overall Best
    optimalRemainingLength, // Current Possible
    suggestedPathFromCurrent, suggestedPathFromCurrentLength, 
    error: gameError, 
    moveAccuracy, 
    gameReport, 
    isLoading: isGameLoading, 
    graphError, 
    optimalChoices, // Add this to get access to the optimal choices
    startGame: startGameAction, 
    selectWord: selectWordAction, 
    giveUp: giveUpAction
    // Remove unused state like optimalDistance, playerSemanticDistance, optimalMovesMade if not displayed
  } = useGame();

  // Get graph data AND definitions data from GraphDataContext
  const { graphData, definitionsData, isLoading: isGraphLoading } = useGraphData(); 

  // Combine game error and graph error for display
  const displayError = gameError || graphError;

  // Replace string state with object for multiselect
  const [pathDisplay, setPathDisplay] = useState({
    player: true,
    optimal: false,
    suggested: false
  });

  // State for info box visibility
  const [showInfo, setShowInfo] = useState(false);

  // Add state for highlighted word
  const [highlightedWord, setHighlightedWord] = useState(null);
  
  // Callback for node clicks
  const handleNodeClick = useCallback((word) => {
    // Toggle highlight: if same word clicked, clear, otherwise set
    setHighlightedWord(prev => (prev === word ? null : word));
  }, []); // No dependencies needed

  // Reset display mode when status changes
  useEffect(() => {
    // When entering GAVE_UP, default to 'both' (optimal/player)
    if (status === GameStatus.GAVE_UP) {
        // Set initial mode when giving up. 'both' makes sense.
        // If we want 'suggested' as default, check if suggestedPathFromCurrent exists.
        setPathDisplay({
          player: true,
          optimal: true,
          suggested: false
        }); 
    }
    // Reset if not in gave_up state (e.g., starting new game)
    else if (status !== GameStatus.GAVE_UP) {
      setPathDisplay({
        player: true,
        optimal: true,
        suggested: false
      }); // Or null/irrelevant state?
    }
  }, [status]); // Run only when status changes

  // Wrap actions to pass graphData.nodes
  const handleStartGame = () => {
    startGameAction(graphData.nodes);
    // Reset path display when starting a new game
    setPathDisplay({
      player: true,
      optimal: false,
      suggested: false
    });
  };
  
  const handleSelectWord = (word) => {
    selectWordAction(word, graphData.nodes);
  };
  
  const handleGiveUp = () => {
    giveUpAction(graphData.nodes);
    // Reset path display when giving up
    setPathDisplay({
      player: true,
      optimal: false,
      suggested: false
    });
  };

  // Get neighbors for the current word when playing
  const currentNeighbors = status === GameStatus.PLAYING && graphData && graphData.nodes[currentWord]
    ? graphData.nodes[currentWord].edges
    : {};

  const neighborOptions = Object.entries(currentNeighbors)
     .sort(([, simA], [, simB]) => simB - simA);

  if (isGraphLoading) {
    return <p>Loading graph data...</p>;
  }

  if (graphError) {
    return <p className="error-message">Graph Error: {graphError}</p>;
  }

  // Add toggle handler for path display
  const togglePathDisplay = (path) => {
    // Get current state
    const currentState = {...pathDisplay};
    
    // If user tries to deselect the only selected path, prevent it
    if (currentState[path] && Object.values(currentState).filter(Boolean).length === 1) {
      return; // At least one path must be selected
    }
    
    // Toggle the path
    currentState[path] = !currentState[path];
    setPathDisplay(currentState);
  };

  // Render based on Game Status
  return (
    <div className="game-container">
      {/* Info Button */}  
      <button onClick={() => setShowInfo(!showInfo)} className="info-button">
        {showInfo ? 'Hide Info' : 'Show Info'}
      </button>

      {/* Info Box */} 
      {showInfo && (
        <div className="info-box">
          <h3>Charting your Synaptic Course</h3>
          <p>
            <strong>Goal:</strong> Discover a semantic pathway from the <span className='start-word-text'>Start</span> word to the <span className='end-word-text'>End</span> word via related words in the fewest moves.
          </p>
          <p>
            <strong>How:</strong> Click a neighbor word. Use <strong>Hover Definitions</strong> (reveals word meanings) & <strong>Button Color</strong> (darker = more similar) to guide your choice towards the target.
          </p>
          <p>
            <strong>Track:</strong> Follow your path below the graph. Track your <strong>Moves</strong> against the overall <strong>Best</strong> score and the currently <strong>Possible</strong> score (hover over labels for details).
          </p>
          <p>
            <strong>Stuck?</strong> "Give Up" shows the <span className='optimal-path-text'>Optimal Path</span>, possibly a <span className='suggested-path-text'>Suggested Path</span>, and a game analysis.
          </p>
        </div>
      )}

      {/* Start Button Logic */}
      {(status === GameStatus.IDLE || status === GameStatus.WON || status === GameStatus.GAVE_UP || status === GameStatus.ERROR) && (
        // Use loading state from useGame
        <button onClick={handleStartGame} disabled={isGameLoading}>
          {isGameLoading ? 'Loading...' : 'Start New Game'}
        </button>
      )}
      {/* Graph loading/error messages */}
      {isGraphLoading && <p>Loading graph data...</p>} {/* Simplified loading message */}
      {displayError && <p className="error-message">Error: {displayError}</p>}

      {/* Visualization Container (Graph Only) */}
      {(status === GameStatus.PLAYING || status === GameStatus.GAVE_UP) && graphData && (
        <div className="graph-container">
          {/* Pass handleNodeClick and pathDisplay down */}
          <GraphVisualization pathDisplayMode={pathDisplay} onNodeClick={handleNodeClick} /> 
         </div>
      )}

      {/* Status Info (Moves & Path) */}
      {(status === GameStatus.PLAYING || status === GameStatus.GAVE_UP) && graphData && (
        <div className="graph-status-info">
          {/* Player Path Rendering */}
          <div className="player-path">
            {/* Render Player Path */}
            {playerPath.map((word, index) => {
              let wordClass = '';
              const isFirst = index === 0;
              const isLast = index === playerPath.length - 1;

              if (isLast && status === GameStatus.PLAYING) {
                wordClass = 'current-word-text';
              } else if (isLast && status === GameStatus.WON) {
                wordClass = 'end-word-text';
              } else if (isFirst) {
                wordClass = 'start-word-text'; 
              }
              
              // Add highlight class if word matches
              if (word === highlightedWord) {
                wordClass += ' highlighted-path-word'; // Append class
              }
              
              // Check if this move was optimal (for non-first words)
              if (index > 0 && gameReport?.optimalChoiceHistory) {
                // The previous position is where the choice was made
                const prevPosition = playerPath[index-1];
                // Find the choice that matches this position and word choice
                const moveData = gameReport.optimalChoiceHistory.find(
                  choice => choice.playerPosition === prevPosition && choice.playerChose === word
                );
                
                // Add optimal choice marker if this was an optimal move
                if (moveData && moveData.playerChose === moveData.optimalChoice) {
                  // Check if this choice is part of the original optimal path
                  const isOnOriginalOptimalPath = optimalPath.includes(word) && 
                                                  optimalPath.includes(prevPosition) &&
                                                  optimalPath.indexOf(word) === optimalPath.indexOf(prevPosition) + 1;
                  
                  wordClass += ' optimal-choice-word'; // Base class for optimal choices
                  wordClass += isOnOriginalOptimalPath ? ' global-optimal-choice' : ' local-optimal-choice';
                }
              } else if (index > 0 && status === GameStatus.PLAYING && optimalChoices) {
                // For active games, check against the accumulated optimalChoices
                const prevPosition = playerPath[index-1];
                const moveData = optimalChoices.find(
                  choice => choice.playerPosition === prevPosition && choice.playerChose === word
                );
                
                if (moveData && moveData.playerChose === moveData.optimalChoice) {
                  // Check if this choice is part of the original optimal path
                  const isOnOriginalOptimalPath = optimalPath.includes(word) && 
                                                  optimalPath.includes(prevPosition) &&
                                                  optimalPath.indexOf(word) === optimalPath.indexOf(prevPosition) + 1;
                  
                  wordClass += ' optimal-choice-word'; // Base class for optimal choices
                  wordClass += isOnOriginalOptimalPath ? ' global-optimal-choice' : ' local-optimal-choice';
                }
              }

              // Fetch and format definitions for the tooltip
              const definitionsList = definitionsData && definitionsData[word] ? definitionsData[word] : [];
              const tooltipText = definitionsList.length > 0
                ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
                : 'No definition found'; // Fallback message

              return (
                <React.Fragment key={word + index}> 
                  {(index > 0) && <span className="path-arrow">{' → '}</span>} 
                  <span 
                    className={wordClass.trim()} 
                    title={tooltipText} // Add tooltip here
                  >
                    {word}
                  </span>
                </React.Fragment>
              );
            })}
            
            {/* Add trailing arrow and Target Word if not won and not already at target */}
            {status === GameStatus.PLAYING && endWord && definitionsData && currentWord !== endWord && (
              <>
                <span className="path-arrow">{' → '}</span>
                <span 
                  className="path-dots"
                  title={`Optimal path length: ${optimalRemainingLength} moves remaining`}
                >
                  {/* Generate N dots where N is optimalRemainingLength */}
                  {Array.from({ length: Math.min(optimalRemainingLength || 0, 10) }, (_, i) => 
                    <span 
                      key={i} 
                      className={moveAccuracy !== null && moveAccuracy < 100 ? "path-dot possible-path-dot" : "path-dot optimal-path-dot"}
                    >
                      .
                    </span>
                  )}
                </span>
                <span className="path-arrow">{' → '}</span>
                {(() => {
                  const definitionsList = definitionsData[endWord] || [];
                  const tooltipText = definitionsList.length > 0
                    ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
                    : 'No definition found';
                  return (
                    <span 
                      className="end-word-text" 
                      title={tooltipText + "\n\nThis is your target word."}
                    >
                      {endWord}
                    </span>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* Options & Give Up Button (Now below status info) */}
      {status === GameStatus.PLAYING && graphData && definitionsData && (
        <div className="options-container">
          <div className="options-buttons">
            {neighborOptions.map(([neighborWord], index) => {
              // Get definitions for the neighbor word
              const definitionsList = definitionsData[neighborWord] || []; // Default to empty list
              // Format definitions for tooltip
              const tooltipText = definitionsList.length > 0
                ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
                : 'No definition found'; // Fallback message

              return (
                <button
                  key={neighborWord}
                  onClick={() => handleSelectWord(neighborWord)}
                  style={getButtonStyle(index, neighborOptions.length)} // Use the existing style function
                  className="option-button"
                  title={tooltipText} // Add the title attribute for the tooltip
                >
                  {neighborWord}
                </button>
              );
            })}
          </div>
          <button onClick={handleGiveUp} className="give-up-button">
            Give Up
          </button>
        </div>
      )}

      {/* Won State Display */}
      {status === GameStatus.WON && gameReport && (
        <div className="won-section game-report-section">
          <h2>You Won!</h2>
          <p><strong>Player Path:</strong> {playerPath.join(' -> ')}</p>
          {/* --- Render Report --- */}
          <GameReportDisplay report={gameReport} />
        </div>
      )}

      {/* Gave Up State Display */}
      {status === GameStatus.GAVE_UP && optimalPath && gameReport && (
        <div className="gave-up-section game-report-section">
          <h3>You Gave Up!</h3>
          {/* Display Optimal Path */}
          <p>Optimal Path ({optimalPathLength ?? 'N/A'} moves):</p>
          <p className="optimal-path">{optimalPath.join(' -> ')}</p>

          {/* Conditionally display Suggested Path */}
          {suggestedPathFromCurrentLength !== null && suggestedPathFromCurrent.length > 0 && (
            <div style={{ marginTop: '10px' }}> {/* Add some space */}
              <p>Currently Suggested Path ({suggestedPathFromCurrentLength} moves):</p>
              {/* Add a class for styling this path text */}
              <p className="suggested-path-text">{suggestedPathFromCurrent.join(' -> ')}</p>
            </div>
          )}
          {suggestedPathFromCurrentLength === null && currentWord !== startWord && (
            <p style={{ fontStyle: 'italic', marginTop: '10px' }}>No path found from your current location ({currentWord}) to the end word.</p>
          )}

          {/* --- Render Report --- */}
          <GameReportDisplay report={gameReport} />

          {/* Replace Path Display Toggle Buttons with multiselect */}
          <div className="path-toggle-container">
            Show on Graph:
            <button 
              onClick={() => togglePathDisplay('player')} 
              className={pathDisplay.player ? 'path-button-active' : ''}
              title="Show or hide the path you took through the word space"
            >
              Player
            </button>
            <button 
              onClick={() => togglePathDisplay('optimal')} 
              className={pathDisplay.optimal ? 'path-button-active' : ''}
              title="Show or hide the optimal path from start to end"
            >
              Optimal
            </button>
            <button
              onClick={() => togglePathDisplay('suggested')}
              disabled={suggestedPathFromCurrentLength === null}
              className={pathDisplay.suggested ? 'path-button-active' : ''}
              title={suggestedPathFromCurrentLength === null ? 
                "No suggested path available" : 
                "Show or hide the suggested path from your current position to the end"}
            >
              Currently Suggested
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- New Component for Displaying Game Report --- 
function GameReportDisplay({ report }) {
  if (!report) return null;

  // Helper to format paired values
  const formatPairedValue = (playerVal, optimalVal, precision = 0) => {
    const playerStr = typeof playerVal === 'number' ? playerVal.toFixed(precision) : 'N/A';
    const optimalStr = typeof optimalVal === 'number' ? optimalVal.toFixed(precision) : 'N/A';
    return `${playerStr} (Optimal: ${optimalStr})`;
  };

  // Filter for non-optimal moves with available alternatives
  const missedOptimalMoves = report.optimalChoiceHistory?.filter(
    choice => choice.playerChose !== choice.optimalChoice && choice.optimalChoice !== null
  ) || [];

  // Filter for optimal moves made by the player
  const optimalMovesMade = report.optimalChoiceHistory?.filter(
    choice => choice.playerChose === choice.optimalChoice && choice.optimalChoice !== null
  ) || [];

  return (
    <div className="game-report">
      <ul>
        <li title="Total number of moves you made, compared to the optimal solution">
          Moves: {report.playerMoves ?? 'N/A'}
        </li>
        <li title="Percentage of your moves that matched the best possible move at each step">
          Accuracy: {report.accuracy?.toFixed(1) ?? 'N/A'}% ({report.optimalMovesMade} / {report.playerMoves} optimal steps)
        </li>
        <li title="Total semantic distance traveled through the word space, based on word similarity">
          Semantic Distance: {formatPairedValue(report.playerDistance, report.optimalDistance, 2)}
        </li>
        <li title="Average similarity score between consecutive words in your path">
          Avg. Similarity / Move: {report.averageSimilarity?.toFixed(3) ?? 'N/A'}
        </li>
        <li title="Moves where you selected the most semantically similar neighbor available">
          "Greedy" Moves (Most Similar): {report.greedyMoves} / {report.playerMoves}
        </li>
        <li title="Moves where the chosen word appeared further from the target (based on graph layout), but enabled a potentially closer approach in future steps">
          "Jackknife" Moves: {report.repositioningMoves} / {report.playerMoves}
        </li>
      </ul>

      {/* Show optimal choices if any exist */}
      {optimalMovesMade.length > 0 && (
        <div className="optimal-moves-made">
          <h5>Optimal Moves Made:</h5>
          <ul>
            {optimalMovesMade.map((move, idx) => {
              // Check if this move was part of the original optimal path
              const isOnOriginalOptimalPath = report.optimalPath && report.optimalPath.includes(move.playerChose) && 
                                          report.optimalPath.includes(move.playerPosition) &&
                                          report.optimalPath.indexOf(move.playerChose) === report.optimalPath.indexOf(move.playerPosition) + 1;
              
              // Determine which class to use
              const starClass = isOnOriginalOptimalPath ? "global-optimal-star" : "local-optimal-star";
              
              return (
                <li key={idx}>
                  At <span className="player-position">{move.playerPosition}</span> you chose <span className="optimal-choice">{move.playerChose}</span> <span className={starClass}>★</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Show missed optimal choices if any exist */}
      {missedOptimalMoves.length > 0 && (
        <div className="missed-optimal-moves">
          <h5>Missed Optimal Moves:</h5>
          <ul>
            {missedOptimalMoves.map((move, idx) => (
              <li key={idx}>
                At <span className="player-position">{move.playerPosition}</span> you chose <span className="player-choice">{move.playerChose}</span>, optimal was <span className="optimal-choice">{move.optimalChoice}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
// --- End New Component ---

function App() {
  return (
    // Remove props from providers
    <GameProvider>
    <GraphDataProvider>
        <div className="App">
          <h1>Synapse</h1>
          <h2 className="subtitle">Semantic Pathways</h2>
          <Game />
        </div>
      </GraphDataProvider>
      </GameProvider>
  );
}

export default App;
