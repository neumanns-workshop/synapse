import React from 'react';
import { Appbar, useTheme } from 'react-native-paper';
import { Image } from 'react-native';
import type { ExtendedTheme } from '../theme/SynapseTheme';
import { useGameStore } from '../stores/useGameStore';
import StatsModal from '../components/StatsModal';

interface AppHeaderProps {
  onNewGame: () => void;
  onGiveUp: () => void;
  newGameDisabled?: boolean;
  giveUpDisabled?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  onNewGame,
  onGiveUp,
  newGameDisabled = false,
  giveUpDisabled = false,
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const setAboutModalVisible = useGameStore((state) => state.setAboutModalVisible);
  const setStatsModalVisible = useGameStore((state) => state.setStatsModalVisible);
  
  // Handler to open the about modal
  const handleAbout = () => setAboutModalVisible(true);
  // Handler to open the stats modal
  const handleStats = () => setStatsModalVisible(true);

  return (
    <Appbar.Header>
      <Image 
        source={require('../../assets/favicon.svg')} 
        style={{ width: 40, height: 40, marginLeft: 8, marginRight: 8, marginVertical: 8 }}
      />
      <Appbar.Content
        title="Synapse"
        titleStyle={{ fontWeight: 'bold', fontSize: 24 }}
      />
      <Appbar.Action icon="book-open-variant" onPress={handleAbout} color={customColors.currentNode} />
      <Appbar.Action icon="trophy" onPress={handleStats} color={customColors.globalOptimalNode} />
      <Appbar.Action
        icon="refresh"
        onPress={onNewGame}
        disabled={newGameDisabled}
        color={customColors.startNode}
      />
      <Appbar.Action
        icon="flag-variant"
        onPress={onGiveUp}
        disabled={giveUpDisabled}
        color={customColors.endNode}
      />
    </Appbar.Header>
  );
};

export default AppHeader; 