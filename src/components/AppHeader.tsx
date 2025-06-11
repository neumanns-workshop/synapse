import React from "react";
import { Image, StyleSheet, Pressable, View, Text } from "react-native";

import { Appbar, useTheme, Badge, Button, Menu } from "react-native-paper";

import CustomIcon from "./CustomIcon";
// Removed react-native-reanimated imports - using simple buttons instead

import { useAuth } from "../context/AuthContext";
import { getUnreadArticles } from "../data/news";
import { dailyChallengesService } from "../services/DailyChallengesService";
import { unifiedDataStore } from "../services/UnifiedDataStore";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface AppHeaderProps {
  onNewGame: () => void;
  onGiveUp: () => void;
  onShowAuth?: () => void;
  onShowAccount?: () => void;
  newGameDisabled?: boolean;
  giveUpDisabled?: boolean;
  gameInProgress?: boolean;
}

// Simple custom action component without animations - memoized to prevent unnecessary re-renders
const CustomAppbarAction = React.memo<{
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
  style?: any;
}>(({ icon, onPress, disabled, color, style }) => (
  <Appbar.Action
    onPress={onPress}
    disabled={disabled}
    style={style}
    animated={false}
    icon={() => <CustomIcon source={icon} size={24} color={color} />}
  />
));

const AppHeader: React.FC<AppHeaderProps> = ({
  onNewGame,
  onGiveUp,
  onShowAuth,
  onShowAccount,
  newGameDisabled = false,
  giveUpDisabled = false,
  gameInProgress = false,
}) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;
  const auth = useAuth();

  // Updated store selectors for new modal states
  const setQuickstartModalVisible = useGameStore(
    (state) => state.setQuickstartModalVisible,
  );
  const newsModalVisible = useGameStore((state) => state.newsModalVisible);
  const setNewsModalVisible = useGameStore(
    (state) => state.setNewsModalVisible,
  );
  const setContactModalVisible = useGameStore(
    (state) => state.setContactModalVisible,
  );
  const statsModalVisible = useGameStore((state) => state.statsModalVisible);
  const setStatsModalVisible = useGameStore(
    (state) => state.setStatsModalVisible,
  );
  const setDailiesModalVisible = useGameStore(
    (state) => state.setDailiesModalVisible,
  );
  const setLabsModalVisible = useGameStore(
    (state) => state.setLabsModalVisible,
  );
  const showUpgradePrompt = useGameStore((state) => state.showUpgradePrompt);

  // State for tracking unread news count, menu visibility, and premium status
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);
  const [readArticleIds, setReadArticleIds] = React.useState<string[]>([]);
  const [unviewedAchievementCount, setUnviewedAchievementCount] =
    React.useState(0);
  const [unviewedWordCollectionCount, setUnviewedWordCollectionCount] =
    React.useState(0);
  const [hasIncompleteDailyChallenge, setHasIncompleteDailyChallenge] =
    React.useState(false);

  // Function to refresh read articles
  const refreshReadArticles = React.useCallback(async () => {
    try {
      const readIds = await unifiedDataStore.getReadArticleIds();
      setReadArticleIds(readIds);
      const unreadArticles = getUnreadArticles(readIds);
      setUnreadCount(unreadArticles.length);
    } catch (error) {
      console.error("Error refreshing read articles:", error);
    }
  }, []);

  // Function to refresh unviewed achievements
  const refreshUnviewedAchievements = React.useCallback(async () => {
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
  }, []);

  // Function to refresh unviewed word collections
  const refreshUnviewedWordCollections = React.useCallback(async () => {
    try {
      const completedIds = await unifiedDataStore.getCompletedWordCollections();
      const viewedIds = await unifiedDataStore.getViewedWordCollections();
      const unviewedCount = completedIds.filter(
        (id) => !viewedIds.includes(id),
      ).length;
      setUnviewedWordCollectionCount(unviewedCount);
    } catch (error) {
      console.error("Error refreshing unviewed word collections:", error);
    }
  }, []);

  // Function to check for incomplete daily challenge
  const checkIncompleteDailyChallenge = React.useCallback(async () => {
    try {
      console.log("🔍 AppHeader: checkIncompleteDailyChallenge called");

      // First, check if today's challenge is available and completed
      const todaysChallenge = dailyChallengesService.getTodaysChallenge();
      console.log("🔍 AppHeader: Checking today's challenge completion:", {
        todaysChallengeExists: !!todaysChallenge,
        challengeId: todaysChallenge?.id,
      });

      if (!todaysChallenge) {
        console.log(
          "🔍 AppHeader: No today's challenge, setting hasIncompleteDailyChallenge = false",
        );
        setHasIncompleteDailyChallenge(false);
        return;
      }

      // Check both the persistent storage AND the game store state
      const hasCompletedPersistent =
        await dailyChallengesService.hasCompletedTodaysChallenge();
      const gameStore = useGameStore.getState();
      const hasCompletedInStore = gameStore.hasPlayedTodaysChallenge;

      console.log("🔍 AppHeader: Completion check:", {
        hasCompletedPersistent,
        hasCompletedInStore,
        challengeId: todaysChallenge.id,
      });

      // If either indicates completion, consider it completed
      const hasCompleted = hasCompletedPersistent || hasCompletedInStore;

      if (hasCompleted) {
        console.log(
          "🔍 AppHeader: Challenge is completed, setting hasIncompleteDailyChallenge = false",
        );
        setHasIncompleteDailyChallenge(false);
        return;
      }

      // Only if the challenge is NOT completed, then check for unfinished games
      const { loadCurrentGame } = await import("../services/StorageAdapter");
      const savedGame = await loadCurrentGame(false); // Regular game storage (daily challenges now use isChallenge: false)

      console.log("🔍 AppHeader: savedGame:", {
        exists: !!savedGame,
        gameStatus: savedGame?.gameStatus,
        isDailyChallenge: savedGame?.isDailyChallenge,
        challengeId: savedGame?.currentDailyChallengeId,
      });

      if (
        savedGame &&
        savedGame.gameStatus === "playing" &&
        savedGame.isDailyChallenge === true &&
        savedGame.currentDailyChallengeId === todaysChallenge.id
      ) {
        console.log("🔍 AppHeader: Found unfinished daily challenge game");
        setHasIncompleteDailyChallenge(true);
      } else {
        console.log("🔍 AppHeader: No unfinished daily challenge game");
        setHasIncompleteDailyChallenge(false);
      }
    } catch (error) {
      console.error("Error checking daily challenge status:", error);
      setHasIncompleteDailyChallenge(false);
    }
  }, []);

  // Load unread count and premium status on mount
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load read article IDs and calculate unread count
        await refreshReadArticles();

        // Load unviewed achievements
        await refreshUnviewedAchievements();

        // Load unviewed word collections
        await refreshUnviewedWordCollections();

        // Check daily challenge status
        await checkIncompleteDailyChallenge();

        // Load premium status
        const premiumStatus = await dailyChallengesService.isPremiumUser();
        setIsPremium(premiumStatus);
      } catch (error) {
        console.error("Error loading header data:", error);
      }
    };

    loadInitialData();
  }, []);

  // Watch for news modal closing and refresh read articles
  React.useEffect(() => {
    if (!newsModalVisible) {
      // Modal just closed, refresh read articles
      refreshReadArticles();
    }
  }, [newsModalVisible, refreshReadArticles]);

  // Watch for stats modal closing and refresh unviewed achievements and word collections
  React.useEffect(() => {
    if (!statsModalVisible) {
      // Modal just closed, refresh unviewed achievements and word collections
      refreshUnviewedAchievements();
      refreshUnviewedWordCollections();
    }
  }, [
    statsModalVisible,
    refreshUnviewedAchievements,
    refreshUnviewedWordCollections,
  ]);

  // Watch for dailies modal closing and refresh daily challenge status
  const dailiesModalVisible = useGameStore(
    (state) => state.dailiesModalVisible,
  );
  React.useEffect(() => {
    if (!dailiesModalVisible) {
      // Modal just closed, refresh daily challenge status
      checkIncompleteDailyChallenge();
    }
  }, [dailiesModalVisible, checkIncompleteDailyChallenge]);

  // Also refresh achievements periodically when modal is visible (to catch real-time unlocks)
  React.useEffect(() => {
    if (statsModalVisible) {
      const interval = setInterval(() => {
        refreshUnviewedAchievements();
        refreshUnviewedWordCollections();
      }, 2000); // Check every 2 seconds
      return () => clearInterval(interval);
    }
  }, [
    statsModalVisible,
    refreshUnviewedAchievements,
    refreshUnviewedWordCollections,
  ]);

  // Refresh achievements, word collections, and daily challenge status when component is focused/visible
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshUnviewedAchievements();
      refreshUnviewedWordCollections();
      checkIncompleteDailyChallenge();
    }, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Get the highest priority color among all notifications
  // Priority order: Red (high priority news) > Gold (achievements + word collections) > Daily Challenge > Other news
  const getHighestPriorityColor = () => {
    const unreadArticles = getUnreadArticles(readArticleIds);

    // HIGHEST PRIORITY: High priority news (red/coral)
    if (unreadArticles.some((article) => article.priority === "high")) {
      return customColors.endNode; // coral/red
    }

    // SECOND PRIORITY: Unviewed achievements OR completed word collections (gold)
    if (unviewedAchievementCount > 0 || unviewedWordCollectionCount > 0) {
      return customColors.achievementIcon; // Golden color for achievements and collections
    }

    // THIRD PRIORITY: Incomplete daily challenge (blue)
    if (hasIncompleteDailyChallenge) {
      return customColors.currentNode; // blue for daily challenges
    }

    // FOURTH PRIORITY: Medium priority news (blue)
    if (unreadArticles.some((article) => article.priority === "medium")) {
      return customColors.currentNode; // blue
    }

    // LOWEST PRIORITY: Low priority news (green)
    if (unreadArticles.some((article) => article.priority === "low")) {
      return customColors.startNode; // green
    }

    // Default fallback
    return customColors.endNode;
  };

  // Get color specifically for news badges (ignores achievements and daily challenges)
  const getNewsPriorityColor = () => {
    const unreadArticles = getUnreadArticles(readArticleIds);

    if (unreadArticles.length === 0) return customColors.endNode;

    // Check for high priority first
    if (unreadArticles.some((article) => article.priority === "high")) {
      return customColors.endNode; // coral/red
    }
    // Then medium priority
    if (unreadArticles.some((article) => article.priority === "medium")) {
      return customColors.currentNode; // blue
    }
    // Finally low priority (or default)
    return customColors.startNode; // green
  };

  // Removed all animation code - using simple buttons now

  // Handlers
  const handleGameAction = () => {
    if (gameInProgress) {
      if (!giveUpDisabled) {
        onGiveUp();
      }
    } else {
      if (!newGameDisabled) {
        onNewGame();
      }
    }
  };

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleQuickstart = () => {
    setMenuVisible(false);
    setQuickstartModalVisible(true);
  };

  const handleNews = async () => {
    setMenuVisible(false);
    setNewsModalVisible(true);
  };

  const handleStats = () => {
    setMenuVisible(false);
    setStatsModalVisible(true);
  };

  const handleDailies = () => {
    setMenuVisible(false);
    setDailiesModalVisible(true);
    // Clear daily challenge notification immediately when opening modal
    checkIncompleteDailyChallenge();
  };

  const handleUpgrade = () => {
    setMenuVisible(false);
    showUpgradePrompt("", "generalUpgrade");
  };

  const handleLab = () => {
    setMenuVisible(false);
    setLabsModalVisible(true);
  };

  const handleContact = () => {
    setMenuVisible(false);
    setContactModalVisible(true);
  };

  return (
    <Appbar.Header>
      <Image source={require("../../assets/favicon.svg")} style={styles.logo} />

      {/* Title */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={[styles.title, { color: colors.onSurface }]}>Synapse</Text>
      </View>

      {/* Spacer to push action buttons to the right */}
      <View style={{ flex: 1 }} />

      {/* Hamburger Menu */}
      <View style={styles.menuContainer}>
        {/* Auth/Account Button */}
        <Button
          mode="contained"
          onPress={
            auth.user
              ? () => {
                  setMenuVisible(false);
                  onShowAccount?.();
                }
              : () => {
                  setMenuVisible(false);
                  onShowAuth?.();
                }
          }
          compact
          buttonColor={auth.user ? customColors.currentNode : colors.primary}
          icon={() => (
            <CustomIcon source="brain" size={18} color={colors.onPrimary} />
          )}
          style={{ marginRight: 8 }}
          labelStyle={{
            color: colors.onPrimary,
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          {auth.user ? "Account" : "Sign In/Up"}
        </Button>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <CustomAppbarAction
              icon="menu"
              onPress={handleMenuPress}
              color={colors.onSurface}
            />
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          <Menu.Item
            onPress={handleDailies}
            title={
              hasIncompleteDailyChallenge ? (
                <View style={styles.menuTitleWithBadge}>
                  <Text style={{ color: colors.onSurface }}>
                    Daily Challenges
                  </Text>
                  <CustomIcon
                    source="circle-outline"
                    size={16}
                    color={colors.primary}
                  />
                </View>
              ) : (
                "Daily Challenges"
              )
            }
            leadingIcon={() => (
              <CustomIcon
                source="calendar-today"
                size={24}
                color={colors.onSurface}
              />
            )}
            titleStyle={{ color: colors.onSurface }}
          />
          <Menu.Item
            onPress={handleStats}
            title={
              unviewedAchievementCount > 0 ||
              unviewedWordCollectionCount > 0 ? (
                <View style={styles.menuTitleWithBadge}>
                  <Text style={{ color: colors.onSurface }}>Stats</Text>
                  <View
                    style={[
                      styles.menuBadgeSticker,
                      { backgroundColor: customColors.achievementIcon },
                    ]}
                  >
                    <Text style={styles.menuBadgeText}>
                      {unviewedAchievementCount + unviewedWordCollectionCount}
                    </Text>
                  </View>
                </View>
              ) : (
                "Stats"
              )
            }
            leadingIcon={() => (
              <CustomIcon source="trophy" size={24} color={colors.onSurface} />
            )}
            titleStyle={{ color: colors.onSurface }}
          />
          <Menu.Item
            onPress={handleQuickstart}
            title="How to Play"
            leadingIcon={() => (
              <CustomIcon
                source="rocket-launch"
                size={24}
                color={colors.onSurface}
              />
            )}
            titleStyle={{ color: colors.onSurface }}
          />
          <Menu.Item
            onPress={handleLab}
            title="Lab"
            leadingIcon={() => (
              <CustomIcon source="flask" size={24} color={colors.onSurface} />
            )}
            titleStyle={{ color: colors.onSurface }}
          />
          <Menu.Item
            onPress={handleNews}
            title={
              unreadCount > 0 ? (
                <View style={styles.menuTitleWithBadge}>
                  <Text style={{ color: colors.onSurface }}>News</Text>
                  <View
                    style={[
                      styles.menuBadgeSticker,
                      { backgroundColor: getNewsPriorityColor() },
                    ]}
                  >
                    <Text style={styles.menuBadgeText}>{unreadCount}</Text>
                  </View>
                </View>
              ) : (
                "News"
              )
            }
            leadingIcon={() => (
              <CustomIcon
                source="newspaper"
                size={24}
                color={colors.onSurface}
              />
            )}
            titleStyle={{ color: colors.onSurface }}
          />
          <Menu.Item
            onPress={handleContact}
            title="Contact"
            leadingIcon={() => (
              <CustomIcon source="email" size={24} color={colors.onSurface} />
            )}
            titleStyle={{ color: colors.onSurface }}
          />
        </Menu>
        {(unreadCount > 0 ||
          unviewedAchievementCount > 0 ||
          unviewedWordCollectionCount > 0 ||
          hasIncompleteDailyChallenge) && (
          <View
            style={[
              styles.notificationBadge,
              // If it's ONLY a daily challenge notification, make it hollow
              unreadCount === 0 &&
              unviewedAchievementCount === 0 &&
              unviewedWordCollectionCount === 0 &&
              hasIncompleteDailyChallenge
                ? {
                    backgroundColor: "transparent",
                    borderColor: colors.primary,
                    borderWidth: 2,
                  }
                : { backgroundColor: getHighestPriorityColor() },
            ]}
          />
        )}
      </View>

      {/* Smart Game Action Icon - New Game or Give Up */}
      <CustomAppbarAction
        icon={gameInProgress ? "flag-variant" : "refresh"}
        onPress={handleGameAction}
        disabled={gameInProgress ? giveUpDisabled : newGameDisabled}
        color={gameInProgress ? customColors.endNode : customColors.startNode}
      />
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 40,
    height: 40,
    marginLeft: 8,
    marginRight: 8,
    marginVertical: 8,
  },
  title: {
    fontWeight: "bold",
    fontSize: 24,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuTitleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuBadgeSticker: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

export default AppHeader;
