import React, { useEffect, useState, useRef, Suspense } from "react";
import {
  useColorScheme,
  View,
  Linking,
  Platform,
  LogBox,
  Alert,
  AppState,
} from "react-native";
import "react-native-url-polyfill/auto";
import { PaperProvider, ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient } from "@tanstack/react-query";

// Lazy load heavy modal components for better web performance
import { lazy } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GameScreen } from "./screens/GameScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { AppHeader } from "./components/AppHeader";
import { LegalPages } from "./components/LegalPages";
import { DailiesModal } from "./components/DailiesModal";
import { SettingsModal } from "./components/SettingsModal";
import { StatsModal } from "./components/StatsModal";
import { NewsModal } from "./components/NewsModal";
import { TutorialModal } from "./components/TutorialModal";
import { QuickstartModal } from "./components/QuickstartModal";
import { ContactModal } from "./components/ContactModal";
import { LabsModal } from "./components/LabsModal";
import UpgradePrompt from "./components/UpgradePrompt";

// Payment-related imports
import PaymentHandler from "./services/PaymentHandler";
import type { PaymentRedirectResult } from "./services/PaymentHandler";

import { useGameStore } from "./stores/useGameStore";
import { SynapseDarkTheme, SynapseLightTheme } from "./theme/SynapseTheme";
import { initializeWebOptimizations } from "./utils/webOptimizations";
import { useAchievementStore } from "./stores/useAchievementStore";
import { useWordCollectionStore } from "./stores/useWordCollectionStore";
import { useDailyChallengeStore } from "./stores/useDailyChallengeStore";
import { useUserProfileStore } from "./stores/useUserProfileStore";
import { ProgressiveSyncService } from "./services/ProgressiveSyncService";

// Initialize Supabase
import { SupabaseService } from "./services/SupabaseService";
import ErrorBoundary from "./components/ErrorBoundary";
import { gameFlowManager } from "./services/GameFlowManager";
import { preloadAllData } from "./services/dataLoader";
import { Footer } from "./components/Footer";
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { TutorialProvider } from "./context/TutorialContext";
import AccountScreen from "./screens/AccountScreen";
SupabaseService.getInstance();

// Initialize Progressive Sync Service
ProgressiveSyncService.getInstance();

// Initialize other stores
useGameStore.getState().initialize();
useAchievementStore.getState().initialize();
useWordCollectionStore.getState().initialize();
useDailyChallengeStore.getState().initialize();
useUserProfileStore.getState().initialize();

// Define the root stack parameter list
export type RootStackParamList = {
  Home: undefined;
  Synapse: undefined;
  History: undefined;
  Auth: undefined;
  Account: undefined;
};

