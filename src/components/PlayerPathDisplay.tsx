import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import { useGameStore } from '../stores/useGameStore';
import type { OptimalChoice } from '../utils/gameReportUtils';

interface PlayerPathDisplayProps {
  playerPath: string[];
  optimalChoices: OptimalChoice[];
  suggestedPath: string[];
  onWordDefinition: (word: string, pathIndex?: number) => void;
}

const PlayerPathDisplay: React.FC<PlayerPathDisplayProps> = ({ 
  playerPath, 
  optimalChoices, 
  suggestedPath,
  onWordDefinition 
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);
  const currentPathDisplayMode = useGameStore((state) => state.pathDisplayMode);
  const endWord = useGameStore((state) => state.endWord);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePlayerPathPress = () => {
    setPathDisplayMode({
      ...currentPathDisplayMode,
      player: !currentPathDisplayMode.player,
    });
  };

  // This StyleSheet definition is for the overall layout (section, pathRow).
  // Specific styles for words, arrows, dots, ellipsis are now in gameScreenStyles for parity.
  const styles = StyleSheet.create({
    section: {
      marginVertical: 8,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 700,
      paddingHorizontal: 24,
    },
    pathScrollContainer: {
      maxHeight: 70, // Changed from 100 to show about 2 lines
    },
    pathScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    pathRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    // Styles for pathWord, pathArrow, pathEllipsis, pathDot are now primarily driven by gameScreenStyles for parity
    // Any definitions here would be overridden by the inline styles in the JSX using gameScreenStyles.
    pathWord: { }, // Keeping as placeholders to avoid breaking references if any existed, but they are overridden.
    pathArrow: { },
    pathEllipsis: { },
    pathDot: { },
    optimalWordClickable: {
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
    usedCheckpoint: {
      opacity: 0.6,
      textDecorationLine: 'none',
    },
  });

  if (!playerPath || playerPath.length < 1) return null;

  const lastWordOfPlayerPath = playerPath[playerPath.length - 1];

  const gameScreenStyles = {
    pathWord: {
      fontSize: 16,
      fontWeight: '500' as '500',
    },
    pathArrow: {
      fontSize: 16,
      opacity: 0.7,
      marginHorizontal: 8,
      color: colors.onSurface, 
      fontWeight: '300' as '300',
    },
    pathEllipsis: {
      fontSize: 16, // This is for the container of dots
      opacity: 0.7, 
      letterSpacing: 3, 
      color: colors.onSurface, 
    },
    pathDot: {
      fontSize: 5, // Adjusted to 5 as requested by user
      opacity: 0.5, 
      marginHorizontal: 2, 
      color: colors.onSurface, 
    },
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity onPress={handlePlayerPathPress}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.pathScrollContainer}
          contentContainerStyle={styles.pathScrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.pathRow}>
            {playerPath.map((word, index) => {
              let textStyle: any = { ...gameScreenStyles.pathWord, color: customColors.pathNode }; 
              const isLastWordInPath = index === playerPath.length - 1;
              let isOptimalWord = false;
              let isUsedCheckpoint = false;

              if (index === 0) {
                textStyle.color = customColors.startNode;
              } else {
                const choiceIndex = index - 1;
                if (optimalChoices && choiceIndex >= 0 && choiceIndex < optimalChoices.length && 
                    optimalChoices[choiceIndex].playerPosition === playerPath[choiceIndex] && 
                    optimalChoices[choiceIndex].playerChose === word) {
                  const choice = optimalChoices[choiceIndex];
                  
                  // Check if this was an optimal move and if it was used as a checkpoint
                  if (choice.isGlobalOptimal || choice.isLocalOptimal) {
                    isOptimalWord = true;
                    isUsedCheckpoint = !!choice.usedAsCheckpoint;
                    
                    // First, set the base optimal color based on the choice type
                    if (choice.isGlobalOptimal) {
                      textStyle.color = customColors.globalOptimalNode;
                    } else if (choice.isLocalOptimal) {
                      textStyle.color = customColors.localOptimalNode;
                    }
                    
                    // Then, apply specific styling for used checkpoints or active clickable checkpoints
                    if (isUsedCheckpoint) {
                      // Apply styling for used checkpoints (e.g., opacity) while retaining the base color
                      textStyle = { ...textStyle, ...styles.usedCheckpoint };
                    } else if (gameStatus === 'playing' && !isLastWordInPath) {
                      // Add visual cue for active (non-used) optimal words that can be used as checkpoints
                      textStyle = { ...textStyle, ...styles.optimalWordClickable };
                    }
                  }
                }
              }
              
              if (isLastWordInPath) {
                textStyle.fontWeight = 'bold'; 
                if (word === endWord) { 
                  textStyle.color = customColors.endNode; 
                } else { 
                  if (textStyle.color === customColors.pathNode || (index === 0 && textStyle.color === customColors.startNode)){
                    textStyle.color = customColors.currentNode;
                  }
                }
              }

              return (
                <React.Fragment key={`path-${word}-${index}`}>
                  <TouchableOpacity onPress={() => onWordDefinition(word, index)}>
                    <Text style={textStyle}>
                      {word}
                    </Text>
                  </TouchableOpacity>
                  {index < playerPath.length - 1 && (
                    <Text style={gameScreenStyles.pathArrow}> → </Text> 
                  )}
                </React.Fragment>
              );
            })}

            {lastWordOfPlayerPath !== endWord && suggestedPath && suggestedPath.length > 1 && (
              <>
                <Text style={gameScreenStyles.pathArrow}> → </Text> 
                {(suggestedPath.length -1) > 0 && (
                  <>
                    <Text style={gameScreenStyles.pathEllipsis}>
                      {Array.from({ length: Math.max(0, suggestedPath.length - 1) }).map((_, i) => (
                        <Text key={`dot-${i}`} style={gameScreenStyles.pathDot}>●</Text> 
                      ))}
                    </Text>
                    <Text style={gameScreenStyles.pathArrow}> → </Text>
                  </>
                )}
                <Text 
                  style={{ ...gameScreenStyles.pathWord, color: customColors.endNode, fontWeight: 'bold' }}
                  onPress={() => endWord && onWordDefinition(endWord)}
                >
                  {endWord} 
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableOpacity>
    </View>
  );
};

export default PlayerPathDisplay; 