import React, { useMemo } from 'react';
import { View, StyleSheet, Text as RNText, Dimensions, Platform } from 'react-native';
import Svg, { G, Line, Circle, Text } from 'react-native-svg';
import { useTheme } from 'react-native-paper';
import { useGameStore } from '../stores/useGameStore';
import type { GraphData } from '../services/dataLoader'; // Import the interface
import TouchableCircle from './TouchableCircle';
import RadarPing from './RadarPing'; // Import the new RadarPing component

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
  isPlayerGlobalOptimalChoice?: boolean; // Flag for player's globally optimal choice
  isPlayerLocalOptimalChoice?: boolean;  // Flag for player's locally optimal choice
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
const LABEL_OFFSET_X = 10;
const LABEL_OFFSET_Y = 4;
const VIEWBOX_PADDING = 30;

// --- Style Constants using theme ---
// Default styling will be replaced by theme colors in the component
const DEFAULT_NODE_FILL = '#aaa';
const DEFAULT_NODE_STROKE = '#333';
const DEFAULT_NODE_STROKE_WIDTH = 0.5;
const PLAYER_PATH_LINK_STROKE_WIDTH = 3;
const PLAYER_PATH_LINK_STROKE_OPACITY = 0.8;
const LABEL_TEXT_FONT_SIZE = 12;
const LABEL_TEXT_FONT_WEIGHT = 'bold';
const PING_MAX_RADIUS_OFFSET = 3; // Reduced from 5
const PING_DURATION = 3500;      // Increased from 2500 for a slower pulse

const NodeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{ cursor: 'pointer', display: 'inline-block' }}>
        {children}
      </div>
    );
  }
  return <>{children}</>;
};

