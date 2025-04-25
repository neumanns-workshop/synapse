import React from 'react';
import '../App.css'; // Import CSS for styling

// --- New Component for Displaying Game Report --- 

// Helper to format paired values (kept within this component's scope)
const formatPairedValue = (playerVal, optimalVal, precision = 0) => {
  const playerStr = typeof playerVal === 'number' ? playerVal.toFixed(precision) : 'N/A';
  const optimalStr = typeof optimalVal === 'number' ? optimalVal.toFixed(precision) : 'N/A';
  return `${playerStr} (Optimal: ${optimalStr})`;
};

function GameReportDisplay({ report }) {
  if (!report) return null;

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

      {/* Show optimal choices if any exist - REMOVED HEADER */}
      {optimalMovesMade.length > 0 && (
        <div className="optimal-moves-made">
          {/* <h5>Optimal Moves Made:</h5> */}
          <ul>
            {optimalMovesMade.map((move, idx) => {
              // Check if this move was part of the original optimal path
              const isOnOriginalOptimalPath = report.optimalPath && report.optimalPath.includes(move.playerChose) &&
                                          report.optimalPath.includes(move.playerPosition) &&
                                          report.optimalPath.indexOf(move.playerChose) === report.optimalPath.indexOf(move.playerPosition) + 1;

              // Determine which class to use for the chosen word AND the star
              const choiceClass = isOnOriginalOptimalPath ? "optimal-choice-word global-optimal-choice" : "optimal-choice-word local-optimal-choice";

              return (
                <li key={idx}>
                  At <span className="player-position">{move.playerPosition}</span> you chose <span className={choiceClass}>{move.playerChose}</span> <span className={choiceClass}>★</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Show missed optimal choices if any exist - REMOVED HEADER */}
      {missedOptimalMoves.length > 0 && (
        <div className="missed-optimal-moves">
          {/* <h5>Missed Optimal Moves:</h5> */}
          <ul>
            {missedOptimalMoves.map((move, idx) => {
              // Determine if the missed optimal choice was globally or locally optimal
              const wasGlobalOptimal = report.optimalPath && 
                                       move.optimalChoice && // Ensure optimalChoice exists
                                       report.optimalPath.includes(move.optimalChoice) &&
                                       report.optimalPath.includes(move.playerPosition) &&
                                       report.optimalPath.indexOf(move.optimalChoice) === report.optimalPath.indexOf(move.playerPosition) + 1;
              
              // Assign class based on whether it was globally optimal
              const optimalChoiceClass = wasGlobalOptimal 
                ? "optimal-choice-word global-optimal-choice" 
                : "optimal-choice-word local-optimal-choice";

              return (
                <li key={idx}>
                  At <span className="player-position">{move.playerPosition}</span> you chose <span className="player-choice">{move.playerChose}</span>, optimal was <span className={optimalChoiceClass}>{move.optimalChoice}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
// --- End New Component ---

export default GameReportDisplay; 