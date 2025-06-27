import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Surface,
  Chip,
  ProgressBar,
  Dialog,
  TextInput,
  Snackbar,
} from "react-native-paper";

import { useAuth } from "../context/AuthContext";
import { useTheme as useAppTheme } from "../context/ThemeContext";
import { allAchievements, Achievement } from "../features/achievements";
import type {
  WordCollection,
  WordCollectionWithStatus,
} from "../features/wordCollections";
import {
  shareChallenge,
  generateSecureGameDeepLink,
  generateSecureDailyChallengeDeepLink,
  generateChallengeMessage,
  generateDailyChallengeTaunt,
  encodeGameReportForSharing,
} from "../services/SharingService";
import {
  loadGameHistory,
  getLifetimeStats,
  getUnlockedAchievementIds,
  getWordCollectionsProgress,
  resetAllPlayerData,
  type LifetimeStats,
  type WordCollectionProgress,
} from "../services/StorageAdapter";
import { unifiedDataStore } from "../services/UnifiedDataStore";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type { GameReport } from "../utils/gameReportUtils";
import WordDefinitionDialog from "./WordDefinitionDialog";
import { QRCodeDisplay } from "./QRCodeDisplay";
import PlayerPathDisplay from "./PlayerPathDisplay";
import GraphVisualization from "./GraphVisualization";
import GameReportDisplay from "./GameReportDisplay";
import CustomIcon from "./CustomIcon";
import AchievementDetailDialog from "./AchievementDetailDialog";
import ModalCloseButton from "./ModalCloseButton";

