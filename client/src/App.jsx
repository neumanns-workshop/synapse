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
    startGame: startGameAction, 
    selectWord: selectWordAction, 
    giveUp: giveUpAction
    // Remove unused state like optimalDistance, playerSemanticDistance, optimalMovesMade if not displayed
  } = useGame();

  // Get graph data AND definitions data from GraphDataContext
  const { graphData, definitionsData, isLoading: isGraphLoading } = useGraphData(); 

  // Combine game error and graph error for display
  const displayError = gameError || graphError;

  // State for controlling path visibility on give up
  // Possible values: 'player', 'optimal', 'suggested', 'both'
  const [pathDisplayMode, setPathDisplayMode] = useState('both');

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
        setPathDisplayMode('both'); 
    }
    // Reset if not in gave_up state (e.g., starting new game)
    else if (status !== GameStatus.GAVE_UP) {
      setPathDisplayMode('both'); // Or null/irrelevant state?
    }
  }, [status]); // Run only when status changes

  // Wrap actions to pass graphData.nodes
  const handleStartGame = () => {
      if (graphData) {
          startGameAction(graphData.nodes);
      } else {
          console.error("Cannot start game, graph data not loaded");
  }
  };
  
  const handleSelectWord = (word) => {
      if (graphData) {
          selectWordAction(word, graphData.nodes);
      } else {
          console.error("Cannot select word, graph data not loaded");
      }
  };
  
  const handleGiveUp = () => {
      if (graphData) {
          giveUpAction(graphData.nodes);
      } else {
          console.error("Cannot give up, graph data not loaded");
  }
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
        <div className="graph-visualization-container">
          {/* Pass handleNodeClick down */}
          <GraphVisualization pathDisplayMode={pathDisplayMode} onNodeClick={handleNodeClick} /> 
         </div>
      )}

      {/* Status Info (Moves & Path) */}
      {(status === GameStatus.PLAYING || status === GameStatus.GAVE_UP) && graphData && (
        <div className="graph-status-info">
          {/* Combined Moves and Target Info */}
          { status === GameStatus.PLAYING && (
            <p className="moves-info">
              {/* Target Word */}
              {endWord && definitionsData && (
                <>
                  <span title="The destination word.">
                    {'Target: '}
                    {
                      (() => {
                        const definitionsList = definitionsData[endWord] || [];
                        const tooltipText = definitionsList.length > 0
                          ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
                          : 'No definition found';
                        return (
                          <span className="end-word-text" title={tooltipText}>
                            {endWord}
                          </span>
                        );
                      })()
                    }
                  </span>
                  {' | '} 
                </>
              )}
              {/* Moves Info */}
              <span title="Your current number of moves.">
                {'Moves: '}
                <span className="player-move-count">{playerPath.length - 1}</span>
              </span>
              {' | '}
              {/* Possible Score from Current */}
              <span title="The lowest possible moves remaining from your current word.">
                {'Possible in: '}
                <span className="optimal-move-count">{optimalRemainingLength ?? 'N/A'}</span>
              </span>
              {' | '} {/* Separator before Accuracy */} 
              {/* Always display Accuracy section */} 
              <span title="Accuracy of your moves compared to the optimal path from each step.">
                {'Accuracy: '}
                {/* Display placeholder or actual value */} 
                {moveAccuracy === null ? '--%' : `${moveAccuracy.toFixed(1)}%`}
              </span>
            </p> 
          )}
          {/* Player Path Rendering */}
          <div className="player-path">
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

              // Fetch and format definitions for the tooltip
              const definitionsList = definitionsData && definitionsData[word] ? definitionsData[word] : [];
              const tooltipText = definitionsList.length > 0
                ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
                : 'No definition found'; // Fallback message

              return (
                <React.Fragment key={word + index}> 
                  {(index > 0) && <span className="path-arrow">{' -> '}</span>} 
                  <span 
                    className={wordClass.trim()} 
                    title={tooltipText} // Add tooltip here
                  >
                    {word}
                  </span>
                </React.Fragment>
              );
            })}
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
              <p>Suggested Path (from Current) ({suggestedPathFromCurrentLength} moves):</p>
              {/* Add a class for styling this path text */}
              <p className="suggested-path-text">{suggestedPathFromCurrent.join(' -> ')}</p>
            </div>
          )}
          {suggestedPathFromCurrentLength === null && currentWord !== startWord && (
            <p style={{ fontStyle: 'italic', marginTop: '10px' }}>No path found from your current location ({currentWord}) to the end word.</p>
          )}

          {/* --- Render Report --- */}
          <GameReportDisplay report={gameReport} />

          {/* Path Display Toggle Buttons */}
          <div className="path-toggle-container">
            Show on Graph:
            <button onClick={() => setPathDisplayMode('player')} disabled={pathDisplayMode === 'player'}>
              Player
            </button>
            <button onClick={() => setPathDisplayMode('optimal')} disabled={pathDisplayMode === 'optimal'}>
              Optimal
            </button>
            <button
              onClick={() => setPathDisplayMode('suggested')}
              disabled={pathDisplayMode === 'suggested' || suggestedPathFromCurrentLength === null}
              title={suggestedPathFromCurrentLength === null ? "No suggested path available" : "Show suggested path"}
            >
              Suggested
            </button>
            <button onClick={() => setPathDisplayMode('player_optimal')} disabled={pathDisplayMode === 'player_optimal'}>
              Player / Optimal
            </button>
            {/* Add Player/Suggested Button */}
            <button
              onClick={() => setPathDisplayMode('player_suggested')}
              disabled={pathDisplayMode === 'player_suggested' || suggestedPathFromCurrentLength === null}
              title={suggestedPathFromCurrentLength === null ? "No suggested path available" : "Show Player vs Suggested paths"}
            >
              Player / Suggested
            </button>
             {/* Add Optimal/Suggested Button */}
            <button
              onClick={() => setPathDisplayMode('optimal_suggested')}
              disabled={pathDisplayMode === 'optimal_suggested' || suggestedPathFromCurrentLength === null}
              title={suggestedPathFromCurrentLength === null ? "No suggested path available" : "Show Optimal vs Suggested paths"}
            >
              Optimal / Suggested
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

  return (
    <div className="game-report">
      <h4>Game Analysis</h4>
      <ul>
        <li>Moves: {formatPairedValue(report.playerMoves, report.optimalMoves)}</li>
        <li>Accuracy: {report.accuracy?.toFixed(1) ?? 'N/A'}% ({report.optimalMovesMade} / {report.playerMoves} optimal steps)</li>
        <li>Semantic Distance: {formatPairedValue(report.playerDistance, report.optimalDistance, 2)}</li>
        <li>Avg. Similarity / Move: {report.averageSimilarity?.toFixed(3) ?? 'N/A'}</li>
        <li>"Greedy" Moves (Most Similar): {report.greedyMoves} / {report.playerMoves}</li>
        <li title="Moves where the chosen word appeared further from the target (based on graph layout), but enabled a potentially closer move next.">
          Repositioning Moves: {report.repositioningMoves} / {report.playerMoves}
        </li>
      </ul>
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
