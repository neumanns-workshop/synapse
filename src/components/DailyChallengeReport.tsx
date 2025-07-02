import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";

import {
  useTheme,
  Portal,
  Snackbar,
  Text,
  Dialog,
  Button,
  Card,
} from "react-native-paper";

import {
  shareDailyChallenge,
  generateDailyChallengeTaunt,
  generateSecureGameDeepLink,
} from "../services/SharingService";
import type { Achievement } from "../features/achievements";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type {
  DailyChallenge,
  DailyChallengeProgress,
} from "../types/dailyChallenges";
import type { GameReport } from "../utils/gameReportUtils";
import CustomIcon from "./CustomIcon";
import GameReportDisplay from "./GameReportDisplay";
import GraphVisualization from "./GraphVisualization";
import PlayerPathDisplay from "./PlayerPathDisplay";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface DailyChallengeReportProps {
  challenge: DailyChallenge;
  progress?: DailyChallengeProgress;
  gameReport?: GameReport;
  onBack: () => void;
  onWordDefinition?: (word: string, pathIndex?: number) => void;
  onAchievementPress?: (achievement: Achievement) => void;
  onPlayChallenge?: () => void;
}

const DailyChallengeReport: React.FC<DailyChallengeReportProps> = ({
  challenge,
  progress,
  gameReport,
  onBack,
  onWordDefinition,
  onAchievementPress,
  onPlayChallenge,
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const graphPreviewRef = useRef(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [challengeLink, setChallengeLink] = useState("");
  const [challengeDialogVisible, setChallengeDialogVisible] = useState(false);
  const [tauntMessage, setTauntMessage] = useState("");
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);

  // Reset challenge dialog state when challenge or game report changes
  useEffect(() => {
    if (challenge || gameReport) {
      // Reset challenge dialog state for new challenge/report
      setChallengeDialogVisible(false);
      setChallengeLink("");
      setTauntMessage("");
      setIsGeneratingChallenge(false);
    }
  }, [challenge, gameReport]);

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

  // Function to handle daily challenge sharing
  const handleDailyChallengeShare = async () => {
    if (!challenge) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (isGeneratingChallenge) {
      console.log("🚀 Already generating daily challenge, skipping");
      return;
    }

    try {
      setIsGeneratingChallenge(true);

      const aiSteps =
        challenge.aiSolution?.stepsTaken || challenge.optimalPathLength;

      // Use game report data if available, otherwise fallback to progress
      const userSteps = gameReport?.totalMoves || progress?.playerMoves;
      const userCompleted = gameReport
        ? gameReport.status === "won"
        : progress?.completed === true && (progress?.playerMoves || 0) > 0;
      const userGaveUp = gameReport ? gameReport.status === "given_up" : false;

      // For web, capture screenshot first, then show dialog with enhanced link
      if (Platform.OS === "web") {
        try {
          // First, try to capture and upload screenshot for preview
          if (graphPreviewRef?.current) {
            // Use shareDailyChallenge to handle screenshot capture and upload
            const success = await shareDailyChallenge({
              challengeId: challenge.id,
              startWord: challenge.startWord,
              targetWord: challenge.targetWord,
              aiSteps,
              userSteps,
              userCompleted,
              userGaveUp,
              challengeDate: challenge.date,
              screenshotRef: graphPreviewRef,
              includeScreenshot: true,
              gameReport,
            });

            if (success) {
              setSnackbarMessage("Daily challenge shared successfully!");
              setSnackbarVisible(true);
              return;
            }
          }

          // If sharing failed or screenshot not available, fall back to basic dialog
          console.warn(
            "Web daily challenge sharing with screenshot failed, falling back to basic dialog",
          );
        } catch (error) {
          console.warn("Web daily challenge screenshot sharing error:", error);
        }

        // Fallback: Generate basic link without screenshot (original behavior)
        const link = generateSecureGameDeepLink(
          "dailychallenge",
          challenge.startWord,
          challenge.targetWord,
          undefined, // no theme for daily challenges
          challenge.id, // challengeId
        );

        const taunt = generateDailyChallengeTaunt({
          startWord: challenge.startWord,
          targetWord: challenge.targetWord,
          aiSteps,
          userSteps,
          userCompleted,
          userGaveUp,
          challengeDate: challenge.date,
          optimalPathLength: challenge.optimalPathLength,
        });

        setChallengeLink(link);
        setTauntMessage(taunt);
        setChallengeDialogVisible(true);
        setIsGeneratingChallenge(false);
        return;
      }

      // For native platforms, use the sharing APIs
      const success = await shareDailyChallenge({
        challengeId: challenge.id,
        startWord: challenge.startWord,
        targetWord: challenge.targetWord,
        aiSteps,
        userSteps,
        userCompleted,
        userGaveUp,
        challengeDate: challenge.date,
        screenshotRef: graphPreviewRef,
        gameReport, // Pass the game report for encoding
      });

      if (success) {
        setSnackbarMessage("Daily challenge shared successfully!");
      } else {
        setSnackbarMessage("Sharing canceled");
      }
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage("Error sharing daily challenge");
      setSnackbarVisible(true);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  // Function to handle challenge dialog dismissal
  const handleChallengeDialogDismiss = () => {
    setChallengeDialogVisible(false);
    setChallengeLink("");
    setTauntMessage("");
    setIsGeneratingChallenge(false);
  };

  // If we have a game report, show the exact same layout as game history
  if (gameReport) {
    return (
      <View style={styles.container}>
        <View style={styles.reportHeader}>
          <Button
            icon={() => (
              <CustomIcon
                source="arrow-left"
                size={20}
                color={colors.primary}
              />
            )}
            mode="text"
            onPress={onBack}
            textColor={colors.primary}
          >
            Back to Calendar
          </Button>
        </View>

        <PlayerPathDisplay
          playerPath={gameReport.playerPath}
          optimalChoices={gameReport.optimalChoices}
          suggestedPath={gameReport.suggestedPath}
          onWordDefinition={
            onWordDefinition ||
            (() => {
              // No-op function when onWordDefinition is not provided
            })
          }
          targetWord={gameReport.targetWord}
        />

        <GameReportDisplay
          report={gameReport}
          onAchievementPress={onAchievementPress}
          onChallengePress={handleDailyChallengeShare}
          isGeneratingChallenge={isGeneratingChallenge}
        />

        {/* Challenge link dialog */}
        <Portal>
          <Dialog
            visible={challengeDialogVisible}
            onDismiss={handleChallengeDialogDismiss}
            style={[styles.dialog, { backgroundColor: colors.surface }]}
          >
            <Dialog.Title style={{ color: colors.primary }}>
              Share Daily Challenge
            </Dialog.Title>
            <Dialog.Content>
              <Text
                style={[styles.dialogText, { color: colors.onSurfaceVariant }]}
              >
                This message will be shared with the challenge:
              </Text>

              {/* Taunt message preview */}
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
                  {tauntMessage}
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
                  <GraphVisualization
                    height={180}
                    gameReport={gameReport}
                    pathDisplayModeOverride={{
                      player: true,
                      optimal: false,
                      suggested: false,
                      ai: false,
                    }}
                  />
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
                  copyToClipboard(`${tauntMessage}\n\n${challengeLink}`)
                }
                mode="contained"
                textColor={colors.onPrimary}
              >
                Copy Challenge
              </Button>
              <Button
                onPress={handleChallengeDialogDismiss}
                mode="text"
                textColor={colors.primary}
              >
                Close
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Snackbar for feedback */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    );
  }

  // If no game report, show challenge details with conditional play button
  const isCompleted = progress?.completed === true;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.reportHeader}>
        <Button
          icon={() => (
            <CustomIcon source="arrow-left" size={20} color={colors.primary} />
          )}
          mode="text"
          onPress={onBack}
          textColor={colors.primary}
        >
          Back to Calendar
        </Button>
      </View>

      <View style={styles.modernContainer}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.challengeTitle, { color: colors.primary }]}>
            Daily Challenge
          </Text>
          <Text
            style={[styles.challengeDate, { color: colors.onSurfaceVariant }]}
          >
            {(() => {
              // Parse the date string (YYYY-MM-DD) manually to avoid timezone issues
              const [year, month, day] = challenge.date.split("-").map(Number);
              const challengeDate = new Date(year, month - 1, day); // month is 0-indexed
              return challengeDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            })()}
          </Text>
          {challenge.aiSolution && (
            <Text
              style={[styles.aiMovesText, { color: colors.onSurfaceVariant }]}
            >
              AI solution:{" "}
              {challenge.aiSolution.stepsTaken ||
                challenge.aiSolution.path?.length - 1 ||
                "N/A"}{" "}
              moves
            </Text>
          )}
        </View>

        {/* Challenge Card */}
        <Card
          style={[
            styles.challengeCard,
            {
              backgroundColor: "transparent",
              borderColor: "transparent",
            },
          ]}
          elevation={0}
        >
          <Card.Content>
            {/* Path Display */}
            <View style={styles.challengeCardHeader}>
              <View style={styles.challengeCardTitleRow}>
                <Text
                  style={[
                    styles.challengeCardTitleText,
                    { color: customColors.startNode },
                  ]}
                >
                  {challenge.startWord}
                </Text>
                <Text
                  style={[
                    styles.challengeCardTitleText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {" → "}
                </Text>
                <Text style={styles.pathEllipsis}>
                  {Array.from({ length: challenge.optimalPathLength }).map(
                    (_, i) => (
                      <Text key={`dot-${i}`} style={styles.pathDot}>
                        ●
                      </Text>
                    ),
                  )}
                </Text>
                <Text
                  style={[
                    styles.challengeCardTitleText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {" → "}
                </Text>
                <Text
                  style={[
                    styles.challengeCardTitleText,
                    { color: customColors.endNode },
                  ]}
                >
                  {challenge.targetWord}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Status */}
        {isCompleted ? (
          <View style={styles.statusSection}>
            <Text style={[styles.statusText, { color: colors.primary }]}>
              ✓ Challenge Completed
            </Text>
            {progress?.playerMoves && (
              <Text
                style={[
                  styles.statusSubtext,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Completed in {progress.playerMoves} moves
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.actionSection}>
            {onPlayChallenge && (
              <Button
                mode="contained"
                onPress={onPlayChallenge}
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                contentStyle={styles.playButtonContent}
                textColor={colors.surface}
              >
                Start Challenge
              </Button>
            )}
          </View>
        )}
      </View>

      {/* Snackbar for feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reportHeader: {
    marginBottom: 10,
  },
  dialog: {
    borderRadius: 8,
    maxWidth: 500,
    width: "90%",
    alignSelf: "center",
  },
  dialogText: {
    marginBottom: 16,
    textAlign: "center",
  },
  graphPreviewContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
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
  linkInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    fontFamily: "monospace",
  },
  modernContainer: {
    padding: 16,
    gap: 16,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  challengeDate: {
    fontSize: 16,
    textAlign: "center",
  },
  aiMovesText: {
    fontSize: 14,
    textAlign: "center",
  },
  challengeCard: {
    borderRadius: 12,
  },
  challengeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
  },
  challengeCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeCardTitleText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  challengeCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
  },
  challengeCardInfoText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  statusSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 16,
    textAlign: "center",
  },
  actionSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  readyText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  playButton: {
    borderRadius: 25,
    paddingHorizontal: 8,
  },
  playButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pathEllipsis: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  pathDot: {
    fontSize: 10,
    marginHorizontal: 2,
    color: "#888",
    lineHeight: 12,
  },
  visualizationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  graphContainer: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "transparent",
    marginBottom: 16,
  },
});

export default DailyChallengeReport;
