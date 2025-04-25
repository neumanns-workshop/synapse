import React from 'react';
import '../App.css'; // Import CSS for styling

// Helper function moved here from App.jsx
function getButtonStyle(rank, totalOptions) {
  // Normalize rank (0 is highest rank/most similar)
  // Avoid division by zero if totalOptions is 1 (shouldn't happen with K>1)
  const normalizedRank = totalOptions > 1 ? rank / (totalOptions - 1) : 0;

  // Use HSL color: Vary Lightness. Lower rank (more similar) = lower lightness (darker)
  const hue = 200; // Blueish
  const saturation = 50; // Moderate saturation
  const darkestLightness = 50; // Darkest end for rank 0
  const lightestLightness = 70; // Lightest end for last rank
  // Interpolate lightness based on normalized rank (0 -> darkest, 1 -> lightest)
  const lightness = darkestLightness + (normalizedRank * (lightestLightness - darkestLightness));

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

function NeighborSelection({ 
  neighborOptions = [], 
  definitionsData = {}, 
  onSelectWord, 
  onGiveUp, 
  actions = null // Added actions prop
}) {
  // Don't render if no options (e.g., not in PLAYING state)
  // This check might be redundant if the parent component already handles this,
  // but it adds safety.
  if (neighborOptions.length === 0) {
    return null;
  }

  return (
    <div className="options-container">
      <div className="options-buttons">
        {neighborOptions.map(([neighborWord], index) => {
          // Get definitions for the neighbor word
          const definitionsList = definitionsData[neighborWord] || []; // Default to empty list
          // Format definitions for tooltip
          const tooltipText = definitionsList.length > 0
            ? definitionsList.map((def, i) => `${i + 1}. ${def}`).join('\n')
            : 'No definition found'; // Fallback message
          const tooltipHtml = tooltipText.replace(/\n/g, '<br />'); // Use HTML version

          return (
            // Revert: Put attributes back on button, remove container/span
            <button
              key={neighborWord}
              onClick={() => onSelectWord(neighborWord)}
              style={getButtonStyle(index, neighborOptions.length)}
              className="option-button"
              // Add tooltip attributes back to button
              data-tooltip-id="path-word-tooltip" 
              data-tooltip-html={tooltipHtml}
              data-tooltip-delay-show={300} 
              data-tooltip-delay-hide={100}
            >
              {neighborWord}
            </button>
            /* Remove info span container */
            /*
            <div key={neighborWord} className="neighbor-button-container">
              <button ... >
                {neighborWord}
              </button>
              <span ... >
                (?)
              </span>
            </div>
            */
          );
        })}
      </div>
      {/* New container for bottom row buttons */}
      <div className="action-buttons-row">
        <button onClick={onGiveUp} className="give-up-button">
        Give Up
      </button>
        {/* Render any passed-in action buttons */}
        {actions}
      </div>
    </div>
  );
}

export default NeighborSelection; 