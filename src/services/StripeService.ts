import { loadStripe, Stripe } from "@stripe/stripe-js";

import SupabaseService from "./SupabaseService";
import { UnifiedDataStore } from "./UnifiedDataStore";

// Environment variables - set these in your .env file
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

if (!stripePublishableKey) {
  console.warn("Missing Stripe publishable key - payments will not work");
}

export interface PaymentResult {
  success: boolean;
  error?: string;
  paymentIntent?: string;
}

export interface InitiatePurchaseResult {
  checkoutUrl?: string;
  temporaryUserId?: string; // So the UI can store it or pass it along
  error?: string;
}

export class StripeService {
  private static instance: StripeService;
  private stripe: Promise<Stripe | null>;
  private supabaseService: SupabaseService;
  private unifiedStore: UnifiedDataStore;

  // Premium unlock product details
  public readonly PREMIUM_PRICE = 5.00;
  public readonly PREMIUM_CURRENCY = "usd";
  public readonly PREMIUM_PRODUCT_NAME = "Galaxy Brain Synapse Premium Account";
  public readonly PREMIUM_PRODUCT_DESCRIPTION =
    "Unlock unlimited games, access to all past daily challenges, and unique themed word collections";

  private constructor() {
    this.stripe = loadStripe(stripePublishableKey);
    this.supabaseService = SupabaseService.getInstance();
    this.unifiedStore = UnifiedDataStore.getInstance();
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Purchase premium using Stripe Checkout (hosted payment page)
   * TRANSACTIONAL APPROACH: Create account first, then payment
   */
  public async initiatePurchaseAndAccountCreation(
    signupData: { // Assuming this is what AuthScreen.tsx provides
      email: string;
      password: string; // Be very careful about handling/storing this, even temporarily
      emailUpdatesOptIn: boolean;
      captchaToken?: string; // Add captcha token here
    }
  ): Promise<InitiatePurchaseResult> {
    try {
      if (!signupData || !signupData.email || !signupData.password) {
        throw new Error("Email and password are required to create a premium account.");
      }

      // STEP A: Temporarily sign in anonymously to get a JWT for the payment function
      console.log("Attempting anonymous sign-in for purchase initiation...");
      // Assuming this.supabaseService.signInAnonymously() returns { data: { user, session }, error }
      const { data: anonSessionData, error: anonError } =
        await this.supabaseService.signInAnonymously(signupData.captchaToken);

      if (
        anonError ||
        !anonSessionData?.user?.id ||
        !anonSessionData?.session?.access_token
      ) {
        console.error("Anonymous sign-in failed:", anonError);
        const errorMessage = (anonError as any)?.message || "";
        if (errorMessage.includes("Anonymous sign-ins are disabled")) {
          throw new Error(
            "Anonymous sign-ins are disabled in your Supabase project. Please enable it in your Supabase dashboard under Authentication -> Providers to proceed with this sign-up flow.",
          );
        }
        if (errorMessage.includes("Database error creating anonymous user")) {
          throw new Error(
            "Database error creating anonymous user. This might be due to RLS policies or database configuration issues. Please check your Supabase dashboard logs for more details.",
          );
        }
        throw new Error(
          errorMessage || "Failed to create a temporary session for purchase.",
        );
      }
      const anonymousUserId = anonSessionData.user.id;
      const anonymousUserJwt = anonSessionData.session.access_token;
      console.log("Temporary anonymous session created:", anonymousUserId);

      // STEP B: Store details needed for conversion after payment
      // IMPORTANT: Handle password with extreme care. Consider alternatives if possible.
      // This is a simplified example; a more secure flow might involve a one-time token.
      // Assuming AsyncStorage is available and imported/configured elsewhere.
      // You might want to wrap AsyncStorage calls in a try/catch.
      // For React Native, import { AsyncStorage } from 'react-native' is old. Use '@react-native-async-storage/async-storage'
      // For web, could use localStorage directly or a wrapper. This example is conceptual.
      // Let's assume a conceptual AsyncStorage wrapper or direct localStorage for web.
      // This part needs to be adapted to your actual AsyncStorage implementation.
      await this.unifiedStore.storePendingConversionDetails(anonymousUserId, {
        email: signupData.email,
        password: signupData.password, 
        emailUpdatesOptIn: signupData.emailUpdatesOptIn,
        anonymousUserJwt: anonymousUserJwt,
      });

      // STEP C: Call the create-checkout-session Edge Function
      // The SupabaseService.invokeFunction needs to be capable of adding the JWT header
      console.log(`Calling create-checkout-session for anonymous user ${anonymousUserId}`);
      const { data: checkoutData, error: checkoutError } = 
        await this.supabaseService.invokeFunction<{ checkoutUrl: string }>(
          "create-checkout-session",
          {}, 
          anonymousUserJwt 
        );

      if (checkoutError || !checkoutData?.checkoutUrl) {
        console.error("create-checkout-session failed:", checkoutError);
        await this.unifiedStore.clearPendingConversionDetails(anonymousUserId);
        
        // Simplified error message handling to satisfy linter
        let errorMessage = "Failed to initialize Stripe Checkout.";
        if (checkoutError instanceof Error) {
          errorMessage = checkoutError.message;
        } else if (typeof checkoutError === 'string') {
          errorMessage = checkoutError;
        } else {
            // For other types of errors, or if it's an object, log it and use a generic message.
            // This avoids complex type guards that the linter might be struggling with.
            console.error("Non-standard error object during checkout:", checkoutError);
        }
        throw new Error(errorMessage);
      }

      console.log("Stripe Checkout session created:", checkoutData.checkoutUrl);
      return { checkoutUrl: checkoutData.checkoutUrl, temporaryUserId: anonymousUserId };

    } catch (error) {
      console.error("Error in initiatePurchaseAndAccountCreation:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred during purchase initiation.",
      };
    }
  }

  /**
   * Handle successful payment - update user to premium
   */
  private async handleSuccessfulPayment(
    paymentIntentId: string,
  ): Promise<void> {
    try {
      // Update local premium status immediately
      await this.unifiedStore.setPremiumStatus(true);

      // Only sync purchase data if user is authenticated
      // In our new flow, account creation happens server-side
      const user = this.supabaseService.getUser();
      if (user) {
        // Sync purchase data to Supabase
        await this.supabaseService.syncPurchaseData({
          platform: "web",
          transactionId: paymentIntentId,
          purchaseDate: Date.now(),
          receiptData: paymentIntentId, // Use payment intent as receipt
          validated: true,
          lastValidated: Date.now(),
        });
      } else {
        console.log(
          "No authenticated user yet - purchase data will sync after sign in",
        );
      }

      console.log("Premium status activated successfully!");
    } catch (error) {
      console.error("Error updating premium status:", error);
      // Even if sync fails, the payment succeeded, so we should still mark as premium locally
      await this.unifiedStore.setPremiumStatus(true);
    }
  }

  /**
   * Get pricing information for display in UI
   */
  public getPricingInfo() {
    return {
      price: this.PREMIUM_PRICE,
      currency: this.PREMIUM_CURRENCY,
      displayPrice: `$${this.PREMIUM_PRICE}`,
      productName: this.PREMIUM_PRODUCT_NAME,
      description: this.PREMIUM_PRODUCT_DESCRIPTION,
    };
  }

  /**
   * Check if Stripe is available (for web platforms)
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const stripe = await this.stripe;
      return !!stripe && !!stripePublishableKey;
    } catch {
      return false;
    }
  }

  /**
   * Debug method to simulate a purchase (for testing)
   */
  public async debugPurchasePremium(): Promise<PaymentResult> {
    try {
      console.log("🧪 DEBUG: Simulating premium purchase...");

      const user = this.supabaseService.getUser();
      if (!user) {
        throw new Error("User must be authenticated");
      }

      await this.handleSuccessfulPayment(`debug_payment_${Date.now()}`);

      return { success: true, paymentIntent: "debug_payment" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Debug purchase failed",
      };
    }
  }
}

export default StripeService;
