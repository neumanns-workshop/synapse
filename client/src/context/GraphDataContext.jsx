import React, { createContext, useState, useEffect, useContext } from 'react';
// REMOVED: import { useGame } from './GameContext'; 

// Create the context
const GraphDataContext = createContext(null);

// Remove selectedKProp
export const GraphDataProvider = ({ children }) => {
  // Remove selectedK usage

  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      // Remove check for selectedK

      setIsLoading(true);
      setError(null);
      setGraphData(null);
      // Hardcode path to default data
      const dataPath = `/data/graph.json`; 
      console.log(`Fetching graph data from: ${dataPath}`);

      try {
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for path ${dataPath}`);
        }
        const data = await response.json();
        setGraphData(data);
      } catch (e) {
        console.error("Error fetching graph data:", e);
        setError(`Failed to load graph data. Please try refreshing.`); // Simplified error
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphData();

    return () => {};
  // Run only once on mount
  }, []); 

  // Value provided to consuming components
  const value = {
    graphData,
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