import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

import { Text, Card, useTheme, Button, Chip } from "react-native-paper";

import type { Achievement } from "../features/achievements";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import type { GameReport } from "../utils/gameReportUtils";
import CustomIcon from "./CustomIcon";

interface GameReportDisplayProps {
  report: GameReport;
  onAchievementPress?: (achievement: Achievement) => void;
  onChallengePress?: () => void;
  screenshotRef?: React.RefObject<View>;
}

// Utility function to render text path with arrows (similar to what was in ReportScreen)
const renderTextPath = (
  path: string[],
  color: string,
  baseStyle: object,
  arrowStyle: object,
) => {
  if (!path || path.length < 1) return null;
  return (
    <View style={styles.pathContainer}>
      {path.map((word, index) => (
        <React.Fragment key={`path-${word}-${index}`}>
          <Text style={[baseStyle, { color }]}>{word}</Text>
          {index < path.length - 1 && <Text style={arrowStyle}> → </Text>}
        </React.Fragment>
      ))}
    </View>
  );
};

const GameReportDisplay: React.FC<GameReportDisplayProps> = ({
  report,
  onAchievementPress,
  onChallengePress,
}) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);
  const currentPathDisplayMode = useGameStore((state) => state.pathDisplayMode);

  // Use AI path data from the report instead of the store
  const isDailyChallenge = report.isDailyChallenge || false;
  const aiPath = report.aiPath || [];
  const aiModel = report.aiModel;

  const handleOptimalPathPress = () => {
    setPathDisplayMode({
      ...currentPathDisplayMode,
      optimal: !currentPathDisplayMode.optimal, // Toggle optimal path
    });
  };

  const handleSuggestedPathPress = () => {
    setPathDisplayMode({
      ...currentPathDisplayMode,
      suggested: !currentPathDisplayMode.suggested,
    });
  };

  const handleAiPathPress = () => {
    setPathDisplayMode({
      ...currentPathDisplayMode,
      ai: !currentPathDisplayMode.ai,
    });
  };

  const globallyOptimalMoves =
    report.optimalChoices.filter((c) => c.isGlobalOptimal).length || 0;
  const locallyOptimalMoves =
    report.optimalChoices.filter((c) => c.isLocalOptimal).length || 0;
  const backtracks = report.backtrackEvents?.length || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
          },
        ]}
      >
        <Card.Content>
          {/* Challenge Button - Moved to top */}
          <View style={[styles.section, styles.buttonSection]}>
            <Button
              mode="outlined"
              icon={() => (
                <CustomIcon
                  source="share-variant"
                  size={20}
                  color={colors.primary}
                />
              )}
              onPress={() => {
                if (onChallengePress) {
                  onChallengePress();
                }
              }}
              style={[styles.challengeButton, { borderColor: colors.primary }]}
              labelStyle={{ color: colors.primary }}
            >
              Challenge a Friend
            </Button>
          </View>

          <View style={styles.section}>
            <TouchableOpacity onPress={handleOptimalPathPress}>
              <View style={styles.pathRow}>
                <Text
                  variant="titleMedium"
                  style={[styles.pathTitle, { color: colors.primary }]}
                >
                  Optimal Path
                </Text>
                {renderTextPath(
                  report.optimalPath,
                  customColors.globalOptimalNode,
                  styles.pathWord,
                  styles.pathArrow,
                )}
              </View>
            </TouchableOpacity>
          </View>

          {report.suggestedPath && report.suggestedPath.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity onPress={handleSuggestedPathPress}>
                <View style={styles.pathRow}>
                  <Text
                    variant="titleMedium"
                    style={[styles.pathTitle, { color: colors.primary }]}
                  >
                    Suggested Path
                  </Text>
                  {renderTextPath(
                    report.suggestedPath,
                    customColors.localOptimalNode,
                    styles.pathWord,
                    styles.pathArrow,
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {isDailyChallenge && aiPath && aiPath.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity onPress={handleAiPathPress}>
                <View style={styles.pathRow}>
                  <Text
                    variant="titleMedium"
                    style={[styles.pathTitle, { color: colors.primary }]}
                  >
                    AI Path
                  </Text>
                  {renderTextPath(
                    aiPath,
                    "#FF6B35", // Orange color for AI path
                    styles.pathWord,
                    styles.pathArrow,
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: colors.primary }]}
            >
              Move Accuracy
            </Text>
            <View style={styles.statLine}>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                {`${report.moveAccuracy.toFixed(1)}% `}
              </Text>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                (
              </Text>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                {report.totalMoves}
              </Text>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                /
              </Text>
              <Text
                variant="bodyLarge"
                style={{ color: customColors.globalOptimalNode }}
              >
                {globallyOptimalMoves}
              </Text>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                /
              </Text>
              <Text
                variant="bodyLarge"
                style={{ color: customColors.localOptimalNode }}
              >
                {locallyOptimalMoves}
              </Text>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                /
              </Text>
              <Text
                variant="bodyLarge"
                style={{ color: customColors.warningColor }}
              >
                {backtracks}
              </Text>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                )
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: colors.primary }]}
            >
              Distance Traveled
            </Text>
            <View style={styles.statLine}>
              <Text variant="bodyLarge" style={{ color: colors.primary }}>
                {`${report.playerSemanticDistance.toFixed(2)} `}
              </Text>
              <Text
                variant="bodyLarge"
                style={{ color: customColors.globalOptimalNode }}
              >
                {`(${report.optimalSemanticDistance.toFixed(2)})`}
              </Text>
            </View>
          </View>

          {/* Achievements Section */}
          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[
                styles.sectionTitle,
                { color: colors.primary, marginBottom: 10 },
              ]}
            >
              Achievements ({report.earnedAchievements?.length || 0})
            </Text>

            <View style={styles.achievementsContainer}>
              {report.earnedAchievements &&
              report.earnedAchievements.length > 0 ? (
                report.earnedAchievements.map((achievement) => (
                  <TouchableOpacity
                    key={achievement.id}
                    onPress={() => onAchievementPress?.(achievement)}
                  >
                    <Chip
                      icon={() => (
                        <CustomIcon
                          source={achievement.icon || "trophy"}
                          size={20}
                          color={customColors.achievementIcon}
                        />
                      )}
                      style={styles.achievementChip}
                      textStyle={styles.achievementChipText}
                    >
                      {achievement.name}
                    </Chip>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: colors.onSurface }}>
                  No new achievements.
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50, // Ensure there's space for the last card's shadow
  },
  card: {
    marginBottom: 16,
    borderWidth: 1,
  },
  section: {
    marginBottom: 16,
  },
  buttonSection: {
    alignItems: "center",
  },
  challengeButton: {
    width: "80%",
    marginBottom: 10,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  pathContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  pathRow: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  pathTitle: {
    marginBottom: 4,
  },
  pathWord: {
    fontSize: 16,
  },
  pathArrow: {
    fontSize: 16,
  },
  achievementItem: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  achievementContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  achievementTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  achievementName: {
    fontWeight: "bold",
  },
  achievementDescription: {
    fontSize: 12,
  },
  statLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  achievementsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  achievementChip: {
    margin: 4,
    backgroundColor: "rgba(255, 246, 163, 0.2)", // very light gold
  },
  achievementChipText: {
    fontSize: 12,
  },
});

export default GameReportDisplay;
