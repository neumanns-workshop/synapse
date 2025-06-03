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
} from "react-native-paper";

import GameReportDisplay from "./GameReportDisplay";
import GraphVisualization from "./GraphVisualization";
import PlayerPathDisplay from "./PlayerPathDisplay";
import {
  shareDailyChallenge,
  generateDailyChallengeDeepLink,
} from "../services/SharingService";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type { DailyChallenge, DailyChallengeProgress } from "../types/dailyChallenges";
import type { GameReport } from "../utils/gameReportUtils";

interface DailyChallengeReportProps {
  challenge: DailyChallenge;
  progress?: DailyChallengeProgress;
  gameReport?: GameReport;
  onBack: () => void;
  onWordDefinition?: (word: string, pathIndex?: number) => void;
  onAchievementPress?: (achievement: any) => void;
}

const DailyChallengeReport: React.FC<DailyChallengeReportProps> = ({
  challenge,
  progress,
  gameReport,
  onBack,
  onWordDefinition,
  onAchievementPress,
}) => {
  const { colors } = useTheme() as ExtendedTheme;
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
      const aiSteps = challenge.aiSolution?.stepsTaken || challenge.optimalPathLength;
      
      // Use game report data if available, otherwise fallback to progress
      const userSteps = gameReport?.totalMoves || progress?.playerMoves;
      const userCompleted = gameReport ? gameReport.status === "won" : (progress?.completed === true && (progress?.playerMoves || 0) > 0);
      const userGaveUp = gameReport ? gameReport.status === "given_up" : false;

      // For web, show the challenge link in a dialog
      if (Platform.OS === "web") {
        const link = generateDailyChallengeDeepLink(
          challenge.id,
          challenge.startWord,
          challenge.targetWord
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
            icon="arrow-left"
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

  // If no game report, show a simple message (this shouldn't happen for completed challenges)
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.reportHeader}>
        <Button
          icon="arrow-left"
          mode="text"
          onPress={onBack}
          textColor={colors.primary}
        >
          Back to Calendar
        </Button>
      </View>

      <View style={styles.noReportContainer}>
        <Text style={[styles.noReportText, { color: colors.onSurface }]}>
          No game report available for this daily challenge.
        </Text>
        <Text style={[styles.noReportSubtext, { color: colors.onSurfaceVariant }]}>
          Play this challenge to see detailed results.
        </Text>
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
    textAlign: 'center',
  },
  graphPreviewContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  linkInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  noReportContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noReportText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  noReportSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DailyChallengeReport; 