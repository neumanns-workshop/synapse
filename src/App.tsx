import React, { useEffect } from "react";
import { Platform, Linking } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AboutModal from "./components/AboutModal";
import StatsModal from "./components/StatsModal";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import GameScreen from "./screens/GameScreen";
import { parseGameDeepLink } from "./services/SharingService";
import { useGameStore } from "./stores/useGameStore";

// Define the root stack parameter list
export type RootStackParamList = {
  Home: undefined;
  Synapse: undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { theme } = useTheme();
  // Get the actions from the store
  const loadInitialData = useGameStore((state) => state.loadInitialData);
  const startChallengeGame = useGameStore((state) => state.startChallengeGame);
  const aboutModalVisible = useGameStore((state) => state.aboutModalVisible);
  const setAboutModalVisible = useGameStore(
    (state) => state.setAboutModalVisible,
  );
  const setHasPendingChallenge = useGameStore(
    (state) => state.setHasPendingChallenge,
  );
  const setPendingChallengeWords = useGameStore(
    (state) => state.setPendingChallengeWords,
  );

  // Initialize web compatibility layers and load data
  useEffect(() => {
    const initializeApp = async () => {
      if (Platform.OS === "web") {
        // Check for challenge parameters in URL for web
        if (typeof window !== "undefined" && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const startWord = params.get("start");
          const targetWord = params.get("target");

          if (startWord && targetWord) {
            // Store these parameters for GameScreen to use
            setPendingChallengeWords({ startWord, targetWord });
            setHasPendingChallenge(true);
          }
        }
      } else {
        // Handle deep links for native platforms
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const params = parseGameDeepLink(initialUrl);

          if (params && params.startWord && params.targetWord) {
            // Store these parameters for GameScreen to use
            setPendingChallengeWords({
              startWord: params.startWord,
              targetWord: params.targetWord,
            });
            setHasPendingChallenge(true);
          }
        }
      }

      // Load graph/definitions data when the app mounts
      try {
        await loadInitialData();
      } catch (error) {}
    };

    initializeApp();
  }, [loadInitialData, setPendingChallengeWords, setHasPendingChallenge]);

  // Set up deep link handling for when app is already open
  useEffect(() => {
    // Function to handle incoming links
    const handleDeepLink = async (event: { url: string }) => {
      const params = parseGameDeepLink(event.url);

      if (params && params.startWord && params.targetWord) {
        setPendingChallengeWords({
          startWord: params.startWord,
          targetWord: params.targetWord,
        });
        setHasPendingChallenge(true);
      }
    };

    // Handle links when app is already open (only for native)
    if (Platform.OS !== "web") {
      const subscription = Linking.addEventListener("url", handleDeepLink);
      return () => subscription.remove();
    }
  }, [startChallengeGame, setPendingChallengeWords, setHasPendingChallenge]);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Synapse"
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="Synapse" component={GameScreen} />
          </Stack.Navigator>
          <AboutModal
            visible={aboutModalVisible}
            onDismiss={() => setAboutModalVisible(false)}
          />
          <StatsModal />
        </NavigationContainer>
        <StatusBar style={theme.dark ? "light" : "dark"} />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
