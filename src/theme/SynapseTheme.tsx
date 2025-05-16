import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Define custom colors
const synapseColors = {
  // Brand colors - chalk pastel, colorblind-friendly
  primary: '#ffffff', // White
  secondary: '#A8E6CF', // Pastel Green (Start Node)
  tertiary: '#FFD3B6', // Pastel Orange (Greedy/Strategic)

  // Path colors - chalk pastel palette
  startNodeColor: '#A8E6CF', // Pastel Green
  endNodeColor: '#FF8B94', // Pastel Coral
  currentNodeColor: '#A0CED9', // Pastel Blue
  pathNodeColor: '#D6D6D6', // Pastel Gray
  globalOptimalNodeColor: '#FFF6A3', // Pastel Yellow
  localOptimalNodeColor: '#CBAACB', // Pastel Purple
  greedyMoveColor: '#FFD3B6', // Pastel Orange
  strategicRepositioningMoveColor: '#FFD3B6', // Pastel Orange (alt)
  
  // Stats modal colors
  warningColor: '#FF8B94', // Same as endNodeColor for consistency
  achievementChipColor: '#FFF6A3', // Same as globalOptimalNodeColor
  achievementIconColor: '#FFF6A3', // Same as globalOptimalNodeColor
  progressBadgeColor: '#A8E6CF', // Same as startNodeColor
  collectedWordChipColor: '#A0CED9', // Same as currentNodeColor
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
    background: '#f5f5f5',
    surface: '#ffffff',
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
    // New colors for stats modal
    warningColor: synapseColors.warningColor,
    achievementChip: synapseColors.achievementChipColor,
    achievementIcon: synapseColors.achievementIconColor,
    progressBadge: synapseColors.progressBadgeColor,
    collectedWordChip: synapseColors.collectedWordChipColor,
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
    background: '#121212',
    surface: '#1e1e1e',
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
    // New colors for stats modal
    warningColor: synapseColors.warningColor,
    achievementChip: synapseColors.achievementChipColor,
    achievementIcon: synapseColors.achievementIconColor,
    progressBadge: synapseColors.progressBadgeColor,
    collectedWordChip: synapseColors.collectedWordChipColor,
  },
};

// Default theme is light
export default SynapseLightTheme; 