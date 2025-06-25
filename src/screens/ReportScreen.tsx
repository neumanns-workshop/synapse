import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";

import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useTheme,
  Portal,
  Snackbar,
  Text,
  Dialog,
  Button,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../App";

import AchievementDetailDialog from "../components/AchievementDetailDialog";
import GameReportDisplay from "../components/GameReportDisplay";
import GraphVisualization from "../components/GraphVisualization";
import PlayerPathDisplay from "../components/PlayerPathDisplay";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import WordDefinitionDialog from "../components/WordDefinitionDialog";
import {
  shareChallenge,
  generateSecureGameDeepLink,
  generateSecureDailyChallengeDeepLink,
  generateChallengeMessage,
  generateDailyChallengeTaunt,
  encodeGameReportForSharing,
} from "../services/SharingService";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type { GameReport } from "../utils/gameReportUtils";
import { loadGameHistory } from "../services/StorageAdapter";
import CustomIcon from "../components/CustomIcon";

type ReportScreenRouteProp = RouteProp<RootStackParamList, "Report">;
type ReportScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Report"
>;

const ReportScreen = () => {
  const route = useRoute<ReportScreenRouteProp>();
  const navigation = useNavigation<ReportScreenNavigationProp>();
  const { colors } = useTheme() as ExtendedTheme;
  const reportSectionRef = useRef(null);
  const graphPreviewRef = useRef(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [challengeLink, setChallengeLink] = useState("");
  const [challengeDialogVisible, setChallengeDialogVisible] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState("");

  // State for handling different report sources
  const [currentReport, setCurrentReport] = useState<GameReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Get navigation parameters
  const { reportData, source, reportId } = route.params || {};

  const gameStatus = useGameStore((state) => state.gameStatus);
  const storeGameReport = useGameStore((state) => state.gameReport);
  const isLoading = useGameStore((state) => state.isLoadingData);
  const showWordDefinition = useGameStore((state) => state.showWordDefinition);

  const definitionDialogWord = useGameStore(
    (state) => state.definitionDialogWord,
  );
  const definitionDialogPathIndex = useGameStore(
    (state) => state.definitionDialogPathIndex,
  );
  const definitionDialogVisible = useGameStore(
    (state) => state.definitionDialogVisible,
  );
  const hideWordDefinition = useGameStore((state) => state.hideWordDefinition);

  const selectedAchievement = useGameStore(
    (state) => state.selectedAchievement,
  );
  const achievementDialogVisible = useGameStore(
    (state) => state.achievementDialogVisible,
  );
  const hideAchievementDetail = useGameStore(
    (state) => state.hideAchievementDetail,
  );
  const showAchievementDetail = useGameStore(
    (state) => state.showAchievementDetail,
  );
  const startGame = useGameStore((state) => state.startGame);

  // Effect to load the appropriate report based on source
  useEffect(() => {
    const loadReport = async () => {
      if (reportData) {
        // Report data was passed directly
        setCurrentReport(reportData);
        return;
      }

      if (source === "current") {
        // Use current game report from store
        setCurrentReport(storeGameReport);
        return;
      }

      if (source === "history" && reportId) {
        // Load from game history
        setReportLoading(true);
        try {
          const gameHistory = await loadGameHistory();
          const historicalReport = gameHistory.find(
            (report) => report.id === reportId,
          );
          setCurrentReport(historicalReport || null);
        } catch (error) {
          console.error("Error loading historical report:", error);
          setCurrentReport(null);
        } finally {
          setReportLoading(false);
        }
        return;
      }

      // Fallback to current game report
      setCurrentReport(storeGameReport);
    };

    loadReport();
  }, [reportData, source, reportId, storeGameReport]);

  // Determine the actual game report to use
  const gameReport = currentReport;

  // Set a special display mode for the challenge preview graph
  const setChallengeGraphMode = useGameStore(
    (state) => state.setPathDisplayMode,
  );

  // Function to prepare the challenge preview
  const prepareGraphPreview = () => {
    // Show only the player path, hide optimal and suggested paths
    setChallengeGraphMode({
      player: true,
      optimal: false,
      suggested: false,
    });
  };

  // Function to copy text to clipboard on web
  const copyToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setSnackbarMessage("Challenge copied to clipboard!");
        setSnackbarVisible(true);
        // Close dialog after copy (optional)
        setChallengeDialogVisible(false);
      } catch (error) {
        setSnackbarMessage("Failed to copy challenge");
        setSnackbarVisible(true);
      }
    }
  };

  // Function to handle challenge sharing
  const handleChallengeShare = async () => {
    if (!gameReport) {
      return;
    }

    try {
      const { startWord, targetWord, playerPath } = gameReport;

      const pathLength = playerPath.length - 1;

      // Prepare graph view for preview (player path only)
      prepareGraphPreview();

      // For web, show the challenge link in a dialog
      if (Platform.OS === "web") {
        // Check if this is a daily challenge and generate appropriate link
        let link: string;
        let message: string;

        if (gameReport.isDailyChallenge && gameReport.dailyChallengeId) {
          // Encode game report data for sharing
          const encodedPath = gameReport
            ? encodeGameReportForSharing(gameReport)
            : "";

          link = generateSecureDailyChallengeDeepLink(
            gameReport.dailyChallengeId,
            startWord,
            targetWord,
            encodedPath,
          );

          // Generate proper daily challenge taunt
          const aiSteps = gameReport.aiPath
            ? gameReport.aiPath.length - 1
            : gameReport.optimalPath.length - 1;
          const userSteps = gameReport.totalMoves;
          const userCompleted = gameReport.status === "won";
          const userGaveUp = gameReport.status === "given_up";
          const challengeDate = gameReport.dailyChallengeId; // Use challenge ID as date for now

          message = generateDailyChallengeTaunt({
            startWord,
            targetWord,
            aiSteps,
            userSteps,
            userCompleted,
            userGaveUp,
            challengeDate,
            encodedPath,
            optimalPathLength: gameReport.optimalPath.length - 1,
          });
        } else {
          // Encode game report data for sharing
          const encodedPath = gameReport
            ? encodeGameReportForSharing(gameReport)
            : "";

          link = generateSecureGameDeepLink(
            startWord,
            targetWord,
            undefined,
            encodedPath,
          );
          message = generateChallengeMessage({
            startWord,
            targetWord,
            playerPath,
            steps: pathLength,
            deepLink: link,
            gameStatus: gameReport.status,
            encodedPath,
            optimalPathLength: gameReport.optimalPath.length - 1,
          });
        }

        setChallengeLink(link);
        setChallengeMessage(message);
        setChallengeDialogVisible(true);
        return;
      }

      // For native platforms, use the sharing APIs
      const success = await shareChallenge({
        startWord,
        targetWord: targetWord,
        playerPath,
        screenshotRef: graphPreviewRef, // Use the graph preview ref for sharing
        steps: pathLength,
        gameReport, // Pass the game report for encoding
      });

      if (success) {
        setSnackbarMessage("Challenge shared successfully!");
      } else {
        setSnackbarMessage("Sharing canceled");
      }
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage("Error sharing challenge");
      setSnackbarVisible(true);
    }
  };

  // Handle back navigation
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to Synapse screen if no back navigation available
      navigation.navigate("Synapse");
    }
  };

  // Handle new game
  const handleNewGame = () => {
    // Start a new game and navigate back to the main game screen
    startGame();
    navigation.navigate("Synapse");
  };

  // Show loading if we're still loading the report
  if (reportLoading || isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.onBackground }}>
          Loading Report...
        </Text>
      </View>
    );
  }

  // Show error if no report is available
  if (!gameReport) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <Text
          style={{
            color: colors.onBackground,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          No report available
        </Text>
        <Button
          mode="outlined"
          onPress={handleBackPress}
          textColor={colors.primary}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <Button
          icon={() => (
            <CustomIcon source="arrow-left" size={20} color={colors.primary} />
          )}
          mode="text"
          onPress={handleBackPress}
          textColor={colors.primary}
        >
          Back
        </Button>
        <Text
          variant="headlineSmall"
          style={[styles.headerTitle, { color: colors.primary }]}
        >
          Game Report
        </Text>
        <Button
          icon={() => (
            <CustomIcon source="plus" size={20} color={colors.primary} />
          )}
          mode="text"
          onPress={handleNewGame}
          textColor={colors.primary}
        >
          New Game
        </Button>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.graphContainer}>
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

        {gameReport && gameReport.playerPath && (
          <PlayerPathDisplay
            playerPath={gameReport.playerPath}
            optimalChoices={gameReport.optimalChoices}
            suggestedPath={gameReport.suggestedPath}
            onWordDefinition={showWordDefinition}
            targetWord={gameReport.targetWord}
          />
        )}

        {gameReport && (
          <View style={styles.reportDisplayContainer} ref={reportSectionRef}>
            <GameReportDisplay
              report={gameReport}
              onChallengePress={handleChallengeShare}
              onAchievementPress={showAchievementDetail}
              screenshotRef={reportSectionRef}
            />
          </View>
        )}
      </ScrollView>

      {/* Challenge link dialog */}
      <Portal>
        <Dialog
          visible={challengeDialogVisible}
          onDismiss={() => setChallengeDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={{ color: colors.primary }}>
            Challenge a Friend
          </Dialog.Title>
          <Dialog.Content>
            <Text
              style={[styles.dialogText, { color: colors.onSurfaceVariant }]}
            >
              This message will be shared with the challenge:
            </Text>

            {/* Challenge message preview */}
            <View
              style={[
                styles.messagePreviewContainer,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.messagePreviewText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {challengeMessage}
              </Text>
            </View>

            {/* Graph preview for challenge */}
            <View style={{ position: "relative" }}>
              <View
                style={[
                  styles.graphPreviewContainer,
                  { borderColor: colors.outline },
                ]}
                ref={graphPreviewRef}
              >
                {gameReport && (
                  <GraphVisualization
                    height={180}
                    gameReport={gameReport}
                    pathDisplayModeOverride={{
                      player: true,
                      optimal: false,
                      suggested: false,
                    }}
                  />
                )}
              </View>
              <QRCodeDisplay value={challengeLink} size={60} overlay />
            </View>

            <TextInput
              value={challengeLink}
              style={[
                styles.linkInput,
                {
                  borderColor: colors.outline,
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
              editable={false}
              selectTextOnFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() =>
                copyToClipboard(`${challengeMessage}\n\n${challengeLink}`)
              }
              mode="contained"
              textColor={colors.onPrimary}
            >
              Copy Challenge
            </Button>
            <Button
              onPress={() => setChallengeDialogVisible(false)}
              mode="outlined"
              textColor={colors.primary}
            >
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "Dismiss",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>

      <Portal>
        <WordDefinitionDialog
          word={definitionDialogWord || ""}
          pathIndexInPlayerPath={definitionDialogPathIndex}
          visible={definitionDialogVisible}
          onDismiss={hideWordDefinition}
        />
        <AchievementDetailDialog
          achievement={selectedAchievement}
          visible={achievementDialogVisible}
          onDismiss={hideAchievementDetail}
        />
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  graphContainer: {
    height: 300,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 8,
  },
  reportDisplayContainer: {
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  graphPreviewContainer: {
    height: 180,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
  },
  messagePreviewContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  messagePreviewText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  sectionContainer: {
    marginHorizontal: 8,
    marginVertical: 10,
    paddingVertical: 8,
  },
  dialog: {
    maxWidth: 500,
    width: "90%",
    alignSelf: "center",
    borderRadius: 8,
  },
  dialogText: {
    marginBottom: 16,
  },
  linkInput: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 8,
    fontSize: 14,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  buttonContainer: {
    // Ensure styles for Dialog.Actions are consistent if needed
  },
});

export default ReportScreen;