const GraphVisualization: React.FC = () => {
  // @ts-ignore - using custom theme extension
  const { customColors, colors } = useTheme();
  
  // Color constants from theme
  const START_NODE_FILL = customColors.startNode;
  const END_NODE_FILL = customColors.endNode;
  const CURRENT_NODE_FILL = customColors.currentNode;
  const PATH_NODE_FILL = customColors.pathNode;
  const GLOBAL_OPTIMAL_NODE_FILL = customColors.globalOptimalNode;
  const LOCAL_OPTIMAL_NODE_FILL = customColors.localOptimalNode;
  const LABEL_TEXT_FILL = colors.onSurface;

  // Get data and state from Zustand store
  const graphData = useGameStore((state) => state.graphData);
  const startWord = useGameStore((state) => state.startWord);
  const endWord = useGameStore((state) => state.endWord);
  const currentWord = useGameStore((state) => state.currentWord);
  const playerPath = useGameStore((state) => state.playerPath);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const optimalPath = useGameStore((state) => state.optimalPath);
  const suggestedPath = useGameStore((state) => state.suggestedPathFromCurrent);
  const pathDisplayMode = useGameStore((state) => state.pathDisplayMode);
  const selectWord = useGameStore((state) => state.selectWord);
  const optimalChoices = useGameStore((state) => state.optimalChoices); // Get optimal choices

  // Handle word selection
  const onSelectWord = (word: string) => {
    if (gameStatus === 'playing') {
      selectWord(word);
    }
  };

  // --- Memoized Data Preparation ---
  const { nodesToRender, linksToRender, viewBox } = useMemo(() => {
    if (!graphData || !startWord || !endWord || gameStatus === 'idle' || gameStatus === 'loading') {
      return { nodesToRender: [], linksToRender: [], viewBox: '0 0 100 100' };
    }

    // Collect all relevant words
    const relevantWords = new Set<string>([startWord, endWord]);
    if (currentWord) {
      relevantWords.add(currentWord);
    }
    
    // Add words based on path display mode
    if (pathDisplayMode.player) {
      playerPath.forEach(word => relevantWords.add(word));
    }
    if (pathDisplayMode.optimal) {
      optimalPath.forEach(word => relevantWords.add(word));
    }
    if (pathDisplayMode.suggested) {
      suggestedPath.forEach(word => relevantWords.add(word));
    }

    // Create node map with flags
    const nodeMap = new Map<string, RenderNode>();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    relevantWords.forEach(word => {
      const nodeData = graphData[word];
      if (nodeData?.tsne) {
        const [x, y] = nodeData.tsne;
        const node: RenderNode = {
          id: word,
          x,
          y,
          isStart: word === startWord,
          isEnd: word === endWord,
          isCurrent: word === currentWord,
          isInPath: playerPath.includes(word),
          isOptimal: optimalPath.includes(word),
          isSuggested: suggestedPath.includes(word),
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
    optimalChoices.forEach(choice => {
      const chosenNode = nodeMap.get(choice.playerChose);
      if (chosenNode) {
        if (choice.isGlobalOptimal) {
          chosenNode.isPlayerGlobalOptimalChoice = true;
        } else if (choice.isLocalOptimal) { // only set if not global
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
            type: 'player'
          });
        }
      }
    }

    // Add optimal path links
    if (pathDisplayMode.optimal && optimalPath.length > 1) {
      for (let i = 0; i < optimalPath.length - 1; i++) {
        const sourceNode = nodeMap.get(optimalPath[i]);
        const targetNode = nodeMap.get(optimalPath[i + 1]);
        if (sourceNode && targetNode) {
          finalLinksToRender.push({ 
            key: `optimal-${sourceNode.id}-${targetNode.id}-${i}`,
            source: sourceNode, 
            target: targetNode,
            type: 'optimal'
          });
        }
      }
    }

    // Add suggested path links
    if (pathDisplayMode.suggested && suggestedPath.length > 1) {
      for (let i = 0; i < suggestedPath.length - 1; i++) {
        const sourceNode = nodeMap.get(suggestedPath[i]);
        const targetNode = nodeMap.get(suggestedPath[i + 1]);
        if (sourceNode && targetNode) {
          finalLinksToRender.push({ 
            key: `suggested-${sourceNode.id}-${targetNode.id}-${i}`,
            source: sourceNode, 
            target: targetNode,
            type: 'suggested'
          });
        }
      }
    }

    // Calculate viewBox
    const padding = 30;
    const vbX = minX - padding;
    const vbY = minY - padding;
    const vbWidth = (maxX - minX) + 2 * padding;
    const vbHeight = (maxY - minY) + 2 * padding;

    return { 
      nodesToRender: finalNodesToRender, 
      linksToRender: finalLinksToRender, 
      viewBox: `${vbX} ${vbY} ${vbWidth} ${vbHeight}` 
    };
  }, [graphData, startWord, endWord, currentWord, playerPath, optimalPath, suggestedPath, pathDisplayMode, gameStatus, optimalChoices]);

  // --- Render Checks ---
  if (!graphData || gameStatus === 'idle' || gameStatus === 'loading') {
    return (
      <View style={styles.container}>
        <RNText>Loading Graph...</RNText>
      </View>
    );
  }

  if (!startWord || !endWord || nodesToRender.length === 0) {
    return (
      <View style={styles.container}>
        <RNText>Waiting for game data...</RNText>
      </View>
    );
  }

  // --- Rendering ---
  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={viewBox}
      >
        {/* Layer for Links */}
        {linksToRender.map(link => (
          <Line
            key={link.key}
            x1={link.source.x}
            y1={link.source.y}
            x2={link.target.x}
            y2={link.target.y}
            stroke={
              link.type === 'player' ? PATH_NODE_FILL :
              link.type === 'optimal' ? GLOBAL_OPTIMAL_NODE_FILL :
              LOCAL_OPTIMAL_NODE_FILL
            }
            strokeWidth={PLAYER_PATH_LINK_STROKE_WIDTH}
            strokeOpacity={PLAYER_PATH_LINK_STROKE_OPACITY}
            strokeDasharray={
              link.type === 'optimal' ? '5,3' :
              link.type === 'suggested' ? '2,4' :
              undefined
            }
          />
        ))}

        {/* Layer for Nodes */}
        {nodesToRender
          .slice() // Create a shallow copy to sort without mutating the memoized array
          .sort((a, b) => { // Sort to bring the current node to the end (rendered on top)
            if (a.isCurrent) return 1;
            if (b.isCurrent) return -1;
            return 0;
          })
          .map(node => {
          const initialNodeRadius = node.isStart || node.isEnd || node.isCurrent ? FOCUSED_NODE_RADIUS : NODE_RADIUS;
          // Determine if the TouchableCircle's radius should animate based on its current status.
          // Prevent animation for start/end nodes unless they ARE the current node.
          const allowRadiusAnimationBasedOnCurrent = !(node.isStart || node.isEnd) || node.isCurrent;

          return (
            <React.Fragment key={`node-fragment-${node.id}`}> {/* Use Fragment for multiple children with one key */}
              <TouchableCircle
                key={node.id} // Original key for the TouchableCircle
                cx={node.x}
                cy={node.y}
                initialRadius={initialNodeRadius}
                // Pass node.isCurrent only if animation is allowed for this node type,
                // otherwise, pass undefined so TouchableCircle uses initialRadius.
                isCurrent={allowRadiusAnimationBasedOnCurrent ? node.isCurrent : undefined}
                focusedRadius={FOCUSED_NODE_RADIUS}
                defaultRadius={NODE_RADIUS}
                fill={
                  node.isCurrent ? CURRENT_NODE_FILL :
                  node.isStart ? START_NODE_FILL :
                  node.isEnd ? END_NODE_FILL :
                  node.isPlayerGlobalOptimalChoice ? GLOBAL_OPTIMAL_NODE_FILL :
                  node.isPlayerLocalOptimalChoice ? LOCAL_OPTIMAL_NODE_FILL :
                  (pathDisplayMode.optimal && node.isOptimal) ? GLOBAL_OPTIMAL_NODE_FILL :
                  (pathDisplayMode.suggested && node.isSuggested) ? LOCAL_OPTIMAL_NODE_FILL :
                  (pathDisplayMode.player && node.isInPath) ? PATH_NODE_FILL :
                  DEFAULT_NODE_FILL
                }
                stroke={DEFAULT_NODE_STROKE}
                strokeWidth={DEFAULT_NODE_STROKE_WIDTH}
                onPress={() => onSelectWord(node.id)}
              />
              {/* {node.isCurrent && (
                <RadarPing
                  key={`ping-${node.id}`} // Unique key for the RadarPing
                  cx={node.x}
                  cy={node.y}
                  color={CURRENT_NODE_FILL} // Use current node's fill color
                  startRadius={FOCUSED_NODE_RADIUS} // Start from the node's edge
                  maxRadius={FOCUSED_NODE_RADIUS + PING_MAX_RADIUS_OFFSET}
                  duration={PING_DURATION} // Pass duration to ensure consistency
                />
              )} */}
            </React.Fragment>
          );
        })}

        {/* Layer for Labels */}
        {nodesToRender
          .filter(node => {
            if (node.isCurrent) return true; // Current label always a candidate
            if (node.isEnd) return true;   // End label always a candidate

            if (node.isStart) {
              const gameCurrentWord = useGameStore.getState().currentWord; // Get currentWord from store for comparison

              if (!gameCurrentWord) return true; // No active current word, show start label
              // If currentWord is the startWord, it's already handled by node.isCurrent check above
              if (gameCurrentWord === node.id) return true; 

              // An active currentWord exists, and it's different from this startNode.
              // Check for collision with the currentWord's label.
              const currentNodeData = nodesToRender.find(n => n.id === gameCurrentWord);
              if (currentNodeData) {
                const AVG_CHAR_WIDTH = LABEL_TEXT_FONT_SIZE * 0.6; // Approx. avg char width

                // Vertical collision check
                const verticalLabelProximity = Math.abs(node.y - currentNodeData.y);
                const verticalCollision = verticalLabelProximity < LABEL_TEXT_FONT_SIZE;

                // Horizontal collision check
                const startLabelEstWidth = node.id.length * AVG_CHAR_WIDTH;
                const currentLabelEstWidth = currentNodeData.id.length * AVG_CHAR_WIDTH;
                const horizontalLabelProximity = Math.abs(node.x - currentNodeData.x);
                const horizontalCollision = horizontalLabelProximity < (startLabelEstWidth / 2 + currentLabelEstWidth / 2);

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
          .map(node => (
            <Text
              key={`label-${node.id}`}
              x={node.x}
              y={node.y + 20}
              textAnchor="middle"
              fill={LABEL_TEXT_FILL}
              fontSize={LABEL_TEXT_FONT_SIZE}
              fontWeight={LABEL_TEXT_FONT_WEIGHT}
            >
              {node.id}
            </Text>
          ))}
      </Svg>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
});

export default GraphVisualization;
