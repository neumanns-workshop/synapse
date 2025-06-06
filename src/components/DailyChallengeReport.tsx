import React, { useRef, useState } from "react";
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
  Surface,
} from "react-native-paper";
import CustomIcon from "./CustomIcon";

import GameReportDisplay from "./GameReportDisplay";
import GraphVisualization from "./GraphVisualization";
import PlayerPathDisplay from "./PlayerPathDisplay";
import {
  shareDailyChallenge,
  generateSecureDailyChallengeDeepLink,
} from "../services/SharingService";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type {
  DailyChallenge,
  DailyChallengeProgress,
} from "../types/dailyChallenges";
import type { GameReport } from "../utils/gameReportUtils";

interface DailyChallengeReportProps {
  challenge: DailyChallenge;
  progress?: DailyChallengeProgress;
  gameReport?: GameReport;
  onBack: () => void;
  onWordDefinition?: (word: string, pathIndex?: number) => void;
  onAchievementPress?: (achievement: any) => void;
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
  const reportSectionRef = useRef(null);
  const graphPreviewRef = useRef(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [challengeLink, setChallengeLink] = useState("");
  const [challengeDialogVisible, setChallengeDialogVisible] = useState(false);

  // Function to copy text to clipboard on web
  const copyToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setSnackbarMessage("Daily challenge link copied to clipboard!");
        setSnackbarVisible(true);
        setChallengeDialogVisible(false);
      } catch (error) {
        setSnackbarMessage("Failed to copy daily challenge link");
        setSnackbarVisible(true);
      }
    }
  };

  // Function to handle daily challenge sharing
  const handleDailyChallengeShare = async () => {
    if (!challenge) {
      return;
    }

    try {
      const aiSteps =
        challenge.aiSolution?.stepsTaken || challenge.optimalPathLength;

      // Use game report data if available, otherwise fallback to progress
      const userSteps = gameReport?.totalMoves || progress?.playerMoves;
      const userCompleted = gameReport
        ? gameReport.status === "won"
        : progress?.completed === true && (progress?.playerMoves || 0) > 0;
      const userGaveUp = gameReport ? gameReport.status === "given_up" : false;

      // For web, show the challenge link in a dialog
      if (Platform.OS === "web") {
        const link = generateSecureDailyChallengeDeepLink(
          challenge.id,
          challenge.startWord,
          challenge.targetWord,
        );
        setChallengeLink(link);
        setChallengeDialogVisible(true);
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
    }
  };

  // If we have a game report, show the exact same layout as game history
  if (gameReport) {
    return (
      <View style={styles.container}>
        <View style={styles.reportHeader}>
          <Button
            icon={() => <CustomIcon source="arrow-left" size={20} color={colors.primary} />}
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
          onWordDefinition={onWordDefinition || (() => {})}
          targetWord={gameReport.targetWord}
        />

        <GameReportDisplay
          report={gameReport}
          onAchievementPress={onAchievementPress}
          onChallengePress={handleDailyChallengeShare}
        />

        {/* Challenge link dialog */}
        <Portal>
          <Dialog
            visible={challengeDialogVisible}
            onDismiss={() => setChallengeDialogVisible(false)}
            style={[styles.dialog, { backgroundColor: colors.surface }]}
          >
            <Dialog.Title style={{ color: colors.primary }}>
              Share Daily Challenge
            </Dialog.Title>
            <Dialog.Content>
              <Text
                style={[styles.dialogText, { color: colors.onSurfaceVariant }]}
              >
                Share this link to challenge friends with this daily puzzle!
              </Text>

              {/* Graph preview for challenge */}
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
                onPress={() => copyToClipboard(challengeLink)}
                mode="contained"
                textColor={colors.onPrimary}
              >
                Copy Link
              </Button>
              <Button
                onPress={() => setChallengeDialogVisible(false)}
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
          icon={() => <CustomIcon source="arrow-left" size={20} color={colors.primary} />}
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
