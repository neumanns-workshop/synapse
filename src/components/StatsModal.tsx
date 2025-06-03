import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";

import * as ExpoClipboard from "expo-clipboard";
import {
  Modal,
  Portal,
  Text,
  Button,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Icon,
  Surface,
  Chip,
  ProgressBar,
  Dialog,
  TextInput,
  Snackbar,
} from "react-native-paper";

import AchievementDetailDialog from "./AchievementDetailDialog";
import GameReportDisplay from "./GameReportDisplay";
import GraphVisualization from "./GraphVisualization";
import PlayerPathDisplay from "./PlayerPathDisplay";
import WordDefinitionDialog from "./WordDefinitionDialog";
import DailyChallengesCalendar from "./DailyChallengesCalendar";
import DailyChallengeReport from "./DailyChallengeReport";
import { useTheme as useAppTheme } from "../context/ThemeContext";
import { allAchievements, Achievement } from "../features/achievements";
import type { WordCollection } from "../features/wordCollections";
import type { DailyChallenge } from "../types/dailyChallenges";
import {
  shareChallenge,
  generateGameDeepLink,
  generateDailyChallengeDeepLink,
} from "../services/SharingService";
import {
  loadGameHistory,
  getLifetimeStats,
  LifetimeStats,
  getUnlockedAchievementIds,
  getWordCollectionsProgress,
  WordCollectionProgress,
} from "../services/StorageService";
import { dailyChallengesService } from "../services/DailyChallengesService";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type { GameReport } from "../utils/gameReportUtils";

