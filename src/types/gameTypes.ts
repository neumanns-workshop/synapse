// Common types used throughout the app

export type Theme = "light" | "dark" | "system";

export interface WordDefinition {
  word: string;
  definition: string;
  examples?: string[];
}

export interface GraphData {
  [word: string]: {
    edges: {
      [neighborWord: string]: number; // Similarity score
    };
    tsne?: [number, number]; // 2D coordinates for visualization
  };
}

export type DefinitionsData = {
  [word: string]: string;
};

export interface GameScore {
  startWord: string;
  targetWord: string;
  pathLength: number;
  timeInSeconds: number;
  date: number; // Timestamp
  isOptimal: boolean;
}

export interface GameState {
  currentWord: string | null;
  targetWord: string | null;
  path: string[];
  availableWords: string[];
  isWon: boolean;
  startTime: number | null;
  endTime: number | null;
}

export interface UserSettings {
  theme: Theme;
  soundEnabled: boolean;
  hapticFeedbackEnabled: boolean;
}
