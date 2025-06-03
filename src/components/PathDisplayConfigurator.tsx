import React from "react";
import { View, StyleSheet } from "react-native";

import { Switch, Text, Divider } from "react-native-paper";

import { useGameStore } from "../stores/useGameStore";

interface PathDisplayConfiguratorProps {
  compact?: boolean;
}

const PathDisplayConfigurator: React.FC<PathDisplayConfiguratorProps> = ({
  compact = false,
}) => {
  const pathDisplayMode = useGameStore((state) => state.pathDisplayMode);
  const setPathDisplayMode = useGameStore((state) => state.setPathDisplayMode);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const isDailyChallenge = useGameStore((state) => state.isDailyChallenge);

  // Only show optimal/suggested paths options if the game is over
  const showAdvancedOptions = gameStatus === "given_up" || gameStatus === "won";
  
  // Only show AI path option for daily challenges
  const showAiPathOption = isDailyChallenge;

  const handleTogglePlayerPath = () => {
    setPathDisplayMode({ player: !pathDisplayMode.player });
  };

  const handleToggleOptimalPath = () => {
    setPathDisplayMode({ optimal: !pathDisplayMode.optimal });
  };

  const handleToggleSuggestedPath = () => {
    setPathDisplayMode({ suggested: !pathDisplayMode.suggested });
  };

  const handleToggleAiPath = () => {
    setPathDisplayMode({ ai: !pathDisplayMode.ai });
  };

  if (compact) {
    // Compact version for small spaces (e.g. toolbar)
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactOption}>
          <Text style={styles.compactLabel}>Your Path</Text>
          <Switch
            value={pathDisplayMode.player}
            onValueChange={handleTogglePlayerPath}
          />
        </View>

        {showAdvancedOptions && (
          <>
            <View style={styles.compactOption}>
              <Text style={styles.compactLabel}>Optimal</Text>
              <Switch
                value={pathDisplayMode.optimal}
                onValueChange={handleToggleOptimalPath}
              />
            </View>

            <View style={styles.compactOption}>
              <Text style={styles.compactLabel}>Suggested</Text>
              <Switch
                value={pathDisplayMode.suggested}
                onValueChange={handleToggleSuggestedPath}
              />
            </View>
          </>
        )}

        {showAiPathOption && (
          <View style={styles.compactOption}>
            <Text style={styles.compactLabel}>AI Path</Text>
            <Switch
              value={pathDisplayMode.ai}
              onValueChange={handleToggleAiPath}
            />
          </View>
        )}
      </View>
    );
  }

  // Standard version with labels
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Path Display Options</Text>
      <Divider style={styles.divider} />

      <View style={styles.option}>
        <Text>Your Path</Text>
        <Switch
          value={pathDisplayMode.player}
          onValueChange={handleTogglePlayerPath}
        />
      </View>

      {showAdvancedOptions && (
        <>
          <View style={styles.option}>
            <Text>Optimal Path</Text>
            <Switch
              value={pathDisplayMode.optimal}
              onValueChange={handleToggleOptimalPath}
            />
          </View>

          <View style={styles.option}>
            <Text>Suggested Path</Text>
            <Switch
              value={pathDisplayMode.suggested}
              onValueChange={handleToggleSuggestedPath}
            />
          </View>
        </>
      )}

      {showAiPathOption && (
        <View style={styles.option}>
          <Text>AI Path</Text>
          <Switch
            value={pathDisplayMode.ai}
            onValueChange={handleToggleAiPath}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 8,
  },
  compactOption: {
    flexDirection: "column",
    alignItems: "center",
    marginHorizontal: 4,
  },
  compactLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
});

export default PathDisplayConfigurator;
