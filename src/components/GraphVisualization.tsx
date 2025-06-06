import React, { useMemo } from "react";
import { View, StyleSheet, Text as RNText } from "react-native";

import { useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper/lib/typescript/types";
import Svg, { Line, Text } from "react-native-svg";

import TouchableCircle from "./TouchableCircle";
import { useGameStore } from "../stores/useGameStore";
import type { GameReport } from "../utils/gameReportUtils";
import {
  startMeasure,
  endMeasure,
  PerformanceMarks,
  PerformanceMeasures,
  startFrameRateMonitoring,
} from "../utils/performanceMonitor";

interface CustomTheme extends MD3Theme {
  customColors: {
    startNode: string;
    endNode: string;
    currentNode: string;
    pathNode: string;
    globalOptimalNode: string;
    localOptimalNode: string;
  };
}

// Define node type for clarity
interface RenderNode {
  id: string;
  x: number;
  y: number;
  isStart: boolean;
  isEnd: boolean;
  isCurrent: boolean;
  isInPath: boolean;
  isOptimal: boolean; // Add flag
  isSuggested: boolean; // Add flag
  isAi: boolean; // AI solution path flag
  isPlayerGlobalOptimalChoice?: boolean; // Flag for player's globally optimal choice
  isPlayerLocalOptimalChoice?: boolean; // Flag for player's locally optimal choice
  isNextGlobalOptimal?: boolean;
  isNextSuggested?: boolean;
}

// Define link type
interface RenderLink {
  key: string;
  source: RenderNode;
  target: RenderNode;
  type: string;
}

// --- Constants ---
const NODE_RADIUS = 7;
const FOCUSED_NODE_RADIUS = 10;

// --- Style Constants using theme ---
// Default styling will be replaced by theme colors in the component
const DEFAULT_NODE_FILL = "#aaa";
const DEFAULT_NODE_STROKE = "#333";
const DEFAULT_NODE_STROKE_WIDTH = 0.5;
const PLAYER_PATH_LINK_STROKE_WIDTH = 3;
const PLAYER_PATH_LINK_STROKE_OPACITY = 0.8;
const BASE_LABEL_TEXT_FONT_SIZE = 12; // Base font size for scaling
const MIN_LABEL_TEXT_FONT_SIZE = 8; // Minimum font size
const MAX_LABEL_TEXT_FONT_SIZE = 16; // Maximum font size
const LABEL_TEXT_FONT_WEIGHT = "bold";

// Helper function to calculate dynamic font size based on available horizontal space to graph edges only
const calculateDynamicFontSize = (
  nodeId: string,
  nodeX: number,
  viewBoxX: number,
  viewBoxWidth: number,
  label: string,
): number => {
  const MARGIN = 12; // px, margin from each edge
  const MAX_FONT_SIZE = 24;
  const MIN_FONT_SIZE = 8;
  // Calculate left and right edges
  const leftEdge = viewBoxX + MARGIN;
  const rightEdge = viewBoxX + viewBoxWidth - MARGIN;
  // The max width the label can take without being cut off
  const maxLabelWidth = Math.min(nodeX - leftEdge, rightEdge - nodeX) * 2;
  // Estimate average character width (in px per font size unit)
  const AVG_CHAR_WIDTH = 0.6; // This is a good default for most sans-serif fonts
  // Calculate the max font size that fits
  let fontSize = maxLabelWidth / (label.length * AVG_CHAR_WIDTH);
  fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize));
  return fontSize;
};

// Helper function - NO truncation, just return the full text
const truncateText = (text: string, fontSize: number): string => {
  // Never truncate - always show the full word and let font sizing handle it
  return text;
};

