import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";

import {
  Modal,
  Portal,
  Surface,
  useTheme,
  Snackbar,
  Text,
  Dialog,
  Button,
} from "react-native-paper";

import {
  shareChallenge,
  generateChallengeMessage,
  generateDailyChallengeTaunt,
  generateSecureGameDeepLink,
} from "../services/SharingService";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import AchievementDetailDialog from "./AchievementDetailDialog";

import GameReportDisplay from "./GameReportDisplay";
import GraphVisualization from "./GraphVisualization";
import PlayerPathDisplay from "./PlayerPathDisplay";
import { QRCodeDisplay } from "./QRCodeDisplay";
import WordDefinitionDialog from "./WordDefinitionDialog";
import ModalCloseButton from "./ModalCloseButton";

const GameReportModal = () => {
  const { colors } = useTheme() as ExtendedTheme;
  const reportSectionRef = useRef(null);
  const graphPreviewRef = useRef(null);
  const mainGraphRef = useRef(null); // Add ref for main graph that's always rendered
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [challengeLink, setChallengeLink] = useState("");
  const [challengeDialogVisible, setChallengeDialogVisible] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState("");

  // Get modal state from store
  const gameReportModalVisible = useGameStore(
    (state) => state.gameReportModalVisible,
  );
  const gameReportModalReport = useGameStore(
    (state) => state.gameReportModalReport,
  );
  const hideGameReportModal = useGameStore(
    (state) => state.hideGameReportModal,
  );

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
    console.log("🚀 handleChallengeShare called");

    if (!gameReportModalReport) {
      console.log("🚀 No gameReportModalReport, returning early");
      return;
    }

    try {
      const { startWord, targetWord, playerPath } = gameReportModalReport;
      console.log("🚀 Challenge data:", {
        startWord,
        targetWord,
        pathLength: playerPath.length - 1,
      });

      const pathLength = playerPath.length - 1;

      // Prepare graph view for preview (player path only)
      prepareGraphPreview();
      console.log("🚀 Graph preview prepared");

      // For web, show custom dialog (skip native sharing entirely)
      if (Platform.OS === "web") {
        console.log("🚀 Web platform detected - showing custom dialog");
        // Skip native sharing and go straight to our custom dialog
        // The shareChallenge functions trigger native sharing which we don't want

        // Main web flow: Generate enhanced link with screenshot for custom dialog
        let link: string;
        let message: string;
        const previewImageUrl: string | undefined = undefined;

        // Try to capture screenshot and upload it
        try {
          if (mainGraphRef?.current) {
            console.log(
              "🚀 Attempting screenshot capture for enhanced link...",
            );
            // We'll use a simpler approach - trigger the sharing function but ignore its native sharing
            // and extract the enhanced URL from it, or generate it ourselves

            // For now, generate without preview, but we can enhance this later
            console.log(
              "🚀 Generating link without preview for now (TODO: add screenshot)",
            );
          }
        } catch (error) {
          console.warn("🚀 Screenshot capture failed:", error);
        }

        if (
          gameReportModalReport.isDailyChallenge &&
          gameReportModalReport.dailyChallengeId
        ) {
          link = generateSecureGameDeepLink(
            "dailychallenge",
            startWord,
            targetWord,
            undefined, // no theme for daily challenges
            gameReportModalReport.dailyChallengeId, // challengeId
            previewImageUrl, // will be undefined for now, enhanced later
          );

          const aiSteps = gameReportModalReport.aiPath
            ? gameReportModalReport.aiPath.length - 1
            : gameReportModalReport.optimalPath.length - 1;
          const userSteps = gameReportModalReport.totalMoves;
          const userCompleted = gameReportModalReport.status === "won";
          const userGaveUp = gameReportModalReport.status === "given_up";
          const challengeDate = gameReportModalReport.dailyChallengeId;

          message = generateDailyChallengeTaunt({
            startWord,
            targetWord,
            aiSteps,
            userSteps,
            userCompleted,
            userGaveUp,
            challengeDate,
            optimalPathLength: gameReportModalReport.optimalPath.length - 1,
          });
        } else {
          link = generateSecureGameDeepLink(
            "challenge",
            startWord,
            targetWord,
            undefined, // no theme
            undefined, // no challengeId for regular challenges
            previewImageUrl, // will be undefined for now, enhanced later
          );

          message = generateChallengeMessage({
            startWord,
            targetWord,
            playerPath,
            steps: pathLength,
            gameStatus: gameReportModalReport.status,
            optimalPathLength: gameReportModalReport.optimalPath.length - 1,
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
        gameReport: gameReportModalReport, // Pass the game report for encoding
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

  return (
    <Portal>
      <Modal
        visible={gameReportModalVisible}
        onDismiss={hideGameReportModal}
        contentContainerStyle={[
          styles.modalContent,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}
      >
        <Surface
          style={[styles.modalSurface, { backgroundColor: colors.surface }]}
        >
          <ModalCloseButton
            onPress={hideGameReportModal}
            style={styles.closeButton}
          />
          {/* Header with close button */}
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={{ color: colors.primary }}>
              Game Report
            </Text>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.graphContainer} ref={mainGraphRef}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading...</Text>
                </View>
              ) : (
                <GraphVisualization
                  gameReport={gameReportModalReport || undefined}
                  height={250}
                />
              )}
            </View>

            {gameReportModalReport && gameReportModalReport.playerPath && (
              <PlayerPathDisplay
                playerPath={gameReportModalReport.playerPath}
                optimalChoices={gameReportModalReport.optimalChoices}
                suggestedPath={gameReportModalReport.suggestedPath}
                onWordDefinition={showWordDefinition}
                targetWord={gameReportModalReport.targetWord}
              />
            )}

            {gameReportModalReport && (
              <View
                style={styles.reportDisplayContainer}
                ref={reportSectionRef}
              >
                <GameReportDisplay
                  report={gameReportModalReport}
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
                  style={[
                    styles.dialogText,
                    { color: colors.onSurfaceVariant },
                  ]}
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
                    {gameReportModalReport && (
                      <GraphVisualization
                        height={180}
                        gameReport={gameReportModalReport}
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
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    maxHeight: "90%",
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 700,
    width: "90%",
    alignSelf: "center",
  },
  modalSurface: {
    flex: 1,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  graphContainer: {
    height: 250,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reportDisplayContainer: {
    width: "100%",
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
  closeButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 1,
  },
  snackbar: {
    bottom: 70, // Adjust to avoid FAB
  },
});

export default GameReportModal;
