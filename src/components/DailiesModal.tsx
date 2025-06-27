import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";

import {
  Modal,
  Portal,
  Text,
  Button,
  ActivityIndicator,
} from "react-native-paper";

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
import ModalCloseButton from "./ModalCloseButton";

const DailiesModal = () => {
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

  // Get game report modal action from store
  const showGameReportModal = useGameStore(
    (state) => state.showGameReportModal,
  );

  const hideAchievementDetail = () => {
    setSelectedAchievement(null);
    setAchievementDialogVisible(false);
  };

  const renderDailyChallengesContent = () => {
    const handleChallengeSelect = async (challenge: DailyChallenge) => {
      // Look up progress by challenge ID
      const progress = dailyChallengeProgress[challenge.id];

      // Try to find a game report for this daily challenge with multiple strategies
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

      // If we found a game report, show it in the modal
      if (challengeGameReport) {
        showGameReportModal(challengeGameReport);
      } else {
        // No game report found, just select the challenge to show details
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

    // If a challenge is selected and it doesn't have a game report, show challenge details
    if (selectedDailyChallenge) {
      const progress = dailyChallengeProgress[selectedDailyChallenge.id];

      return (
        <DailyChallengeReport
          challenge={selectedDailyChallenge}
          progress={progress}
          gameReport={undefined} // Reports are now shown in modal
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
        <ModalCloseButton onPress={() => setDailiesModalVisible(false)} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: appTheme.colors.primary }]}>
            Daily Challenges
          </Text>
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
    paddingRight: 40,
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
