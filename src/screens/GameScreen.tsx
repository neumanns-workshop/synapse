import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

import {
  Text,
  Card,
  ActivityIndicator,
  useTheme,
  Portal,
  Snackbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import ReportScreen from "./ReportScreen";
import AppHeader from "../components/AppHeader";
import AvailableWordsDisplay from "../components/AvailableWordsDisplay";
import GraphVisualization from "../components/GraphVisualization";
import PathDisplayConfigurator from "../components/PathDisplayConfigurator";
import PlayerPathDisplay from "../components/PlayerPathDisplay";
import WordDefinitionDialog from "../components/WordDefinitionDialog";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

const GameScreen = () => {
  // const navigation = useNavigation<NavigationProp>(); // Removing unused navigation variable
  const { customColors, colors } = useTheme() as ExtendedTheme;

  // UI state
  const [_optionsVisible, _setOptionsVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordPathIndex, setSelectedWordPathIndex] = useState<
    number | null
  >(null);
  const [definitionVisible, setDefinitionVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [gameWasRestored, setGameWasRestored] = useState(false);

  // Game state
  const graphData = useGameStore((state) => state.graphData);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const startGame = useGameStore((state) => state.startGame);
  const selectWord = useGameStore((state) => state.selectWord);
  const giveUp = useGameStore((state) => state.giveUp);
  const currentWord = useGameStore((state) => state.currentWord);
  const playerPath = useGameStore((state) => state.playerPath);
  const optimalPath = useGameStore((state) => state.optimalPath);
  const suggestedPathFromCurrent = useGameStore(
    (state) => state.suggestedPathFromCurrent,
  );
  const isLoading = useGameStore(
    (state) => state.isLoadingData || state.gameStatus === "loading",
  );
  const optimalChoices = useGameStore((state) => state.optimalChoices);
  const loadInitialData = useGameStore((state) => state.loadInitialData);
  // Added states for challenge handling and error display
  const errorLoadingData = useGameStore((state) => state.errorLoadingData);
  const hasPendingChallenge = useGameStore(
    (state) => state.hasPendingChallenge,
  );
  const pendingChallengeWords = useGameStore(
    (state) => state.pendingChallengeWords,
  );
  const startChallengeGameAction = useGameStore(
    (state) => state.startChallengeGame,
  );
  const isChallenge = useGameStore((state) => state.isChallenge);

  // Load initial data on mount and check if a game was restored.
  useEffect(() => {
    const performInitialLoad = async () => {
      const restored = await loadInitialData();
      setGameWasRestored(restored);
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
  // 5. And there's no pending challenge to start
  useEffect(() => {
    const currentError = useGameStore.getState().errorLoadingData; // Get latest error state

    if (
      initialLoadComplete &&
      graphData &&
      !gameWasRestored &&
      ((gameStatus === "idle" && !hasPendingChallenge && !currentError) || // If idle, ensure no pending/error
        (gameStatus === "loading" && !hasPendingChallenge && !currentError)) && // If loading, also ensure not due to pending/error
      !isChallenge // And not currently in a challenge game that might be loading
    ) {
      startGame();
    }
  }, [
    initialLoadComplete,
    graphData,
    gameWasRestored,
    gameStatus,
    startGame,
    hasPendingChallenge,
    errorLoadingData,
    isChallenge,
  ]);

  // Handle challenge game from deep link if pending
  useEffect(() => {
    // Actions and state are now available from store hooks directly
    if (
      initialLoadComplete &&
      graphData &&
      hasPendingChallenge &&
      pendingChallengeWords
    ) {
      startChallengeGameAction(
        pendingChallengeWords.startWord,
        pendingChallengeWords.targetWord,
      )
        .then(() => {
          // After the attempt, check for an error set by the store
          const currentError = useGameStore.getState().errorLoadingData;

          if (currentError) {
            setSnackbarMessage(currentError); // Show error to user
            setSnackbarVisible(true);

            // Fallback: attempt to start a new random game after showing the error.
            startGame(); // Call startGame to fall back to a random game
          } else {
            // If successful, store would have set isChallenge, gameStatus etc.
            // Store also clears pending flags.
          }
        })
        .catch((_err) => {
          // Should not happen if store handles errors, but as a safeguard:
          setSnackbarMessage(
            "An unexpected error occurred with the challenge.",
          );
          setSnackbarVisible(true);
        });
    }
  }, [
    initialLoadComplete,
    graphData,
    hasPendingChallenge,
    pendingChallengeWords,
    startChallengeGameAction,
    startGame,
    // No need to depend on setHasPendingChallenge or setPendingChallengeWords here
    // as we're reacting to the state values, and the store is responsible for setting them.
  ]);

  // Determine if we should show the path display options
  const showPathOptions = gameStatus === "given_up" || gameStatus === "won";

  // Determine if we should show the report screen
  const showReport = gameStatus === "given_up" || gameStatus === "won";

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
    setSnackbarMessage(
      `Invalid move: ${word} is not connected to ${currentWord}.`,
    );
  };

  // Handle give up action
  const handleGiveUp = () => {
    giveUp();
  };

  // Handle snackbar dismiss
  const onDismissSnackbar = () => setSnackbarVisible(false);

  // Render the optimalPath if game is over
  const renderOptimalPath = () => {
    if (!showPathOptions || !optimalPath || optimalPath.length < 2) return null;

    // This function displays the static optimal path, not player choices.
    // Coloring here should remain based on the optimal path itself.
    return (
      <View style={styles.pathContent}>
        {optimalPath.map((word, index) => (
          <React.Fragment key={`optimal-${index}`}>
            <Text
              style={{
                ...styles.pathWord,
                color: customColors.globalOptimalNode,
              }}
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

  // If still checking persistence or loading data, show loading indicator
  if (!initialLoadComplete || isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onBackground }]}>
          Loading game data...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* App Bar/Header */}
        <AppHeader
          onNewGame={startGame}
          onGiveUp={handleGiveUp}
          newGameDisabled={gameStatus === "playing"}
          giveUpDisabled={gameStatus !== "playing"}
        />
        {showReport ? (
          <ReportScreen />
        ) : (
          <>
            <View style={styles.gameContainer}>
              <View
                style={[styles.graphContainer, styles.transparentBackground]}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="large"
                    animating={true}
                    color={colors.onSurface}
                  />
                ) : (
                  <GraphVisualization />
                )}
              </View>
              {/* Player Path Container */}
              <View style={[styles.pathCard, styles.transparentBackground]}>
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
                <View style={[styles.pathCard, styles.transparentBackground]}>
                  {renderOptimalPath()}
                </View>
              )}
              {/* Available Words Display (only shown when playing) */}
              {gameStatus === "playing" && (
                <AvailableWordsDisplay onWordSelect={handleSelectWord} />
              )}
              {/* Only show path display options when game is over */}
              {showPathOptions && (
                <Card
                  style={[
                    styles.optionsCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Card.Content>
                    <Text
                      variant="labelMedium"
                      style={[styles.optionsLabel, { color: colors.onSurface }]}
                    >
                      Path Display:
                    </Text>
                    <PathDisplayConfigurator compact={true} />
                  </Card.Content>
                </Card>
              )}
            </View>
            {/* Dialogs and Portals */}
            <Portal>
              {/* Word Definition Dialog */}
              <WordDefinitionDialog
                word={selectedWord || ""}
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
  transparentBackground: {
    backgroundColor: "transparent",
  },
  pathCard: {
    margin: 5,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    borderRadius: 8,
  },
  pathHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pathScrollContainer: {
    maxHeight: 100,
  },
  pathScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  pathContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 8,
    width: "100%",
  },
  pathLabel: {
    fontWeight: "600",
    marginBottom: 4,
  },
  pathWord: {
    fontSize: 16,
    fontWeight: "500",
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
    alignSelf: "center",
    width: "100%",
  },
  graphContainer: {
    flex: 1,
    padding: 0,
    borderRadius: 8,
    overflow: "hidden",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
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
    backgroundColor: "transparent",
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default GameScreen;
