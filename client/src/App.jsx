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
  const lightestLightness = 85; // Lightest end for last rank
  // Interpolate lightness based on normalized rank (0 -> darkest, 1 -> lightest)
  const lightness = darkestLightness + (normalizedRank * (lightestLightness - darkestLightness));

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

// Main Game Component
function Game() {
  // Get state/actions from GameContext (no selectedK/changeK)
  const {
    status, startWord, endWord, currentWord, playerPath, 
    optimalPath, optimalPathLength, 
    suggestedPathFromCurrent, suggestedPathFromCurrentLength, 
    error: gameError, // Game specific error
    isLoading: isGameLoading, // Use loading state from context
    graphError, // Use graph error from context
    startGame: startGameAction, 
    selectWord: selectWordAction, 
    giveUp: giveUpAction
  } = useGame();

  // Get graph data from GraphDataContext (still needed for neighbors)
  const { graphData, isLoading: isGraphLoading } = useGraphData(); 

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
          <h3>How to Play Synapse</h3>
          <p>
            <strong>Goal:</strong> Navigate from the <span className="start-word-text">Start</span> word 
            to the <span className="end-word-text">End</span> word using the fewest moves.
          </p>
          <p>
            <strong>Gameplay:</strong> Click on one of the available neighbor words 
            (arranged in the 2x3 grid). These are the words most semantically similar 
            to your <span className="current-word-text">Current</span> word.
          </p>
          <p>
             <strong>Similarity Hint:</strong> The background color of the neighbor buttons indicates 
             similarity; darker blue means a stronger semantic connection (higher similarity score). 
             Use this hint to choose words that might lead you closer to the target.
          </p>
          <p>
            <strong>Tracking Progress:</strong> Below the graph, you can see your current move count 
            compared to the optimal number of moves required (<span className="optimal-move-count">Optimal</span>). 
            Your path taken so far is also displayed.
          </p>
          <p>
            <strong>Graph Visualization:</strong> The graph shows the positions of relevant words 
            (based on t-SNE embeddings). Your path is traced with lines. Click nodes on the graph 
            to highlight the corresponding word in the path text.
          </p>
          <p>
            <strong>Giving Up:</strong> If you get stuck, press "Give Up". You'll see the 
            <span className="optimal-path-text">Optimal Path</span> from the start word, 
            and potentially a <span className="suggested-path-text">Suggested Path</span> from your current location. 
            Use the toggle buttons to switch between viewing paths on the graph.
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

      {/* Status Info (Moves & Path) - MOVED HERE, BELOW GRAPH */}
      {(status === GameStatus.PLAYING || status === GameStatus.GAVE_UP) && graphData && (
        // Remove status-block-active class if not needed
        <div className="graph-status-info">
          {/* REMOVED Start/End/Current <p> tags AGAIN */}
          
          {/* Keep Moves */}
          { status === GameStatus.PLAYING && 
            <p className="moves-info">
              {`Moves: `}
              <span className="player-move-count">{playerPath.length - 1}</span>
              {` (Optimal: `} {/* Use template literal */} 
              <span className="optimal-move-count">{optimalPathLength ?? 'N/A'}</span>
              {`)`}
            </p> 
          }
          {/* Keep modified player path rendering */}
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

              return (
                <React.Fragment key={word + index}> 
                  {(index > 0) && <span className="path-arrow">{' -> '}</span>} 
                  <span className={wordClass.trim()}> {/* Use trim to avoid leading space */} 
                    {word}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Options & Give Up Button (Now below status info) */}
      {status === GameStatus.PLAYING && graphData && (
        <div className="options-container">
          <div className="options-buttons">
            {neighborOptions.map(([neighborWord], index) => {
              const buttonStyle = getButtonStyle(index, neighborOptions.length);
              return (
                 <button
                   key={neighborWord}
                   // Use handleSelectWord wrapper
                   onClick={() => handleSelectWord(neighborWord)}
                   className="neighbor-button"
                   style={buttonStyle}
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
      {status === GameStatus.WON && (
        <div className="won-section">
          <h2>You Won!</h2>
          <p><strong>Player Path:</strong> {playerPath.join(' -> ')}</p>
          <p>Moves: {playerPath.length - 1} (Optimal: {optimalPathLength ?? 'N/A'})</p>
        </div>
      )}

      {/* Gave Up State Display */}
      {status === GameStatus.GAVE_UP && optimalPath && (
        <div className="gave-up-section">
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

          {/* Path Display Toggle Buttons */}
          <div className="path-toggle-container">
            Show:
            <button onClick={() => setPathDisplayMode('player')} disabled={pathDisplayMode === 'player'}>
              Player Path
            </button>
            <button onClick={() => setPathDisplayMode('optimal')} disabled={pathDisplayMode === 'optimal'}>
              Optimal Path
            </button>
            {/* Add Suggested Path button, disable if no suggested path exists */}
            <button 
              onClick={() => setPathDisplayMode('suggested')} 
              disabled={pathDisplayMode === 'suggested' || suggestedPathFromCurrentLength === null}
              title={suggestedPathFromCurrentLength === null ? "No suggested path available from your current location" : "Show suggested path from current location"}
            >
              Suggested Path
            </button>
            <button onClick={() => setPathDisplayMode('both')} disabled={pathDisplayMode === 'both'}>
              Both (Player/Optimal)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

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
