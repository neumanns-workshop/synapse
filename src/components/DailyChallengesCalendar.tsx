import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

import {
  Text,
  Card,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import CustomIcon from "./CustomIcon";

import { allWordCollections } from "../features/wordCollections";
import type { WordCollection } from "../features/wordCollections/collection.types";
import { dailyChallengesService } from "../services/DailyChallengesService";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type {
  DailyChallenge,
  DailyChallengeProgress,
} from "../types/dailyChallenges";

interface DailyChallengesCalendarProps {
  onChallengeSelect?: (challenge: DailyChallenge) => void;
}

const DailyChallengesCalendar: React.FC<DailyChallengesCalendarProps> = ({
  onChallengeSelect,
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [progress, setProgress] = useState<
    Record<string, DailyChallengeProgress>
  >({});
  const [loading, setLoading] = useState(true);

  // Access upgrade prompt function from game store
  const showUpgradePrompt = useGameStore((state) => state.showUpgradePrompt);

  useEffect(() => {
    loadChallengesForMonth();
  }, [currentMonth]);

  const loadChallengesForMonth = async () => {
    setLoading(true);
    try {
      // Get first and last day of the month
      const firstDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );
      const lastDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      );

      const startDate = firstDay.toISOString().split("T")[0];
      const endDate = lastDay.toISOString().split("T")[0];

      const monthChallenges = dailyChallengesService.getChallengesInRange(
        startDate,
        endDate,
      );
      const challengeProgress =
        await dailyChallengesService.getDailyChallengeProgress();

      setChallenges(monthChallenges);
      setProgress(challengeProgress);
    } catch (error) {
      console.error("Error loading challenges for month:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getDaysInMonth = (): (number | null)[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getChallengeForDay = (day: number): DailyChallenge | null => {
    // Create date string directly without timezone conversion to avoid date shifts
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateString = `${year}-${month}-${dayStr}`;

    return (
      challenges.find((challenge) => challenge.date === dateString) || null
    );
  };

  const getChallengeStatus = (challenge: DailyChallenge | null) => {
    if (!challenge) return "unavailable";

    // Use EST timezone for consistent daily reset timing
    const now = new Date();
    const estDate = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, "0");
    const day = String(estDate.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;

    const isToday = challenge.date === today;
    const isAvailable = dailyChallengesService.isChallengeAvailable(
      challenge.date,
    );
    const isCompleted = progress[challenge.id]?.completed;

    // If it's completed, determine status based on move accuracy
    if (isCompleted) {
      const playerMoves = progress[challenge.id]?.playerMoves || 0;
      const optimalMoves =
        challenge.optimalPathLength || challenge.aiSolution?.stepsTaken || 1;
      const aiMoves =
        challenge.aiSolution?.stepsTaken ||
        (challenge.aiSolution?.path
          ? challenge.aiSolution.path.length - 1
          : null) ||
        optimalMoves;

      // Calculate move accuracy: how close player came to optimal
      // Handle the case where playerMoves is 0 (gave up immediately)
      const moveAccuracy =
        playerMoves > 0 ? Math.min(100, (optimalMoves / playerMoves) * 100) : 0;

      // Status based on move accuracy and AI comparison
      if (moveAccuracy >= 100) return "optimal"; // Gold star for optimal
      if (moveAccuracy >= 60) return "good"; // Purple star for good performance
      if (playerMoves <= aiMoves && playerMoves > 0) return "beat-ai"; // Silver star for beating AI
      return "completed"; // Filled circle for basic completion
    }

    // If it's today's challenge, show as today (free)
    if (isToday) return "today";

    // If it's in the future, show as future
    if (!isAvailable) return "future";

    // For past challenges (incomplete), they're locked - need upgrade
    const isPastChallenge = challenge.date < today;
    if (isPastChallenge) {
      return "locked";
    }

    // This shouldn't happen, but fallback
    return "unavailable";
  };

  // Helper function to check if a date is an equinox or solstice
  const getCelestialEvent = (day: number): string | null => {
    // Removed celestial event detection - no longer needed
    return null;
  };

  // Helper function to get active collections for a given date
  const getActiveCollectionsForDate = (date: Date): WordCollection[] => {
    return allWordCollections.filter((collection) => {
      if (!collection.startDate || !collection.endDate) return false;

      // Create dates for the same year as the given date to handle year transitions
      const startDate = new Date(
        date.getFullYear(),
        collection.startDate.getMonth(),
        collection.startDate.getDate(),
      );
      const endDate = new Date(
        date.getFullYear(),
        collection.endDate.getMonth(),
        collection.endDate.getDate(),
      );

      // Handle events that cross year boundaries (like New Year events)
      if (startDate > endDate) {
        // Event crosses year boundary
        return date >= startDate || date <= endDate;
      } else {
        // Normal date range
        return date >= startDate && date <= endDate;
      }
    });
  };

  // Helper function to get event indicators for a day
  const getEventIndicators = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const activeCollections = getActiveCollectionsForDate(date);

    return activeCollections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      icon: collection.icon,
      color: getEventColor(collection.id),
    }));
  };

  // Helper function to get event colors
  const getEventColor = (collectionId: string): string => {
    switch (collectionId) {
      case "renewal":
        return "#4FC3F7"; // Light blue for Renewal & Reflection
      case "affection":
        return "#FF69B4"; // Pink for Affection & Kinship (includes Valentine's)
      case "greening":
        return "#66BB6A"; // Green for Greening Earth
      case "bloom":
        return "#FFB74D"; // Orange/gold for Bloom & Buzz
      case "high-sun":
        return "#FF5722"; // Red-orange for High Sun & Wildfire
      case "ripening":
        return "#FFC107"; // Amber for Ripening & Radiance
      case "amber-harvest":
        return "#FF8F00"; // Deep amber for Amber Harvest
      case "cider-ember":
        return "#FF6B35"; // Orange for Cider & Ember (includes Halloween)
      case "fog-frost":
        return "#9E9E9E"; // Gray for Fog & First Frost
      case "long-night":
        return "#3F51B5"; // Deep blue for Long Night & Spark
      case "gratitude-gathering":
        return "#8BC34A"; // Light green for Gratitude & Gathering
      case "equinox-solstice":
        return "#673AB7"; // Purple for Equinox & Solstice
      case "seasons":
        return "#4CAF50"; // Green for general seasons
      default:
        return colors.secondary; // Default color for other events
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal":
        return "#FFD700"; // Gold for optimal (like game reports)
      case "good":
        return "#9C27B0"; // Purple for good performance (like suggested moves)
      case "beat-ai":
        return "#607D8B"; // Silver/blue for beating AI
      case "completed":
        return customColors.startNode; // Green for basic completion
      case "today":
        return colors.primary;
      case "available":
        return colors.onSurfaceVariant;
      case "locked":
        return "#FF8F00"; // Amber for missed challenges (recoverable with upgrade)
      case "future":
        return "#607D8B"; // Blue-gray for future challenges (locked until time)
      default:
        return "transparent";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "optimal":
        return "star";
      case "good":
        return "star";
      case "beat-ai":
        return "star";
      case "completed":
        return "circle";
      case "today":
        return "circle-outline";
      case "available":
        return "circle-outline";
      case "locked":
        return "clock-outline";
      case "future":
        return "lock";
      default:
        return null;
    }
  };

  const getGradeLetter = (status: string): string | null => {
    return null; // No longer using grade letters
  };

  const handleDayPress = async (day: number) => {
    const challenge = getChallengeForDay(day);
    if (challenge && onChallengeSelect) {
      const status = getChallengeStatus(challenge);
      if (status === "locked") {
        // Check if user is premium first
        const isPremium = await dailyChallengesService.isPremiumUser();
        if (isPremium) {
          // Premium users can access past challenges
          onChallengeSelect(challenge);
        } else {
          // Show upgrade prompt for non-premium users
          showUpgradePrompt(
            "", // Use context content instead of hardcoded message
            "pastChallenges",
          );
        }
      } else if (status !== "future" && status !== "unavailable") {
        onChallengeSelect(challenge);
      }
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurface }]}>
          Loading challenges...
        </Text>
      </View>
    );
  }

  return (
    <Card style={[styles.calendarCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        {/* Header with month navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigateMonth("prev")}>
            <CustomIcon source="chevron-left" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.monthTitle, { color: colors.primary }]}>
            {formatMonthYear(currentMonth)}
          </Text>

          <TouchableOpacity onPress={() => navigateMonth("next")}>
            <CustomIcon source="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Week day headers */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <Text
              key={day}
              style={[styles.weekDayText, { color: colors.onSurfaceVariant }]}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {getDaysInMonth().map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const challenge = getChallengeForDay(day);
            const status = getChallengeStatus(challenge);
            const statusColor = getStatusColor(status);
            const statusIcon = getStatusIcon(status);
            const eventIndicators = getEventIndicators(day);

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  status !== "unavailable" && styles.availableDayCell,
                  { borderColor: colors.outline },
                ]}
                onPress={() => handleDayPress(day)}
                disabled={status === "future" || status === "unavailable"}
              >
                <Text style={[styles.dayNumber, { color: statusColor }]}>
                  {day}
                </Text>
                {statusIcon && (
                  <View style={styles.statusIcon}>
                    <CustomIcon source={statusIcon} size={12} color={statusColor} />
                  </View>
                )}
                {/* Event indicators - bottom border bars */}
                {eventIndicators.length > 0 && (
                  <View style={styles.eventBorderBars}>
                    {eventIndicators.slice(0, 3).map((event, idx) => (
                      <View
                        key={event.id}
                        style={[
                          styles.eventBar,
                          {
                            backgroundColor: event.color,
                            height: eventIndicators.length > 1 ? 2 : 3, // Thinner bars when multiple
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <CustomIcon source="star" size={16} color="#FFD700" />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Optimal
            </Text>
          </View>
          <View style={styles.legendItem}>
            <CustomIcon source="star" size={16} color="#9C27B0" />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Good
            </Text>
          </View>
          <View style={styles.legendItem}>
            <CustomIcon source="star" size={16} color="#607D8B" />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Beat AI
            </Text>
          </View>
          <View style={styles.legendItem}>
            <CustomIcon source="circle" size={16} color={customColors.startNode} />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Completed
            </Text>
          </View>
          <View style={styles.legendItem}>
            <CustomIcon source="circle-outline" size={16} color={colors.primary} />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Today
            </Text>
          </View>
          <View style={styles.legendItem}>
            <CustomIcon source="clock-outline" size={16} color="#FF8F00" />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Missed
            </Text>
          </View>
          <View style={styles.legendItem}>
            <CustomIcon source="lock" size={16} color="#607D8B" />
            <Text
              style={[styles.legendText, { color: colors.onSurfaceVariant }]}
            >
              Future
            </Text>
          </View>
        </View>

        {/* Grading note */}
        <View style={styles.gradingNote}>
          <Text
            style={[styles.gradingNoteText, { color: colors.onSurfaceVariant }]}
          >
            Performance based on move accuracy
          </Text>
        </View>

        {/* Show active collections for current month */}
        {(() => {
          const currentDate = new Date();
          const activeCollections = getActiveCollectionsForDate(currentDate);

          if (activeCollections.length > 0) {
            return (
              <View style={styles.activeThemesContainer}>
                <Text
                  style={[
                    styles.activeThemesTitle,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Active Collections
                </Text>
                <View style={styles.activeThemesList}>
                  {activeCollections.map((collection, index) => (
                    <View
                      key={collection.id}
                      style={[
                        styles.activeThemeChip,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: getEventColor(collection.id),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.activeThemeIndicator,
                          { backgroundColor: getEventColor(collection.id) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.activeThemeText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {collection.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          return null;
        })()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  calendarCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%", // 100% / 7 days
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  availableDayCell: {
    borderRadius: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusIcon: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  legendText: {
    fontSize: 12,
  },
  eventBorderBars: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  eventBar: {
    flex: 1,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventLegend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  eventLegendTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  eventLegendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 8,
  },
  activeThemesContainer: {
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  activeThemesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  activeThemesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  activeThemeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 20,
    margin: 4,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeThemeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  activeThemeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  gradingNote: {
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  gradingNoteText: {
    fontSize: 12,
  },
});

export default DailyChallengesCalendar;
