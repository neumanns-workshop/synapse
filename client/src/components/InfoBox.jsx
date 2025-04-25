import React from 'react';
import '../App.css'; // Import main CSS for styling

// Changed to accept props: showInfo, handleClose
function InfoBox({ showInfo, handleClose }) {

  // If showInfo is false, render nothing
  if (!showInfo) {
    return null;
  }

  // If showInfo is true, render the modal
  return (
    <div className="modal-backdrop" onClick={handleClose}> {/* Backdrop closes on click */}
      <div className="info-box" onClick={(e) => e.stopPropagation()}> {/* Prevent click propagation */}
          <h3>Charting your Synaptic Course</h3>
          <p>
            <strong>Goal:</strong> Discover a semantic pathway from the <span className='start-word-text'>Start</span> word to the <span className='end-word-text'>End</span> word via related words in the fewest moves.
          </p>
          <p>
          <strong>How:</strong> Click a neighbor word to advance. Neighbors are ordered by semantic similarity (most similar at the top). Use <strong>Hover Definitions</strong> to understand word meanings and guide your choice towards the target.
          </p>
          <p>
          <strong>Track:</strong> Follow your path below the graph. Optimal moves are indicated by <span className='optimal-choice-word global-optimal-choice' style={{fontWeight: 'bold'}}>colored text</span> (orange for globally optimal moves, purple for locally optimal moves).
          </p>
          <p>
          <strong>Stuck?</strong> "Give Up" shows the <span className='optimal-path-text'>Optimal Path</span>, possibly a <span className='suggested-path-text'>Suggested Path</span> from your current position, and a detailed game analysis.
        </p>
        <hr />
        <h4>Acknowledgements</h4>
        <p className="acknowledgements">
          Word relationships derived from `nomic-embed-text:137m-v1.5-fp16` embeddings (via Ollama).
        </p>
        <p className="acknowledgements">
          Vocabulary based on a custom, lemmatized word list (~5000 words, subject to change).
        </p>
        <p className="acknowledgements">
          Definitions sourced from <a href="https://wordnet.princeton.edu/" target="_blank" rel="noopener noreferrer">WordNet</a>.
          </p>
        </div>
    </div>
  );
}

export default InfoBox; 