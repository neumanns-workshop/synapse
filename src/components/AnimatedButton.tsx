import React from "react";
import { StyleSheet, GestureResponderEvent } from "react-native";

import { Button, ButtonProps } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedButton = Animated.createAnimatedComponent(Button);

interface AnimatedButtonProps extends ButtonProps {
  // Add any additional props specific to our animated button
  scaleOnPress?: boolean;
}

const AnimatedPaperButton: React.FC<AnimatedButtonProps> = ({
  children,
  onPress,
  style,
  scaleOnPress = true,
  ...props
}) => {
  // Animation shared values
  const scale = useSharedValue(1);
  
  // Create animation style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Prepare animated press handler
  const handlePress = (e: GestureResponderEvent) => {
    if (scaleOnPress) {
      // Scale down
      scale.value = withTiming(0.95, { 
        duration: 100, 
        easing: Easing.inOut(Easing.ease) 
      });
      
      // Scale back up
      setTimeout(() => {
        scale.value = withTiming(1, { 
          duration: 200, 
          easing: Easing.inOut(Easing.ease) 
        });
      }, 100);
    }
    
    // Call the original onPress handler
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <AnimatedButton
      onPress={handlePress}
      style={[styles.button, style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
  },
});

export default AnimatedPaperButton; 