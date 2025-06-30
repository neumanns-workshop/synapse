import React, { useEffect, useState, Suspense, lazy } from "react";
import {
  Platform,
  Linking,
  View,
  Alert,
  AppState,
  StyleSheet,
} from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Lazy load heavy modal components for better web performance
const ContactModal = lazy(() => import("./components/ContactModal"));
const DailiesModal = lazy(() => import("./components/DailiesModal"));
const GameReportModal = lazy(() => import("./components/GameReportModal"));
const LabsModal = lazy(() => import("./components/LabsModal"));
const NewsModal = lazy(() => import("./components/NewsModal"));
const QuickstartModal = lazy(() => import("./components/QuickstartModal"));
const StatsModal = lazy(() => import("./components/StatsModal"));
const TutorialModal = lazy(() => import("./components/TutorialModal"));

// Legal page components

import ErrorBoundary from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { LegalPage } from "./components/LegalPages";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { TutorialProvider } from "./context/TutorialContext";
import AccountScreen from "./screens/AccountScreen";
import AuthScreen from "./screens/AuthScreen";
import GameScreen from "./screens/GameScreen";
import { preloadAllData } from "./services/dataLoader";
import { gameFlowManager } from "./services/GameFlowManager";
import PaymentHandler from "./services/PaymentHandler";
import type { PaymentRedirectResult } from "./services/PaymentHandler";
import { unifiedDataStore } from "./services/UnifiedDataStore";
import { useGameStore } from "./stores/useGameStore";
import { initializeWebOptimizations } from "./utils/webOptimizations";

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
const modalLoadingStyles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

const ModalLoadingFallback: React.FC = () => (
  <View style={modalLoadingStyles.container}>
    <ActivityIndicator size="small" />
  </View>
);

function AppContent() {
  const { theme } = useTheme();
  const auth = useAuth();
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
        window.history.replaceState({}, "", urlObj.pathname + urlObj.search); // Update URL without reload so PaymentHandler can parse it
      }

      const paymentResult = await paymentHandler.handlePaymentRedirect();

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.history.replaceState(
          {},
          "",
          window.location.pathname + originalSearch,
        ); // Restore original search if needed
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

        // If user is signed in and payment was successful, refresh game access state
        if (auth.user && paymentResult.success) {
          try {
            await useGameStore.getState().refreshGameAccessState();
            console.log(
              "✅ Game access state refreshed after successful payment (deep link)",
            );
          } catch (error) {
            console.error(
              "❌ Error refreshing game access state after payment (deep link):",
              error,
            );
          }
        }

        return; // Stop further processing if it was a payment attempt
      }
      // --- End of Payment Redirect Handling for open app ---

      // If not a payment redirect, proceed with normal deep link handling
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
    return () => subscription.remove();
  }, [auth.user]); // Dependencies: gameFlowManager or other services if they change

  // Set up AppState handling to flush pending data saves when app backgrounds
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        // Flush any pending saves before the app goes to background
        try {
          await unifiedDataStore.flushPendingChanges();
          console.log("✅ Flushed pending data saves on app background");
        } catch (error) {
          console.error("❌ Error flushing pending saves:", error);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  // Show loading screen while auth is initializing
  if (auth.isLoading) {
    const loadingScreenStyles = StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background,
      },
      text: {
        marginTop: 16,
        color: theme.colors.onBackground,
      },
    });

    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <View style={loadingScreenStyles.container}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={loadingScreenStyles.text}>Loading...</Text>
          </View>
          <StatusBar style={theme.dark ? "light" : "dark"} />
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  // Show legal page if requested
  if (currentLegalPage) {
    const legalPageStyles = StyleSheet.create({
      container: {
        flex: 1,
      },
    });

    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <View style={legalPageStyles.container}>
            <LegalPage
              type={currentLegalPage}
              onBack={() => setCurrentLegalPage(null)}
            />
            <Footer onLegalPageRequest={(page) => setCurrentLegalPage(page)} />
          </View>
          <StatusBar style={theme.dark ? "light" : "dark"} />
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <ErrorBoundary>
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
              <Stack.Screen name="Synapse">
                {(props) => (
                  <ErrorBoundary>
                    <GameScreen
                      {...props}
                      onShowAuth={() => {
                        setAuthScreenMode("signup");
                        setShowAuth(true);
                      }}
                      onShowAuthUpgrade={() => {
                        setAuthScreenMode("signup");
                        setShowAuth(true);
                      }}
                      onShowAccount={() => setShowAccount(true)}
                      onLegalPageRequest={(page) => setCurrentLegalPage(page)}
                    />
                  </ErrorBoundary>
                )}
              </Stack.Screen>
            </Stack.Navigator>

            {/* Modals */}
            <Suspense fallback={<ModalLoadingFallback />}>
              <QuickstartModal
                visible={quickstartModalVisible}
                onDismiss={() => setQuickstartModalVisible(false)}
              />
            </Suspense>
            <Suspense fallback={<ModalLoadingFallback />}>
              <NewsModal
                visible={newsModalVisible}
                onDismiss={() => setNewsModalVisible(false)}
              />
            </Suspense>
            <Suspense fallback={<ModalLoadingFallback />}>
              {contactModalVisible && (
                <ContactModal
                  visible={contactModalVisible}
                  onDismiss={() => setContactModalVisible(false)}
                />
              )}
            </Suspense>
            <Suspense fallback={<ModalLoadingFallback />}>
              <LabsModal
                visible={labsModalVisible}
                onDismiss={() => setLabsModalVisible(false)}
              />
            </Suspense>
            <Suspense fallback={<ModalLoadingFallback />}>
              <StatsModal />
            </Suspense>
            <Suspense fallback={<ModalLoadingFallback />}>
              <DailiesModal />
            </Suspense>
            <Suspense fallback={<ModalLoadingFallback />}>
              <TutorialModal />
            </Suspense>

            {/* Game Report Modal - needs to be at top level to appear over other modals */}
            <Suspense fallback={<ModalLoadingFallback />}>
              <GameReportModal />
            </Suspense>

            {/* Auth Modal */}
            {showAuth && (
              <AuthScreen
                visible={showAuth}
                onAuthComplete={() => {
                  setShowAuth(false);
                  setAuthScreenInitialEmail(undefined);
                  // After successful auth, you might want to sync data or refresh state
                  // This is handled by the AuthContext now.
                }}
                onDismiss={() => {
                  setShowAuth(false);
                  setAuthScreenInitialEmail(undefined);
                }}
                defaultMode={authScreenMode}
                paymentSuccessMessage={paymentMessage}
                initialEmail={authScreenInitialEmail}
              />
            )}

            {/* Account Modal */}
            {showAccount && auth.user && (
              <AccountScreen onClose={() => setShowAccount(false)} />
            )}
          </NavigationContainer>
          <StatusBar style={theme.dark ? "light" : "dark"} />
        </ErrorBoundary>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TutorialProvider>
          <AppContent />
        </TutorialProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
