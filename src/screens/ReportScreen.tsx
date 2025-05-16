import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Portal } from 'react-native-paper';
import { useGameStore } from '../stores/useGameStore';
import GameReportDisplay from '../components/GameReportDisplay';
import GraphVisualization from '../components/GraphVisualization';
import PlayerPathDisplay from '../components/PlayerPathDisplay';
import WordDefinitionDialog from '../components/WordDefinitionDialog';
import AchievementDetailDialog from '../components/AchievementDetailDialog';
import type { ExtendedTheme } from '../theme/SynapseTheme';

const ReportScreen = () => {
  const { colors } = useTheme() as ExtendedTheme;
  
  const gameStatus = useGameStore((state) => state.gameStatus);
  const gameReport = useGameStore((state) => state.gameReport);
  const isLoading = useGameStore((state) => state.isLoadingData);
  const showWordDefinition = useGameStore((state) => state.showWordDefinition);

  const definitionDialogWord = useGameStore((state) => state.definitionDialogWord);
  const definitionDialogPathIndex = useGameStore((state) => state.definitionDialogPathIndex);
  const definitionDialogVisible = useGameStore((state) => state.definitionDialogVisible);
  const hideWordDefinition = useGameStore((state) => state.hideWordDefinition);

  const selectedAchievement = useGameStore((state) => state.selectedAchievement);
  const achievementDialogVisible = useGameStore((state) => state.achievementDialogVisible);
  const hideAchievementDetail = useGameStore((state) => state.hideAchievementDetail);

  if (gameStatus !== 'given_up' && gameStatus !== 'won') {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.graphContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" animating={true} color={colors.onSurface} />
          ) : (
            <GraphVisualization />
          )}
        </View>

        {gameReport && gameReport.playerPath && (
          <PlayerPathDisplay 
            playerPath={gameReport.playerPath} 
            optimalChoices={gameReport.optimalChoices}
            suggestedPath={gameReport.suggestedPath}
            onWordDefinition={showWordDefinition}
          />
        )}

        {gameReport && (
          <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center' }}>
            <GameReportDisplay report={gameReport} />
          </View>
        )}
      </ScrollView>
      <Portal>
        <WordDefinitionDialog
          word={definitionDialogWord || ''}
          pathIndexInPlayerPath={definitionDialogPathIndex}
          visible={definitionDialogVisible}
          onDismiss={hideWordDefinition}
        />
        <AchievementDetailDialog 
          achievement={selectedAchievement}
          visible={achievementDialogVisible}
          onDismiss={hideAchievementDetail}
        />
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  graphContainer: {
    height: 300,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  sectionContainer: {
    marginHorizontal: 8,
    marginVertical: 10,
    paddingVertical: 8,
  },
});

export default ReportScreen; 