// Update component definition to accept props with height
interface GraphVisualizationProps {
  height?: number;
  gameReport?: GameReport;
  pathDisplayModeOverride?: {
    player?: boolean;
    optimal?: boolean;
    suggested?: boolean;
    ai?: boolean;
  };
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  height,
  gameReport,
  pathDisplayModeOverride,
}) => {
  const { customColors, colors } = useTheme() as CustomTheme;

  // Color constants from theme
  const START_NODE_FILL = customColors.startNode;
  const END_NODE_FILL = customColors.endNode;
  const CURRENT_NODE_FILL = customColors.currentNode;
  const PATH_NODE_FILL = customColors.pathNode;
  const GLOBAL_OPTIMAL_NODE_FILL = customColors.globalOptimalNode;
  const LOCAL_OPTIMAL_NODE_FILL = customColors.localOptimalNode;
  const LABEL_TEXT_FILL = colors.onSurface;

  // Get data and state from Zustand store
  const storeGraphData = useGameStore((state) => state.graphData);
  const storeStartWord = useGameStore((state) => state.startWord);
  const storeEndWord = useGameStore((state) => state.targetWord);
  const storeCurrentWord = useGameStore((state) => state.currentWord);
  const storePlayerPath = useGameStore((state) => state.playerPath);
  const storeGameStatus = useGameStore((state) => state.gameStatus);
  const storeOptimalPath = useGameStore((state) => state.optimalPath);
  const storeSuggestedPath = useGameStore(
    (state) => state.suggestedPathFromCurrent,
  );
  const storeAiPath = useGameStore((state) => state.aiPath);
  const storePathDisplayMode = useGameStore((state) => state.pathDisplayMode);
  const storeSelectWord = useGameStore((state) => state.selectWord);
  const storeOptimalChoices = useGameStore((state) => state.optimalChoices); // Get optimal choices

  // Determine data sources based on whether gameReport is provided
  const graphData = storeGraphData; // graphData always comes from the store
  const startWord = gameReport ? gameReport.startWord : storeStartWord;
  const targetWord = gameReport ? gameReport.targetWord : storeEndWord;

  // For currentWord, if gameReport is provided, it's usually a completed game.
  // We can set currentWord to the last word of the player's path or the target word if won.
  // For a preview, we might not need a distinct 'current' word highlight unless it's the end word.
  // Let's simplify: if gameReport is present, currentWord is the targetWord (targetWord).
  // const currentWord = gameReport
  //   ? gameReport.playerPath[gameReport.playerPath.length -1] // last word in player path
  //   : storeCurrentWord;

  // New logic for currentWordForDisplay:
  // If gameReport exists: if status is 'won', use the last word of playerPath.
  // If status is 'given_up', set to null (no current word highlight).
  // Otherwise (no gameReport), use currentWord from the store.
  const currentWordForDisplay = gameReport
    ? gameReport.status === "won"
      ? gameReport.playerPath[gameReport.playerPath.length - 1]
      : null
    : storeCurrentWord;

  const playerPath = gameReport ? gameReport.playerPath : storePlayerPath;
  const gameStatus = gameReport ? gameReport.status : storeGameStatus; // 'won' or 'given_up' from report

  // Optimal and suggested paths for gameReport context.
  // For challenge preview, these are typically not shown, but we use the structure.
  const optimalPath = gameReport ? gameReport.optimalPath : storeOptimalPath;

  // Memoize suggestedPath initialization
  const suggestedPath = useMemo(() => {
    if (gameReport) {
      return gameReport.suggestedPath || [];
    }
    return storeSuggestedPath;
  }, [gameReport, storeSuggestedPath]);

  // Memoize aiPath initialization
  const aiPath = useMemo(() => {
    // AI path is only available from store (not in gameReport)
    return storeAiPath;
  }, [storeAiPath]);

  // Memoize pathDisplayMode initialization
  const pathDisplayMode = useMemo(() => {
    if (pathDisplayModeOverride) {
      return {
        player:
          pathDisplayModeOverride.player !== undefined
            ? pathDisplayModeOverride.player
            : storePathDisplayMode.player,
        optimal:
          pathDisplayModeOverride.optimal !== undefined
            ? pathDisplayModeOverride.optimal
            : storePathDisplayMode.optimal,
        suggested:
          pathDisplayModeOverride.suggested !== undefined
            ? pathDisplayModeOverride.suggested
            : storePathDisplayMode.suggested,
        ai:
          pathDisplayModeOverride.ai !== undefined
            ? pathDisplayModeOverride.ai
            : storePathDisplayMode.ai,
      };
    }
    return storePathDisplayMode;
  }, [pathDisplayModeOverride, storePathDisplayMode]);

  const selectWord = storeSelectWord; // selectWord action is always from the store

  // Optimal choices would typically come from the gameReport if available
  const optimalChoices = gameReport
    ? gameReport.optimalChoices
    : storeOptimalChoices;

  // Start frame rate monitoring when component mounts
  React.useEffect(() => {
    startFrameRateMonitoring();
  }, []);

  // Handle word selection with performance monitoring
  const onSelectWord = (word: string) => {
    startMeasure(PerformanceMarks.WORD_SELECTION);

    // Only allow selection if not using a gameReport (i.e., it's a live game)
    if (!gameReport && gameStatus === "playing") {
      selectWord(word);
    }

    endMeasure(
      PerformanceMarks.WORD_SELECTION,
      PerformanceMarks.WORD_SELECTION,
      PerformanceMeasures.WORD_SELECTION_TIME,
    );
  };

  // --- Memoized Data Preparation ---
  const {
    nodesToRender,
    linksToRender,
    viewBox,
    viewBoxX,
    viewBoxY,
    viewBoxWidth,
    viewBoxHeight,
  } = useMemo(() => {
    startMeasure(PerformanceMarks.GRAPH_RENDER);

    // graphData comes from store, startWord/targetWord can be from report or store
    if (
      !graphData ||
      !startWord ||
      !targetWord ||
      (gameStatus !== "won" &&
        gameStatus !== "given_up" &&
        (gameStatus === "idle" || gameStatus === "loading"))
    ) {
      return {
        nodesToRender: [],
        linksToRender: [],
        viewBox: "0 0 100 100",
        viewBoxX: 0,
        viewBoxY: 0,
        viewBoxWidth: 100,
        viewBoxHeight: 100,
      };
    }

    // Collect all relevant words
    const relevantWords = new Set<string>([startWord, targetWord]);
    if (currentWordForDisplay) {
      // Use currentWordForDisplay here
      relevantWords.add(currentWordForDisplay);
    }

    // Add words based on path display mode
    if (pathDisplayMode.player) {
      playerPath.forEach((word) => relevantWords.add(word));
    }
    if (pathDisplayMode.optimal && optimalPath) {
      // Ensure optimalPath exists
      optimalPath.forEach((word) => relevantWords.add(word));
    }
    if (pathDisplayMode.suggested && suggestedPath) {
      // Ensure suggestedPath exists
      suggestedPath.forEach((word) => relevantWords.add(word));
    }
    if (pathDisplayMode.ai && aiPath) {
      // Add AI path words
      aiPath.forEach((word) => relevantWords.add(word));
    }

    // Create node map with flags
    const nodeMap = new Map<string, RenderNode>();
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    relevantWords.forEach((word) => {
      const nodeData = graphData[word];
      if (nodeData?.tsne) {
        const [x, y] = nodeData.tsne;
        const node: RenderNode = {
          id: word,
          x,
          y,
          isStart: word === startWord,
          isEnd: word === targetWord,
          isCurrent: word === currentWordForDisplay, // Use currentWordForDisplay
          isInPath: playerPath.includes(word),
          isOptimal: optimalPath ? optimalPath.includes(word) : false, // Check if optimalPath exists
          isSuggested: suggestedPath ? suggestedPath.includes(word) : false, // Check if suggestedPath exists
          isAi: aiPath ? aiPath.includes(word) : false, // Check if word is in AI path
          // Initialize new flags
          isPlayerGlobalOptimalChoice: false,
          isPlayerLocalOptimalChoice: false,
          isNextGlobalOptimal: false,
          isNextSuggested: false,
        };
        nodeMap.set(word, node);
        // Update bounds
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });

    // Set flags for player's optimal choices
    optimalChoices.forEach((choice) => {
      const chosenNode = nodeMap.get(choice.playerChose);
      if (chosenNode) {
        if (choice.isGlobalOptimal) {
          chosenNode.isPlayerGlobalOptimalChoice = true;
        } else if (choice.isLocalOptimal) {
          // only set if not global
          chosenNode.isPlayerLocalOptimalChoice = true;
        }
      }
    });

    const finalNodesToRender = Array.from(nodeMap.values());

    // Create links between visible nodes
    const finalLinksToRender: RenderLink[] = [];

    // Add player path links
    if (pathDisplayMode.player && playerPath.length > 1) {
      for (let i = 0; i < playerPath.length - 1; i++) {
        const sourceNode = nodeMap.get(playerPath[i]);
        const targetNode = nodeMap.get(playerPath[i + 1]);
        if (sourceNode && targetNode) {
          finalLinksToRender.push({
            key: `player-${sourceNode.id}-${targetNode.id}-${i}`,
            source: sourceNode,
            target: targetNode,
            type: "player",
          });
        }
      }
    }

    // Add optimal path links
    if (pathDisplayMode.optimal && optimalPath && optimalPath.length > 1) {
      // Ensure optimalPath exists
      for (let i = 0; i < optimalPath.length - 1; i++) {
        const sourceNode = nodeMap.get(optimalPath[i]);
        const targetNode = nodeMap.get(optimalPath[i + 1]);
        if (sourceNode && targetNode) {
          finalLinksToRender.push({
            key: `optimal-${sourceNode.id}-${targetNode.id}-${i}`,
            source: sourceNode,
            target: targetNode,
            type: "optimal",
          });
        }
      }
    }

    // Add suggested path links
    if (
      pathDisplayMode.suggested &&
      suggestedPath &&
      suggestedPath.length > 1
    ) {
      // Ensure suggestedPath exists
      for (let i = 0; i < suggestedPath.length - 1; i++) {
        const sourceNode = nodeMap.get(suggestedPath[i]);
        const targetNode = nodeMap.get(suggestedPath[i + 1]);
        if (sourceNode && targetNode) {
          finalLinksToRender.push({
            key: `suggested-${sourceNode.id}-${targetNode.id}-${i}`,
            source: sourceNode,
            target: targetNode,
            type: "suggested",
          });
        }
      }
    }

    // Add AI path links
    if (pathDisplayMode.ai && aiPath && aiPath.length > 1) {
      for (let i = 0; i < aiPath.length - 1; i++) {
        const sourceNode = nodeMap.get(aiPath[i]);
        const targetNode = nodeMap.get(aiPath[i + 1]);
        if (sourceNode && targetNode) {
          finalLinksToRender.push({
            key: `ai-${sourceNode.id}-${targetNode.id}-${i}`,
            source: sourceNode,
            target: targetNode,
            type: "ai",
          });
        }
      }
    }

    // Calculate viewBox
    const padding = 30;
    const vbX = minX - padding;
    const vbY = minY - padding;
    const vbWidth = maxX - minX + 2 * padding;
    const vbHeight = maxY - minY + 2 * padding;

    const result = {
      nodesToRender: finalNodesToRender,
      linksToRender: finalLinksToRender,
      viewBox: `${vbX} ${vbY} ${vbWidth} ${vbHeight}`,
      viewBoxX: vbX,
      viewBoxY: vbY,
      viewBoxWidth: vbWidth,
      viewBoxHeight: vbHeight,
    };

    endMeasure(
      PerformanceMarks.GRAPH_RENDER,
      PerformanceMarks.GRAPH_RENDER,
      PerformanceMeasures.GRAPH_RENDER_TIME,
    );

    return result;
  }, [
    graphData,
    startWord,
    targetWord,
    currentWordForDisplay,
    playerPath,
    optimalPath,
    suggestedPath,
    pathDisplayMode,
    gameStatus,
    optimalChoices,
    aiPath,
  ]);

  // --- Render Checks ---
  if (!graphData || gameStatus === "loading") {
    return (
      <View style={styles.container}>
        <RNText>Loading Graph...</RNText>
      </View>
    );
  }

  if (
    (!startWord || !targetWord || nodesToRender.length === 0) &&
    gameStatus !== "idle"
  ) {
    return (
      <View style={styles.container}>
        <RNText>Waiting for game data...</RNText>
      </View>
    );
  }

  // If we're in idle state with no data, just render empty container
  if (
    gameStatus === "idle" &&
    (!startWord || !targetWord || nodesToRender.length === 0)
  ) {
    return <View style={styles.container} />;
  }

  // --- Rendering ---
  return (
    <View
      style={[
        styles.container,
        height ? { height } : null, // Apply custom height if provided
      ]}
    >
      <Svg width="100%" height="100%" viewBox={viewBox}>
        {/* Layer for Links */}
        {linksToRender.map((link) => (
          <Line
            key={link.key}
            x1={link.source.x}
            y1={link.source.y}
            x2={link.target.x}
            y2={link.target.y}
            stroke={
              link.type === "player"
                ? PATH_NODE_FILL
                : link.type === "optimal"
                  ? GLOBAL_OPTIMAL_NODE_FILL
                  : link.type === "ai"
                    ? "#FF6B35" // Orange color for AI path
                    : LOCAL_OPTIMAL_NODE_FILL
            }
            strokeWidth={PLAYER_PATH_LINK_STROKE_WIDTH}
            strokeOpacity={PLAYER_PATH_LINK_STROKE_OPACITY}
            strokeDasharray={
              link.type === "optimal"
                ? "5,3"
                : link.type === "suggested"
                  ? "2,4"
                  : link.type === "ai"
                    ? "8,2"
                    : undefined
            }
          />
        ))}

        {/* Layer for Nodes */}
        {nodesToRender
          .slice() // Create a shallow copy to sort without mutating the memoized array
          .sort((a, b) => {
            // Sort to bring the current node to the end (rendered on top)
            if (a.isCurrent) return 1;
            if (b.isCurrent) return -1;
            return 0;
          })
          .map((node) => {
            const initialNodeRadius =
              node.isStart || node.isEnd || node.isCurrent
                ? FOCUSED_NODE_RADIUS
                : NODE_RADIUS;
            // Determine if the TouchableCircle's radius should animate based on its current status.
            // Prevent animation for start/end nodes unless they ARE the current node.
            const allowRadiusAnimationBasedOnCurrent =
              !(node.isStart || node.isEnd) || node.isCurrent;

            const nodeTargetFill = node.isCurrent
              ? CURRENT_NODE_FILL
              : node.isStart
                ? START_NODE_FILL
                : node.isEnd
                  ? END_NODE_FILL
                  : node.isPlayerGlobalOptimalChoice
                    ? GLOBAL_OPTIMAL_NODE_FILL
                    : node.isPlayerLocalOptimalChoice
                      ? LOCAL_OPTIMAL_NODE_FILL
                      : pathDisplayMode.optimal && node.isOptimal
                        ? GLOBAL_OPTIMAL_NODE_FILL
                        : pathDisplayMode.suggested && node.isSuggested
                          ? LOCAL_OPTIMAL_NODE_FILL
                          : pathDisplayMode.ai && node.isAi
                            ? "#FF6B35" // Orange color for AI path nodes
                            : pathDisplayMode.player && node.isInPath
                              ? PATH_NODE_FILL
                              : DEFAULT_NODE_FILL;

            return (
              <React.Fragment key={`node-fragment-${node.id}`}>
                {" "}
                {/* Use Fragment for multiple children with one key */}
                <TouchableCircle
                  key={node.id} // Original key for the TouchableCircle
                  cx={node.x}
                  cy={node.y}
                  initialRadius={initialNodeRadius}
                  // Pass node.isCurrent only if animation is allowed for this node type,
                  // otherwise, pass undefined so TouchableCircle uses initialRadius.
                  isCurrent={
                    allowRadiusAnimationBasedOnCurrent
                      ? node.isCurrent
                      : undefined
                  } // node.isCurrent now uses currentWordForDisplay
                  focusedRadius={FOCUSED_NODE_RADIUS}
                  defaultRadius={NODE_RADIUS}
                  targetFill={nodeTargetFill}
                  stroke={DEFAULT_NODE_STROKE}
                  strokeWidth={DEFAULT_NODE_STROKE_WIDTH}
                  onPress={() => onSelectWord(node.id)}
                />
              </React.Fragment>
            );
          })}

        {/* Layer for Labels */}
        {nodesToRender
          .filter((node) => {
            if (node.isCurrent) return true; // Current label always a candidate (node.isCurrent based on currentWordForDisplay)
            if (node.isEnd) return true; // End label always a candidate

            if (node.isStart) {
              // const gameCurrentWord = useGameStore.getState().currentWord; // Get currentWord from store for comparison
              // Use currentWordForDisplay for label collision logic if a gameReport is active
              const activeCurrentWord = gameReport
                ? currentWordForDisplay
                : useGameStore.getState().currentWord;

              if (!activeCurrentWord) return true; // No active current word, show start label
              // If activeCurrentWord is the startWord, it's already handled by node.isCurrent check above
              if (activeCurrentWord === node.id) return true;

              // An active currentWord exists, and it's different from this startNode.
              // Check for collision with the activeCurrentWord's label.
              const currentNodeData = nodesToRender.find(
                (n) => n.id === activeCurrentWord,
              );
              if (currentNodeData) {
                const dynamicFontSize = calculateDynamicFontSize(
                  node.id,
                  node.x,
                  viewBoxX,
                  viewBoxWidth,
                  node.id,
                );
                const AVG_CHAR_WIDTH = dynamicFontSize * 0.6; // Approx. avg char width

                // Vertical collision check
                const verticalLabelProximity = Math.abs(
                  node.y - currentNodeData.y,
                );
                const verticalCollision =
                  verticalLabelProximity < dynamicFontSize;

                // Horizontal collision check
                const startLabelEstWidth = node.id.length * AVG_CHAR_WIDTH;
                const currentLabelEstWidth =
                  currentNodeData.id.length * AVG_CHAR_WIDTH;
                const horizontalLabelProximity = Math.abs(
                  node.x - currentNodeData.x,
                );
                const horizontalCollision =
                  horizontalLabelProximity <
                  startLabelEstWidth / 2 + currentLabelEstWidth / 2;

                if (verticalCollision && horizontalCollision) {
                  return false; // Labels likely collide, suppress start label
                }
              }
              return true; // No collision detected with current, or no current node data found, show start label
            }
            return false;
          })
          .slice() // For sorting
          .sort((a, b) => {
            if (a.isCurrent && !b.isCurrent) return 1;
            if (!a.isCurrent && b.isCurrent) return -1;
            // Add further sorting if needed, e.g., End over Start if neither is Current
            if (a.isEnd && !b.isEnd && !a.isCurrent && !b.isCurrent) return 1;
            if (!a.isEnd && b.isEnd && !a.isCurrent && !b.isCurrent) return -1;
            return 0;
          })
          .map((node) => {
            const fontSize = calculateDynamicFontSize(
              node.id,
              node.x,
              viewBoxX,
              viewBoxWidth,
              node.id,
            );
            return (
              <Text
                key={`label-${node.id}`}
                x={node.x}
                y={node.y + 20}
                textAnchor="middle"
                fill={LABEL_TEXT_FILL}
                fontSize={fontSize}
                fontWeight={LABEL_TEXT_FONT_WEIGHT}
              >
                {truncateText(node.id, fontSize)}
              </Text>
            );
          })}
      </Svg>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
});

export default GraphVisualization;
