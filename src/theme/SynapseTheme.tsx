import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

// Define custom colors
const synapseColors = {
  // Brand colors - chalk pastel, colorblind-friendly
  primary: "#ffffff", // White
  secondary: "#A8E6CF", // Pastel Green (Start Node)
  tertiary: "#FFD3B6", // Pastel Orange (Greedy/Strategic)

  // Path colors - chalk pastel palette
  startNodeColor: "#90EEBB", // Pastel Green (Adjusted)
  endNodeColor: "#FF8787", // Pastel Coral (Adjusted)
  currentNodeColor: "#87CEEB", // Pastel Blue
  pathNodeColor: "#EAEAEA", // Very Light Gray (Adjusted for player path)
  globalOptimalNodeColor: "#FFEE77", // Pastel Yellow
  localOptimalNodeColor: "#B19CD9", // Pastel Purple
  greedyMoveColor: "#FFD3B6", // Pastel Orange
  strategicRepositioningMoveColor: "#FFD3B6", // Pastel Orange (alt)

  // Stats modal colors
  warningColor: "#FF8B94", // Same as endNodeColor for consistency
  achievementChipColor: "#FFF6A3", // Same as globalOptimalNodeColor (before update)
  achievementIconColor: "#FFF6A3", // Same as globalOptimalNodeColor (before update)
  progressBadgeColor: "#A8E6CF", // Same as startNodeColor
  collectedWordChipColor: "#A0CED9", // Same as currentNodeColor (before update)
};

// Define the extended theme structure
export interface ExtendedTheme extends MD3Theme {
  customColors: {
    startNode: string;
    endNode: string;
    currentNode: string;
    pathNode: string;
    globalOptimalNode: string;
    localOptimalNode: string;
    greedyMove: string;
    strategicRepositioningMove: string;
    // New colors for stats modal
    warningColor: string;
    achievementChip: string;
    achievementIcon: string;
    progressBadge: string;
    collectedWordChip: string;
  };
}

// Base light theme
export const SynapseLightTheme: ExtendedTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: synapseColors.primary,
    secondary: synapseColors.secondary,
    tertiary: synapseColors.tertiary,
    background: "#f5f5f5",
    surface: "#ffffff",
  },
  // Custom colors in a separate property
  customColors: {
    startNode: synapseColors.startNodeColor,
    endNode: synapseColors.endNodeColor,
    currentNode: synapseColors.currentNodeColor,
    pathNode: synapseColors.pathNodeColor,
    globalOptimalNode: synapseColors.globalOptimalNodeColor,
    localOptimalNode: synapseColors.localOptimalNodeColor,
    greedyMove: synapseColors.greedyMoveColor,
    strategicRepositioningMove: synapseColors.strategicRepositioningMoveColor,
    // For stats modal, let's update these to use the new, more saturated colors as well
    warningColor: synapseColors.warningColor, // Stays the same (Pastel Coral)
    achievementChip: synapseColors.globalOptimalNodeColor, // Updated Pastel Yellow
    achievementIcon: synapseColors.globalOptimalNodeColor, // Updated Pastel Yellow
    progressBadge: synapseColors.startNodeColor, // Stays the same (Pastel Green)
    collectedWordChip: synapseColors.currentNodeColor, // Updated Pastel Blue
  },
};

// Base dark theme (for potential future use)
export const SynapseDarkTheme: ExtendedTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: synapseColors.primary,
    secondary: synapseColors.secondary,
    tertiary: synapseColors.tertiary,
    background: "#121212",
    surface: "#1e1e1e",
  },
  // Custom colors in a separate property
  customColors: {
    startNode: synapseColors.startNodeColor,
    endNode: synapseColors.endNodeColor,
    currentNode: synapseColors.currentNodeColor,
    pathNode: synapseColors.pathNodeColor,
    globalOptimalNode: synapseColors.globalOptimalNodeColor,
    localOptimalNode: synapseColors.localOptimalNodeColor,
    greedyMove: synapseColors.greedyMoveColor,
    strategicRepositioningMove: synapseColors.strategicRepositioningMoveColor,
    // For stats modal, let's update these to use the new, more saturated colors as well
    warningColor: synapseColors.warningColor, // Stays the same (Pastel Coral)
    achievementChip: synapseColors.globalOptimalNodeColor, // Updated Pastel Yellow
    achievementIcon: synapseColors.globalOptimalNodeColor, // Updated Pastel Yellow
    progressBadge: synapseColors.startNodeColor, // Stays the same (Pastel Green)
    collectedWordChip: synapseColors.currentNodeColor, // Updated Pastel Blue
  },
};

// Default theme is light
export default SynapseLightTheme;
