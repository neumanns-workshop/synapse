import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Pressable,
} from "react-native";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Text,
  TextInput,
  Button,
  Card,
  SegmentedButtons,
  Portal,
  Modal,
  Dialog,
  useTheme,
} from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import CustomIcon from "../components/CustomIcon";
import StripeService from "../services/StripeService";
import SupabaseService from "../services/SupabaseService";
import type { ExtendedTheme } from "../theme/SynapseTheme";

const PENDING_CONVERSION_USER_ID = "synapse_pending_conversion_user_id";

// Type guard for error objects
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message;
  }
  return "An unknown error occurred";
};

type AuthMode = "signin" | "signup" | "reset" | "signin_after_purchase";

interface AuthScreenProps {
  visible: boolean;
  onAuthComplete: () => void;
  onDismiss: () => void;
  defaultMode?: AuthMode;
  paymentSuccessMessage?: string | null;
  initialEmail?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  visible,
  onAuthComplete,
  onDismiss,
  defaultMode = "signup",
  paymentSuccessMessage,
  initialEmail,
}) => {
  const { customColors, colors, roundness } = useTheme() as ExtendedTheme;
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailUpdatesOptIn, setEmailUpdatesOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);

  // Promo code state - auto-expand during beta phase (until June 30, 2025)
  const isBetaPhase = new Date() < new Date("2025-06-30");
  const [showPromoField, setShowPromoField] = useState(isBetaPhase);
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const captchaRef = useRef<HCaptcha>(null);

  const supabaseService = SupabaseService.getInstance();
  const stripeService = StripeService.getInstance();

  // Listen for auth state changes to complete sign-in process
  React.useEffect(() => {
    if (!isWaitingForAuth) return;

    const unsubscribe = supabaseService.onAuthStateChange((authState) => {
      console.log("🔐 AuthScreen: Auth state changed while waiting:", {
        hasUser: !!authState.user,
        hasProfile: !!authState.profile,
        isLoading: authState.isLoading,
      });

      if (!authState.isLoading) {
        if (authState.user && authState.profile) {
          // Successfully authenticated with profile
          console.log(
            "🔐 AuthScreen: Authentication complete, calling onAuthComplete",
          );
          setIsWaitingForAuth(false);
          setIsLoading(false);
          onAuthComplete();
        } else if (!authState.user) {
          // User was signed out (likely due to missing profile)
          console.log("🔐 AuthScreen: User was signed out during auth process");
          setIsWaitingForAuth(false);
          setIsLoading(false);
          setErrorMessage(
            "Your account was not found in our system. Please contact support or create a new account.",
          );
        }
      }
    });

    return unsubscribe;
  }, [isWaitingForAuth, onAuthComplete, supabaseService]);

  // Scale animation value
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  // Update animation values when visibility changes
  React.useEffect(() => {
    if (visible) {
      // Animate in
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Reset for next time
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Update mode when defaultMode changes
  React.useEffect(() => {
    setMode(defaultMode);
    if (defaultMode === "signin_after_purchase" || defaultMode === "signin") {
      if (initialEmail) setEmail(initialEmail);
    } else {
      // Reset email if not a sign-in mode where prefill is relevant,
      // unless it was already set by user typing.
      // This behavior might need refinement based on desired UX.
      // For now, only prefill on specific modes.
    }
  }, [defaultMode, initialEmail]);

  React.useEffect(() => {
    // If the modal becomes visible and there's an initialEmail for a signin mode, set it.
    // This helps if the component was already mounted but props change leading to visibility.
    if (
      visible &&
      (mode === "signin" || mode === "signin_after_purchase") &&
      initialEmail
    ) {
      setEmail(initialEmail);
    }
    // If it becomes visible with a success message, ensure mode is appropriate (e.g. signin)
    if (
      visible &&
      paymentSuccessMessage &&
      mode !== "signin" &&
      mode !== "signin_after_purchase"
    ) {
      // If there's a success message, usually we want to prompt sign-in
      // setMode("signin_after_purchase"); // Or just "signin"
    }
  }, [visible, initialEmail, mode, paymentSuccessMessage]);

  const handleSignIn = async () => {
    console.log(
      "🔐 handleSignIn called with email:",
      email,
      "password length:",
      password.length,
    );
    setErrorMessage(null); // Clear any previous errors

    if (!email || !password) {
      console.log("🔐 Validation failed: missing email or password");
      setErrorMessage("Please fill in all fields");
      return;
    }

    console.log("🔐 Setting loading state and executing CAPTCHA...");
    // Trigger the CAPTCHA challenge for sign-in
    setIsLoading(true);
    console.log("🔐 CAPTCHA ref:", captchaRef.current);
    captchaRef.current?.execute();
  };

  const proceedWithSignIn = async (token: string) => {
    console.log("🔐 Starting sign-in process with email:", email);
    try {
      console.log("🔐 Calling supabaseService.signIn...");
      const result = await supabaseService.signIn(email, password, token);
      console.log("🔐 Sign-in response received. Full result:", result);
      const { error } = result;

      if (error) {
        console.log("🔐 Sign-in failed with error:", error);

        // Provide user-friendly error messages
        let errorMessage = "An error occurred during sign in";

        if (error && typeof error === "object" && "message" in error) {
          const message = getErrorMessage(error).toLowerCase();

          if (
            message.includes("invalid login credentials") ||
            message.includes("invalid email or password")
          ) {
            errorMessage =
              "Invalid email or password. Please check your credentials and try again.";
          } else if (message.includes("email not confirmed")) {
            errorMessage =
              "Please check your email and click the confirmation link before signing in.";
          } else if (message.includes("too many requests")) {
            errorMessage =
              "Too many sign-in attempts. Please wait a few minutes and try again.";
          } else if (message.includes("captcha")) {
            errorMessage = "CAPTCHA verification failed. Please try again.";
          } else {
            errorMessage = getErrorMessage(error) || errorMessage;
          }
        }

        setErrorMessage(errorMessage);
        setIsLoading(false);
      } else {
        console.log(
          "🔐 Sign-in successful, waiting for auth state to complete...",
        );
        // Don't call onAuthComplete() immediately - wait for auth state to be established
        setIsWaitingForAuth(true);
        // Keep isLoading true until auth state is complete
      }
    } catch (error) {
      console.log("🔐 Sign-in threw exception:", error);
      setErrorMessage("An unexpected error occurred");
    } finally {
      console.log("🔐 Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const onCaptchaVerify = (token: string) => {
    console.log("🔐 CAPTCHA verified with token:", token);
    console.log("🔐 Current mode:", mode);
    setCaptchaToken(token);

    // Determine which action to take based on current mode
    if (mode === "signup") {
      // Check if user entered a promo code
      if (promoCode.trim()) {
        console.log(
          "🎫 Promo code detected, proceeding with promo signup flow",
        );
        proceedWithPromoSignUp(token);
      } else {
        console.log("🔐 Proceeding with traditional payment sign-up flow");
        proceedWithSignUp(token);
      }
    } else if (mode === "signin" || mode === "signin_after_purchase") {
      console.log("🔐 Proceeding with sign-in flow");
      proceedWithSignIn(token);
    } else {
      console.log("🔐 Unknown mode, not proceeding:", mode);
    }
  };

  const handleSignUp = async () => {
    console.log("handleSignUp called with:", {
      email,
      password,
      confirmPassword,
      promoCode: promoCode.toUpperCase().trim(),
    });
    setErrorMessage(null); // Clear any previous errors

    if (!email || !password || !confirmPassword) {
      console.log("Validation failed: missing fields");
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      console.log("Validation failed: passwords don't match");
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      console.log("Validation failed: password too short");
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      console.log("Validation failed: legal consent not given");
      setErrorMessage(
        "Please accept the Terms of Service and Privacy Policy to continue",
      );
      return;
    }

    // Validate promo code if the promo field section is shown
    if (showPromoField && !promoCode.trim()) {
      console.log("Validation failed: promo code field is empty but visible");
      setErrorMessage(
        "Please enter your beta code or close the beta code section",
      );
      return;
    }

    // Trigger the CAPTCHA challenge for both normal payment flow AND promo code flow
    // The captcha verification will determine which path to take
    console.log("Setting loading and executing CAPTCHA");
    setIsLoading(true);
    console.log("CAPTCHA ref:", captchaRef.current);
    captchaRef.current?.execute();
  };

  const proceedWithSignUp = async (token: string) => {
    try {
      // Call the refactored service method
      const result = await stripeService.initiatePurchaseAndAccountCreation({
        email,
        password,
        emailUpdatesOptIn,
        termsAccepted,
        privacyAccepted,
        captchaToken: token,
      });

      if (result.checkoutUrl && result.temporaryUserId) {
        try {
          await AsyncStorage.setItem(
            PENDING_CONVERSION_USER_ID,
            result.temporaryUserId,
          );
          // Redirect to Stripe Checkout
          // For web, window.open is fine. For native, you'd use Linking.openURL
          if (Platform.OS === "web") {
            window.open(result.checkoutUrl, "_self");
          } else {
            // Handle native redirection if needed, or inform user if web-only for now
            Alert.alert(
              "Redirecting to Payment",
              "You will be redirected to complete your payment.",
            );
            // import { Linking } from 'react-native';
            // Linking.openURL(result.checkoutUrl);
            // For now, assume web or a webview will handle this part
            // If this is a pure native screen, more setup for Stripe redirect handling is needed
            console.warn(
              "Stripe Checkout redirection on native needs Linking.openURL and deep link handling.",
            );
            // As a fallback for testing on native if Linking is not set up, can show the URL
            // Alert.alert("Test URL (Native)", result.checkoutUrl);
            window.open(result.checkoutUrl, "_self"); // Fallback to window.open for Expo Go web/dev environment
          }
        } catch (storageError) {
          console.error(
            "Failed to store temporaryUserId for conversion:",
            storageError,
          );
          setErrorMessage(
            "Could not prepare for payment. Please try again or contact support.",
          );
        }
      } else if (result.error) {
        setErrorMessage(result.error);
      } else {
        setErrorMessage(
          "An unexpected issue occurred while starting the payment process.",
        );
      }
    } catch (error) {
      console.error("Error during handleSignUp:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithPromoSignUp = async (token: string) => {
    setIsApplyingPromo(true);

    try {
      const code = promoCode.toUpperCase().trim();
      console.log("🎫 Starting promo signup with captcha token");

      // STEP 1: Create anonymous user with captcha token (same as traditional signup)
      console.log("🎫 Creating anonymous session with captcha...");
      console.log("🎫 CAPTCHA token length:", token?.length || 0);
      console.log("🎫 CAPTCHA token starts with:", token?.substring(0, 10) || 'undefined');
      const { data: anonSessionData, error: anonError } =
        await supabaseService.signInAnonymously(token);

      if (
        anonError ||
        !anonSessionData?.session?.access_token ||
        !anonSessionData?.user?.id
      ) {
        console.error("🎫 Anonymous sign-in failed:", anonError);
        console.error("🎫 Session data:", anonSessionData);
        console.error("🎫 Has session:", !!anonSessionData?.session);
        console.error("🎫 Has user:", !!anonSessionData?.user);
        console.error("🎫 Has access token:", !!anonSessionData?.session?.access_token);
        
        // More specific error message based on the actual error
        const errorMsg = anonError instanceof Error ? anonError.message : "Failed to create temporary session";
        setErrorMessage(`Authentication error: ${errorMsg}`);
        return;
      }

      const anonymousUserId = anonSessionData.user.id;
      const anonymousUserJwt = anonSessionData.session.access_token;
      console.log("🎫 Anonymous session created, validating promo code...");

      // STEP 2: Validate promo code using anonymous JWT
      const { data: validationResult, error: validationError } =
        await supabaseService.invokeFunction(
          "validate-promo-code",
          {
            code,
            userEmail: email,
            userAgent: navigator.userAgent,
          },
          anonymousUserJwt,
        );

      if (
        validationError ||
        !(validationResult as { valid?: boolean })?.valid
      ) {
        const errorMessage =
          (validationResult as { error?: string })?.error ||
          (validationError instanceof Error
            ? validationError.message
            : "Invalid promo code");
        setErrorMessage(errorMessage);
        return;
      }

      console.log("🎫 Promo code validated successfully!");

      // STEP 3: Store conversion details (same as traditional signup)
      const unifiedStore = stripeService.getUnifiedStore(); // Access unifiedStore
      await unifiedStore.storePendingConversionDetails(anonymousUserId, {
        email,
        password,
        emailUpdatesOptIn,
        termsAccepted,
        privacyAccepted,
        anonymousUserJwt,
      });

      // STEP 4: Create premium profile in database (required for finalize-premium-account)
      console.log("🎫 Creating premium profile in database...");
      const profileResult = await supabaseService.createPremiumProfile(
        anonymousUserId,
        email,
      );
      if (profileResult.error) {
        console.error(
          "🎫 Failed to create premium profile:",
          profileResult.error,
        );
        setErrorMessage("Failed to create premium account");
        return;
      }

      console.log("🎫 Premium profile created, finalizing account...");

      // STEP 5: Convert the anonymous user to a real account
      const { data: conversionResult, error: conversionError } =
        await supabaseService.invokeFunction(
          "finalize-premium-account",
          {
            temporaryUserId: anonymousUserId,
            email,
            password,
          },
          anonymousUserJwt,
        );

      if (
        conversionError ||
        !(conversionResult as { message?: string })?.message
      ) {
        console.error("🎫 Account conversion failed:", conversionError);
        setErrorMessage("Failed to finalize premium account");
        return;
      }

      console.log("🎫 Premium account created successfully!");

      // STEP 6: Set local premium status and sync promo purchase data
      await stripeService.createPromoAccount(code);

      // STEP 7: Cleanup and wait for auth state
      await unifiedStore.clearPendingConversionDetails(anonymousUserId);
      setIsWaitingForAuth(true);
      // The auth state change will trigger onAuthComplete
    } catch (error) {
      console.error("🎫 Error during promo signup:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create account with promo code",
      );
    } finally {
      setIsLoading(false);
      setIsApplyingPromo(false);
    }
  };

  const handlePromoCodeSignup = async () => {
    setIsLoading(true);
    setIsApplyingPromo(true);

    try {
      const code = promoCode.toUpperCase().trim();
      console.log("🎫 Validating promo code:", code);

      // STEP 1: Validate promo code WITHOUT authentication
      // The edge function uses service role internally and doesn't need user auth
      console.log("🎫 Calling promo validation edge function...");
      const { data: validationResult, error: validationError } =
        await supabaseService.invokeFunction("validate-promo-code", {
          code,
          userEmail: email,
          userAgent: navigator.userAgent,
        }); // No JWT token passed - function works without auth

      if (
        validationError ||
        !(validationResult as { valid?: boolean })?.valid
      ) {
        const errorMessage =
          (validationResult as { error?: string })?.error ||
          (validationError instanceof Error
            ? validationError.message
            : "Invalid promo code");
        setErrorMessage(errorMessage);
        return;
      }

      console.log("🎫 Promo code validated successfully, creating account...");

      // STEP 2: Create the account directly via Supabase (similar to traditional signup)
      const { user, error: signUpError } = await supabaseService.signUp(
        email,
        password,
        emailUpdatesOptIn,
      );

      if (signUpError) {
        setErrorMessage(
          signUpError instanceof Error
            ? signUpError.message
            : "Failed to create account",
        );
        return;
      }

      if (!user) {
        setErrorMessage("Account created but user data missing");
        return;
      }

      console.log("🎫 Account created, setting premium status...");

      // STEP 3: Set premium status locally (same as traditional signup after payment)
      await stripeService.createPromoAccount(code);

      console.log("🎫 Premium account created successfully!");

      // Wait for auth state to complete (similar to traditional signup)
      setIsWaitingForAuth(true);
      // The auth state change will trigger onAuthComplete
    } catch (error) {
      console.error("🎫 Error during promo signup:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create account with promo code",
      );
    } finally {
      setIsLoading(false);
      setIsApplyingPromo(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMessage(null); // Clear any previous errors

    if (!email) {
      setErrorMessage("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabaseService.resetPassword(email);

      if (error) {
        setErrorMessage(
          getErrorMessage(error) || "An error occurred during password reset",
        );
      } else {
        // For password reset success, we'll show a success message and switch to signin
        setErrorMessage(null);
        setMode("signin");
        // You might want to add a success message state as well, but for now we'll just clear errors
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail(
      initialEmail && (mode === "signin" || mode === "signin_after_purchase")
        ? initialEmail
        : "",
    );
    setPassword("");
    setConfirmPassword("");
    setEmailUpdatesOptIn(false);
    setErrorMessage(null); // Clear errors when resetting form
    setIsWaitingForAuth(false); // Clear waiting state
    // Don't reset initialEmail prop itself, just the field state
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
    if (
      (newMode === "signin" || newMode === "signin_after_purchase") &&
      initialEmail
    ) {
      setEmail(initialEmail); // Re-apply if switching to a mode that uses it
    }
  };

  const handleClose = () => {
    resetForm();
    onDismiss();
  };

  const renderHeader = () => (
    <View style={{ alignItems: "center", marginBottom: 24 }}>
      <CustomIcon
        source="brain"
        size={56}
        color={customColors.localOptimalNode}
      />
      <Text
        variant="displaySmall"
        style={{
          color: colors.primary,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 8,
          marginTop: 12,
        }}
      >
        Galaxy Brain
      </Text>
      <Text
        variant="bodyLarge"
        style={{
          color: customColors.currentNode,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        Cloud sync, unlimited games, and more
      </Text>

      {mode !== "reset" && (
        <>
          <SegmentedButtons
            value={mode === "signin_after_purchase" ? "signin" : mode}
            onValueChange={(value) => switchMode(value as AuthMode)}
            buttons={[
              {
                value: "signup",
                label: "Sign Up",
                icon: () => (
                  <CustomIcon
                    source="brain"
                    size={18}
                    color={
                      mode === "signup"
                        ? colors.onPrimary
                        : colors.onSurfaceVariant
                    }
                  />
                ),
                style: {
                  backgroundColor:
                    mode === "signup" ? colors.primary : colors.surfaceVariant,
                  flex: 1,
                },
                labelStyle: {
                  color:
                    mode === "signup"
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  fontWeight: mode === "signup" ? "bold" : "normal",
                  fontSize: 14,
                },
              },
              {
                value: "signin",
                label: "Sign In",
                icon: () => (
                  <CustomIcon
                    source="login"
                    size={18}
                    color={
                      mode === "signin"
                        ? colors.onPrimary
                        : colors.onSurfaceVariant
                    }
                  />
                ),
                style: {
                  backgroundColor:
                    mode === "signin" ? colors.primary : colors.surfaceVariant,
                  flex: 1,
                },
                labelStyle: {
                  color:
                    mode === "signin"
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  fontWeight: mode === "signin" ? "bold" : "normal",
                  fontSize: 14,
                },
              },
            ]}
            style={{
              marginBottom: 16,
              width: "100%",
              maxWidth: 300,
              alignSelf: "center",
            }}
          />

          <Text
            variant="bodySmall"
            style={{
              textAlign: "center",
              color: colors.onSurfaceVariant,
              lineHeight: 18,
              marginBottom: 4,
            }}
          >
            {mode === "signup"
              ? "Already have a Galaxy Brain account? Tap 'Sign In' above!"
              : "Don't have an account? Tap 'Sign Up' above to unlock unlimited play!"}
          </Text>
        </>
      )}
    </View>
  );

  const renderSignInForm = () => (
    <>
      <TextInput
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errorMessage) setErrorMessage(null); // Clear error when user starts typing
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: 16 }}
        left={
          <TextInput.Icon
            icon={() => (
              <CustomIcon
                source="email"
                size={20}
                color={colors.onSurfaceVariant}
              />
            )}
          />
        }
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errorMessage) setErrorMessage(null); // Clear error when user starts typing
        }}
        secureTextEntry
        style={{ marginBottom: 24 }}
        left={
          <TextInput.Icon
            icon={() => (
              <CustomIcon
                source="lock"
                size={20}
                color={colors.onSurfaceVariant}
              />
            )}
          />
        }
      />

      <Button
        mode="contained"
        onPress={handleSignIn}
        loading={isLoading || isWaitingForAuth}
        disabled={isLoading || isWaitingForAuth}
        style={{ marginBottom: 16 }}
        buttonColor={customColors.currentNode}
        icon={() => (
          <CustomIcon source="brain" size={20} color={colors.onPrimary} />
        )}
      >
        {isWaitingForAuth ? "Verifying Account..." : "Sign In to Galaxy Brain"}
      </Button>

      <Button
        mode="text"
        onPress={() => switchMode("reset")}
        disabled={isLoading}
        textColor={colors.error}
      >
        Forgot Password?
      </Button>
    </>
  );

  const renderSignUpForm = () => (
    <>
      <View style={{ marginBottom: 20 }}>
        <Pressable
          onPress={() => setFeaturesExpanded(!featuresExpanded)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <Text
            variant="titleMedium"
            style={{
              color: colors.primary,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Galaxy Brain Features
          </Text>
          <CustomIcon
            source={featuresExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.primary}
          />
        </Pressable>

        {featuresExpanded && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 4,
              }}
            >
              <CustomIcon source="sync" size={20} color={colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.onSurface,
                }}
              >
                Sync progress across all devices
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 4,
              }}
            >
              <CustomIcon source="infinity" size={20} color={colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.onSurface,
                }}
              >
                Unlimited random games daily
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 4,
              }}
            >
              <CustomIcon
                source="calendar-check"
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.onSurface,
                }}
              >
                Access to all past daily challenges
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 4,
              }}
            >
              <CustomIcon source="trophy" size={20} color={colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.onSurface,
                }}
              >
                Global leaderboard
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingVertical: 4,
              }}
            >
              <CustomIcon source="flask" size={20} color={colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.onSurface,
                }}
              >
                Early access to Lab features
              </Text>
            </View>
          </View>
        )}
      </View>

      <TextInput
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errorMessage) setErrorMessage(null); // Clear error when user starts typing
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: 16 }}
        left={
          <TextInput.Icon
            icon={() => (
              <CustomIcon
                source="email"
                size={20}
                color={colors.onSurfaceVariant}
              />
            )}
          />
        }
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errorMessage) setErrorMessage(null); // Clear error when user starts typing
        }}
        secureTextEntry
        style={{ marginBottom: 16 }}
        left={
          <TextInput.Icon
            icon={() => (
              <CustomIcon
                source="lock"
                size={20}
                color={colors.onSurfaceVariant}
              />
            )}
          />
        }
      />

      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (errorMessage) setErrorMessage(null); // Clear error when user starts typing
        }}
        secureTextEntry
        style={{ marginBottom: 20 }}
        left={
          <TextInput.Icon
            icon={() => (
              <CustomIcon
                source="lock-check"
                size={20}
                color={colors.onSurfaceVariant}
              />
            )}
          />
        }
      />

      {/* Promo Code Section */}
      <View style={{ marginBottom: 20 }}>
        <Pressable
          onPress={() => setShowPromoField(!showPromoField)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              textDecorationLine: "underline",
            }}
          >
            Have a beta code?
          </Text>
          <CustomIcon
            source={showPromoField ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
        </Pressable>

        {showPromoField && (
          <View style={{ gap: 12, marginTop: 12 }}>
            <TextInput
              label="Beta Code"
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter your beta code"
              autoCapitalize="characters"
              autoCorrect={false}
              disabled={isApplyingPromo}
              left={
                <TextInput.Icon
                  icon={() => (
                    <CustomIcon
                      source="ticket"
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  )}
                />
              }
            />
            <Text
              style={{
                fontSize: 12,
                color: colors.onSurfaceVariant,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              Beta codes expire June 30, 2025 but grant permanent premium access
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceVariant,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.outline,
        }}
      >
        <Pressable
          onPress={() => setEmailUpdatesOptIn(!emailUpdatesOptIn)}
          style={{
            width: 24,
            height: 24,
            borderWidth: 2,
            borderColor: emailUpdatesOptIn ? colors.primary : colors.outline,
            backgroundColor: emailUpdatesOptIn ? colors.primary : "transparent",
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {emailUpdatesOptIn && (
            <CustomIcon source="check" size={16} color={colors.onPrimary} />
          )}
        </Pressable>
        <Text
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 14,
            color: colors.onSurface,
          }}
        >
          Send me updates about new features and improvements
        </Text>
      </View>

      {/* Terms of Service Consent */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          backgroundColor: colors.surface,
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: termsAccepted ? colors.primary : colors.error,
        }}
      >
        <Pressable
          onPress={() => setTermsAccepted(!termsAccepted)}
          style={{
            width: 24,
            height: 24,
            borderWidth: 2,
            borderColor: termsAccepted ? colors.primary : colors.error,
            backgroundColor: termsAccepted ? colors.primary : "transparent",
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          {termsAccepted && (
            <CustomIcon source="check" size={16} color={colors.onPrimary} />
          )}
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.onSurface,
              lineHeight: 20,
            }}
          >
            I agree to the{" "}
            <Text
              style={{
                color: colors.primary,
                textDecorationLine: "underline",
              }}
              onPress={() => {
                // Open Terms of Service
                if (Platform.OS === "web") {
                  window.open("/terms", "_blank");
                } else {
                  // For native, you might want to open in a modal or WebView
                  Alert.alert(
                    "Terms of Service",
                    "Terms of Service will be available at synapsegame.ai/terms",
                  );
                }
              }}
            >
              Terms of Service
            </Text>
          </Text>
        </View>
      </View>

      {/* Privacy Policy Consent */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          backgroundColor: colors.surface,
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: privacyAccepted ? colors.primary : colors.error,
        }}
      >
        <Pressable
          onPress={() => setPrivacyAccepted(!privacyAccepted)}
          style={{
            width: 24,
            height: 24,
            borderWidth: 2,
            borderColor: privacyAccepted ? colors.primary : colors.error,
            backgroundColor: privacyAccepted ? colors.primary : "transparent",
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          {privacyAccepted && (
            <CustomIcon source="check" size={16} color={colors.onPrimary} />
          )}
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.onSurface,
              lineHeight: 20,
            }}
          >
            I acknowledge the{" "}
            <Text
              style={{
                color: colors.primary,
                textDecorationLine: "underline",
              }}
              onPress={() => {
                // Open Privacy Policy
                if (Platform.OS === "web") {
                  window.open("/privacy", "_blank");
                } else {
                  // For native, you might want to open in a modal or WebView
                  Alert.alert(
                    "Privacy Policy",
                    "Privacy Policy will be available at synapsegame.ai/privacy",
                  );
                }
              }}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>

      {/* Beta Gatekeeping with Hidden Payment Button */}
      {isBetaPhase && !promoCode.trim() && (
        <Card
          style={{
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.outline,
            borderWidth: 1,
            marginBottom: 16,
          }}
        >
          <Card.Content style={{ padding: 16 }}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <CustomIcon
                source="ticket"
                size={24}
                color={colors.primary}
                style={{ marginBottom: 8 }}
              />
              <Text
                variant="titleMedium"
                style={{
                  color: colors.primary,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Beta Code Required
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors.onSurface,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 8,
              }}
            >
              Galaxy Brain is currently in private beta. Please enter your beta
              code above to create an account.
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Payment Button - hidden during beta phase unless bypass is needed */}
      {(!isBetaPhase || __DEV__) && !promoCode.trim() && (
        <Button
          mode="contained"
          onPress={handleSignUp}
          loading={isLoading}
          disabled={isLoading}
          style={{
            marginBottom: 16,
          }}
          buttonColor={customColors.startNode}
          icon={() => (
            <CustomIcon
              source="credit-card"
              size={20}
              color={colors.onPrimary}
            />
          )}
        >
          Continue to Payment - $5
        </Button>
      )}

      {/* Promo Code Button (shows when promo code entered) */}
      {promoCode.trim() && (
        <Button
          mode="contained"
          onPress={handleSignUp}
          loading={isLoading || isApplyingPromo}
          disabled={isLoading || isApplyingPromo}
          style={{ marginBottom: 16 }}
          buttonColor={customColors.localOptimalNode}
          icon={() => (
            <CustomIcon source="ticket" size={20} color={colors.onPrimary} />
          )}
        >
          {isApplyingPromo ? "Validating Beta Code..." : "Activate Beta Code"}
        </Button>
      )}
    </>
  );

  const renderResetForm = () => (
    <>
      <Button
        mode="text"
        onPress={() => switchMode("signin")}
        icon={() => (
          <CustomIcon
            source="arrow-left"
            size={20}
            color={customColors.localOptimalNode}
          />
        )}
        style={{ alignSelf: "flex-start", marginBottom: 16 }}
        textColor={customColors.localOptimalNode}
      >
        Back
      </Button>

      <Text
        variant="headlineMedium"
        style={{
          color: colors.primary,
          textAlign: "center",
          marginBottom: 16,
          fontWeight: "bold",
        }}
      >
        Reset Password
      </Text>

      <Text
        variant="bodyMedium"
        style={{
          textAlign: "center",
          marginBottom: 24,
          color: colors.onSurface,
          lineHeight: 20,
        }}
      >
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errorMessage) setErrorMessage(null); // Clear error when user starts typing
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: 24 }}
        left={
          <TextInput.Icon
            icon={() => (
              <CustomIcon
                source="email"
                size={20}
                color={colors.onSurfaceVariant}
              />
            )}
          />
        }
      />

      <Button
        mode="contained"
        onPress={handlePasswordReset}
        loading={isLoading}
        disabled={isLoading}
        style={{ marginBottom: 16 }}
        buttonColor={customColors.localOptimalNode}
        icon={() => (
          <CustomIcon source="email-send" size={20} color={colors.onPrimary} />
        )}
      >
        Send Reset Link
      </Button>
    </>
  );

  // Simplified logic for rendering: treat 'signin_after_purchase' as 'signin' for form display
  const currentFormMode = mode === "signin_after_purchase" ? "signin" : mode;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={{
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Animated.View style={[animatedStyle, { width: "100%" }]}>
          {/* CAPTCHA component - shared for both sign-in and sign-up */}
          <HCaptcha
            ref={captchaRef}
            sitekey={
              __DEV__
                ? "10000000-ffff-ffff-ffff-000000000001" // Test key for development
                : process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY!
            }
            onVerify={onCaptchaVerify}
            size="invisible"
            onError={(error) => {
              console.log("🔐 CAPTCHA error occurred:", error);
              setErrorMessage(
                "Failed to verify you are human. Please try again.",
              );
              setIsLoading(false);
            }}
            onExpire={() => {
              console.log("🔐 CAPTCHA expired");
              setErrorMessage(
                "The CAPTCHA challenge has expired. Please try again.",
              );
              setIsLoading(false);
            }}
          />

          <Dialog
            visible={true}
            onDismiss={handleClose}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.outline,
              borderWidth: 1,
              borderRadius: roundness * 2,
              maxWidth: 500,
              maxHeight: Dimensions.get("window").height * 0.9,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Dialog.Content
              style={{
                maxHeight: Dimensions.get("window").height * 0.8,
                paddingBottom: 0,
              }}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
                  style={{ flex: 1 }}
                >
                  {renderHeader()}

                  {/* Payment Success Message */}
                  {paymentSuccessMessage && (
                    <Card
                      style={{
                        backgroundColor: customColors.achievementIcon + "15",
                        borderColor: customColors.achievementIcon,
                        borderWidth: 1,
                        marginBottom: 20,
                      }}
                    >
                      <Card.Content>
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: customColors.achievementIcon,
                            textAlign: "center",
                            lineHeight: 20,
                          }}
                        >
                          {paymentSuccessMessage}
                        </Text>
                      </Card.Content>
                    </Card>
                  )}

                  {/* Error Message */}
                  {errorMessage && (
                    <Card
                      style={{
                        backgroundColor: colors.errorContainer,
                        borderColor: colors.error,
                        borderWidth: 1,
                        marginBottom: 20,
                      }}
                    >
                      <Card.Content>
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: colors.onErrorContainer,
                            textAlign: "center",
                            lineHeight: 20,
                          }}
                        >
                          {errorMessage}
                        </Text>
                      </Card.Content>
                    </Card>
                  )}

                  <View style={{ marginTop: 8 }}>
                    {currentFormMode === "signin" && renderSignInForm()}
                    {currentFormMode === "signup" && renderSignUpForm()}
                    {currentFormMode === "reset" && renderResetForm()}
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </Dialog.Content>
          </Dialog>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

export default AuthScreen;
