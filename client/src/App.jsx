import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { GraphDataProvider, useGraphData } from './context/GraphDataContext';
// Import GameProvider and useGame hook
import { GameProvider, useGame, GameStatus } from './context/GameContext';
// Import Tooltip and its CSS
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
// Removed unused import
// import { findShortestPath } from './utils/graphUtils'; 
// Import the new component
import GraphVisualization from './components/GraphVisualization';
import InfoBox from './components/InfoBox'; // Import the new InfoBox component
import GameReportDisplay from './components/GameReportDisplay'; // Import GameReportDisplay
import NeighborSelection from './components/NeighborSelection'; // Import NeighborSelection

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

  // Lifted state for InfoBox modal
  const [showInfo, setShowInfo] = useState(false);

  // Combine game error and graph error for display
  const displayError = gameError || graphError;

  // Replace string state with object for multiselect
  const [pathDisplay, setPathDisplay] = useState({
    player: true,
    optimal: false,
    suggested: false
  });

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
    setPathDisplay({ player: true, optimal: false, suggested: false });
  };
  
  const handleSelectWord = (word) => {
    selectWordAction(word, graphData.nodes);
  };
  
  const handleGiveUp = () => {
    giveUpAction(graphData.nodes);
    setPathDisplay({ player: true, optimal: false, suggested: false });
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

  // Define the About button element here
  const aboutButton = (
    <button onClick={() => setShowInfo(prev => !prev)} className="info-button help-button">
      About
    </button>
  );

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
    <>
    <div className="game-container">

        {/* Container for Start Button & About Button (when idle/finished) */}
      {(status === GameStatus.IDLE || status === GameStatus.WON || status === GameStatus.GAVE_UP || status === GameStatus.ERROR) && (
          <div className="start-controls-container">
        <button onClick={handleStartGame} disabled={isGameLoading}>
              {isGameLoading ? 'Loading...' : 'New Game'}
        </button>
            {aboutButton} {/* Render About button here */}
          </div>
      )}

      {/* Graph loading/error messages */}
        {isGraphLoading && <p>Loading graph data...</p>}
      {displayError && <p className="error-message">Error: {displayError}</p>}

      {/* Visualization Container (Graph Only) */}
      {(status === GameStatus.PLAYING || status === GameStatus.GAVE_UP || status === GameStatus.WON) && graphData && (
        <div className="graph-container">
          <GraphVisualization pathDisplayMode={pathDisplay} onNodeClick={handleNodeClick} /> 
         </div>
      )}

        {/* Status Info (Path) */}
      {(status === GameStatus.PLAYING || status === GameStatus.GAVE_UP || status === GameStatus.WON) && graphData && (
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
              
              if (word === highlightedWord) {
                  wordClass += ' highlighted-path-word';
              }
              
                // --- Determine Optimality and Modify Tooltip --- 
                let isOnOriginalOptimalPath = false;
                let optimalityTooltip = '';

                if (index > 0) { // Only check for moves after the first word
                  const prevPosition = playerPath[index - 1];
                  let moveData = null;

                  // Check based on game status (report available vs. live game)
                  if (gameReport?.optimalChoiceHistory) {
                    moveData = gameReport.optimalChoiceHistory.find(
                  choice => choice.playerPosition === prevPosition && choice.playerChose === word
                );
                  } else if (status === GameStatus.PLAYING && optimalChoices) {
                    moveData = optimalChoices.find(
                  choice => choice.playerPosition === prevPosition && choice.playerChose === word
                );
                  }
                
                  // If optimal move data exists
                if (moveData && moveData.playerChose === moveData.optimalChoice) {
                    // Check if it was on the original path
                    isOnOriginalOptimalPath = optimalPath.includes(word) &&
                                                  optimalPath.includes(prevPosition) &&
                                                  optimalPath.indexOf(word) === optimalPath.indexOf(prevPosition) + 1;
                  
                    // Assign class and tooltip text
                    wordClass += ' optimal-choice-word';
                    if (isOnOriginalOptimalPath) {
                      wordClass += ' global-optimal-choice';
                      optimalityTooltip = "\n\n(Orange: Optimal move on the original shortest path)";
                    } else {
                      wordClass += ' local-optimal-choice';
                      optimalityTooltip = "\n\n(Purple: Optimal move from the previous word)";
                }
              }
                }
                // --- End Optimality Check --- 

              // Fetch and format definitions for the tooltip
              const definitionsList = definitionsData && definitionsData[word] ? definitionsData[word] : [];
                let tooltipText = definitionsList.length > 0
                ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
                  : 'No definition found';
                
                // Append the optimality explanation if applicable
                tooltipText += optimalityTooltip;

              // Prepare tooltip content for HTML rendering
              const tooltipHtml = tooltipText.replace(/\n/g, '<br />');

              return (
                <React.Fragment key={word + index}> 
                  {(index > 0) && <span className="path-arrow">{' → '}</span>} 
                  <span 
                    className={wordClass.trim()} 
                    // Remove title attribute
                    // title={tooltipText} 
                    // Add react-tooltip attributes
                    data-tooltip-id="path-word-tooltip"
                    data-tooltip-html={tooltipHtml}
                    data-tooltip-delay-show={300} // Optional: slight delay
                    data-tooltip-delay-hide={100}
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

        {/* Render NeighborSelection with actions when Playing */}
      {status === GameStatus.PLAYING && (
          <NeighborSelection 
            neighborOptions={neighborOptions}
            definitionsData={definitionsData}
            onSelectWord={handleSelectWord}
            onGiveUp={handleGiveUp}
            actions={aboutButton} /* Pass About button as action */
          />
      )}

      {/* Won State Display */}
      {status === GameStatus.WON && gameReport && (
        <div className="won-section game-report-section">
          <h3>You Won!</h3>
          
          <p>Optimal Path ({optimalPathLength ?? 'N/A'} moves):</p>
          <p className="optimal-path">{optimalPath.join(' -> ')}</p>

          <div style={{ marginTop: '10px' }}>
             <p>Currently Suggested Path:</p>
             <p className="suggested-path-text" style={{ fontStyle: 'italic' }}>N/A (Game Won)</p>
          </div>
          
          <GameReportDisplay report={gameReport} />

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
              disabled={true}
              className={pathDisplay.suggested ? 'path-button-active' : ''}
              title="Suggested path is not applicable after winning"
            >
              Currently Suggested
            </button>
          </div>
        </div>
      )}

      {/* Gave Up State Display */}
      {status === GameStatus.GAVE_UP && optimalPath && gameReport && (
        <div className="gave-up-section game-report-section">
          <h3>You Gave Up!</h3>
          
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
      {/* Render the InfoBox Modal Content conditionally OUTSIDE game-container for positioning */}
      <InfoBox showInfo={showInfo} handleClose={() => setShowInfo(false)} />
    </>
  );
}

// Top-level App component to wrap providers and Game
function App() {
  return (
    <GraphDataProvider>
      <GameProvider>
        <div className="app-wrapper"> {/* Added wrapper div */}
          <h1>Synapse</h1> {/* Re-added title */}
          <h2 className="subtitle">Semantic Pathways</h2> {/* Re-added subtitle */}
          <main className="app-content"> {/* Added main content area */}
          <Game />
          </main>
          <footer className="app-footer"> {/* Added footer */}
            Copyright © 2025 Jared Neumann. Licensed under the <a href="https://github.com/neumanns-workshop/synapse/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">GPLv3</a>. | v1.0.0 Alpha
          </footer>
        </div>
        {/* Add Tooltip component instance with clickable prop */}
        <Tooltip id="path-word-tooltip" clickable={true} />
      </GameProvider>
    </GraphDataProvider>
  );
}

export default App;
