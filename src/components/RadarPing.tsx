import React, { useEffect } from 'react';
import { Circle, CircleProps } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadarPingProps {
  cx: number;
  cy: number;
  color: string;
  startRadius: number;
  maxRadius: number;
  duration?: number;
  initialDelay?: number; // Delay before the first ping animation starts
}

const RadarPing: React.FC<RadarPingProps> = ({
  cx,
  cy,
  color,
  startRadius,
  maxRadius,
  duration = 2500, // Increased duration
  initialDelay = 0,
}) => {
  const progress = useSharedValue(0); // Animation progress from 0 to 1

  useEffect(() => {
    // Start the repeating animation sequence with an initial delay
    progress.value = withDelay(
      initialDelay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.ease) }),
        -1, // Infinite repeats
        false // Do not reverse
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, initialDelay]); // Rerun effect if duration or initialDelay changes

  const animatedProps = useAnimatedProps(() => {
    const currentRadius = interpolate(
      progress.value,
      [0, 1],
      [startRadius, maxRadius]
    );
    const currentOpacity = interpolate(
      progress.value,
      [0, 0.15, 0.7, 1], // Opacity ramps up, holds, then fades
      [0, 0.4, 0.2, 0]   // Max opacity 0.4
    );

    return {
      r: currentRadius,
      strokeOpacity: currentOpacity,
    };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill="none" // Pings are typically just outlines
      stroke={color}
      strokeWidth={1} // Further reduced stroke width
      animatedProps={animatedProps}
    />
  );
};

export default RadarPing; 