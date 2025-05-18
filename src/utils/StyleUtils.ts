import { Platform, ViewStyle, StyleProp } from "react-native";

// Define a type for pointerEvents that matches React Native's accepted values
type PointerEvents = "auto" | "none" | "box-none" | "box-only";

interface PointerEventStyle {
  pointerEvents?: PointerEvents;
  style?: {
    pointerEvents: PointerEvents;
  };
}

/**
 * Properly handle pointer events in a cross-platform way
 * This prevents the "props.pointerEvents is deprecated" warning on web
 */
export const getPointerEventStyles = (
  pointerEvents: PointerEvents,
): PointerEventStyle => {
  if (Platform.OS === "web") {
    // On web, we should use style.pointerEvents instead of the prop
    return { style: { pointerEvents } };
  } else {
    // On native, we use the pointerEvents prop
    return { pointerEvents };
  }
};

interface ShadowOptions {
  elevation?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
}

/**
 * Platform-specific shadow styles that work across platforms
 */
export const getShadowStyles = (
  options: ShadowOptions = {},
): StyleProp<ViewStyle> => {
  const {
    elevation = 2,
    shadowColor = "#000",
    shadowOpacity = 0.1,
    shadowRadius = 2,
    shadowOffset = { width: 0, height: 1 },
  } = options;

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    },
    web: {
      // For web, boxShadow expects a string.
      // We construct it carefully. Note: React Native's ViewStyle for web doesn't strictly type boxShadow.
      boxShadow: `0px ${shadowOffset.height}px ${shadowRadius}px rgba(0, 0, 0, ${shadowOpacity})`,
    } as ViewStyle & { boxShadow: string }, // More specific cast for web
    android: {
      elevation,
    },
  });
};
