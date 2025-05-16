import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, Icon } from 'react-native-paper';
import type { GameReport } from '../utils/gameReportUtils';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import { useGameStore } from '../stores/useGameStore';
import type { Achievement } from '../features/achievements/achievements';

interface GameReportDisplayProps {
  report: GameReport;
  onAchievementPress?: (achievement: Achievement) => void;
}

// Utility function to render text path with arrows (similar to what was in ReportScreen)
const renderTextPath = (path: string[], color: string, baseStyle: object, arrowStyle: object) => {
  if (!path || path.length < 1) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      {path.map((word, index) => (
        <React.Fragment key={`path-${word}-${index}`}>
          <Text style={[baseStyle, { color }]}>{word}</Text>
          {index < path.length - 1 && (
            <Text style={arrowStyle}> → </Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const GameReportDisplay: React.FC<GameReportDisplayProps> = ({ report, onAchievementPress }) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);
  const showAchievementDetail = useGameStore((state) => state.showAchievementDetail);
  const currentPathDisplayMode = useGameStore((state) => state.pathDisplayMode);

  // const handlePlayerPathPress = () => { // Removed as it's now in PlayerPathDisplay
  //   setPathDisplayMode({
  //     ...currentPathDisplayMode,
  //     player: !currentPathDisplayMode.player, // Toggle player path
  //   });
  // };

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

  return (
    <ScrollView style={styles.container}>
      <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline, borderWidth: 1 }]}>
        <Card.Content>
          {/* 'Your Path' section removed, will be handled by PlayerPathDisplay directly in ReportScreen */}
          {/* <View style={styles.section}>
            <TouchableOpacity onPress={handlePlayerPathPress}>
              <View style={styles.pathRow}>
                <Text variant="titleMedium" style={[styles.pathTitle, { color: colors.onSurface }]}>
                  Your Path
                </Text>
                {renderTextPath(report.playerPath, customColors.pathNode, styles.pathWord, styles.pathArrow)}
              </View>
            </TouchableOpacity>
          </View> */}

          <View style={styles.section}>
            <TouchableOpacity onPress={handleOptimalPathPress}>
              <View style={styles.pathRow}>
                <Text variant="titleMedium" style={[styles.pathTitle, { color: colors.primary }]}>
                  Optimal Path
                </Text>
                {renderTextPath(report.optimalPath, customColors.globalOptimalNode, styles.pathWord, styles.pathArrow)}
              </View>
            </TouchableOpacity>
          </View>

          {/* Suggested Path Textual Display */}
          {report.suggestedPath && report.suggestedPath.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity onPress={handleSuggestedPathPress}>
                <View style={styles.pathRow}>
                  <Text variant="titleMedium" style={[styles.pathTitle, { color: colors.primary }]}>
                    Suggested Path
                  </Text>
                  {renderTextPath(report.suggestedPath, customColors.localOptimalNode, styles.pathWord, styles.pathArrow)}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Move Accuracy */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
              Move Accuracy
            </Text>
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {report.moveAccuracy.toFixed(1)}%
            </Text>
          </View>

          {/* Path Distances - Styled as headers */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
              Distance Traveled
            </Text>
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {report.playerSemanticDistance.toFixed(2)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
              Optimal Distance
            </Text>
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {report.optimalSemanticDistance.toFixed(2)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
              Semantic Efficiency {report.playerPath[report.playerPath.length - 1] !== report.optimalPath[report.optimalPath.length - 1] ? '(Projected)' : ''}
            </Text>
            <Text variant="bodyLarge" style={{ color: colors.primary }}>
              {report.semanticPathEfficiency !== undefined ? report.semanticPathEfficiency.toFixed(1) + '%' : 'N/A'}
            </Text>
          </View>

          {/* Player Path as Text */}
          {/* <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>Your Path</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
              {report.playerPath.join(' → ')}
            </Text>
          </View> */}

          {/* Optimal Choices - Grouped, no Back on Track */}
          {(() => {
            // Moves that are globally optimal (including those that are both)
            const globalMoves = report.optimalChoices.filter(choice => choice.isGlobalOptimal);
            // Moves that are locally optimal but NOT globally optimal
            const localMoves = report.optimalChoices.filter(choice => choice.isLocalOptimal && !choice.isGlobalOptimal);
            return (
              <>
                {globalMoves.length > 0 && (
                  <View style={styles.section}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>Optimal Moves</Text>
                    {globalMoves.map((choice, index) => (
                      <Text
                        key={index}
                        variant="bodyMedium"
                        style={[styles.choiceText, { color: customColors.globalOptimalNode }]}
                      >
                        {choice.playerPosition} → {choice.playerChose} <Text style={{color: customColors.globalOptimalNode}}>★</Text>
                      </Text>
                    ))}
                  </View>
                )}
                {localMoves.length > 0 && (
                  <View style={styles.section}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>Suggested Moves</Text>
                    {localMoves.map((choice, index) => (
                      <Text
                        key={index}
                        variant="bodyMedium"
                        style={[styles.choiceText, { color: customColors.localOptimalNode }]}
                      >
                        {choice.playerPosition} → {choice.playerChose} <Text style={{color: customColors.localOptimalNode}}>★</Text>
                      </Text>
                    ))}
                  </View>
                )}
              </>
            );
          })()}

          {/* Greedy Moves - REMOVING */}
          {/* {report.greedyMoveChoices.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>Greedy Moves</Text>
              {report.greedyMoveChoices.map((choice, index) => (
                <Text
                  key={index}
                  variant="bodyMedium"
                  style={[styles.choiceText, { color: customColors.greedyMove }]}
                >
                  {choice.playerPosition} → {choice.playerChose} <Text style={{color: customColors.greedyMove}}>↑</Text>
                </Text>
              ))}
            </View>
          )} */}

          {/* Strategic Repositioning Moves - REMOVING */}
          {/* {report.strategicRepositioningMoveChoices.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>Strategic Repositioning Moves</Text>
              {report.strategicRepositioningMoveChoices.map((choice, index) => (
                <Text
                  key={index}
                  variant="bodyMedium"
                  style={[styles.choiceText, { color: customColors.strategicRepositioningMove }]}
                >
                  {choice.playerPosition} → {choice.playerChose} <Text style={{color: customColors.strategicRepositioningMove}}>↪</Text>
                </Text>
              ))}
            </View>
          )} */}

          {/* Performance Insights */}
          {/* {(report.greedyMoves > 0 || report.repositioningMoves > 0) && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>Performance Insights</Text>
              
              {report.greedyMoves > 0 && (
                <View>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
                    Understanding Greedy Moves
                  </Text>
                  Description moved to glossary
                </View>
              )}

              {report.repositioningMoves > 0 && (
                <View style={{ marginTop: report.greedyMoves > 0 ? 8 : 0 }}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: 'bold' }}>
                    Understanding Strategic Repositioning
                  </Text>
                  Description moved to glossary
                </View>
              )}
            </View>
          )} */}
          
          {/* Backtracking Moves Section */}
          {report.backtrackEvents && report.backtrackEvents.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                Backtracks Used
              </Text>
              {report.backtrackEvents.map((event, index) => (
                <Text
                  key={index}
                  variant="bodyMedium"
                  style={[styles.choiceText, { color: colors.onSurface, opacity: 0.6 }]}
                >
                  <Text style={{ fontWeight: 'bold' }}>{event.landedOn}</Text> ← <Text style={{ fontWeight: 'bold' }}>{event.jumpedFrom}</Text>
                </Text>
              ))}
            </View>
          )}

          {/* Achievements Unlocked Section */}
          {report.earnedAchievements && report.earnedAchievements.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                Achievements
              </Text>
              {report.earnedAchievements.map((achievement, index) => (
                <TouchableOpacity 
                  key={achievement.id} 
                  onPress={() => onAchievementPress ? onAchievementPress(achievement) : showAchievementDetail(achievement)} 
                  style={styles.achievementItem}
                >
                  <View style={styles.achievementHeader}>
                    <Icon source="trophy" size={20} color={colors.onSurface} />
                    <Text variant="bodyLarge" style={[styles.achievementName, { color: colors.onSurface, marginLeft: 8 }]}>
                      {achievement.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 8,
  },
  card: {
    margin: 8,
    borderRadius: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pathRow: {
    marginBottom: 8,
  },
  pathTitle: {
    marginBottom: 4,
  },
  pathWord: {
    fontSize: 16,
    marginRight: 4,
  },
  pathArrow: {
    fontSize: 16,
    marginRight: 4,
    color: '#888',
  },
  choiceItem: {
    marginVertical: 4,
  },
  choiceText: {
    fontWeight: '500',
    lineHeight: 22,
  },
  missedMove: {
    marginVertical: 4,
    fontWeight: '500',
  },
  achievementItem: {
    marginBottom: 10, // Increased margin for better separation
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Space between icon/name and description
  },
  achievementName: {
    fontWeight: 'bold',
    // Removed marginBottom as it's handled by achievementHeader
  },
  achievementDescription: {
    // This style might no longer be needed here if description is only in dialog
    // marginLeft will be added inline for alignment with name after icon
  },
});

export default GameReportDisplay; 