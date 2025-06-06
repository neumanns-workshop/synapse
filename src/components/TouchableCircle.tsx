import React, { useEffect } from "react";
import { Platform } from "react-native";

import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  // SharedValue // Not typically needed for direct import unless for explicit typing
} from "react-native-reanimated";
import { Circle, CircleProps } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TouchableCircleProps
  extends Omit<CircleProps, "r" | "onPress" | "fill"> {
  cx: number;
  cy: number;
  initialRadius: number; // This is the key prop that was missing
  targetFill: string; // New prop for the target fill color
  stroke: string;
  strokeWidth: number;
  onPress: () => void;
  fillOpacity?: number;
  isCurrent?: boolean;
  focusedRadius: number;
  defaultRadius: number;
  animationDuration?: number; // Optional duration for fill animation
}

const TouchableCircle: React.FC<TouchableCircleProps> = ({
  cx,
  cy,
  initialRadius,
  targetFill,
  stroke,
  strokeWidth,
  onPress,
  fillOpacity,
  isCurrent,
  focusedRadius,
  defaultRadius,
  animationDuration = 300, // Default fill animation duration
  ...otherProps // To pass through other SVG props if any
}) => {
  const animatedRadius = useSharedValue(initialRadius);
  const animatedFillColor = useSharedValue(targetFill); // Initialize with the first targetFill

  useEffect(() => {
    // Animate fill color when targetFill changes
    animatedFillColor.value = withTiming(targetFill, {
      duration: animationDuration,
      easing: Easing.inOut(Easing.ease),
    });
  }, [targetFill, animationDuration, animatedFillColor]);

  useEffect(() => {
    if (isCurrent === true) {
      // First, smoothly animate to the trough of the breath cycle
      animatedRadius.value = withTiming(
        focusedRadius - 1, // Target the bottom of the breath cycle
        { duration: 500, easing: Easing.out(Easing.ease) }, // Duration for this initial transition
        (finished) => {
          // This callback runs when the transition to the trough is complete
          if (finished) {
            // Now, start the continuous breathing loop from the trough
            animatedRadius.value = withRepeat(
              withSequence(
                // Inhale: expand slightly from the trough
                withTiming(focusedRadius + 1.5, {
                  duration: 2500,
                  easing: Easing.inOut(Easing.ease),
                }),
                // Exhale: contract slightly back to the trough
                withTiming(focusedRadius - 1, {
                  duration: 3000,
                  easing: Easing.inOut(Easing.ease),
                }),
              ),
              -1, // Repeat indefinitely
              false, // Play the sequence as defined, then repeat it
            );
          }
        },
      );
    } else if (isCurrent === false) {
      // Animate to defaultRadius when not current. Reanimated should cancel the prior loop.
      animatedRadius.value = withTiming(defaultRadius, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
    } else {
      // isCurrent is undefined (e.g. for start/end nodes not currently active)
      // Animate to initialRadius (which should be their focused size)
      animatedRadius.value = withTiming(initialRadius, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isCurrent, focusedRadius, defaultRadius, initialRadius, animatedRadius]);

  const animatedPropsObject = useAnimatedProps(() => {
    return {
      r: animatedRadius.value,
      fill: animatedFillColor.value, // Use the animated fill color
    } as { r: number; fill: string }; // Explicitly type the return for animatedProps
  });

  const pressHandler =
    Platform.OS === "web" ? { onClick: onPress } : { onPress };

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fillOpacity={fillOpacity}
      {...pressHandler}
      {...otherProps} // Spread other CircleProps like strokeDasharray etc.
      animatedProps={animatedPropsObject}
    />
  );
};

export default TouchableCircle;
