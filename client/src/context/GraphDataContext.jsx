import React, { createContext, useState, useEffect, useContext } from 'react';
// REMOVED: import { useGame } from './GameContext'; 

// Create the context
const GraphDataContext = createContext(null);

// Remove selectedKProp
export const GraphDataProvider = ({ children }) => {
  // Remove selectedK usage

  const [graphData, setGraphData] = useState(null);
  const [definitionsData, setDefinitionsData] = useState(null); // Add state for definitions
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameData = async () => { // Rename function for clarity
      setIsLoading(true);
      setError(null);
      setGraphData(null);
      setDefinitionsData(null);

      // Define paths
      const graphDataPath = `/data/graph.json`;
      const definitionsDataPath = `/data/definitions.json`;
      console.log(`Fetching graph data from: ${graphDataPath}`);
      console.log(`Fetching definitions data from: ${definitionsDataPath}`);

      try {
        // Fetch both files in parallel
        const [graphResponse, definitionsResponse] = await Promise.all([
          fetch(graphDataPath),
          fetch(definitionsDataPath)
        ]);

        // Check both responses
        if (!graphResponse.ok) {
          throw new Error(`HTTP error! status: ${graphResponse.status} for path ${graphDataPath}`);
        }
        if (!definitionsResponse.ok) {
          throw new Error(`HTTP error! status: ${definitionsResponse.status} for path ${definitionsDataPath}`);
        }

        // Parse JSON from both responses
        const [graphJson, definitionsJson] = await Promise.all([
          graphResponse.json(),
          definitionsResponse.json()
        ]);

        // Set state for both
        setGraphData(graphJson);
        setDefinitionsData(definitionsJson);

      } catch (e) {
        console.error("Error fetching game data:", e);
        setError(`Failed to load game data. Please try refreshing.`); // Updated error message
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData(); // Call the renamed function

    return () => {};
  // Run only once on mount
  }, []);

  // Value provided to consuming components
  const value = {
    graphData,
    definitionsData, // Expose definitions data
    isLoading,
    error,
  };

  return (
    <GraphDataContext.Provider value={value}>
      {children}
    </GraphDataContext.Provider>
  );
};

// Custom hook to use the graph data context
export const useGraphData = () => {
  const context = useContext(GraphDataContext);
  if (context === undefined || context === null) {
    // Added null check for robustness
    throw new Error('useGraphData must be used within a GraphDataProvider');
  }
  return context;
}; 