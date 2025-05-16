// src/services/dataLoader.ts

// Define interfaces for the data structures
interface Edge {
  [neighbor: string]: number;
}

interface NodeData {
  edges: Edge;
  tsne: number[];  // Changed from [number, number] to number[] to match actual data
}

export interface GraphData {
  [word: string]: NodeData;
}

export interface DefinitionsData {
  [word: string]: string[];
}

// Import JSON files directly
import graphData from '../data/graph.json';
import definitionsData from '../data/definitions.json';

export const loadGraphData = async (): Promise<GraphData> => {
  try {
    console.log("loadGraphData: Loading graph data...");
    
    // Check if the data is in the expected format
    if (typeof graphData === 'object' && graphData !== null) {
      const keys = Object.keys(graphData);
      console.log(`loadGraphData: Found ${keys.length} top-level keys.`);

      // Check for the nested "nodes" structure
      if (keys.length === 1 && keys[0] === 'nodes' && typeof graphData.nodes === 'object' && graphData.nodes !== null) {
        console.log("loadGraphData: Detected nested 'nodes' structure.");
        return graphData.nodes as unknown as GraphData;
      } else if (keys.length > 1) {
        console.log("loadGraphData: Using top-level keys as words.");
        return graphData as unknown as GraphData;
      } else {
        throw new Error("Invalid graph data structure.");
      }
    } else {
      throw new Error("Failed to load graph data: Invalid format.");
    }
  } catch (error) {
    console.error("Error loading graph data:", error);
    throw error instanceof Error ? error : new Error("Failed to load graph data.");
  }
};

export const loadDefinitionsData = async (): Promise<DefinitionsData> => {
  try {
    console.log("loadDefinitionsData: Loading definitions data...");
    return definitionsData as DefinitionsData;
  } catch (error) {
    console.error("Error loading definitions data:", error);
    throw new Error("Failed to load definitions data.");
  }
}; 