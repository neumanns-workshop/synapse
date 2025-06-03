import React, { useEffect } from "react";
import { Platform, Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "react-query";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AboutModal from "./components/AboutModal";
import StatsModal from "./components/StatsModal";
import TutorialModal from "./components/TutorialModal";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { TutorialProvider } from "./context/TutorialContext";
import GameScreen from "./screens/GameScreen";
import { gameFlowManager } from "./services/GameFlowManager";
import { useGameStore } from "./stores/useGameStore";
import { resetAllPlayerData } from './services/StorageService';

// Define the root stack parameter list
export type RootStackParamList = {
  Home: undefined;
  Synapse: undefined;
  History: undefined;
};

// Custom screen transition animations
const customScreenOptions: Partial<NativeStackNavigationOptions> = {
  animation: "fade",
  animationDuration: 300, // in ms
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const queryClient = new QueryClient();

function AppContent() {
  const { theme } = useTheme();
  // Get the actions from the store
  const loadInitialData = useGameStore((state) => state.loadInitialData);
  const aboutModalVisible = useGameStore((state) => state.aboutModalVisible);
  const setAboutModalVisible = useGameStore(
    (state) => state.setAboutModalVisible,
  );

  // Initialize web compatibility layers and load data
  useEffect(() => {
    const initializeApp = async () => {
      // TEMPORARY: Reset all player data for testing
      // Comment this out after testing
      await resetAllPlayerData();
      
      let entryUrl = '';
      
      if (Platform.OS === "web") {
        // Get URL from browser
        if (typeof window !== "undefined") {
          entryUrl = window.location.href;
        }
      } else {
        // Handle deep links for native platforms
        const initialUrl = await Linking.getInitialURL();
        entryUrl = initialUrl || '';
      }

      // Parse the entry URL to determine the type and extract challenge data
      const { entryType, challengeData } = gameFlowManager.parseEntryUrl(entryUrl);

      // Load graph/definitions data when the app mounts
      try {
        await loadInitialData();
        
        // Determine and execute the appropriate game flow
        const flowDecision = await gameFlowManager.determineGameFlow(entryType, challengeData);
        await gameFlowManager.executeFlowDecision(flowDecision);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, [loadInitialData]);

  // Set up deep link handling for when app is already open
  useEffect(() => {
    // Function to handle incoming links
    const handleDeepLink = async (event: { url: string }) => {
      const { entryType, challengeData } = gameFlowManager.parseEntryUrl(event.url);
      
      // Determine and execute the appropriate game flow
      const flowDecision = await gameFlowManager.determineGameFlow(entryType, challengeData);
      await gameFlowManager.executeFlowDecision(flowDecision);
    };

    // Handle links when app is already open (only for native)
    if (Platform.OS !== "web") {
      const subscription = Linking.addEventListener("url", handleDeepLink);
      return () => subscription.remove();
    }
  }, []);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Synapse"
            screenOptions={{
              headerShown: false,
              animation: customScreenOptions.animation,
              animationDuration: customScreenOptions.animationDuration,
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
          <TutorialModal />
        </NavigationContainer>
        <StatusBar style={theme.dark ? "light" : "dark"} />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TutorialProvider>
        <AppContent />
      </TutorialProvider>
    </ThemeProvider>
  );
}
