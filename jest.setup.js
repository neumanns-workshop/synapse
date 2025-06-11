// Jest setup file (can be empty or used for global mocks/setup)

// Mock environment variables globally for all tests - SET FIRST BEFORE ANY IMPORTS
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";

import "react-native-gesture-handler/jestSetup"; // Recommended by react-native-gesture-handler

// Simplified expo-asset mock, relying more on jest-expo defaults if possible
jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      uri: "test-asset-uri",
      name: "test-asset-name",
      type: "test-asset-type",
      hash: "test-asset-hash",
      downloaded: true, // Assume downloaded for tests
      downloadAsync: jest.fn(() => Promise.resolve()),
    })),
    fromURI: jest.fn(() => ({
      uri: "test-uri",
      name: "test-asset-name-from-uri",
      localUri: "test-local-uri",
      width: 100,
      height: 100,
      downloadAsync: jest.fn(() => Promise.resolve()),
    })),
    loadAsync: jest.fn(() => Promise.resolve([])), // For Asset.loadAsync([]) pattern
    isLoaded: jest.fn(() => true),
    getAssetByID: jest.fn(() => ({
      uri: "test-asset-uri-by-id",
      name: "test-asset-name-by-id",
      downloadAsync: jest.fn(() => Promise.resolve()),
    })),
    // You can add other properties/methods of Asset class if needed by your components
  },
}));

// Mock for expo-font
jest.mock("expo-font", () => ({
  ...jest.requireActual("expo-font"), // Preserve other exports if any
  loadAsync: jest.fn(() => Promise.resolve()), // Mock font loading to always succeed
  isLoaded: jest.fn(() => true), // Assume fonts are loaded
  // If specific fonts are checked via Font.processFontFamily, mock that too if needed
}));

// Mock for @expo/vector-icons if they are causing issues directly with font loading
// Often, mocking expo-font is enough, but this can be a fallback.
// jest.mock('@expo/vector-icons', () => {
//   const actualNav = jest.requireActual('@expo/vector-icons');
//   return {
//     ...actualNav,
//     // For any icon component like MaterialIcons, FontAwesome, etc.:
//     MaterialIcons: ({ name, color, size, style }) =>
//       `<MaterialIcons name="${name}" size={${size}} color="${color}" style={${JSON.stringify(style)}} />`,
//     // Add other icon sets your app uses
//     FontAwesome: ({ name, color, size, style }) =>
//       `<FontAwesome name="${name}" size={${size}} color="${color}" style={${JSON.stringify(style)}} />`,
//   };
// });

// Mock for react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.useSharedValue = jest.fn((initialValue) => ({
    value: initialValue,
  }));
  Reanimated.useAnimatedStyle = jest.fn((updater) =>
    typeof updater === "function" ? updater() : {},
  );
  Reanimated.withTiming = jest.fn((toValue, _, cb) => {
    if (cb) cb({ finished: true });
    return toValue;
  });
  Reanimated.withSpring = jest.fn((toValue, _, cb) => {
    if (cb) cb({ finished: true });
    return toValue;
  });
  // Provide default implementations for layout animations if used
  Reanimated.FadeIn = {
    entering: jest.fn(() => ({})),
    duration: jest.fn().mockReturnThis(),
    delay: jest.fn().mockReturnThis(),
    withCallback: jest.fn().mockReturnThis(),
  };
  Reanimated.FadeOut = {
    exiting: jest.fn(() => ({})),
    duration: jest.fn().mockReturnThis(),
    delay: jest.fn().mockReturnThis(),
    withCallback: jest.fn().mockReturnThis(),
  };
  Reanimated.Layout = jest.fn(() => ({
    duration: jest.fn().mockReturnThis(),
    delay: jest.fn().mockReturnThis(),
    withCallback: jest.fn().mockReturnThis(),
  }));
  // Add other Reanimated features your app uses as needed
  return Reanimated;
});

// If you use @react-native-async-storage/async-storage, it's often mocked automatically by jest-expo
// or you can use: jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Other global mocks can go here
