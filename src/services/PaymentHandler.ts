import AsyncStorage from "@react-native-async-storage/async-storage";

import SupabaseService from "./SupabaseService";
import { UnifiedDataStore } from "./UnifiedDataStore"; // Assuming UnifiedDataStore is exported like this
import { Logger } from "../utils/logger";

// Key for AsyncStorage, needs to be consistent with AuthScreen.tsx
// It's better to define this in a shared constants file, but for now, duplicating
const PENDING_CONVERSION_USER_ID = "synapse_pending_conversion_user_id";

export interface PaymentRedirectResult {
  wasPaymentAttempt: boolean; // Renamed from wasPayment for clarity
  success?: boolean;
  error?: string;
  showAuthModal?: boolean; // To instruct App.tsx
  authMode?: "signin" | "signup"; // To instruct App.tsx
  emailToPreFill?: string; // For pre-filling sign-in form
  message?: string; // For displaying a message to the user (e.g., via AuthScreen prop)
}

export class PaymentHandler {
  private static instance: PaymentHandler;
  // No longer needs stripeService for verifyPaymentStatus
  private supabaseService: SupabaseService;
  private unifiedStore: UnifiedDataStore;

  private constructor() {
    this.supabaseService = SupabaseService.getInstance();
    this.unifiedStore = UnifiedDataStore.getInstance();
  }

  public static getInstance(): PaymentHandler {
    if (!PaymentHandler.instance) {
      PaymentHandler.instance = new PaymentHandler();
    }
    return PaymentHandler.instance;
  }