// GameHistoryCard component for displaying game history entries
const GameHistoryCard = ({
  report,
  theme,
  onPress,
  onAchievementPress,
}: {
  report: GameReport;
  theme: ExtendedTheme;
  onPress: () => void;
  onAchievementPress: (achievement: Achievement) => void;
}) => {
  const date = new Date(report.timestamp);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Status indicator color
  const statusColor =
    report.status === "won"
      ? theme.customColors.startNode
      : theme.customColors.warningColor;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card
        style={[
          styles.historyCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <Card.Content>
          <View style={styles.historyCardHeader}>
            <View style={styles.historyCardTitleRow}>
              <Text
                style={[
                  styles.historyCardTitleText,
                  { color: theme.colors.primary },
                ]}
              >
                {report.startWord} → {report.targetWord}
              </Text>
              <View
                style={[styles.statusBadge, { backgroundColor: statusColor }]}
              >
                <Text style={styles.statusBadgeText}>
                  {report.status === "won" ? "WON" : "GAVE UP"}
                </Text>
              </View>
            </View>
            <View style={styles.historyCardInfoRow}>
              <Text
                style={[
                  styles.historyCardInfoText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {formattedDate} at {formattedTime}
              </Text>
              {report.earnedAchievements &&
                report.earnedAchievements.length > 0 && (
                  <View style={styles.trophyContainer}>
                    {report.earnedAchievements.map((achievement, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.trophyIconTouchable}
                        onPress={() => onAchievementPress(achievement)}
                      >
                        <Icon
                          source="trophy"
                          size={16}
                          color={theme.customColors.achievementIcon}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </View>
          </View>

          <View style={styles.historyCardStats}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.historyCardInfoText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Moves
              </Text>
              <Text style={{ color: theme.colors.onSurface }}>
                {report.totalMoves}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.historyCardInfoText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Accuracy
              </Text>
              <Text style={{ color: theme.colors.onSurface }}>
                {report.moveAccuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.historyCardInfoText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Efficiency{report.status === "given_up" ? " (Projected)" : ""}
              </Text>
              <Text style={{ color: theme.colors.onSurface }}>
                {report.semanticPathEfficiency?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// AchievementCard component for displaying achievement items
const AchievementCard = ({
  achievement,
  unlocked,
  theme,
  onPress,
}: {
  achievement: Achievement;
  unlocked: boolean;
  theme: ExtendedTheme;
  onPress: (achievement: Achievement) => void;
}) => {
  return (
    <TouchableOpacity
      onPress={() => (unlocked ? onPress(achievement) : null)}
      disabled={!unlocked}
      activeOpacity={unlocked ? 0.7 : 1}
    >
      <Card
        style={[
          styles.achievementCard,
          {
            backgroundColor: unlocked
              ? theme.colors.surfaceVariant
              : theme.colors.surfaceDisabled,
            borderColor: theme.colors.outline,
          },
          unlocked
            ? styles.unlockedAchievementCard
            : styles.lockedAchievementCard,
        ]}
      >
        <Card.Content>
          <View style={styles.achievementCardContent}>
            <View style={styles.achievementIconContainer}>
              <Icon
                source={unlocked ? "trophy" : "trophy-outline"}
                size={24}
                color={
                  unlocked
                    ? theme.customColors.achievementIcon
                    : theme.colors.onSurfaceDisabled
                }
              />
            </View>
            <View style={styles.achievementText}>
              <Text
                style={[
                  styles.achievementCardNameText,
                  {
                    color: unlocked
                      ? theme.colors.primary
                      : theme.colors.onSurfaceDisabled,
                  },
                ]}
              >
                {achievement.name}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// Updated WordCollectionCard - Using Surface instead of Card to avoid text node errors
const WordCollectionCard = ({
  collection,
  progress,
  theme,
}: {
  collection: WordCollection;
  progress: string[];
  theme: ExtendedTheme;
}) => {
  // Local state for word collection dialog
  const [wordDialogVisible, setWordDialogVisible] = useState(false);

  const collectedCount = progress.length;
  const totalWordsInCollection = collection.words.length;

  const progressPercentage =
    totalWordsInCollection > 0 ? collectedCount / totalWordsInCollection : 0;

  if (totalWordsInCollection === 0) {
  }

  const showWordDialog = () => {
    setWordDialogVisible(true);
  };

  const hideWordDialog = () => {
    setWordDialogVisible(false);
  };

  // Determine if the wordlist button should be enabled
  const isWordlistViewable =
    collection.isWordlistViewable || progress.length > 0;

  // Determine which words to show in the dialog
  const wordsToShow = collection.isWordlistViewable
    ? collection.words
    : progress;

  // Using Surface instead of Card, with standard Views instead of Card.Content
  return (
    <>
      <TouchableOpacity
        onPress={showWordDialog}
        disabled={!isWordlistViewable}
        activeOpacity={isWordlistViewable ? 0.7 : 1}
      >
        <Surface
          style={[
            styles.wordCollectionCardSurface,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
            isWordlistViewable
              ? styles.viewableCollectionCard
              : styles.nonViewableCollectionCard,
          ]}
          elevation={1}
        >
          {/* Main content: header, description, progress bar */}
          <View style={styles.wordCollectionCardMainContent}>
            <View style={styles.wordCollectionHeader}>
              <View style={styles.wordCollectionTitle}>
                {collection.icon && (
                  <View style={styles.wordCollectionIconWrapper}>
                    <Icon
                      source={collection.icon}
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                )}
                <Text
                  style={[
                    styles.wordCollectionNameText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {collection.title}
                </Text>
              </View>

              <Text
                style={[
                  styles.progressText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {collectedCount} / {totalWordsInCollection}
              </Text>
            </View>

            <View style={styles.wordCollectionProgressContainer}>
              <View
                style={[
                  styles.progressBarWrapper,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              >
                <ProgressBar
                  progress={progressPercentage}
                  color={theme.customColors.collectedWordChip}
                  style={styles.progressBarInner}
                />
              </View>
            </View>
          </View>
        </Surface>
      </TouchableOpacity>

      {/* Word Collection Dialog */}
      <Portal>
        <Modal
          visible={wordDialogVisible}
          onDismiss={hideWordDialog}
          contentContainerStyle={[
            styles.wordCollectionDialogContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <View style={styles.wordDialogHeader}>
            <View style={styles.wordDialogTitle}>
              {collection.icon && (
                <View style={styles.wordDialogIconWrapper}>
                  <Icon
                    source={collection.icon}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.wordDialogNameText,
                  { color: theme.colors.primary },
                ]}
              >
                {collection.title}{" "}
                {collection.isWordlistViewable ? "Wordlist" : "Collected Words"}
              </Text>
            </View>
            <Button onPress={hideWordDialog}>Close</Button>
          </View>

          <ScrollView style={styles.wordDialogScrollView}>
            <View style={styles.wordDialogContent}>
              {wordsToShow.map((word, index) => (
                <Chip
                  key={index}
                  mode="flat"
                  style={[
                    styles.wordDialogChip,
                    {
                      backgroundColor: progress.includes(word)
                        ? theme.customColors.collectedWordChip
                        : theme.colors.surfaceDisabled,
                    },
                    progress.includes(word)
                      ? styles.collectedWordChip
                      : styles.notCollectedWordChip,
                  ]}
                  textStyle={[
                    styles.wordDialogChipText,
                    {
                      color: progress.includes(word)
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceDisabled,
                    },
                  ]}
                >
                  {word}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
};

// Add new HighlightStatBox component
const HighlightStatBox = ({ label, value, unit = "", icon, iconColor }) => {
  const { theme: appTheme } = useAppTheme();
  
  return (
    <View style={[styles.highlightStatBox, { backgroundColor: appTheme.colors.surface }]}>
      <View style={styles.highlightStatHeader}>
        <Icon source={icon} size={20} color={iconColor} />
        <Text style={[styles.highlightStatLabel, { color: appTheme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      </View>
      <View style={styles.highlightStatValueContainer}>
        <Text style={[styles.highlightStatValue, { color: appTheme.colors.onSurface }]}>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.highlightStatUnit, { color: appTheme.colors.onSurfaceVariant }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

// Component for W/L Ratio Display
const WLRatioDisplay = ({ wins: winCountInput, totalGames: totalGamesInput, theme }) => {
  const currentTotalGames = totalGamesInput || 0;
  const currentWins = winCountInput || 0;
  const currentLosses = currentTotalGames - currentWins;

  const winPercentage = currentTotalGames > 0 ? (currentWins / currentTotalGames) * 100 : 0;
  const lossPercentage = currentTotalGames > 0 ? (currentLosses / currentTotalGames) * 100 : (currentTotalGames === 0 ? 100 : 0);

  return (
    <View style={styles.wlRatioBarWithLabels}>
      <View style={[styles.wlRatioLine, { borderColor: theme.colors.outline }]}> 
        <View style={[styles.wlRatioWinsSegment, { width: `${winPercentage}%`, backgroundColor: theme.customColors.startNode }]} />
        <View style={[styles.wlRatioLossesSegment, { width: `${lossPercentage}%`, backgroundColor: currentTotalGames > 0 ? theme.customColors.warningColor : theme.colors.surfaceDisabled }]} />
      </View>
    </View>
  );
};

// --- Main StatsModal ---
const StatsModal = () => {
  const {
    statsModalVisible,
    setStatsModalVisible,
    wordCollections,
    setPathDisplayMode,
  } = useGameStore((state) => ({
    statsModalVisible: state.statsModalVisible,
    setStatsModalVisible: state.setStatsModalVisible,
    wordCollections: state.wordCollections,
    setPathDisplayMode: state.setPathDisplayMode,
  }));
  const { theme: appTheme } = useAppTheme();
  const historicalReportRef = useRef(null);
  const graphPreviewRef = useRef(null);

  // State
  const [activeTab, setActiveTab] = useState("history");
  const [gameHistory, setGameHistory] = useState<GameReport[]>([]);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(
    null,
  );
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<
    string[]
  >([]);
  const [collectionsProgress, setCollectionsProgress] =
    useState<WordCollectionProgress>({});
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<GameReport | null>(null);
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
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // State for historical challenge sharing
  const [historicalChallengeLink, setHistoricalChallengeLink] = useState("");
  const [
    historicalChallengeDialogVisible,
    setHistoricalChallengeDialogVisible,
  ] = useState(false);

  // State for daily challenge selection
  const [selectedDailyChallenge, setSelectedDailyChallenge] = useState<DailyChallenge | null>(null);
  const [dailyChallengeProgress, setDailyChallengeProgress] = useState<Record<string, any>>({});

  // Load data when modal opens
  useEffect(() => {
    if (statsModalVisible) {
      const loadData = async () => {
        try {
          const [
            historyData,
            lifetimeData,
            achievementIds,
            collectionsData,
          ] = await Promise.all([
            loadGameHistory(),
            getLifetimeStats(),
            getUnlockedAchievementIds(),
            getWordCollectionsProgress(),
          ]);

          // Load daily challenge progress
          const dailyProgress = await dailyChallengesService.getDailyChallengeProgress();

          setGameHistory(historyData);
          setLifetimeStats(lifetimeData);
          setUnlockedAchievementIds(achievementIds);
          setCollectionsProgress(collectionsData);
          setDailyChallengeProgress(dailyProgress);
        } catch (error) {
          console.error("Error loading stats data:", error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [statsModalVisible]);

  // Handle game history item press
  const handleReportPress = (report: GameReport) => {
    setSelectedReport(report);
  };

  // Close selected report view
  const handleBackToHistory = () => {
    setSelectedReport(null);
  };

  // Handle word definition in history view
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

  // Function to copy text to clipboard on web (can be reused)
  const copyToClipboard = async (text: string) => {
    try {
      if (Platform.OS === "web") {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          setSnackbarMessage("Link copied to clipboard!");
        } else {
          // Fallback for older browsers or if navigator.clipboard is not available
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          setSnackbarMessage("Link copied to clipboard (fallback)!");
        }
      } else {
        // Native platforms
        await ExpoClipboard.setStringAsync(text);
        setSnackbarMessage("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setSnackbarMessage("Failed to copy link.");
    }
    setSnackbarVisible(true);
  };

  // Function to prepare the challenge preview graph
  const prepareHistoricalGraphPreview = () => {
    setPathDisplayMode({
      player: true,
      optimal: false,
      suggested: false,
    });
  };

  // Function to handle challenge sharing from historical report
  const handleChallengeShareInHistory = async () => {
    if (!selectedReport) {
      return;
    }

    try {
      const { startWord, targetWord, playerPath } = selectedReport;
      const pathLength = playerPath ? playerPath.length - 1 : 0;
      // const timeInSeconds = (timestamp - (selectedReport.startTime || timestamp)) / 1000;

      // Prepare graph view for preview (player path only)
      prepareHistoricalGraphPreview();

      if (Platform.OS === "web") {
        // Check if this is a daily challenge and generate appropriate link
        let link: string;
        if (selectedReport.isDailyChallenge && selectedReport.dailyChallengeId) {
          link = generateDailyChallengeDeepLink(
            selectedReport.dailyChallengeId,
            startWord,
            targetWord
          );
        } else {
          link = generateGameDeepLink(startWord, targetWord);
        }
        setHistoricalChallengeLink(link);
        setHistoricalChallengeDialogVisible(true);
      } else {
        const success = await shareChallenge({
          startWord,
          targetWord,
          playerPath,
          screenshotRef: graphPreviewRef, // Use the graph preview ref for sharing
          steps: pathLength,
          // timeInSeconds, // Removed
        });

        if (success) {
          setSnackbarMessage("Challenge shared successfully!");
        } else {
          setSnackbarMessage("Sharing canceled or failed.");
        }
        setSnackbarVisible(true);
      }
    } catch (error) {
      setSnackbarMessage("Error sharing challenge.");
      setSnackbarVisible(true);
    }
  };

  // Aggregate lifetime stats from gameHistory
  const aggregateStats = (history: GameReport[]): {
    totalGamesPlayed: number;
    totalWins: number;
    totalGaveUps: number;
    totalMoves: number;
    averageMovesPerGame: string;
    averageMoveAccuracy: string;
    averageSemanticPathEfficiency: string;
    averageSimilarityPerMove: string;
    totalBacktracks: number;
    totalDistanceTraveled: string;
    averageDistanceTraveled: string;
    optimalGames: number;
    bestGame: GameReport | null;
  } => {
    if (!history || history.length === 0) {
      return {
        totalGamesPlayed: 0,
        totalWins: 0,
        totalGaveUps: 0,
        totalMoves: 0,
        averageMovesPerGame: '0.00',
        averageMoveAccuracy: '0.0',
        averageSemanticPathEfficiency: '0.0',
        averageSimilarityPerMove: '0.000',
        totalBacktracks: 0,
        totalDistanceTraveled: '0.00',
        averageDistanceTraveled: '0.00',
        optimalGames: 0,
        bestGame: null,
      };
    }
    let totalMoves = 0;
    let totalMoveAccuracy = 0;
    let totalSemanticPathEfficiency = 0;
    let totalSimilarity = 0;
    let similarityCount = 0;
    let totalBacktracks = 0;
    let totalDistanceTraveled = 0;
    let totalWins = 0;
    let totalGaveUps = 0;
    let optimalGames = 0;
    let bestGame: GameReport | null = null;
    let bestEfficiency = -1;
    let bestMoves = Infinity;
    history.forEach((game, idx) => {
      totalMoves += game.totalMoves || 0;
      totalMoveAccuracy += game.moveAccuracy || 0;
      totalSemanticPathEfficiency += game.semanticPathEfficiency || 0;
      if (typeof game.averageSimilarity === 'number') {
        totalSimilarity += game.averageSimilarity;
        similarityCount++;
      }
      if (game.backtrackEvents && Array.isArray(game.backtrackEvents)) {
        totalBacktracks += game.backtrackEvents.length;
      }
      totalDistanceTraveled += game.playerSemanticDistance || 0;
      if (game.status === 'won') totalWins++;
      if (game.status === 'given_up') totalGaveUps++;
      // Optimal game: playerPath matches optimalPath
      if (
        Array.isArray(game.playerPath) &&
        Array.isArray(game.optimalPath) &&
        game.playerPath.length === game.optimalPath.length &&
        game.playerPath.every((w, i) => w === game.optimalPath[i])
      ) {
        optimalGames++;
      }
      // Best game: highest semanticPathEfficiency, then fewest moves
      const eff = game.semanticPathEfficiency ?? -1;
      if (
        eff > bestEfficiency ||
        (eff === bestEfficiency && (game.totalMoves || Infinity) < bestMoves)
      ) {
        bestEfficiency = eff;
        bestMoves = game.totalMoves || Infinity;
        // Always use the reference from gameHistory
        bestGame = history[idx];
      }
    });
    const totalGamesPlayed = history.length;
    return {
      totalGamesPlayed,
      totalWins,
      totalGaveUps,
      totalMoves,
      averageMovesPerGame: totalGamesPlayed > 0 ? (totalMoves / totalGamesPlayed).toFixed(2) : '0.00',
      averageMoveAccuracy: totalGamesPlayed > 0 ? (totalMoveAccuracy / totalGamesPlayed).toFixed(1) : '0.0',
      averageSemanticPathEfficiency: totalGamesPlayed > 0 ? (totalSemanticPathEfficiency / totalGamesPlayed).toFixed(1) : '0.0',
      averageSimilarityPerMove: similarityCount > 0 ? (totalSimilarity / similarityCount).toFixed(3) : '0.000',
      totalBacktracks,
      totalDistanceTraveled: totalDistanceTraveled.toFixed(2),
      averageDistanceTraveled: totalGamesPlayed > 0 ? (totalDistanceTraveled / totalGamesPlayed).toFixed(2) : '0.00',
      optimalGames,
      bestGame,
    };
  };

  const stats = aggregateStats(gameHistory);

  // Tab content components
  const renderHistoryTab = () => {
    if (selectedReport) {
      return (
        <View style={styles.reportContainer} ref={historicalReportRef}>
          <View style={styles.reportHeader}>
            <Button
              icon="arrow-left"
              mode="text"
              onPress={handleBackToHistory}
              textColor={appTheme.colors.primary}
            >
              Back to History
            </Button>
          </View>

          <PlayerPathDisplay
            playerPath={selectedReport.playerPath}
            optimalChoices={selectedReport.optimalChoices}
            suggestedPath={selectedReport.suggestedPath}
            onWordDefinition={showWordDefinition}
            targetWord={selectedReport.targetWord}
          />

          <GameReportDisplay
            report={selectedReport}
            onAchievementPress={showAchievementDetail}
            onChallengePress={handleChallengeShareInHistory}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={gameHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GameHistoryCard
            report={item}
            theme={appTheme}
            onPress={() => handleReportPress(item)}
            onAchievementPress={showAchievementDetail}
          />
        )}
        ListEmptyComponent={
          <Text
            style={[
              styles.emptyTabText,
              { color: appTheme.colors.onSurface },
              styles.historyListEmpty,
            ]}
          >
            No game history yet. Play a game to see your stats!
          </Text>
        }
        contentContainerStyle={styles.tabContentContainerPadded}
      />
    );
  };

  const renderProgressTab = () => {
    let completedCollectionsCount = 0;
    if (wordCollections && Object.keys(collectionsProgress).length > 0) {
      wordCollections.forEach(collection => {
        const progress = collectionsProgress[collection.id];
        if (collection.words && collection.words.length > 0 && progress && progress.collectedWords) {
          if (progress.collectedWords.length === collection.words.length) {
            completedCollectionsCount++;
          }
        }
      });
    }

    const gamesPlayed = lifetimeStats?.totalGamesPlayed || 0;
    const wins = lifetimeStats?.totalWins || 0;
    // const losses = gamesPlayed - wins; // Calculated inside WLRatioDisplay

    const averageMoveAccuracy =
      lifetimeStats && gamesPlayed > 0
        ? ((lifetimeStats.cumulativeMoveAccuracySum || 0) / gamesPlayed).toFixed(1)
        : "0.0";

    const actualAchievementsUnlocked = unlockedAchievementIds.length;

    // Component for stat boxes in the highlight section with icon support
    const HighlightStatBox = ({ label, value, unit = "", icon, iconColor }: { label: string, value: string | number, unit?: string, icon?: string, iconColor?: string }) => (
      <View style={styles.highlightStatBox}>
        <View style={styles.iconValueRow}>
          {icon && (
            <Icon
              source={icon}
              size={28}
              color={iconColor || appTheme.colors.primary}
            />
          )}
          <Text style={[styles.highlightStatValue, { color: appTheme.colors.primary, marginLeft: icon ? 8 : 0 }]}>{value}{unit}</Text>
        </View>
        <Text style={[styles.highlightStatLabel, { color: appTheme.colors.onSurfaceVariant }]}>{label}</Text>
      </View>
    );

    // Component for W/L Ratio Display
    const WLRatioDisplay = ({ wins: winCountInput, totalGames: totalGamesInput, theme }) => {
      const currentTotalGames = totalGamesInput || 0;
      const currentWins = winCountInput || 0;
      const currentLosses = currentTotalGames - currentWins;
    
      const winPercentage = currentTotalGames > 0 ? (currentWins / currentTotalGames) * 100 : 0;
      const lossPercentage = currentTotalGames > 0 ? (currentLosses / currentTotalGames) * 100 : (currentTotalGames === 0 ? 100 : 0);
    
      return (
        <View style={styles.wlRatioBarWithLabels}>
          <View style={[styles.wlRatioLine, { borderColor: theme.colors.outline }]}> 
            <View style={[styles.wlRatioWinsSegment, { width: `${winPercentage}%`, backgroundColor: theme.customColors.startNode }]} />
            <View style={[styles.wlRatioLossesSegment, { width: `${lossPercentage}%`, backgroundColor: currentTotalGames > 0 ? theme.customColors.warningColor : theme.colors.surfaceDisabled }]} />
          </View>
        </View>
      );
    };

    return (
      <ScrollView contentContainerStyle={styles.tabContentContainerPadded}>
        <Card style={[styles.statsSummaryCard, { backgroundColor: appTheme.colors.surfaceVariant, borderColor: appTheme.colors.outline }]}> 
          <Card.Content style={styles.statsCardContent}>
            <Text style={[styles.lifetimeStatsTitle, { color: appTheme.colors.primary }]}>Lifetime Stats</Text>
            <View style={styles.statLineItemList}>
              {(() => {
                const statItems = [
                  { label: 'Games Played', value: stats.totalGamesPlayed },
                  { label: 'Wins', value: stats.totalWins },
                  { label: 'Win Rate', value: stats.totalGamesPlayed > 0 ? Math.round((stats.totalWins / stats.totalGamesPlayed) * 100) + '%' : '0%' },
                  { label: 'Games Given Up', value: stats.totalGaveUps },
                  { label: 'Avg. Moves/Game', value: stats.averageMovesPerGame },
                  { label: 'Avg. Move Accuracy', value: stats.averageMoveAccuracy + '%' },
                  { label: 'Total Backtracks', value: stats.totalBacktracks },
                  { label: 'Achievements', value: unlockedAchievementIds.length },
                  { label: 'Total Distance', value: stats.totalDistanceTraveled },
                  { label: 'Optimal Games', value: stats.optimalGames },
                ];
                return statItems.map((item, idx) => (
                  <View
                    key={item.label}
                    style={[
                      styles.statsLineItemRow,
                      idx !== statItems.length - 1 && styles.statsLineItemDivider,
                    ]}
                  >
                    <Text style={styles.statsLineItemLabel}>{item.label}</Text>
                    <Text style={styles.statsLineItemValue}>{item.value}</Text>
                  </View>
                ));
              })()}
            </View>
          </Card.Content>
        </Card>

        <Text
          style={[
            styles.sectionTitle,
            styles.achievementsSectionTitle,
            { color: appTheme.colors.primary },
          ]}
        >
          Achievements
        </Text>

        {allAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            unlocked={unlockedAchievementIds.includes(achievement.id)}
            theme={appTheme}
            onPress={showAchievementDetail}
          />
        ))}

        {/* Word Collections Section */}
        <Text
          style={[
            styles.sectionTitle,
            styles.achievementsSectionTitle,
            { color: appTheme.colors.primary },
          ]}
        >
          Word Collections
        </Text>

        {wordCollections.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Icon
            source="card-search-outline"
            size={48}
            color={appTheme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.emptyTabText,
              { color: appTheme.colors.onSurface },
              styles.eventsTabEmptyText,
            ]}
          >
            No word collections available. Play more to discover them!
          </Text>
        </View>
        ) : (
          wordCollections.map((collection) => {
          const collectionProgress =
            collectionsProgress[collection.id]?.collectedWords || [];

          return (
            <WordCollectionCard
              key={collection.id}
              collection={collection}
              progress={collectionProgress}
              theme={appTheme}
            />
          );
          })
        )}
      </ScrollView>
    );
  };

  const renderDailyChallengesTab = () => {
    const handleChallengeSelect = async (challenge: DailyChallenge) => {
      setSelectedDailyChallenge(challenge);
    };

    const handleBackToCalendar = () => {
      setSelectedDailyChallenge(null);
    };

    // If a challenge is selected, show the report
    if (selectedDailyChallenge) {
      // Fix: Look up progress by challenge ID, not date
      const progress = dailyChallengeProgress[selectedDailyChallenge.id];
      
      // Try to find a game report for this daily challenge
      // Look for a game that was specifically marked as a daily challenge
      const challengeGameReport = gameHistory.find(report => 
        report.startWord === selectedDailyChallenge.startWord &&
        report.targetWord === selectedDailyChallenge.targetWord && // Now both use targetWord
        // Check if this was marked as a daily challenge
        report.isDailyChallenge === true &&
        // More flexible date matching - check multiple date formats
        (new Date(report.timestamp).toDateString() === new Date(selectedDailyChallenge.date).toDateString() ||
         new Date(report.timestamp).toISOString().split('T')[0] === selectedDailyChallenge.date)
      );
      
      console.log('Daily Challenge:', selectedDailyChallenge.startWord, '→', selectedDailyChallenge.targetWord);
      console.log('Found Report:', challengeGameReport ? `${challengeGameReport.startWord} → ${challengeGameReport.targetWord}` : 'NONE');

      return (
        <DailyChallengeReport
          challenge={selectedDailyChallenge}
          progress={progress}
          gameReport={challengeGameReport}
          onBack={handleBackToCalendar}
          onWordDefinition={showWordDefinition}
          onAchievementPress={showAchievementDetail}
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.tabContentContainerPadded}>
        <DailyChallengesCalendar onChallengeSelect={handleChallengeSelect} />
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text
            style={[
              styles.loadingTabText,
              { color: appTheme.colors.onSurface },
            ]}
          >
            Loading stats...
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case "history":
        return renderHistoryTab();
      case "progress":
        return renderProgressTab();
      case "events":
        return renderDailyChallengesTab();
      default:
        return null;
    }
  };

  return (
    <Portal>
      <Modal
        visible={statsModalVisible}
        onDismiss={() => setStatsModalVisible(false)}
        contentContainerStyle={[
          styles.modalContent,
          {
            backgroundColor: appTheme.colors.surface,
            borderColor: appTheme.colors.outline,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={{ ...styles.title, color: appTheme.colors.primary }}>
            Player Statistics
          </Text>
          <Button
            onPress={() => setStatsModalVisible(false)}
            textColor={appTheme.colors.primary}
          >
            Close
          </Button>
        </View>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: "history", label: "History" },
            { value: "progress", label: "Progress" },
            { value: "events", label: "Daily Challenges" },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.tabContent}>{renderTabContent()}</View>

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

        {/* Historical Challenge Link Dialog (for Web & Native) */}
        <Portal>
          <Dialog
            visible={historicalChallengeDialogVisible}
            onDismiss={() => setHistoricalChallengeDialogVisible(false)}
            style={[
              styles.dialogStyle,
              { backgroundColor: appTheme.colors.surface },
            ]}
          >
            <Dialog.Title style={{ color: appTheme.colors.primary }}>
              Challenge a Friend
            </Dialog.Title>
            <Dialog.Content>
              <Text
                style={[
                  styles.dialogText,
                  { color: appTheme.colors.onSurfaceVariant },
                ]}
              >
                Share this link for a friend to play this exact game!
              </Text>

              <View style={styles.graphPreviewContainer} ref={graphPreviewRef}>
                {selectedReport && (
                  <GraphVisualization
                    height={180}
                    gameReport={selectedReport}
                    pathDisplayModeOverride={{
                      player: true,
                      optimal: false,
                      suggested: false,
                    }}
                  />
                )}
              </View>

              <TextInput
                value={historicalChallengeLink}
                style={[
                  styles.linkInput,
                  {
                    borderColor: appTheme.colors.outline,
                    color: appTheme.colors.onSurface,
                    backgroundColor: appTheme.colors.surfaceVariant,
                  },
                ]}
                editable={false}
                selectTextOnFocus
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => copyToClipboard(historicalChallengeLink)}
                mode="contained"
                textColor={appTheme.colors.onPrimary}
              >
                Copy Link
              </Button>
              <Button
                onPress={() => setHistoricalChallengeDialogVisible(false)}
                mode="outlined"
                textColor={appTheme.colors.primary}
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
          style={{ backgroundColor: appTheme.colors.inverseSurface }}
        >
          <Text style={{ color: appTheme.colors.inverseOnSurface }}>
            {snackbarMessage}
          </Text>
        </Snackbar>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    padding: 15,
    borderRadius: 12,
    maxHeight: '90%',
    flex: 1,
    borderWidth: 1,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
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
  segmentedButtons: {
    marginHorizontal: 0,
    marginBottom: 15,
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainerPadded: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  historyCard: {
    marginBottom: 12,
    elevation: 1,
    borderWidth: 1,
  },
  historyCardHeader: {
    marginBottom: 8,
  },
  historyCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  historyCardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  statItem: {
    alignItems: "center",
  },
  trophyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportContainer: {
    flex: 1,
  },
  reportHeader: {
    marginBottom: 10,
  },
  statsSummaryCard: {
    marginBottom: 15,
    borderWidth: 1,
  },
  statsCardContent: { 
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  lifetimeStatsTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  highlightSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  highlightStatBox: {
    alignItems: "center",
    flex: 1,
    padding: 8,
  },
  iconValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  highlightStatValue: {
    fontSize: 26,
    fontWeight: "bold",
  },
  highlightStatLabel: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  wlRatioBar: {
    flexDirection: 'row',
    height: 22,
    width: '100%',
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 6,
  },
  wlRatioBarRow: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  wlRatioBarWithLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    maxWidth: 400,
    minWidth: 120,
    marginTop: 8,
  },
  wlRatioLine: {
    flexDirection: 'row',
    height: 2,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 0,
    marginHorizontal: 12,
  },
  wlRatioWinsSegment: {
    height: '100%',
  },
  wlRatioLossesSegment: {
    height: '100%',
  },
  wlRatioPercentage: {
    fontSize: 14,
    marginLeft: 8,
  },
  historyCardTitleText: {
    fontWeight: "bold",
  },
  historyCardInfoText: {
    fontSize: 12,
  },
  trophyIconTouchable: {
    marginLeft: 4,
  },
  emptyTabText: {
    textAlign: "center",
  },
  historyListEmpty: {
    marginTop: 20,
  },
  eventsTabEmptyText: {
    marginTop: 16,
  },
  loadingTabText: {
    marginTop: 10,
  },
  achievementCard: {
    marginBottom: 8,
    borderWidth: 1,
  },
  unlockedAchievementCard: {
    opacity: 1,
  },
  lockedAchievementCard: {
    opacity: 0.7,
  },
  achievementCardNameText: {
    fontWeight: "bold",
  },
  achievementCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  achievementIconContainer: {
    marginRight: 12,
  },
  achievementText: {
    flex: 1,
  },
  wordCollectionCard: {
    marginBottom: 12,
  },
  wordCollectionCardSurface: {
    marginBottom: 12,
    borderWidth: 1,
  },
  viewableCollectionCard: {
    opacity: 1,
  },
  nonViewableCollectionCard: {
    opacity: 0.7,
  },
  wordCollectionCardMainContent: {
    padding: 16,
  },
  wordCollectionIconWrapper: {
    marginRight: 8,
  },
  wordCollectionNameText: {
    fontWeight: "bold",
  },
  wordCollectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  wordCollectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  wordCollectionProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  progressBarWrapper: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    padding: 2,
    marginRight: 8,
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  progressText: {
    fontSize: 12,
    minWidth: 45,
    textAlign: "right",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  wordDialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  wordDialogTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordDialogIconWrapper: {
    marginRight: 8,
  },
  wordDialogNameText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  wordDialogScrollView: {
    maxHeight: '60%',
  },
  wordDialogChip: {
    margin: 4,
  },
  collectedWordChip: {
    opacity: 1,
  },
  notCollectedWordChip: {
    opacity: 0.7,
  },
  wordDialogChipText: {
    fontSize: 14,
  },
  wordDialogContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  wordCollectionDialogContainer: {
    padding: 20,
    margin: 16,
    borderRadius: 8,
    maxWidth: 700,
    width: '90%',
    maxHeight: '90%',
    alignSelf: 'center',
    borderWidth: 1,
  },
  dialogStyle: {
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
  graphPreviewContainer: {
    height: 180,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  highlightStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightStatValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  highlightStatUnit: {
    fontSize: 16,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  achievementsSectionTitle: {
    marginTop: 16,
  },
  statLineItemList: {
    marginTop: 8,
    marginBottom: 8,
  },
  statsLineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  statsLineItemLabel: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'left',
    flex: 1,
  },
  statsLineItemValue: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'right',
    minWidth: 40,
    fontVariant: ['tabular-nums'],
  },
  statsLineItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8886',
  },
});

export default StatsModal;
