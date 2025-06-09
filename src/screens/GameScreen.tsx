import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

import {
  Text,
  Card,
  ActivityIndicator,
  useTheme,
  Portal,
  Snackbar,
  Button,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import ReportScreen from "./ReportScreen";
import AppHeader from "../components/AppHeader";
import AvailableWordsDisplay from "../components/AvailableWordsDisplay";
import GraphVisualization from "../components/GraphVisualization";
import PathDisplayConfigurator from "../components/PathDisplayConfigurator";
import PlayerPathDisplay from "../components/PlayerPathDisplay";
import UpgradePrompt from "../components/UpgradePrompt";
import WordDefinitionDialog from "../components/WordDefinitionDialog";
import { useTutorial } from "../context/TutorialContext";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface GameScreenProps {
  onShowAuth?: () => void;
  onShowAuthUpgrade?: () => void;
  onShowAccount?: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  onShowAuth,
  onShowAuthUpgrade,
  onShowAccount,
}) => {
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
  const isDailyChallenge = useGameStore((state) => state.isDailyChallenge);

  // Upgrade prompt state
  const upgradePromptVisible = useGameStore(
    (state) => state.upgradePromptVisible,
  );
  const upgradePromptMessage = useGameStore(
    (state) => state.upgradePromptMessage,
  );
  const upgradePromptContext = useGameStore(
    (state) => state.upgradePromptContext,
  );
  const upgradePromptDismissedThisSession = useGameStore(
    (state) => state.upgradePromptDismissedThisSession,
  );
  const hideUpgradePrompt = useGameStore((state) => state.hideUpgradePrompt);
  const showUpgradePrompt = useGameStore((state) => state.showUpgradePrompt);
  const resetUpgradePromptDismissal = useGameStore(
    (state) => state.resetUpgradePromptDismissal,
  );
  const remainingFreeGames = useGameStore((state) => state.remainingFreeGames);

  // Debug logging for upgrade prompt
  console.log("GameScreen: upgradePromptVisible =", upgradePromptVisible);
  console.log("GameScreen: upgradePromptMessage =", upgradePromptMessage);
  console.log(
    "GameScreen: About to render UpgradePrompt with visible =",
    upgradePromptVisible,
  );

  // Add useEffect to track upgradePromptVisible changes
  useEffect(() => {
    console.log(
      "GameScreen: upgradePromptVisible changed to:",
      upgradePromptVisible,
    );
  }, [upgradePromptVisible]);

  const { startTutorial } = useTutorial();

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

  // Handle challenge game from deep link if pending - THIS MUST RUN FIRST
  useEffect(() => {
    // Actions and state are now available from store hooks directly
    if (
      initialLoadComplete &&
      graphData &&
      hasPendingChallenge &&
      pendingChallengeWords
    ) {
      console.log("🎮 GameScreen: Starting pending challenge");
      startChallengeGameAction(
        pendingChallengeWords.startWord,
        pendingChallengeWords.targetWord,
      )
        .then(() => {
          // If successful, the store would have set isChallenge, gameStatus etc.
          // Store also clears pending flags. No explicit action needed here if store manages state correctly.
          console.log("🎮 GameScreen: Challenge started successfully");
        })
        .catch((_actionError) => {
          // Catch rejection from startChallengeGameAction
          // The action itself should ideally set errorLoadingData in the store upon failure.
          // We check the store for that error message.
          const currentErrorFromStore =
            useGameStore.getState().errorLoadingData;
          const messageToShow =
            currentErrorFromStore ||
            "Failed to start challenge. Trying a random game.";

          setSnackbarMessage(messageToShow);
          setSnackbarVisible(true);

          // Fallback: attempt to start a new random game after showing the error.
          startGame(); // Call startGame to fall back to a random game
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

  // Automatically start a new game if:
  // 1. Initial data load is complete.
  // 2. Graph data is available.
  // 3. A game was NOT restored during the initial load.
  // 4. Game status is 'idle' or 'loading'.
  // 5. And there's no pending challenge to start
  // 6. And there's no upgrade prompt currently visible
  // 7. And the upgrade prompt hasn't been dismissed this session
  // 8. This runs AFTER challenge handling to avoid interference
  useEffect(() => {
    const currentError = useGameStore.getState().errorLoadingData; // Get latest error state

    if (
      initialLoadComplete &&
      graphData &&
      !gameWasRestored &&
      !hasPendingChallenge && // CRITICAL: Don't auto-start if there's a pending challenge
      !upgradePromptVisible && // Don't auto-start if upgrade prompt is visible
      !upgradePromptDismissedThisSession && // Don't auto-start if upgrade prompt was dismissed
      ((gameStatus === "idle" && !currentError) || // If idle, ensure no error
        (gameStatus === "loading" && !currentError)) && // If loading, also ensure not due to error
      !isChallenge && // And not currently in a challenge game that might be loading
      !isDailyChallenge // And not currently in a daily challenge
    ) {
      console.log("🎮 GameScreen: Auto-starting game");
      startGame();
    } else {
      console.log("🎮 GameScreen: Skipping auto-start", {
        initialLoadComplete,
        graphData: !!graphData,
        gameWasRestored,
        hasPendingChallenge,
        upgradePromptVisible,
        upgradePromptDismissedThisSession,
        gameStatus,
        currentError,
        isChallenge,
        isDailyChallenge,
      });
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
    isDailyChallenge, // Add this dependency
    upgradePromptVisible, // Add this dependency
    upgradePromptDismissedThisSession, // Add this dependency
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

  // Handle upgrade prompt actions
  const handleUpgrade = () => {
    hideUpgradePrompt();

    // Don't call resetUpgradePromptDismissal() here - that would undo the dismissal
    // and allow another upgrade prompt to fire immediately

    // Add a delay to ensure the prompt is fully hidden before showing auth
    setTimeout(() => {
      if (onShowAuthUpgrade) {
        onShowAuthUpgrade();
      } else {
        // Fallback: TODO: Implement direct IAP upgrade flow
        console.log("Upgrade to premium requested - no auth handler provided");
      }
    }, 100); // Small delay to prevent timing conflicts
  };

  const handleUpgradeDismiss = () => {
    hideUpgradePrompt();
  };

  // Render loading indicator if data is loading or game status is loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer} testID="loading-indicator">
        <ActivityIndicator testID="activity-indicator" animating size="large" />
        <Text style={styles.loadingText}>Loading Game...</Text>
      </SafeAreaView>
    );
  }

  // Show error state if there's an error
  if (errorLoadingData) {
    return (
      <SafeAreaView style={styles.centeredContainer} testID="error-state">
        <Text style={styles.errorText}>{errorLoadingData}</Text>
        <Button onPress={() => startGame()}>Try Again</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="game-screen">
      <AppHeader
        onNewGame={startGame}
        onGiveUp={handleGiveUp}
        onShowAuth={onShowAuth}
        onShowAccount={onShowAccount}
        newGameDisabled={gameStatus === "playing"}
        giveUpDisabled={gameStatus !== "playing"}
        gameInProgress={gameStatus === "playing"}
      />
      {showReport ? (
        <View testID="report-screen">
          <ReportScreen />
        </View>
      ) : (
        <>
          <View style={styles.gameContainer} testID={gameStatus === "playing" ? "game-interface" : "idle-state"}>
            <View style={[styles.graphContainer, styles.transparentBackground]}>
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
              visible={definitionVisible}
              word={selectedWord || ""}
              pathIndexInPlayerPath={selectedWordPathIndex}
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

      {/* Global Portals - Available in all states */}
      <Portal>
        <UpgradePrompt
          visible={upgradePromptVisible}
          onDismiss={handleUpgradeDismiss}
          onUpgrade={handleUpgrade}
          remainingFreeGames={remainingFreeGames}
          context={upgradePromptContext}
          customMessage={upgradePromptMessage}
        />
      </Portal>
    </SafeAreaView>
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
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default GameScreen;
