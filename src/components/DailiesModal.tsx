import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  Modal,
  Portal,
  Text,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import type { RootStackParamList } from "../App";

import { useTheme as useAppTheme } from "../context/ThemeContext";
import { allAchievements, Achievement } from "../features/achievements";
import { dailyChallengesService } from "../services/DailyChallengesService";
import { loadGameHistory } from "../services/StorageAdapter";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type {
  DailyChallenge,
  DailyChallengeProgress,
} from "../types/dailyChallenges";
import type { GameReport } from "../utils/gameReportUtils";
import WordDefinitionDialog from "./WordDefinitionDialog";
import DailyChallengesCalendar from "./DailyChallengesCalendar";
import DailyChallengeReport from "./DailyChallengeReport";
import AchievementDetailDialog from "./AchievementDetailDialog";

type DailiesModalNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Synapse"
>;

const DailiesModal = () => {
  const navigation = useNavigation<DailiesModalNavigationProp>();
  const { dailiesModalVisible, setDailiesModalVisible } = useGameStore(
    (state) => ({
      dailiesModalVisible: state.dailiesModalVisible,
      setDailiesModalVisible: state.setDailiesModalVisible,
    }),
  );
  const { theme: appTheme } = useAppTheme();

  // State
  const [gameHistory, setGameHistory] = useState<GameReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [definitionDialogWord, setDefinitionDialogWord] = useState<
    string | null
  >(null);
  const [definitionDialogPathIndex, setDefinitionDialogPathIndex] = useState<
    number | null
  >(null);
  const [definitionDialogVisible, setDefinitionDialogVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [achievementDialogVisible, setAchievementDialogVisible] =
    useState(false);

  // State for daily challenge selection
  const [selectedDailyChallenge, setSelectedDailyChallenge] =
    useState<DailyChallenge | null>(null);
  const [dailyChallengeProgress, setDailyChallengeProgress] = useState<
    Record<string, DailyChallengeProgress>
  >({});

  // Load data when modal opens
  useEffect(() => {
    if (dailiesModalVisible) {
      const loadData = async () => {
        try {
          const [historyData] = await Promise.all([loadGameHistory()]);

          // Load daily challenge progress
          const dailyProgress =
            await dailyChallengesService.getDailyChallengeProgress();

          setGameHistory(historyData);
          setDailyChallengeProgress(dailyProgress);
        } catch (error) {
          console.error("Error loading dailies data:", error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [dailiesModalVisible]);

  // Handle word definition
  const showWordDefinition = (word: string, pathIndex?: number | null) => {
    setDefinitionDialogWord(word);
    setDefinitionDialogPathIndex(pathIndex !== undefined ? pathIndex : null);
    setDefinitionDialogVisible(true);
  };

  const hideWordDefinition = () => {
    setDefinitionDialogVisible(false);
    setDefinitionDialogWord(null);
    setDefinitionDialogPathIndex(null);
  };

  // Achievement dialog functions
  const showAchievementDetail = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setAchievementDialogVisible(true);
  };

  const hideAchievementDetail = () => {
    setSelectedAchievement(null);
    setAchievementDialogVisible(false);
  };

  const renderDailyChallengesContent = () => {
    const handleChallengeSelect = async (challenge: DailyChallenge) => {
      // Look up progress by challenge ID
      const progress = dailyChallengeProgress[challenge.id];

      // Try to find a game report for this daily challenge
      let challengeGameReport: GameReport | undefined;

      // Strategy 1: Match by daily challenge ID (most reliable)
      challengeGameReport = gameHistory.find(
        (report) =>
          report.isDailyChallenge === true &&
          report.dailyChallengeId === challenge.id,
      );

      // Strategy 2: Match by start/target words and daily challenge flag
      if (!challengeGameReport) {
        challengeGameReport = gameHistory.find(
          (report) =>
            report.startWord === challenge.startWord &&
            report.targetWord === challenge.targetWord &&
            report.isDailyChallenge === true,
        );
      }

      // Strategy 3: Match by start/target words and date (less reliable but covers older games)
      if (!challengeGameReport) {
        challengeGameReport = gameHistory.find(
          (report) =>
            report.startWord === challenge.startWord &&
            report.targetWord === challenge.targetWord &&
            // More flexible date matching - check multiple date formats
            (new Date(report.timestamp).toDateString() ===
              new Date(challenge.date).toDateString() ||
              new Date(report.timestamp).toISOString().split("T")[0] ===
                challenge.date),
        );
      }

      // Close the dailies modal
      setDailiesModalVisible(false);

      // Navigate to report screen if we have a completed challenge
      if (challengeGameReport) {
        navigation.navigate("Report", {
          reportData: challengeGameReport,
          source: "daily",
          reportId: challengeGameReport.id,
        });
      } else {
        // If no report exists, show the challenge detail (this could be a separate screen or modal in the future)
        // For now, we'll temporarily set the selected challenge to show the detail
        setSelectedDailyChallenge(challenge);
      }
    };

    const handleBackToCalendar = () => {
      setSelectedDailyChallenge(null);
    };

    const handlePlayChallenge = () => {
      if (selectedDailyChallenge) {
        // Get current game state
        const gameStore = useGameStore.getState();
        const todaysChallenge = gameStore.currentDailyChallenge;

        console.log("🎮 DailiesModal: handlePlayChallenge called", {
          selectedChallengeId: selectedDailyChallenge.id,
          selectedChallengeDate: selectedDailyChallenge.date,
          currentGameStatus: gameStore.gameStatus,
          isDailyChallenge: gameStore.isDailyChallenge,
          hasPlayedTodaysChallenge: gameStore.hasPlayedTodaysChallenge,
          currentDailyChallengeId: gameStore.currentDailyChallenge?.id,
          currentDailyChallengeDate: gameStore.currentDailyChallenge?.date,
        });

        // Check if this challenge is already being played
        if (
          gameStore.gameStatus === "playing" &&
          gameStore.isDailyChallenge &&
          gameStore.currentDailyChallenge?.id === selectedDailyChallenge.id
        ) {
          console.log(
            "🎮 DailiesModal: Same daily challenge already in progress, just closing modal",
          );
          setDailiesModalVisible(false);
          return;
        }

        // Close the dailies modal
        setDailiesModalVisible(false);

        // Check if this is today's daily challenge
        if (
          todaysChallenge &&
          selectedDailyChallenge.id === todaysChallenge.id
        ) {
          // This is today's daily challenge - use the dedicated daily challenge method
          console.log(
            "🎮 DailiesModal: Starting today's daily challenge via startDailyChallengeGame",
          );
          gameStore.startDailyChallengeGame();
        } else {
          // This is a past daily challenge - use the general challenge method
          console.log(
            "🎮 DailiesModal: Starting past daily challenge via startChallengeGame",
          );
          gameStore.startChallengeGame(
            selectedDailyChallenge.startWord,
            selectedDailyChallenge.targetWord,
            selectedDailyChallenge,
          );
        }
      }
    };

    // If a challenge is selected, show the report
    if (selectedDailyChallenge) {
      // Look up progress by challenge ID
      const progress = dailyChallengeProgress[selectedDailyChallenge.id];

      // Try to find a game report for this daily challenge with multiple strategies
      let challengeGameReport: GameReport | undefined;

      // Strategy 1: Match by daily challenge ID (most reliable)
      challengeGameReport = gameHistory.find(
        (report) =>
          report.isDailyChallenge === true &&
          report.dailyChallengeId === selectedDailyChallenge.id,
      );

      // Strategy 2: Match by start/target words and daily challenge flag
      if (!challengeGameReport) {
        challengeGameReport = gameHistory.find(
          (report) =>
            report.startWord === selectedDailyChallenge.startWord &&
            report.targetWord === selectedDailyChallenge.targetWord &&
            report.isDailyChallenge === true,
        );
      }

      // Strategy 3: Match by start/target words and date (less reliable but covers older games)
      if (!challengeGameReport) {
        challengeGameReport = gameHistory.find(
          (report) =>
            report.startWord === selectedDailyChallenge.startWord &&
            report.targetWord === selectedDailyChallenge.targetWord &&
            // More flexible date matching - check multiple date formats
            (new Date(report.timestamp).toDateString() ===
              new Date(selectedDailyChallenge.date).toDateString() ||
              new Date(report.timestamp).toISOString().split("T")[0] ===
                selectedDailyChallenge.date),
        );
      }

      return (
        <DailyChallengeReport
          challenge={selectedDailyChallenge}
          progress={progress}
          gameReport={challengeGameReport}
          onBack={handleBackToCalendar}
          onWordDefinition={showWordDefinition}
          onAchievementPress={showAchievementDetail}
          onPlayChallenge={handlePlayChallenge}
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <DailyChallengesCalendar onChallengeSelect={handleChallengeSelect} />
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: appTheme.colors.onSurface }]}
          >
            Loading daily challenges...
          </Text>
        </View>
      );
    }

    return renderDailyChallengesContent();
  };

  return (
    <Portal>
      <Modal
        visible={dailiesModalVisible}
        onDismiss={() => setDailiesModalVisible(false)}
        contentContainerStyle={[
          styles.modalContent,
          {
            backgroundColor: appTheme.colors.surface,
            borderColor: appTheme.colors.outline,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: appTheme.colors.primary }]}>
            Daily Challenges
          </Text>
          <Button
            onPress={() => setDailiesModalVisible(false)}
            textColor={appTheme.colors.primary}
          >
            Close
          </Button>
        </View>

        <View style={styles.content}>{renderContent()}</View>

        {/* Word Definition Dialog */}
        <WordDefinitionDialog
          word={definitionDialogWord || ""}
          pathIndexInPlayerPath={definitionDialogPathIndex}
          visible={definitionDialogVisible}
          onDismiss={hideWordDefinition}
        />

        {/* Achievement Detail Dialog */}
        <AchievementDetailDialog
          achievement={selectedAchievement}
          visible={achievementDialogVisible}
          onDismiss={hideAchievementDetail}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    padding: 15,
    borderRadius: 12,
    maxHeight: "90%",
    flex: 1,
    borderWidth: 1,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 5,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default DailiesModal;
