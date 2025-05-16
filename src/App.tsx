import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { useGameStore } from './stores/useGameStore';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AboutModal from './components/AboutModal';
import StatsModal from './components/StatsModal';

// Import our actual screens
import GameScreen from './screens/GameScreen';

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
  const aboutModalVisible = useGameStore((state) => state.aboutModalVisible);
  const setAboutModalVisible = useGameStore((state) => state.setAboutModalVisible);
  const statsModalVisible = useGameStore((state) => state.statsModalVisible);
  const setStatsModalVisible = useGameStore((state) => state.setStatsModalVisible);

  // Initialize web compatibility layers and load data
  useEffect(() => {
    const initializeApp = async () => {
      if (Platform.OS === 'web') {
        console.log('Running on web platform');
        // Web compatibility initialization would go here
      }
      // Load graph/definitions data when the app mounts
      try {
        await loadInitialData();
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    initializeApp();
  }, [loadInitialData]);

  // Use selector to get loading/error state for potential display
  const isLoadingData = useGameStore((state) => state.isLoadingData);
  const errorLoadingData = useGameStore((state) => state.errorLoadingData);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Synapse"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: theme.colors.background }
            }}
          >
            <Stack.Screen name="Synapse" component={GameScreen} />
          </Stack.Navigator>
          <AboutModal visible={aboutModalVisible} onDismiss={() => setAboutModalVisible(false)} />
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