  /**
   * Handle payment result from URL parameters.
   * This is called when the app loads/redirects to check for payment status.
   */
  public async handlePaymentRedirect(): Promise<PaymentRedirectResult> {
    try {
      const urlParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      const paymentStatus = urlParams.get("payment");
      // const sessionId = urlParams.get("session_id"); // No longer primary focus

      if (!paymentStatus) {
        return { wasPaymentAttempt: false };
      }

      this.cleanupUrl(); // Clean up URL query params

      const temporaryUserId = await AsyncStorage.getItem(
        PENDING_CONVERSION_USER_ID,
      );

      if (paymentStatus === "success") {
        if (!temporaryUserId) {
          console.error(
            "Payment success redirect, but no temporaryUserId found in AsyncStorage.",
          );
          return {
            wasPaymentAttempt: true,
            success: false,
            error:
              "Payment processed, but session data lost. Please contact support if your account isn't upgraded.",
          };
        }

        // Retrieve stored conversion details
        const conversionDetails =
          await this.unifiedStore.retrievePendingConversionDetails(
            temporaryUserId,
          );
        if (
          !conversionDetails ||
          !conversionDetails.email ||
          !conversionDetails.password
        ) {
          // Password might be optional if not changing it, but for new signup, it's expected
          await this.unifiedStore.clearPendingConversionDetails(
            temporaryUserId,
          );
          await AsyncStorage.removeItem(PENDING_CONVERSION_USER_ID);
          return {
            wasPaymentAttempt: true,
            success: false,
            error:
              "Could not retrieve account details for finalization. Please try signing up again or contact support.",
            showAuthModal: true,
            authMode: "signup",
          };
        }
        const { email, password, anonymousUserJwt } = conversionDetails;

        // Grant premium access immediately (optimistic)
        // The webhook will confirm this in the background
        Logger.debug(
          "Payment successful! Granting immediate premium access...",
        );

        // Set premium status locally immediately
        this.unifiedStore.setPremiumStatus(true);

        // Create user profile in database immediately
        const profileResult = await this.supabaseService.createPremiumProfile(
          temporaryUserId,
          email,
        );
        if (profileResult.error) {
          console.error(
            "Failed to create premium profile immediately:",
            profileResult.error,
          );
          // Don't fail the flow - webhook will handle it as fallback
        } else {
          Logger.info(" Premium profile created immediately in database");
        }

        // Convert anonymous user to permanent user by calling the new Edge Function
        Logger.debug(
          `Attempting to finalize account for user ${temporaryUserId} via Edge Function with email ${email}`,
        );

        if (!anonymousUserJwt) {
          console.error(
            "Critical: Missing anonymousUserJwt for finalize-premium-account call.",
          );
          return {
            wasPaymentAttempt: true,
            success: false, // Technically payment was fine, premium is set, but conversion step cannot proceed
            error:
              "Failed to finalize account: session token missing. Please contact support.",
            showAuthModal: false,
          };
        }

        const { data: finalizeResult, error: finalizeError } =
          await this.supabaseService.invokeFunction(
            "finalize-premium-account",
            { temporaryUserId, email, password },
            anonymousUserJwt, // Pass the JWT of the (temporary) anonymous user
          );

        if (finalizeError || !finalizeResult || (finalizeResult as any).error) {
          // Premium is set, but account conversion via Edge Function failed.
          const errorMessage =
            (finalizeError as any)?.message ||
            (finalizeResult as any)?.error ||
            "Unknown error during account finalization.";
          console.error(
            `finalize-premium-account Edge Function failed for ${temporaryUserId}:`,
            errorMessage,
          );
          return {
            wasPaymentAttempt: true,
            success: true, // Payment was successful, premium IS active in DB
            error: `Premium activated, but failed to update account credentials via server. Please contact support with ID: ${temporaryUserId}. Details: ${errorMessage}`,
            showAuthModal: false,
          };
        }

        // Success! Cleanup and user is already signed in with permanent account
        Logger.debug(
          "finalize-premium-account Edge Function succeeded.",
          finalizeResult,
        );
        await this.unifiedStore.clearPendingConversionDetails(temporaryUserId);
        await AsyncStorage.removeItem(PENDING_CONVERSION_USER_ID);

        // No need to sign out - the Edge Function already converted the anonymous user
        // to a permanent user, so they should stay logged in with premium access

        return {
          wasPaymentAttempt: true,
          success: true,
          showAuthModal: false, // Don't show auth modal - user is already signed in
          message: "Premium Activated! Welcome to Galaxy Brain Premium!",
        };
      } else if (paymentStatus === "cancel") {
        if (temporaryUserId) {
          await this.unifiedStore.clearPendingConversionDetails(
            temporaryUserId,
          );
          await AsyncStorage.removeItem(PENDING_CONVERSION_USER_ID);
          Logger.debug(
            "Payment cancelled by user. Cleaned up pending conversion details for:",
            temporaryUserId,
          );
        }
        return {
          wasPaymentAttempt: true,
          success: false,
          error: "Payment was cancelled.",
          showAuthModal: true, // Show auth modal again, perhaps in signup mode
          authMode: "signup",
        };
      }

      return { wasPaymentAttempt: false }; // Should not reach here if paymentStatus was set
    } catch (error) {
      console.error("Error handling payment redirect:", error);
      // Attempt to clear temporary user ID if it exists, as state is unknown
      try {
        const tempId = await AsyncStorage.getItem(PENDING_CONVERSION_USER_ID);
        if (tempId) {
          await this.unifiedStore.clearPendingConversionDetails(tempId);
          await AsyncStorage.removeItem(PENDING_CONVERSION_USER_ID);
        }
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup temp data during error handling:",
          cleanupError,
        );
      }
      return {
        wasPaymentAttempt: true, // It was an attempt, but it failed globally
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error processing payment result. Please contact support.",
      };
    }
  }

  /**
   * Clean up payment parameters from URL (Web only)
   */
  private cleanupUrl(): void {
    if (
      typeof window !== "undefined" &&
      typeof window.history.replaceState === "function"
    ) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        url.searchParams.delete("session_id"); // Also remove old session_id if present
        url.searchParams.delete("temporaryUserId"); // And temporaryUserId if we ever add it
        window.history.replaceState({}, document.title, url.toString());
      } catch (e) {
        console.warn("Could not clean up URL:", e);
      }
    }
  }
}

export default PaymentHandler;
