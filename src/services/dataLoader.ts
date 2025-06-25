// src/services/dataLoader.ts

// Define interfaces for the data structures
export interface GraphData {
  [word: string]: {
    edges: {
      [neighborWord: string]: number; // Similarity score
    };
    tsne?: number[]; // 2D coordinates for visualization
  };
}

export interface DefinitionsData {
  [word: string]: string[];
}

export interface WordFrequencies {
  [word: string]: number;
}

// Data caching for performance
let graphDataCache: GraphData | null = null;
let wordFrequenciesCache: WordFrequencies | null = null;
let definitionsCache: DefinitionsData | null = null;

export const loadGraphData = async (): Promise<GraphData> => {
  try {
    // Return cached data if available
    if (graphDataCache) {
      return graphDataCache;
    }

    // Dynamic import for better bundle splitting
    const graphDataModule = await import("../data/graph.json");
    const graphDataJson = graphDataModule.default || graphDataModule;

    // Check if the data is in the expected format
    if (typeof graphDataJson === "object" && graphDataJson !== null) {
      const keys = Object.keys(graphDataJson);

      // Check for the nested "nodes" structure
      if (
        keys.length === 1 &&
        keys[0] === "nodes" &&
        typeof (graphDataJson as { nodes?: unknown }).nodes === "object" &&
        (graphDataJson as { nodes?: unknown }).nodes !== null
      ) {
        graphDataCache = (graphDataJson as any).nodes as GraphData;
        return graphDataCache;
      } else if (keys.length > 1) {
        graphDataCache = graphDataJson as any as GraphData;
        return graphDataCache;
      } else {
        throw new Error("Invalid graph data structure.");
      }
    } else {
      throw new Error("Failed to load graph data: Invalid format.");
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Failed to load graph data.");
  }
};

export const loadDefinitions = async (): Promise<DefinitionsData> => {
  try {
    // Return cached data if available
    if (definitionsCache) {
      return definitionsCache;
    }

    // Dynamic import for better bundle splitting
    const definitionsModule = await import("../data/definitions.json");
    const definitions = definitionsModule.default || definitionsModule;

    if (typeof definitions === "object" && definitions !== null) {
      definitionsCache = definitions as DefinitionsData;
      return definitionsCache;
    } else {
      throw new Error("Failed to load definitions: Invalid format.");
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Failed to load definitions.");
  }
};

export const loadWordFrequencies = async (): Promise<WordFrequencies> => {
  try {
    // Return cached data if available
    if (wordFrequenciesCache) {
      return wordFrequenciesCache;
    }

    // Dynamic import for better bundle splitting
    const wordFrequenciesModule = await import(
      "../data/filtered_word_frequencies.json"
    );
    const wordFrequencies =
      wordFrequenciesModule.default || wordFrequenciesModule;

    if (typeof wordFrequencies === "object" && wordFrequencies !== null) {
      wordFrequenciesCache = wordFrequencies as WordFrequencies;
      return wordFrequenciesCache;
    } else {
      throw new Error("Failed to load word frequencies: Invalid format.");
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Failed to load word frequencies.");
  }
};

// Helper function to preload all data (for better UX)
export const preloadAllData = async (): Promise<void> => {
  try {
    await Promise.all([
      loadGraphData(),
      loadWordFrequencies(),
      loadDefinitions(),
    ]);
  } catch (error) {
    console.warn("Failed to preload some data:", error);
  }
};

// Clear cache if needed (useful for testing or memory management)
export const clearDataCache = (): void => {
  graphDataCache = null;
  wordFrequenciesCache = null;
  definitionsCache = null;
};

// Legacy function name for backwards compatibility
export const loadDefinitionsData = loadDefinitions;
