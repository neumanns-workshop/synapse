import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

// Initialize Supabase client with SERVICE_ROLE_KEY for admin actions
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      throw new Error("Stripe secret key not configured");
    }
    if (!Deno.env.get("STRIPE_PRICE_ID")) {
      throw new Error(
        "Stripe Price ID (STRIPE_PRICE_ID) for one-time purchase not configured in environment variables.",
      );
    }
    if (!Deno.env.get("APP_URL")) {
      throw new Error(
        "Application URL (APP_URL) for redirects not configured in environment variables.",
      );
    }

    // 1. Get Supabase User from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      console.error("User not found or error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: userError?.message || "User not found" }),
        { status: 401, headers: corsHeaders },
      );
    }

    // 2. Get or Create Stripe Customer
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    // profileError with code PGRST116 means 0 rows found, which is fine (new user profile).
    // Any other error during profile fetch is a problem.
    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: corsHeaders },
      );
    }

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email, // user.email can be null for anonymous users, Stripe handles this.
        metadata: { supabase_user_id: user.id }, // Link Stripe customer to Supabase user
      });
      stripeCustomerId = customer.id;

      // Save the new stripe_customer_id to the user's profile
      // Upsert ensures that if the profile was somehow created without stripe_customer_id by another process, it still works.
      const { error: updateProfileError } = await supabaseAdmin
        .from("user_profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateProfileError) {
        console.error(
          "Error updating user profile with Stripe customer ID:",
          updateProfileError,
        );
        // This is a critical error because we might have a Stripe customer not linked in Supabase.
        // Depending on desired resilience, you might want to return an error or log for manual reconciliation.
        return new Response(
          JSON.stringify({
            error: "Failed to update user profile with Stripe customer ID",
          }),
          { status: 500, headers: corsHeaders },
        );
      }
    }

    // 3. Create Stripe Checkout Session
    const stripePriceId = Deno.env.get("STRIPE_PRICE_ID");
    const appUrl = Deno.env.get("APP_URL");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", // For one-time purchases
      customer: stripeCustomerId, // Associate with existing or new Stripe customer
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: user.id, // IMPORTANT: Pass Supabase user ID for webhook reconciliation
      success_url: `${appUrl.replace(/\/$/, "")}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl.replace(/\/$/, "")}/?payment=cancel`,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, checkoutUrl: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in create-checkout-session:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status:
          error instanceof Error &&
          (error.message === "Missing Authorization header" ||
            error.message.includes("User not found"))
            ? 401
            : 400,
      },
    );
  }
});
