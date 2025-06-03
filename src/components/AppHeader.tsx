import React from "react";
import { Image, StyleSheet, Pressable } from "react-native";

import { Appbar, useTheme } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface AppHeaderProps {
  onNewGame: () => void;
  onGiveUp: () => void;
  newGameDisabled?: boolean;
  giveUpDisabled?: boolean;
}

// Create animated version of Appbar.Action
const AnimatedAction = Animated.createAnimatedComponent(Appbar.Action);

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

  // Animation values for each button
  const aboutScale = useSharedValue(1);
  const statsScale = useSharedValue(1);
  const newGameScale = useSharedValue(1);
  const giveUpScale = useSharedValue(1);

  // Shared animation style creator
  const createAnimatedStyle = (scale: Animated.SharedValue<number>) => 
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

  // Animation styles for each button
  const aboutAnimatedStyle = createAnimatedStyle(aboutScale);
  const statsAnimatedStyle = createAnimatedStyle(statsScale);
  const newGameAnimatedStyle = createAnimatedStyle(newGameScale);
  const giveUpAnimatedStyle = createAnimatedStyle(giveUpScale);

  // Shared press animation function
  const animatePress = (scale: Animated.SharedValue<number>) => {
    scale.value = withTiming(0.9, { duration: 100, easing: Easing.inOut(Easing.ease) });
    setTimeout(() => {
      scale.value = withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) });
    }, 100);
  };

  // Handlers with animation
  const handleAbout = () => {
    animatePress(aboutScale);
    setAboutModalVisible(true);
  };

  const handleStats = () => {
    animatePress(statsScale);
    setStatsModalVisible(true);
  };

  const handleNewGame = () => {
    if (!newGameDisabled) {
      animatePress(newGameScale);
      onNewGame();
    }
  };

  const handleGiveUp = () => {
    if (!giveUpDisabled) {
      animatePress(giveUpScale);
      onGiveUp();
    }
  };

  return (
    <Appbar.Header>
      <Image source={require("../../assets/favicon.svg")} style={styles.logo} />
      <Appbar.Content title="Synapse" titleStyle={styles.title} />
      
      <AnimatedAction
        icon="book-open-variant"
        onPress={handleAbout}
        color={customColors.currentNode}
        style={aboutAnimatedStyle}
      />
      
      <AnimatedAction
        icon="trophy"
        onPress={handleStats}
        color={customColors.globalOptimalNode}
        style={statsAnimatedStyle}
      />
      
      <AnimatedAction
        icon="refresh"
        onPress={handleNewGame}
        disabled={newGameDisabled}
        color={customColors.startNode}
        style={newGameAnimatedStyle}
      />
      
      <AnimatedAction
        icon="flag-variant"
        onPress={handleGiveUp}
        disabled={giveUpDisabled}
        color={customColors.endNode}
        style={giveUpAnimatedStyle}
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