// GameHistoryCard component for displaying game history entries
const GameHistoryCard = React.memo(
  ({
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
                          <CustomIcon
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
                  {`${report.moveAccuracy.toFixed(1)}% (${
                    report.totalMoves
                  } ${report.totalMoves === 1 ? "move" : "moves"})`}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  },
);

// AchievementCard component for displaying achievement items
const AchievementCard = React.memo(
  ({
    achievement,
    unlocked,
    theme,
    onPress,
    progressiveCount,
  }: {
    achievement: Achievement;
    unlocked: boolean;
    theme: ExtendedTheme;
    onPress: (achievement: Achievement) => void;
    progressiveCount?: number;
  }) => {
    const displayName =
      achievement.isProgressive && progressiveCount && progressiveCount > 0
        ? `${achievement.name} ${progressiveCount}x`
        : achievement.name;

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
                <CustomIcon
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
                  {displayName}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  },
);

// Updated WordCollectionCard - Using Surface instead of Card to avoid text node errors
const WordCollectionCard = ({
  collection,
  progress,
  theme,
}: {
  collection: WordCollectionWithStatus;
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

  // Determine styling based on availability
  const isAvailable = collection.isCurrentlyAvailable;
  const cardOpacity = isAvailable ? 1 : 0.5;
  const textColor = isAvailable
    ? theme.colors.primary
    : theme.colors.onSurfaceDisabled;
  const progressTextColor = isAvailable
    ? theme.colors.onSurfaceVariant
    : theme.colors.onSurfaceDisabled;

  // Using Surface instead of Card, with standard Views instead of Card.Content
  return (
    <>
      <TouchableOpacity
        onPress={showWordDialog}
        disabled={!isWordlistViewable}
        activeOpacity={isWordlistViewable ? 0.7 : 1}
        style={{ opacity: cardOpacity }}
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
                    <CustomIcon
                      source={collection.icon}
                      size={24}
                      color={textColor}
                    />
                  </View>
                )}
                <Text
                  style={[styles.wordCollectionNameText, { color: textColor }]}
                >
                  {collection.title}
                </Text>
              </View>

              <Text style={[styles.progressText, { color: progressTextColor }]}>
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
                  color={
                    isAvailable
                      ? theme.customColors.collectedWordChip
                      : theme.colors.onSurfaceDisabled
                  }
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
          <ModalCloseButton onPress={hideWordDialog} />
          <View style={styles.wordDialogHeader}>
            <View style={styles.wordDialogTitle}>
              {collection.icon && (
                <View style={styles.wordDialogIconWrapper}>
                  <CustomIcon
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
    <View
      style={[
        styles.highlightStatBox,
        { backgroundColor: appTheme.colors.surface },
      ]}
    >
      <View style={styles.highlightStatHeader}>
        <CustomIcon source={icon} size={20} color={iconColor} />
        <Text
          style={[
            styles.highlightStatLabel,
            { color: appTheme.colors.onSurfaceVariant },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.highlightStatValueContainer}>
        <Text
          style={[
            styles.highlightStatValue,
            { color: appTheme.colors.onSurface },
          ]}
        >
          {value}
        </Text>
        {unit && (
          <Text
            style={[
              styles.highlightStatUnit,
              { color: appTheme.colors.onSurfaceVariant },
            ]}
          >
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

// Component for W/L Ratio Display
const WLRatioDisplay = ({
  wins: winCountInput,
  totalGames: totalGamesInput,
  theme,
}) => {
  const currentTotalGames = totalGamesInput || 0;
  const currentWins = winCountInput || 0;
  const currentLosses = currentTotalGames - currentWins;

  const winPercentage =
    currentTotalGames > 0 ? (currentWins / currentTotalGames) * 100 : 0;
  const lossPercentage =
    currentTotalGames > 0
      ? (currentLosses / currentTotalGames) * 100
      : currentTotalGames === 0
        ? 100
        : 0;

  return (
    <View style={styles.wlRatioBarWithLabels}>
      <View style={[styles.wlRatioLine, { borderColor: theme.colors.outline }]}>
        <View
          style={[
            styles.wlRatioWinsSegment,
            {
              width: `${winPercentage}%`,
              backgroundColor: theme.customColors.startNode,
            },
          ]}
        />
        <View
          style={[
            styles.wlRatioLossesSegment,
            {
              width: `${lossPercentage}%`,
              backgroundColor:
                currentTotalGames > 0
                  ? theme.customColors.warningColor
                  : theme.colors.surfaceDisabled,
            },
          ]}
        />
      </View>
    </View>
  );
};

// --- Main StatsModal ---
const StatsModal = () => {
  const { theme: appTheme } = useAppTheme();
  const { user } = useAuth();
  const statsModalVisible = useGameStore((state) => state.statsModalVisible);
  const setStatsModalVisible = useGameStore(
    (state) => state.setStatsModalVisible,
  );
  const wordCollections = useGameStore((state) => state.wordCollections);
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);

  // State
  const [activeTab, setActiveTab] = useState<"history" | "progress">("history");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<GameReport[]>([]);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(
    null,
  );
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<
    string[]
  >([]);
  const [unviewedAchievementCount, setUnviewedAchievementCount] = useState(0);
  const [collectionsProgress, setCollectionsProgress] =
    useState<WordCollectionProgress>({});
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
  const [progressiveAchievementCounts, setProgressiveAchievementCounts] =
    useState<Record<string, number>>({});

  // Collapsible section state for Progress tab
  const [lifetimeStatsExpanded, setLifetimeStatsExpanded] = useState(true);
  const [difficultyAnalysisExpanded, setDifficultyAnalysisExpanded] =
    useState(true);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [collectionsExpanded, setCollectionsExpanded] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (statsModalVisible) {
      const loadData = async () => {
        try {
          const [historyData, lifetimeData, achievementIds, collectionsData] =
            await Promise.all([
              loadGameHistory(),
              getLifetimeStats(),
              getUnlockedAchievementIds(),
              getWordCollectionsProgress(),
            ]);

          // Load progressive achievement counts
          const progressiveCounts =
            await unifiedDataStore.getProgressiveAchievementCounts();

          setHistory(historyData);
          setLifetimeStats(lifetimeData);
          setUnlockedAchievementIds(achievementIds);
          setCollectionsProgress(collectionsData);
          setProgressiveAchievementCounts(progressiveCounts);

          // Load unviewed achievements
          await refreshUnviewedAchievements();
        } catch (error) {
          console.error("Error loading stats data:", error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [statsModalVisible]);

  // Handle game history item press - now shows game report modal
  const showGameReportModal = useGameStore(
    (state) => state.showGameReportModal,
  );
  const handleReportPress = useCallback(
    (report: GameReport) => {
      showGameReportModal(report);
    },
    [showGameReportModal],
  );

  // Show achievement detail modal
  const showAchievementDetail = useCallback((achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setAchievementDialogVisible(true);
  }, []);

  // Memoized render functions for FlatList optimization
  const renderGameHistoryItem = useCallback(
    ({ item }: { item: GameReport }) => (
      <GameHistoryCard
        report={item}
        theme={appTheme}
        onPress={() => handleReportPress(item)}
        onAchievementPress={showAchievementDetail}
      />
    ),
    [appTheme, handleReportPress, showAchievementDetail],
  );

  const keyExtractor = useCallback((item: GameReport) => item.id, []);

  // Calculate consistent item height for getItemLayout optimization
  const GAME_HISTORY_ITEM_HEIGHT = 120; // Approximate height of GameHistoryCard

  const getItemLayout = useCallback(
    (data: ArrayLike<GameReport> | null | undefined, index: number) => ({
      length: GAME_HISTORY_ITEM_HEIGHT,
      offset: GAME_HISTORY_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

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
  const hideAchievementDetail = () => {
    setSelectedAchievement(null);
    setAchievementDialogVisible(false);
  };

  const markAchievementsAsViewed = async () => {
    try {
      await unifiedDataStore.markMultipleAchievementsAsViewed(
        unlockedAchievementIds,
      );
      // Refresh the count after marking as viewed
      await refreshUnviewedAchievements();
    } catch (error) {
      console.error("Error marking achievements as viewed:", error);
    }
  };

  const markWordCollectionsAsViewed = async () => {
    try {
      const completedIds = await unifiedDataStore.getCompletedWordCollections();
      await unifiedDataStore.markMultipleWordCollectionsAsViewed(completedIds);
      // Note: The count will be refreshed when the modal closes via AppHeader
    } catch (error) {
      console.error("Error marking word collections as viewed:", error);
    }
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

  // Aggregate lifetime stats from gameHistory
  const aggregateStats = (
    history: GameReport[],
  ): {
    totalGamesPlayed: number;
    totalWins: number;
    totalGaveUps: number;
    totalMoves: number;
    averageMovesPerGame: string;
    averageMoveAccuracy: string;
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
        averageMovesPerGame: "0.00",
        averageMoveAccuracy: "0.0",
        averageSimilarityPerMove: "0.000",
        totalBacktracks: 0,
        totalDistanceTraveled: "0.00",
        averageDistanceTraveled: "0.00",
        optimalGames: 0,
        bestGame: null,
      };
    }
    let totalMoves = 0;
    let totalMoveAccuracy = 0;
    let totalSimilarity = 0;
    let similarityCount = 0;
    let totalBacktracks = 0;
    let totalDistanceTraveled = 0;
    let totalWins = 0;
    let totalGaveUps = 0;
    let optimalGames = 0;
    let bestGame: GameReport | null = null;
    let bestMoves = Infinity;
    history.forEach((game, idx) => {
      totalMoves += game.totalMoves || 0;
      totalMoveAccuracy += game.moveAccuracy || 0;
      if (typeof game.averageSimilarity === "number") {
        totalSimilarity += game.averageSimilarity;
        similarityCount++;
      }
      if (game.backtrackEvents && Array.isArray(game.backtrackEvents)) {
        totalBacktracks += game.backtrackEvents.length;
      }
      totalDistanceTraveled += game.playerSemanticDistance || 0;
      if (game.status === "won") totalWins++;
      if (game.status === "given_up") totalGaveUps++;
      // Optimal game: playerPath matches optimalPath
      if (
        Array.isArray(game.playerPath) &&
        Array.isArray(game.optimalPath) &&
        game.playerPath.length === game.optimalPath.length &&
        game.playerPath.every((w, i) => w === game.optimalPath[i])
      ) {
        optimalGames++;
      }
      // Best game: fewest moves for won games, or highest accuracy for given up games
      const currentMoves = game.totalMoves || Infinity;
      if (game.status === "won" && currentMoves < bestMoves) {
        bestMoves = currentMoves;
        bestGame = history[idx];
      } else if (
        !bestGame ||
        (bestGame.status !== "won" && game.status === "won")
      ) {
        bestMoves = currentMoves;
        bestGame = history[idx];
      }
    });
    const totalGamesPlayed = history.length;
    return {
      totalGamesPlayed,
      totalWins,
      totalGaveUps,
      totalMoves,
      averageMovesPerGame:
        totalGamesPlayed > 0
          ? (totalMoves / totalGamesPlayed).toFixed(2)
          : "0.00",
      averageMoveAccuracy:
        totalGamesPlayed > 0
          ? (totalMoveAccuracy / totalGamesPlayed).toFixed(1)
          : "0.0",
      averageSimilarityPerMove:
        similarityCount > 0
          ? (totalSimilarity / similarityCount).toFixed(3)
          : "0.000",
      totalBacktracks,
      totalDistanceTraveled: totalDistanceTraveled.toFixed(2),
      averageDistanceTraveled:
        totalGamesPlayed > 0
          ? (totalDistanceTraveled / totalGamesPlayed).toFixed(2)
          : "0.00",
      optimalGames,
      bestGame,
    };
  };

  const stats = aggregateStats(history);

  // Function to refresh unviewed achievements
  const refreshUnviewedAchievements = async () => {
    try {
      const unlockedIds = await unifiedDataStore.getUnlockedAchievements();
      const viewedIds = await unifiedDataStore.getViewedAchievementIds();
      const unviewedCount = unlockedIds.filter(
        (id) => !viewedIds.includes(id),
      ).length;
      setUnviewedAchievementCount(unviewedCount);
    } catch (error) {
      console.error("Error refreshing unviewed achievements:", error);
    }
  };

  // Tab content components
  const renderHistoryTab = () => {
    return (
      <FlatList
        data={history}
        keyExtractor={keyExtractor}
        renderItem={renderGameHistoryItem}
        getItemLayout={getItemLayout}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
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
      wordCollections.forEach((collection) => {
        const progress = collectionsProgress[collection.id];
        if (
          collection.words &&
          collection.words.length > 0 &&
          progress &&
          progress.collectedWords
        ) {
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
        ? (
            (lifetimeStats.cumulativeMoveAccuracySum || 0) / gamesPlayed
          ).toFixed(1)
        : "0.0";

    const actualAchievementsUnlocked = unlockedAchievementIds.length;

    // Analyze games by difficulty (path length)
    const difficultyAnalysis = (() => {
      if (!history || history.length === 0) {
        return null;
      }

      const byDifficulty: Record<
        number,
        {
          total: number;
          wins: number;
          totalMoves: number;
          totalAccuracy: number;
          optimalGames: number;
          bestGame: GameReport | null;
        }
      > = {};

      history.forEach((game) => {
        const difficulty = (game.optimalPath?.length || 1) - 1; // Convert path length to moves
        if (!byDifficulty[difficulty]) {
          byDifficulty[difficulty] = {
            total: 0,
            wins: 0,
            totalMoves: 0,
            totalAccuracy: 0,
            optimalGames: 0,
            bestGame: null,
          };
        }

        const stats = byDifficulty[difficulty];
        stats.total += 1;
        if (game.status === "won") stats.wins += 1;
        stats.totalMoves += game.totalMoves || 0;
        stats.totalAccuracy += game.moveAccuracy || 0;

        // Check if this is an optimal game (player path matches optimal path exactly)
        if (
          Array.isArray(game.playerPath) &&
          Array.isArray(game.optimalPath) &&
          game.playerPath.length === game.optimalPath.length &&
          game.playerPath.every((w, i) => w === game.optimalPath[i])
        ) {
          stats.optimalGames += 1;
        }

        // Track best game for this difficulty (fewest moves for won games, then any game)
        const currentMoves = game.totalMoves || Infinity;
        const bestMoves = stats.bestGame?.totalMoves || Infinity;

        if (
          !stats.bestGame ||
          (game.status === "won" && stats.bestGame.status !== "won") ||
          (game.status === "won" &&
            stats.bestGame.status === "won" &&
            currentMoves < bestMoves)
        ) {
          stats.bestGame = game;
        }
      });

      return byDifficulty;
    })();

    // Component for collapsible section header
    const CollapsibleSectionHeader = ({
      title,
      expanded,
      onToggle,
    }: {
      title: string;
      expanded: boolean;
      onToggle: () => void;
    }) => (
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.collapsibleHeaderContent}>
          <View>
            <Text
              style={[
                styles.lifetimeStatsTitle,
                { color: appTheme.colors.primary, marginBottom: 0 },
              ]}
            >
              {title}
            </Text>
          </View>
        </View>
        <CustomIcon
          source={expanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={appTheme.colors.primary}
        />
      </TouchableOpacity>
    );

    // Component for difficulty analysis row
    const DifficultyRow = ({
      difficulty,
      stats,
    }: {
      difficulty: number;
      stats: {
        total: number;
        wins: number;
        totalMoves: number;
        totalAccuracy: number;
        optimalGames: number;
        bestGame: GameReport | null;
      };
    }) => {
      const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
      const avgMoves = stats.total > 0 ? stats.totalMoves / stats.total : 0;
      const avgAccuracy =
        stats.total > 0 ? stats.totalAccuracy / stats.total : 0;
      const optimalRate =
        stats.total > 0 ? (stats.optimalGames / stats.total) * 100 : 0;

      // Determine path length color (no difficulty labels)
      const getPathLengthColor = (moves: number) => {
        if (moves === 3) return appTheme.customColors.startNode; // 3 moves - green
        if (moves === 4) return appTheme.customColors.currentNode; // 4 moves - blue
        if (moves === 5) return appTheme.customColors.localOptimalNode; // 5 moves - purple
        if (moves === 6) return appTheme.customColors.warningColor; // 6 moves - orange
        if (moves === 7) return appTheme.customColors.endNode; // 7 moves - red
        return appTheme.colors.onSurface; // fallback for any outliers
      };

      const pathLengthColor = getPathLengthColor(difficulty);

      return (
        <View
          style={[
            styles.difficultyRow,
            { borderColor: appTheme.colors.outline },
          ]}
        >
          <View style={styles.difficultyHeader}>
            <View style={styles.difficultyLabelContainer}>
              <View
                style={[
                  styles.difficultyDot,
                  { backgroundColor: pathLengthColor },
                ]}
              />
              <Text
                style={[
                  styles.difficultyLabel,
                  { color: appTheme.colors.onSurface },
                ]}
              >
                {difficulty} moves
              </Text>
            </View>
            <Text
              style={[
                styles.difficultyGamesCount,
                { color: appTheme.colors.onSurfaceVariant },
              ]}
            >
              {stats.total} game{stats.total !== 1 ? "s" : ""}
            </Text>
          </View>

          <View style={styles.difficultyStats}>
            <View style={styles.difficultyStatItem}>
              <Text
                style={[
                  styles.difficultyStatLabel,
                  { color: appTheme.colors.onSurfaceVariant },
                ]}
              >
                Win Rate
              </Text>
              <Text
                style={[
                  styles.difficultyStatValue,
                  { color: appTheme.colors.onSurface },
                ]}
              >
                {winRate.toFixed(0)}%
              </Text>
            </View>

            <View style={styles.difficultyStatItem}>
              <Text
                style={[
                  styles.difficultyStatLabel,
                  { color: appTheme.colors.onSurfaceVariant },
                ]}
              >
                Avg Moves
              </Text>
              <Text
                style={[
                  styles.difficultyStatValue,
                  { color: appTheme.colors.onSurface },
                ]}
              >
                {avgMoves.toFixed(1)}
              </Text>
            </View>

            <View style={styles.difficultyStatItem}>
              <Text
                style={[
                  styles.difficultyStatLabel,
                  { color: appTheme.colors.onSurfaceVariant },
                ]}
              >
                Avg Accuracy
              </Text>
              <Text
                style={[
                  styles.difficultyStatValue,
                  { color: appTheme.colors.onSurface },
                ]}
              >
                {avgAccuracy.toFixed(0)}%
              </Text>
            </View>

            <View style={styles.difficultyStatItem}>
              <Text
                style={[
                  styles.difficultyStatLabel,
                  { color: appTheme.colors.onSurfaceVariant },
                ]}
              >
                Optimal Games
              </Text>
              <Text
                style={[
                  styles.difficultyStatValue,
                  { color: appTheme.colors.onSurface },
                ]}
              >
                {stats.optimalGames} ({optimalRate.toFixed(0)}%)
              </Text>
            </View>
          </View>
        </View>
      );
    };

    return (
      <ScrollView contentContainerStyle={styles.tabContentContainerPadded}>
        {/* Lifetime Stats Section */}
        <Card
          style={[
            styles.statsSummaryCard,
            {
              backgroundColor: appTheme.colors.surfaceVariant,
              borderColor: appTheme.colors.outline,
            },
          ]}
        >
          <Card.Content style={styles.statsCardContent}>
            <CollapsibleSectionHeader
              title="Lifetime Stats"
              expanded={lifetimeStatsExpanded}
              onToggle={() => setLifetimeStatsExpanded(!lifetimeStatsExpanded)}
            />

            {lifetimeStatsExpanded && (
              <View style={styles.statLineItemList}>
                {(() => {
                  const statItems = [
                    { label: "Games Played", value: stats.totalGamesPlayed },
                    { label: "Wins", value: stats.totalWins },
                    {
                      label: "Win Rate",
                      value:
                        stats.totalGamesPlayed > 0
                          ? Math.round(
                              (stats.totalWins / stats.totalGamesPlayed) * 100,
                            ) + "%"
                          : "0%",
                    },
                    { label: "Games Given Up", value: stats.totalGaveUps },
                    {
                      label: "Avg. Moves/Game",
                      value: stats.averageMovesPerGame,
                    },
                    {
                      label: "Avg. Move Accuracy",
                      value: stats.averageMoveAccuracy + "%",
                    },
                    { label: "Total Backtracks", value: stats.totalBacktracks },
                    {
                      label: "Achievements",
                      value: `${unlockedAchievementIds.length} of ${allAchievements.length}`,
                    },
                    {
                      label: "Total Semantic Distance",
                      value: stats.totalDistanceTraveled,
                    },
                    {
                      label: "Avg. Distance/Game",
                      value: stats.averageDistanceTraveled,
                    },
                    { label: "Optimal Games", value: stats.optimalGames },
                  ];

                  return statItems.map((item, index) => (
                    <View key={index}>
                      <View style={styles.statsLineItemRow}>
                        <Text
                          style={[
                            styles.statsLineItemLabel,
                            { color: appTheme.colors.onSurface },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.statsLineItemValue,
                            { color: appTheme.colors.onSurface },
                          ]}
                        >
                          {item.value}
                        </Text>
                      </View>
                      {index < statItems.length - 1 && (
                        <View
                          style={[
                            styles.statsLineItemDivider,
                            { borderBottomColor: appTheme.colors.outline },
                          ]}
                        />
                      )}
                    </View>
                  ));
                })()}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Performance by Difficulty Section */}
        <Card
          style={[
            styles.statsSummaryCard,
            {
              backgroundColor: appTheme.colors.surfaceVariant,
              borderColor: appTheme.colors.outline,
              marginTop: 16,
            },
          ]}
        >
          <Card.Content style={styles.statsCardContent}>
            <CollapsibleSectionHeader
              title="Performance by Path Length"
              expanded={difficultyAnalysisExpanded}
              onToggle={() =>
                setDifficultyAnalysisExpanded(!difficultyAnalysisExpanded)
              }
            />

            {difficultyAnalysisExpanded && (
              <View style={{ marginTop: 16 }}>
                {difficultyAnalysis &&
                Object.keys(difficultyAnalysis).length > 0 ? (
                  Object.entries(difficultyAnalysis)
                    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                    .map(([difficulty, stats]) => (
                      <DifficultyRow
                        key={difficulty}
                        difficulty={parseInt(difficulty, 10)}
                        stats={stats}
                      />
                    ))
                ) : (
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: appTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    Play some games to see your performance by difficulty level.
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Achievements Section */}
        <Card
          style={[
            styles.statsSummaryCard,
            {
              backgroundColor: appTheme.colors.surfaceVariant,
              borderColor: appTheme.colors.outline,
              marginTop: 16,
            },
          ]}
        >
          <Card.Content style={styles.statsCardContent}>
            <CollapsibleSectionHeader
              title={
                unviewedAchievementCount > 0
                  ? `Achievements (${unviewedAchievementCount})`
                  : "Achievements"
              }
              expanded={achievementsExpanded}
              onToggle={() => {
                setAchievementsExpanded(!achievementsExpanded);
                // Mark achievements as viewed when section is opened or closed
                markAchievementsAsViewed();
              }}
            />

            {achievementsExpanded && (
              <View style={{ marginTop: 8 }}>
                {allAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={unlockedAchievementIds.includes(achievement.id)}
                    theme={appTheme}
                    onPress={showAchievementDetail}
                    progressiveCount={
                      progressiveAchievementCounts[achievement.id]
                    }
                  />
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Word Collections Section */}
        <Card
          style={[
            styles.statsSummaryCard,
            {
              backgroundColor: appTheme.colors.surfaceVariant,
              borderColor: appTheme.colors.outline,
              marginTop: 16,
            },
          ]}
        >
          <Card.Content style={styles.statsCardContent}>
            <CollapsibleSectionHeader
              title="Word Collections"
              expanded={collectionsExpanded}
              onToggle={() => {
                setCollectionsExpanded(!collectionsExpanded);
                // Mark word collections as viewed when section is opened or closed
                markWordCollectionsAsViewed();
              }}
            />

            {collectionsExpanded && (
              <View style={[styles.wordCollectionsContainer, { marginTop: 8 }]}>
                {wordCollections.map((collection) => {
                  const progress = collectionsProgress[collection.id];
                  const collectedCount = progress?.collectedWords?.length || 0;
                  const totalWords = collection.words?.length || 0;
                  const isCompleted =
                    collectedCount === totalWords && totalWords > 0;

                  return (
                    <WordCollectionCard
                      key={collection.id}
                      collection={collection}
                      progress={progress?.collectedWords || []}
                      theme={appTheme}
                    />
                  );
                })}
              </View>
            )}
          </Card.Content>
        </Card>
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
        <View
          style={[
            styles.header,
            { borderBottomColor: appTheme.colors.outline },
          ]}
        >
          <Text style={[styles.title, { color: appTheme.colors.primary }]}>
            Player Stats & History
          </Text>
          <ModalCloseButton onPress={() => setStatsModalVisible(false)} />
        </View>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: "history", label: "History" },
            {
              value: "progress",
              label:
                unviewedAchievementCount > 0
                  ? `Progress (${unviewedAchievementCount})`
                  : "Progress",
            },
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 28,
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginBottom: 15,
    marginTop: 8,
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
    padding: 5,
  },
  reportHeader: {
    marginBottom: 10,
  },
  graphContainer: {
    height: 300,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 8,
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
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    height: 22,
    width: "100%",
    borderRadius: 11,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 6,
  },
  wlRatioBarRow: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  wlRatioBarWithLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    maxWidth: 400,
    minWidth: 120,
    marginTop: 8,
  },
  wlRatioLine: {
    flexDirection: "row",
    height: 2,
    width: "100%",
    overflow: "hidden",
    borderWidth: 0,
    marginHorizontal: 12,
  },
  wlRatioWinsSegment: {
    height: "100%",
  },
  wlRatioLossesSegment: {
    height: "100%",
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
    marginBottom: 15,
    paddingRight: 40,
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
    maxHeight: "60%",
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
    margin: 20,
    padding: 15,
    borderRadius: 12,
    maxHeight: "70%",
    flex: 1,
    borderWidth: 1,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    paddingTop: 40,
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
  highlightStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  highlightStatValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
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
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
    paddingVertical: 4,
    justifyContent: "space-between",
  },
  statsLineItemLabel: {
    fontSize: 16,
    color: "#fff",
    textAlign: "left",
    flex: 1,
  },
  statsLineItemValue: {
    fontSize: 16,
    color: "#fff",
    textAlign: "right",
    minWidth: 40,
    fontVariant: ["tabular-nums"],
  },
  statsLineItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#8886",
  },
  difficultyRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  difficultyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  difficultyLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  difficultyLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  difficultyGamesCount: {
    fontSize: 14,
  },
  difficultyStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  difficultyStatItem: {
    alignItems: "center",
    flex: 1,
  },
  difficultyStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  difficultyStatValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  wordCollectionsContainer: {
    gap: 8,
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    marginBottom: 8,
  },
  collapsibleHeaderContent: {
    flex: 1,
  },
  emptyStateText: {
    textAlign: "center",
  },
  closeButton: {},
  closeText: {
    fontSize: 14,
  },
});

export default StatsModal;
