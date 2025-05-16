import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Portal, Text, Button, Card, SegmentedButtons, useTheme, ActivityIndicator, MD3Colors, Icon, Divider, Badge, Surface, Chip, ProgressBar } from 'react-native-paper';
import { View, ScrollView, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useGameStore } from '../stores/useGameStore';
import GameReportDisplay from './GameReportDisplay';
import PlayerPathDisplay from './PlayerPathDisplay';
import WordDefinitionDialog from './WordDefinitionDialog';
import AchievementDetailDialog from './AchievementDetailDialog';
import type { GameReport } from '../utils/gameReportUtils';
import { loadGameHistory, getLifetimeStats, LifetimeStats, getUnlockedAchievementIds, getWordCollectionsProgress, WordCollectionProgress } from '../services/StorageService';
import { allAchievements, Achievement } from '../features/achievements/achievements';
import type { WordCollection } from '../features/wordCollections/wordCollections';
import type { ExtendedTheme } from '../theme/SynapseTheme';

// GameHistoryCard component for displaying game history entries
const GameHistoryCard = ({ report, theme, onPress, onAchievementPress }: { report: GameReport, theme: ExtendedTheme, onPress: () => void, onAchievementPress: (achievement: Achievement) => void }) => {
  const date = new Date(report.timestamp);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Status indicator color
  const statusColor = report.status === 'won' 
    ? theme.customColors.startNode
    : theme.customColors.warningColor;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={[styles.historyCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline, borderWidth: 1 }]}>
        <Card.Content>
          <View style={styles.historyCardHeader}>
            <View style={styles.historyCardTitleRow}>
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {report.startWord} → {report.endWord}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {report.status === 'won' ? 'WON' : 'GAVE UP'}
                </Text>
              </View>
            </View>
            <View style={styles.historyCardInfoRow}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                {formattedDate} at {formattedTime}
              </Text>
              {report.earnedAchievements && report.earnedAchievements.length > 0 && (
                <View style={styles.trophyContainer}>
                  {report.earnedAchievements.map((achievement, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={{ marginLeft: 4 }}
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
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Moves</Text>
              <Text style={{ color: theme.colors.onSurface }}>{report.totalMoves}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Accuracy</Text>
              <Text style={{ color: theme.colors.onSurface }}>{report.moveAccuracy.toFixed(1)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                Efficiency{report.status === 'given_up' ? ' (Projected)' : ''}
              </Text>
              <Text style={{ color: theme.colors.onSurface }}>{report.semanticPathEfficiency?.toFixed(1) || 0}%</Text>
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
  onPress
}: { 
  achievement: Achievement, 
  unlocked: boolean, 
  theme: ExtendedTheme,
  onPress: (achievement: Achievement) => void
}) => {
  return (
    <TouchableOpacity 
      onPress={() => unlocked ? onPress(achievement) : null}
      disabled={!unlocked}
      activeOpacity={unlocked ? 0.7 : 1}
    >
      <Card 
        style={[
          styles.achievementCard, 
          { 
            backgroundColor: unlocked ? theme.colors.surfaceVariant : theme.colors.surfaceDisabled,
            borderColor: theme.colors.outline,
            borderWidth: 1,
            opacity: unlocked ? 1 : 0.7
          }
        ]}
      >
        <Card.Content>
          <View style={styles.achievementCardContent}>
            <View style={styles.achievementIconContainer}>
              <Icon 
                source={unlocked ? "trophy" : "trophy-outline"} 
                size={24} 
                color={unlocked ? theme.customColors.achievementIcon : theme.colors.onSurfaceDisabled} 
              />
            </View>
            <View style={styles.achievementText}>
              <Text 
                style={{ 
                  color: unlocked ? theme.colors.primary : theme.colors.onSurfaceDisabled,
                  fontWeight: 'bold'
                }}
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
  theme
}: { 
  collection: WordCollection, 
  progress: string[], 
  theme: ExtendedTheme 
}) => {
  // Local state for word collection dialog
  const [wordDialogVisible, setWordDialogVisible] = useState(false);
  
  console.log(`[WordCollectionCard] Rendering collection ID: ${collection.id}, Title: ${collection.title}`);
  console.log(`[WordCollectionCard] Progress array:`, progress);

  const collectedCount = progress.length;
  const totalWordsInCollection = collection.words.length;
  
  const progressPercentage = totalWordsInCollection > 0 
    ? collectedCount / totalWordsInCollection 
    : 0;

  console.log(`[WordCollectionCard] ID: ${collection.id} - Collected: ${collectedCount}, Total: ${totalWordsInCollection}, Percentage: ${progressPercentage}`);
  if (totalWordsInCollection === 0) {
    console.warn(`[WordCollectionCard] ID: ${collection.id} - totalWordsInCollection is 0. Collection words:`, collection.words);
  }
  
  const showWordDialog = () => {
    setWordDialogVisible(true);
  };

  const hideWordDialog = () => {
    setWordDialogVisible(false);
  };
  
  // Determine if the wordlist button should be enabled
  const isWordlistViewable = collection.isWordlistViewable || progress.length > 0;
  
  // Determine which words to show in the dialog
  const wordsToShow = collection.isWordlistViewable ? collection.words : progress;
  
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
            styles.wordCollectionCard, 
            { 
              backgroundColor: theme.colors.surfaceVariant, 
              borderColor: theme.colors.outline, 
              borderWidth: 1,
              opacity: isWordlistViewable ? 1 : 0.7 
            }
          ]} 
          elevation={1}
        >
          {/* Main content: header, description, progress bar */}
          <View style={{ padding: 16 }}>
            <View style={styles.wordCollectionHeader}>
              <View style={styles.wordCollectionTitle}>
                {collection.icon && (
                  <View style={{ marginRight: 8 }}>
                    <Icon 
                      source={collection.icon} 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  </View>
                )}
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{collection.title}</Text>
              </View>
              
              <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                {collectedCount} / {totalWordsInCollection}
              </Text>
            </View>
            
            <View style={styles.wordCollectionProgressContainer}>
              <View style={[
                styles.progressBarWrapper, 
                { backgroundColor: theme.colors.outlineVariant } 
              ]}>
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
          contentContainerStyle={{ 
            backgroundColor: theme.colors.surface, 
            padding: 20, 
            margin: 20, 
            borderRadius: 8,
            maxWidth: 700,
            width: '100%',
            alignSelf: 'center',
            borderColor: theme.colors.outline,
            borderWidth: 1
          }}
        >
          <View style={styles.wordDialogHeader}>
            <View style={styles.wordDialogTitle}>
              {collection.icon && (
                <View style={{ marginRight: 8 }}>
                  <Icon 
                    source={collection.icon} 
                    size={24} 
                    color={theme.colors.primary}
                  />
                </View>
              )}
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.primary }}>
                {collection.title} {collection.isWordlistViewable ? "Wordlist" : "Collected Words"}
              </Text>
            </View>
            <Button onPress={hideWordDialog}>Close</Button>
          </View>
          
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.wordDialogContent}>
              {wordsToShow.map((word, index) => (
                <Chip 
                  key={index}
                  mode="flat"
                  style={{ 
                    backgroundColor: progress.includes(word) 
                      ? theme.customColors.collectedWordChip 
                      : theme.colors.surfaceDisabled,
                    margin: 4,
                    opacity: progress.includes(word) ? 1 : 0.7
                  }}
                  textStyle={{ 
                    color: progress.includes(word) 
                      ? theme.colors.onSurface 
                      : theme.colors.onSurfaceDisabled,
                    fontSize: 14
                  }}
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

// --- Main StatsModal ---
const StatsModal = () => {
  const { statsModalVisible, setStatsModalVisible, wordCollections } = useGameStore(state => ({
    statsModalVisible: state.statsModalVisible,
    setStatsModalVisible: state.setStatsModalVisible,
    wordCollections: state.wordCollections
  }));
  const theme = useTheme() as ExtendedTheme;
  
  // State
  const [activeTab, setActiveTab] = useState('history');
  const [gameHistory, setGameHistory] = useState<GameReport[]>([]);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [collectionsProgress, setCollectionsProgress] = useState<WordCollectionProgress>({});
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<GameReport | null>(null);
  const [definitionDialogWord, setDefinitionDialogWord] = useState<string | null>(null);
  const [definitionDialogPathIndex, setDefinitionDialogPathIndex] = useState<number | null>(null);
  const [definitionDialogVisible, setDefinitionDialogVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [achievementDialogVisible, setAchievementDialogVisible] = useState(false);
  
  // Load data when modal opens
  useEffect(() => {
    if (statsModalVisible) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [history, stats, achievementIds, progress] = await Promise.all([
            loadGameHistory(),
            getLifetimeStats(),
            getUnlockedAchievementIds(),
            getWordCollectionsProgress()
          ]);
          
          setGameHistory(history);
          setLifetimeStats(stats);
          setUnlockedAchievementIds(achievementIds);
          setCollectionsProgress(progress);
        } catch (error) {
          console.error('Error loading stats data:', error);
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
  
  // Tab content components
  const renderHistoryTab = () => {
    if (selectedReport) {
      return (
        <View style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <Button 
              icon="arrow-left" 
              mode="text" 
              onPress={handleBackToHistory}
              textColor={theme.colors.primary}
            >
              Back to History
            </Button>
          </View>

          <PlayerPathDisplay
            playerPath={selectedReport.playerPath}
            optimalChoices={selectedReport.optimalChoices}
            suggestedPath={selectedReport.suggestedPath}
            onWordDefinition={showWordDefinition}
          />

          <GameReportDisplay report={selectedReport} onAchievementPress={showAchievementDetail} />
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
            theme={theme} 
            onPress={() => handleReportPress(item)}
            onAchievementPress={showAchievementDetail}
          />
        )}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.onSurface, textAlign: 'center', marginTop: 20 }}>
            No game history yet. Play a game to see your stats!
          </Text>
        }
        contentContainerStyle={styles.tabContentContainerPadded}
      />
    );
  };
  
  const renderProgressTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContentContainerPadded}>
        {/* Lifetime Stats Summary */}
        <Card style={[styles.statsSummaryCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline, borderWidth: 1 }]}>
          <Card.Content>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 10 }}>
              Lifetime Stats
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Games Played</Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 24, fontWeight: 'bold' }}>
                  {lifetimeStats?.totalGamesPlayed || 0}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Wins</Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 24, fontWeight: 'bold' }}>
                  {lifetimeStats?.totalWins || 0}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Win Rate</Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 24, fontWeight: 'bold' }}>
                  {lifetimeStats && lifetimeStats.totalGamesPlayed > 0
                    ? Math.round((lifetimeStats.totalWins / lifetimeStats.totalGamesPlayed) * 100)
                    : 0}%
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Achievements Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary, marginTop: 16 }]}>
          Achievements
        </Text>
        
        {allAchievements.map((achievement) => (
          <AchievementCard 
            key={achievement.id}
            achievement={achievement}
            unlocked={unlockedAchievementIds.includes(achievement.id)}
            theme={theme}
            onPress={showAchievementDetail}
          />
        ))}
      </ScrollView>
    );
  };
  
  // Updated renderEventsTab to use real data
  const renderEventsTab = () => {
    if (wordCollections.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Icon source="card-search-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurface, textAlign: 'center', marginTop: 16 }}>
            No word collections available. Play more to discover them!
          </Text>
        </View>
      );
    }
    
    return (
      <ScrollView contentContainerStyle={styles.tabContentContainerPadded}>
        {wordCollections.map((collection) => {
          const collectionProgress = collectionsProgress[collection.id]?.collectedWords || [];
          
          return (
            <WordCollectionCard 
              key={collection.id}
              collection={collection}
              progress={collectionProgress}
              theme={theme}
            />
          );
        })}
      </ScrollView>
    );
  };
  
  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurface, marginTop: 10 }}>Loading stats...</Text>
        </View>
      );
    }
    
    switch (activeTab) {
      case 'history':
        return renderHistoryTab();
      case 'progress':
        return renderProgressTab();
      case 'events':
        return renderEventsTab();
      default:
        return null;
    }
  };

  return (
    <Portal>
      <Modal
        visible={statsModalVisible}
        onDismiss={() => setStatsModalVisible(false)}
        contentContainerStyle={{ 
          ...styles.modalContent, 
          backgroundColor: theme.colors.surface,
          maxWidth: 700,
          width: '100%',
          alignSelf: 'center',
          borderColor: theme.colors.outline,
          borderWidth: 1
        }}
      >
        <View style={styles.header}>
          <Text style={{...styles.title, color: theme.colors.primary}}>Player Statistics</Text>
          <Button onPress={() => setStatsModalVisible(false)} textColor={theme.colors.primary}>Close</Button>
        </View>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'history', label: 'History' },
            { value: 'progress', label: 'Progress' },
            { value: 'events', label: 'Word Lists' }
          ]}
          style={styles.segmentedButtons}
        />
        
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        {/* Word Definition Dialog */}
        <WordDefinitionDialog
          word={definitionDialogWord || ''}
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
    maxHeight: '90%',
    maxWidth: 900,
    alignSelf: 'center',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Game History styles
  historyCard: {
    marginBottom: 12,
    elevation: 1,
  },
  historyCardHeader: {
    marginBottom: 8,
  },
  historyCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyCardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  trophyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Game Report styles
  reportContainer: {
    flex: 1,
  },
  reportHeader: {
    marginBottom: 10,
  },
  // Progress Tab styles
  statsSummaryCard: {
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  achievementCard: {
    marginBottom: 8,
  },
  achievementCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconContainer: {
    marginRight: 12,
  },
  achievementText: {
    flex: 1,
  },
  // Events Tab styles
  wordCollectionCard: {
    marginBottom: 12,
  },
  wordCollectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordCollectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  wordCollectionProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    height: '100%',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  progressText: {
    fontSize: 12,
    minWidth: 45,
    textAlign: 'right',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  wordDialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wordDialogTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordDialogContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});

export default StatsModal; 