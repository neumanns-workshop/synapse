import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

import { Text, Card, useTheme, Button } from "react-native-paper";

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
  disableScrollView?: boolean;
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
  disableScrollView = false,
}) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);
  const currentPathDisplayMode = useGameStore((state) => state.pathDisplayMode);

  // Use AI path data from the report instead of the store
  const isDailyChallenge = report.isDailyChallenge || false;
  const aiPath = report.aiPath || [];
  const aiModel = report.aiModel;

  // State for collapsible sections
  const [optimalMovesExpanded, setOptimalMovesExpanded] = useState(false);
  const [suggestedMovesExpanded, setSuggestedMovesExpanded] = useState(false);
  const [missedMovesExpanded, setMissedMovesExpanded] = useState(false);
  const [backtrackingExpanded, setBacktrackingExpanded] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(true); // Default open for achievements

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

  // Collapsible section header component
  const CollapsibleSectionHeader = ({
    title,
    expanded,
    onToggle,
    count,
  }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    count?: number;
  }) => (
    <TouchableOpacity
      style={styles.collapsibleHeader}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.collapsibleHeaderContent}>
        <Text
          variant="titleMedium"
          style={[
            styles.sectionTitle,
            { color: colors.primary, marginBottom: 0 },
          ]}
        >
          {title}
          {count !== undefined && ` (${count})`}
        </Text>
      </View>
      <CustomIcon
        source={expanded ? "chevron-up" : "chevron-down"}
        size={20}
        color={colors.primary}
      />
    </TouchableOpacity>
  );

  const ContentWrapper = disableScrollView ? View : ScrollView;
  const wrapperStyle = disableScrollView ? styles.containerView : styles.container;

  return (
    <ContentWrapper style={wrapperStyle}>
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
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {`${report.moveAccuracy.toFixed(1)}% (${
                report.totalMoves
              } ${report.totalMoves === 1 ? "move" : "moves"})`}
            </Text>
          </View>

          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: colors.primary }]}
            >
              Distance Traveled
            </Text>
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {report.playerSemanticDistance.toFixed(2)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: colors.primary }]}
            >
              Optimal Distance
            </Text>
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {report.optimalSemanticDistance.toFixed(2)}
            </Text>
          </View>

          {(() => {
            const globalMoves = report.optimalChoices.filter(
              (choice) => choice.isGlobalOptimal,
            );
            const localMoves = report.optimalChoices.filter(
              (choice) => choice.isLocalOptimal && !choice.isGlobalOptimal,
            );
            return (
              <>
                {globalMoves.length > 0 && (
                  <View style={styles.section}>
                    <CollapsibleSectionHeader
                      title="Optimal Moves"
                      expanded={optimalMovesExpanded}
                      onToggle={() =>
                        setOptimalMovesExpanded(!optimalMovesExpanded)
                      }
                      count={globalMoves.length}
                    />
                    {optimalMovesExpanded &&
                      globalMoves.map((choice, index) => (
                        <Text
                          key={index}
                          variant="bodyMedium"
                          style={[
                            styles.choiceText,
                            { color: customColors.globalOptimalNode },
                          ]}
                        >
                          {choice.playerPosition} → {choice.playerChose}{" "}
                          <Text
                            style={{ color: customColors.globalOptimalNode }}
                          >
                            ★
                          </Text>
                        </Text>
                      ))}
                  </View>
                )}
                {localMoves.length > 0 && (
                  <View style={styles.section}>
                    <CollapsibleSectionHeader
                      title="Suggested Moves"
                      expanded={suggestedMovesExpanded}
                      onToggle={() =>
                        setSuggestedMovesExpanded(!suggestedMovesExpanded)
                      }
                      count={localMoves.length}
                    />
                    {suggestedMovesExpanded &&
                      localMoves.map((choice, index) => (
                        <Text
                          key={index}
                          variant="bodyMedium"
                          style={[
                            styles.choiceText,
                            { color: customColors.localOptimalNode },
                          ]}
                        >
                          {choice.playerPosition} → {choice.playerChose}{" "}
                          <Text
                            style={{ color: customColors.localOptimalNode }}
                          >
                            ★
                          </Text>
                        </Text>
                      ))}
                  </View>
                )}
              </>
            );
          })()}

          {report.missedOptimalMoves &&
            report.missedOptimalMoves.length > 0 && (
              <View style={styles.section}>
                <CollapsibleSectionHeader
                  title="Missed Optimal Moves"
                  expanded={missedMovesExpanded}
                  onToggle={() => setMissedMovesExpanded(!missedMovesExpanded)}
                  count={report.missedOptimalMoves.length}
                />
                {missedMovesExpanded &&
                  report.missedOptimalMoves.map((missedMove, index) => {
                    // Parse the missed move text to extract all words
                    // Format: "At [position], chose [chosen] instead of [better_word]"
                    const fullMatch = missedMove.match(
                      /At (\w+), chose (\w+) instead of (\w+)/,
                    );
                    
                                          if (fullMatch) {
                        const [, positionWord, chosenWord, betterWord] = fullMatch;
                        
                        // Determine colors for each word
                        const isGlobalOptimal = report.optimalPath.includes(betterWord);
                        const betterWordColor = isGlobalOptimal
                          ? customColors.globalOptimalNode
                          : customColors.localOptimalNode;
                      
                      return (
                        <View key={index} style={styles.missedMoveContainer}>
                          <Text
                            variant="bodyMedium"
                            style={[
                              styles.missedMove,
                              { color: colors.onSurface },
                            ]}
                          >
                            At{" "}
                            <Text
                              style={{
                                color: customColors.pathNode,
                                fontWeight: "bold",
                              }}
                            >
                              {positionWord}
                            </Text>
                            , chose{" "}
                            <Text
                              style={{
                                color: customColors.currentNode,
                                fontWeight: "bold",
                              }}
                            >
                              {chosenWord}
                            </Text>
                                                         {" "}instead of{" "}
                             <Text
                               style={{
                                 color: betterWordColor,
                                 fontWeight: "bold",
                               }}
                             >
                               {betterWord}
                             </Text>
                          </Text>
                        </View>
                      );
                    } else {
                      // Fallback for unexpected format
                      return (
                        <Text
                          key={index}
                          variant="bodyMedium"
                          style={[
                            styles.missedMove,
                            { color: colors.onSurface },
                          ]}
                        >
                          {missedMove}
                        </Text>
                      );
                    }
                  })}
              </View>
            )}

          {report.backtrackEvents && report.backtrackEvents.length > 0 && (
            <View style={styles.section}>
              <CollapsibleSectionHeader
                title="Backtracking Moves"
                expanded={backtrackingExpanded}
                onToggle={() => setBacktrackingExpanded(!backtrackingExpanded)}
                count={report.backtrackEvents.length}
              />
              {backtrackingExpanded &&
                report.backtrackEvents.map((event, index) => (
                  <Text
                    key={index}
                    variant="bodyMedium"
                    style={{ color: colors.onSurface }}
                  >
                    {event.landedOn} ← {event.jumpedFrom}
                  </Text>
                ))}
            </View>
          )}

          {report.earnedAchievements &&
            report.earnedAchievements.length > 0 && (
              <View style={styles.section}>
                <CollapsibleSectionHeader
                  title="Achievements Earned"
                  expanded={achievementsExpanded}
                  onToggle={() =>
                    setAchievementsExpanded(!achievementsExpanded)
                  }
                  count={report.earnedAchievements.length}
                />
                {achievementsExpanded &&
                  report.earnedAchievements.map((achievement, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() =>
                        onAchievementPress && onAchievementPress(achievement)
                      }
                      style={styles.achievementItem}
                    >
                      <View style={styles.achievementHeader}>
                        <View style={styles.achievementIconContainer}>
                          <CustomIcon
                            source="trophy"
                            size={20}
                            color={customColors.achievementIcon}
                          />
                        </View>
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.achievementName,
                            { color: colors.primary },
                          ]}
                        >
                          {achievement.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
        </Card.Content>
      </Card>
    </ContentWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 8,
  },
  containerView: {
    marginVertical: 8,
  },
  card: {
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  section: {
    marginBottom: 16,
  },
  buttonSection: {
    marginTop: 8,
    alignItems: "center",
  },
  challengeButton: {
    marginTop: 8,
    width: "80%",
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: "bold",
  },
  pathContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  pathRow: {
    marginBottom: 8,
  },
  pathTitle: {
    marginBottom: 4,
    fontWeight: "bold",
  },
  pathWord: {
    fontSize: 16,
    marginRight: 4,
  },
  pathArrow: {
    fontSize: 16,
    marginRight: 4,
    color: "#888",
  },
  choiceItem: {
    marginVertical: 4,
  },
  choiceText: {
    fontWeight: "500",
    lineHeight: 22,
  },
  missedMove: {
    marginVertical: 4,
    fontWeight: "500",
  },
  missedMoveContainer: {
    marginVertical: 4,
  },
  achievementItem: {
    marginBottom: 10,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  achievementIconContainer: {
    marginRight: 8,
  },
  achievementName: {
    fontWeight: "bold",
  },
  achievementDescription: {},
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
});

export default GameReportDisplay;
