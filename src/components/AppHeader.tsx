import React from "react";
import { Image, StyleSheet } from "react-native";

import { Appbar, useTheme } from "react-native-paper";

import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

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
  const { customColors } = useTheme() as ExtendedTheme;
  const setAboutModalVisible = useGameStore(
    (state) => state.setAboutModalVisible,
  );
  const setStatsModalVisible = useGameStore(
    (state) => state.setStatsModalVisible,
  );

  // Handler to open the about modal
  const handleAbout = () => setAboutModalVisible(true);
  // Handler to open the stats modal
  const handleStats = () => setStatsModalVisible(true);

  return (
    <Appbar.Header>
      <Image source={require("../../assets/favicon.svg")} style={styles.logo} />
      <Appbar.Content title="Synapse" titleStyle={styles.title} />
      <Appbar.Action
        icon="book-open-variant"
        onPress={handleAbout}
        color={customColors.currentNode}
      />
      <Appbar.Action
        icon="trophy"
        onPress={handleStats}
        color={customColors.globalOptimalNode}
      />
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
});

export default AppHeader;