// Custom screen transition animations
const customScreenOptions: Partial<NativeStackNavigationOptions> = {
  animation: "fade",
  animationDuration: 300, // in ms
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading fallback component for lazy-loaded modals
const ModalLoadingFallback: React.FC = () => (
  <View style={{ justifyContent: "center", alignItems: "center", padding: 20 }}>
    <ActivityIndicator size="small" />
  </View>
);

function AppContent() {
  const { auth, authLoaded } = useAuth();
  const { theme } = useTheme();
  const [showAuth, setShowAuth] = useState(false);
  const [authScreenMode, setAuthScreenMode] = useState<
    "signin" | "signup" | "reset" | "signin_after_purchase"
  >("signup");
  const [authScreenInitialEmail, setAuthScreenInitialEmail] = useState<
    string | undefined
  >(undefined);
  const [showAccount, setShowAccount] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [currentLegalPage, setCurrentLegalPage] = useState<
    "terms" | "privacy" | "dmca" | "about" | "contact" | null
  >(null);

  // Get the actions from the store - updated for new modal states
  const loadInitialData = useGameStore((state) => state.loadInitialData);

  // New modal visibility states
  const quickstartModalVisible = useGameStore(
    (state) => state.quickstartModalVisible,
  );
  const newsModalVisible = useGameStore((state) => state.newsModalVisible);
  const contactModalVisible = useGameStore(
    (state) => state.contactModalVisible,
  );
  const labsModalVisible = useGameStore((state) => state.labsModalVisible);

  // New modal actions
  const setQuickstartModalVisible = useGameStore(
    (state) => state.setQuickstartModalVisible,
  );
  const setNewsModalVisible = useGameStore(
    (state) => state.setNewsModalVisible,
  );
  const setContactModalVisible = useGameStore(
    (state) => state.setContactModalVisible,
  );
  const setLabsModalVisible = useGameStore(
    (state) => state.setLabsModalVisible,
  );

  // Initialize web compatibility layers and load data
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize web-specific optimizations first
      if (Platform.OS === "web") {
        initializeWebOptimizations();
      }

      let entryUrl = "";
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          entryUrl = window.location.href;

          // Check if we're on a legal page
          const pathname = window.location.pathname;
          if (pathname === "/terms") {
            setCurrentLegalPage("terms");
            return;
          } else if (pathname === "/privacy") {
            setCurrentLegalPage("privacy");
            return;
          } else if (pathname === "/dmca") {
            setCurrentLegalPage("dmca");
            return;
          } else if (pathname === "/about") {
            setCurrentLegalPage("about");
            return;
          } else if (pathname === "/contact") {
            setCurrentLegalPage("contact");
            return;
          }
        }
      } else {
        const initialUrl = await Linking.getInitialURL();
        entryUrl = initialUrl || "";
      }

      // --- Handle Payment Redirects FIRST ---
      // For web, direct URL access. For native, initial deep link.
      const paymentHandler = PaymentHandler.getInstance();
      const paymentResult: PaymentRedirectResult =
        await paymentHandler.handlePaymentRedirect();

      if (paymentResult.wasPaymentAttempt) {
        setPaymentMessage(paymentResult.message || paymentResult.error || null);
        if (paymentResult.showAuthModal) {
          setAuthScreenMode(paymentResult.authMode || "signup");
          setAuthScreenInitialEmail(paymentResult.emailToPreFill);
          setShowAuth(true);
        } else if (paymentResult.error) {
          // If not showing auth modal but there was an error, alert it.
          // You might want a more subtle UI for this.
          Alert.alert("Payment Status", paymentResult.error);
        }
        // After handling payment, typically don't proceed with other URL parsing like game challenges
        // unless payment flow specifically dictates it.
        // Ensure essential data is loaded if needed, but primary flow might stop here.
        await loadInitialData(); // Load essential data regardless
        if (auth.user && paymentResult.success) {
          // User got signed in during payment flow and payment was successful
          // Refresh game access state to ensure they can play immediately
          try {
            await useGameStore.getState().refreshGameAccessState();
            console.log(
              "✅ Game access state refreshed after successful payment",
            );
          } catch (error) {
            console.error(
              "❌ Error refreshing game access state after payment:",
              error,
            );
          }
        }
        return; // Stop further processing in initializeApp if it was a payment attempt
      }
      // --- End of Payment Redirect Handling ---

      // If not a payment redirect, proceed with normal app initialization
      const { entryType, challengeData } =
        gameFlowManager.parseEntryUrl(entryUrl);

      // Start data preloading in parallel with loadInitialData for better performance
      const [,] = await Promise.all([
        loadInitialData(),
        preloadAllData().catch((err) =>
          console.warn("Data preloading failed:", err),
        ),
      ]);

      if (auth.user) {
        // await auth.syncDataFromCloud(); // This was old logic
        // With new SupabaseService, sync happens on auth state change handled by service.
      }

      const flowDecision = await gameFlowManager.determineGameFlow(
        entryType,
        challengeData,
      );
      await gameFlowManager.executeFlowDecision(flowDecision);
    };

    if (!auth.isLoading) {
      initializeApp().catch((err) =>
        console.error("Error during initializeApp:", err),
      );
    }
    // Ensure all dependencies are correct for when this should re-run
  }, [auth.isLoading, auth.user, loadInitialData]);

  // Set up deep link handling for when app is ALREADY open
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log("App already open, received deeplink:", event.url);
      // --- Handle Payment Redirects for open app ---
      const paymentHandler = PaymentHandler.getInstance();
      // Temporarily set window.location.search for PaymentHandler if on web and app is already open
      // This is a bit of a hack for web. Native Linking gives the full URL.
      let originalSearch = "";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        originalSearch = window.location.search;
        const urlObj = new URL(event.url);
        window.location.search = urlObj.search;
      }

      const paymentResult: PaymentRedirectResult =
        await paymentHandler.handlePaymentRedirect();

      // Restore original search query if on web
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname); // Clean up URL
        window.location.search = originalSearch;
      }

      if (paymentResult.wasPaymentAttempt) {
        setPaymentMessage(paymentResult.message || paymentResult.error || null);
        if (paymentResult.showAuthModal) {
          setAuthScreenMode(paymentResult.authMode || "signup");
          setAuthScreenInitialEmail(paymentResult.emailToPreFill);
          setShowAuth(true);
        } else if (paymentResult.error) {
          Alert.alert("Payment Status", paymentResult.error);
        }
        if (auth.user && paymentResult.success) {
          try {
            await useGameStore.getState().refreshGameAccessState();
            console.log(
              "✅ Game access state refreshed after successful payment",
            );
          } catch (error) {
            console.error(
              "❌ Error refreshing game access state after payment:",
              error,
            );
          }
        }
        return; // Stop further processing if it was a payment link
      }
      // --- End Payment Redirect Handling for open app ---

      // Handle other deep links (e.g., game challenges)
      const { entryType, challengeData } = gameFlowManager.parseEntryUrl(
        event.url,
      );
      const flowDecision = await gameFlowManager.determineGameFlow(
        entryType,
        challengeData,
      );
      await gameFlowManager.executeFlowDecision(flowDecision);
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [auth.user]);

  // Handle app state changes (e.g., coming to foreground)
  useEffect(() => {
    const appState = AppState.currentState;
    console.log("Current App State:", appState);

    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active") {
        console.log("App has come to the foreground");
        // Refresh daily challenge data when app becomes active
        await useDailyChallengeStore.getState().fetchTodaysChallenge();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  if (!authLoaded) {
    return (
      <PaperProvider theme={SynapseDarkTheme}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: SynapseDarkTheme.colors.background,
          }}
        >
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 15, color: "white" }}>
            Loading Synapses...
          </Text>
        </View>
      </PaperProvider>
    );
  }

  // Once auth is loaded, decide which main screen to show
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <AppHeader
        onShowAuth={() => setShowAuth(true)}
        onShowAccount={() => setShowAccount(true)}
        onShowLegal={(page) => setCurrentLegalPage(page)}
      />

      <GameScreen />

      <Footer
        onShowAuth={() => setShowAuth(true)}
        onShowLegal={(page) => setCurrentLegalPage(page)}
      />

      {/* Auth Modal */}
      {showAuth && (
        <AuthScreen
          visible={showAuth}
          onDismiss={() => setShowAuth(false)}
          mode={authScreenMode}
          initialEmail={authScreenInitialEmail}
          onSuccess={() => {
            setShowAuth(false);
          }}
        />
      )}

      {/* Account Modal */}
      <Suspense fallback={<ModalLoadingFallback />}>
        {showAccount && (
          <AccountScreen
            visible={showAccount}
            onDismiss={() => setShowAccount(false)}
          />
        )}
      </Suspense>

      {/* Other Modals */}
      <Suspense fallback={<ModalLoadingFallback />}>
        <DailiesModal />
        <StatsModal />
        <SettingsModal />
        <NewsModal
          visible={newsModalVisible}
          onDismiss={() => setNewsModalVisible(false)}
        />
        <QuickstartModal
          visible={quickstartModalVisible}
          onDismiss={() => setQuickstartModalVisible(false)}
        />
        <ContactModal
          visible={contactModalVisible}
          onDismiss={() => setContactModalVisible(false)}
        />
        <LabsModal
          visible={labsModalVisible}
          onDismiss={() => setLabsModalVisible(false)}
        />
        <TutorialModal />
      </Suspense>

      <UpgradePrompt />

      {/* Legal Pages Modal */}
      {currentLegalPage && (
        <LegalPages
          type={currentLegalPage}
          onBack={() => setCurrentLegalPage(null)}
        />
      )}

      {/* Payment success/error message */}
      {paymentMessage && (
        <View
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            padding: 20,
            backgroundColor: "lightblue",
          }}
        >
          <Text>{paymentMessage}</Text>
          <button onClick={() => setPaymentMessage(null)}>Close</button>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <TutorialProvider>
              <PaperProvider>
                <NavigationContainer>
                  <AppContent />
                </NavigationContainer>
              </PaperProvider>
            </TutorialProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Ignore warnings for now
LogBox.ignoreLogs([
  "Warning: Each child in a list should have a unique 'key' prop.",
  "Warning: Using 'animation' in user-facing transitions is discouraged. Use 'animationType' instead.",
  "You are setting the style 'color' as a prop. You should nest it in a style object.",
  "You are setting the style 'backgroundColor' as a prop. You should nest it in a style object.",
  "Prop `color` supplied to `Icon` is conflicting with transformation `color`.",
]);
