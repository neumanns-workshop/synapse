import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  Text, 
  Card, 
  Button, 
  ActivityIndicator, 
  useTheme,
  Chip,
  FAB,
  Portal,
  Dialog,
  Snackbar,
  Paragraph
} from 'react-native-paper';
import { useGameStore } from '../stores/useGameStore';
import GraphVisualization from '../components/GraphVisualization';
import PathDisplayConfigurator from '../components/PathDisplayConfigurator';
import WordDefinitionDialog from '../components/WordDefinitionDialog';
import AvailableWordsDisplay from '../components/AvailableWordsDisplay';
import ReportScreen from './ReportScreen';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import { Linking } from 'react-native';
import AppHeader from '../components/AppHeader';
import PlayerPathDisplay from '../components/PlayerPathDisplay';
import { loadCurrentGame } from '../services/StorageService';

type RootStackParamList = {
  Home: undefined;
  Synapse: undefined;
  Scores: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Synapse'>;

const GameScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { customColors, colors } = useTheme() as ExtendedTheme;
  
  // UI state
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordPathIndex, setSelectedWordPathIndex] = useState<number | null>(null);
  const [definitionVisible, setDefinitionVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [gameWasRestored, setGameWasRestored] = useState(false);

  // Game state
  const graphData = useGameStore((state) => state.graphData);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const startGame = useGameStore((state) => state.startGame);
  const selectWord = useGameStore((state) => state.selectWord);
  const giveUp = useGameStore((state) => state.giveUp);
  const startWord = useGameStore((state) => state.startWord);
  const targetWord = useGameStore((state) => state.endWord);
  const currentWord = useGameStore((state) => state.currentWord);
  const playerPath = useGameStore((state) => state.playerPath);
  const optimalPath = useGameStore((state) => state.optimalPath);
  const suggestedPathFromCurrent = useGameStore((state) => state.suggestedPathFromCurrent);
  const isLoading = useGameStore((state) => state.isLoadingData || state.gameStatus === 'loading');
  const pathDisplayMode = useGameStore((state) => state.pathDisplayMode);
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);
  const gameReport = useGameStore((state) => state.gameReport);
  const optimalChoices = useGameStore((state) => state.optimalChoices);
  const loadInitialData = useGameStore((state) => state.loadInitialData);

  // Load initial data on mount and check if a game was restored.
  useEffect(() => {
    const performInitialLoad = async () => {
      console.log('GameScreen: Performing initial load...');
      const restored = await loadInitialData();
      setGameWasRestored(restored);
      console.log(`GameScreen: Initial load complete. Game restored: ${restored}`);
      setInitialLoadComplete(true);
    };

    // We only want this to run once.
    if (!initialLoadComplete) {
        performInitialLoad();
    }
  }, [loadInitialData, initialLoadComplete]);

  // Automatically start a new game if:
  // 1. Initial data load is complete.
  // 2. Graph data is available.
  // 3. A game was NOT restored during the initial load.
  // 4. Game status is 'idle' or 'loading'.
  useEffect(() => {
    if (initialLoadComplete && graphData && !gameWasRestored && (gameStatus === 'idle' || gameStatus === 'loading')) {
      console.log('GameScreen: Auto-starting new game as no game was restored on initial load.');
      startGame();
    }
  }, [initialLoadComplete, graphData, gameWasRestored, gameStatus, startGame]);

  // Determine if we should show the path display options
  const showPathOptions = gameStatus === 'given_up' || gameStatus === 'won';

  // Determine if we should show the report screen
  const showReport = gameStatus === 'given_up' || gameStatus === 'won';

  // Handle showing options dialog
  const toggleOptions = () => setOptionsVisible(!optionsVisible);

  // Handle word selection for display definition
  const handleShowDefinition = (word: string, pathIndex?: number) => {
    setSelectedWord(word);
    setSelectedWordPathIndex(pathIndex ?? null);
    setDefinitionVisible(true);
  };

  // Handle dismissing the definition dialog
  const handleDismissDefinition = () => {
    setDefinitionVisible(false);
    setSelectedWord(null);
    setSelectedWordPathIndex(null);
  };

  // Handle word selection for gameplay
  const handleSelectWord = (word: string) => {
    // Check if the word is a valid neighbor of the current word
    if (graphData && currentWord && graphData[currentWord]?.edges[word]) {
      // It's a valid neighbor, so select it regardless of whether it's in the path
      selectWord(word);
      return;
    }
    
    // If we get here, it's not a valid neighbor.
    // This shouldn't happen with the UI, but handle it just in case
    console.warn(`Invalid word selection: ${word} is not a neighbor of ${currentWord}`);
  };

  // Handle give up action
  const handleGiveUp = () => {
    giveUp();
  };

  // Handle snackbar dismiss
  const onDismissSnackbar = () => setSnackbarVisible(false);

  // Render the accordion-style path with dots for remaining steps
  const renderAccordionPath = () => {
    if (!playerPath.length) return null;
    
    // Calculate how many dots we need
    const suggestedRemainingSteps = 
      gameStatus === 'playing' && suggestedPathFromCurrent && suggestedPathFromCurrent.length > 0 ? 
        Math.max(0, suggestedPathFromCurrent.length - 1) : 0;
    
    // Create a map of which words are in which paths for coloring (used for general path display)
    // const inOptimalPath = new Set(optimalPath || []); // Keep for potential future use or different contexts
    // const inSuggestedPath = new Set(suggestedPathFromCurrent || []); // Keep for potential future use

    return (
      <ScrollView 
        ref={scrollViewRef}
        style={styles.pathScrollContainer}
        contentContainerStyle={styles.pathScrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.pathContent}>
          {playerPath.map((word, index) => {
            // Determine the style based on position and choice optimality
            let textStyle: any = {...styles.pathWord, color: customColors.pathNode}; // Default to pathNode color
            const isCurrentWord = index === playerPath.length - 1;

            if (index === 0) {
              // Start word
              textStyle.color = customColors.startNode;
            } else {
              // For words other than the start word, check optimalChoices
              const choiceIndex = index - 1;
              if (optimalChoices && choiceIndex < optimalChoices.length && optimalChoices[choiceIndex].playerChose === word) {
                const choice = optimalChoices[choiceIndex];
                // Strategic and Greedy coloring removed from here, will only be in report
                // if (choice.isGreedyHeuristicChoice) { ... }
                // else if (choice.isStrategicRepositioningChoice) { ... }
                if (choice.isGlobalOptimal) {
                  textStyle.color = customColors.globalOptimalNode;
                } else if (choice.isLocalOptimal) {
                  textStyle.color = customColors.localOptimalNode;
                }
                // If none of the above, it keeps the default pathNode color set initially
              }
              
              // Current word styling: If it's the current word and not colored by a specific choice type,
              // or if we always want to highlight the current word with its specific color.
              // Current logic: Apply current word styling if it hasn't been colored by a choice type.
              if (isCurrentWord && playerPath.length > 1) { 
                 if (textStyle.color === customColors.pathNode || !textStyle.color) { // Only override if not already specially colored
                    textStyle.color = customColors.currentNode;
                 }
                 textStyle.fontWeight = 'bold'; 
              }
            }
            
            // Fallback for current word if it's the only word in path (i.e., start word is also current)
            // This ensures the very first word, if it's also the current one, gets current word styling.
            if (playerPath.length === 1 && isCurrentWord) { // isCurrentWord implies index === 0 here
                textStyle.color = customColors.currentNode; 
                textStyle.fontWeight = 'bold';
            }

            return (
              <React.Fragment key={`word-${index}`}>
                <Text 
                  style={textStyle}
                  onPress={() => handleShowDefinition(word)}
                >
                  {word}
                </Text>
                {index < playerPath.length - 1 && (
                  <Text style={styles.pathArrow}> → </Text>
                )}
              </React.Fragment>
            );
          })}
          
          {/* Only show dots if we're still playing and have suggested steps */}
          {gameStatus === 'playing' && suggestedRemainingSteps > 0 && (
            <>
              <Text style={styles.pathArrow}> → </Text>
              <Text style={styles.pathEllipsis}>
                {Array.from({ length: suggestedRemainingSteps }).map((_, i) => (
                  <Text key={i} style={styles.pathDot}>●</Text>
                ))}
              </Text>
              <Text style={styles.pathArrow}> → </Text>
              <Text 
                style={{...styles.pathWord, color: customColors.endNode}}
                onPress={() => handleShowDefinition(targetWord || '')}
              >
                {targetWord}
              </Text>
            </>
          )}
          
          {/* If game is won, the path should lead directly to the end word */}
          {gameStatus === 'won' && (
            <>
              <Text style={styles.pathArrow}> → </Text>
              <Text 
                style={{...styles.pathWord, color: customColors.endNode}}
                onPress={() => handleShowDefinition(targetWord || '')}
              >
                {targetWord}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render the optimal path if game is over
  const renderOptimalPath = () => {
    if (!showPathOptions || !optimalPath || optimalPath.length < 2) return null;
    
    // This function displays the static optimal path, not player choices.
    // Coloring here should remain based on the optimal path itself.
    return (
      <View style={styles.pathContent}>
        {optimalPath.map((word, index) => (
          <React.Fragment key={`optimal-${index}`}>
            <Text 
              style={{...styles.pathWord, color: customColors.globalOptimalNode}}
              onPress={() => handleShowDefinition(word)}
            >
              {word}
            </Text>
            {index < optimalPath.length - 1 && (
              <Text style={styles.pathArrow}> → </Text>
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Add ref at the top of the component
  const scrollViewRef = useRef<ScrollView>(null);

  // If still checking persistence or loading data, show loading indicator
  if (!initialLoadComplete || isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onBackground }]}>
          Loading game data...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        {/* App Bar/Header */}
        <AppHeader
          onNewGame={startGame}
          onGiveUp={handleGiveUp}
          newGameDisabled={gameStatus === 'playing'}
          giveUpDisabled={gameStatus !== 'playing'}
        />
        {showReport ? (
          <ReportScreen />
        ) : (
          <>
            <View style={styles.gameContainer}>
              <View style={[styles.graphContainer, { backgroundColor: 'transparent' }]}> 
                {isLoading ? (
                  <ActivityIndicator size="large" animating={true} color={colors.onSurface} />
                ) : (
                  <GraphVisualization />
                )}
              </View>
              {/* Player Path Container */}
              <View style={[styles.pathCard, { backgroundColor: 'transparent' }]}> 
                <View style={styles.transparentContent}>
                  <PlayerPathDisplay 
                    playerPath={playerPath}
                    optimalChoices={optimalChoices} 
                    suggestedPath={suggestedPathFromCurrent}
                    onWordDefinition={handleShowDefinition}
                  />
                </View>
              </View>
              {/* Optimal Path Container (only shown when game is over) */}
              {showPathOptions && (
                <View style={[styles.pathCard, { backgroundColor: 'transparent' }]}> 
                  {renderOptimalPath()}
                </View>
              )}
              {/* Available Words Display (only shown when playing) */}
              {gameStatus === 'playing' && (
                <AvailableWordsDisplay onWordSelect={handleSelectWord} />
              )}
              {/* Only show path display options when game is over */}
              {showPathOptions && (
                <Card style={[styles.optionsCard, { backgroundColor: colors.surface }]}> 
                  <Card.Content>
                    <Text variant="labelMedium" style={[styles.optionsLabel, { color: colors.onSurface }]}>Path Display:</Text>
                    <PathDisplayConfigurator compact={true} />
                  </Card.Content>
                </Card>
              )}
            </View>
            {/* Dialogs and Portals */}
            <Portal>
              {/* Word Definition Dialog */}
              <WordDefinitionDialog
                word={selectedWord || ''}
                pathIndexInPlayerPath={selectedWordPathIndex}
                visible={definitionVisible}
                onDismiss={handleDismissDefinition}
              />
              {/* Snackbar for messages */}
              <Snackbar
                visible={snackbarVisible}
                onDismiss={onDismissSnackbar}
                style={{ backgroundColor: colors.surface }}
              >
                {snackbarMessage}
              </Snackbar>
            </Portal>
          </>
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pathCard: {
    margin: 5,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    borderRadius: 8,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pathScrollContainer: {
    maxHeight: 100,
  },
  pathScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  pathContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 8,
    width: '100%',
  },
  pathLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  pathWord: {
    fontSize: 16,
    fontWeight: '500',
  },
  pathArrow: {
    fontSize: 16,
    opacity: 0.7,
    marginHorizontal: 8,
  },
  pathEllipsis: {
    fontSize: 16,
    opacity: 0.7,
    letterSpacing: 3,
  },
  pathDot: {
    fontSize: 10,
    opacity: 0.5,
    marginHorizontal: 2,
  },
  gameContainer: {
    flex: 1,
    margin: 5,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  graphContainer: {
    flex: 1,
    padding: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 15,
    gap: 12,
  },
  button: {
    minWidth: 120,
    borderWidth: 1,
  },
  optionsCard: {
    margin: 10,
    marginTop: 0,
    borderRadius: 8,
  },
  optionsLabel: {
    marginBottom: 8,
  },
  transparentContent: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GameScreen; 