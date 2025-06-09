import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0";

// Initialize Supabase client with SERVICE_ROLE_KEY for admin actions
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Initialize Stripe (optional - only if you want to clean up Stripe customers)
const stripe = Deno.env.get("STRIPE_SECRET_KEY")
  ? new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    })
  : null;

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
    // 1. Authenticate the request
    const authHeader = req.headers.get("Authorization");
    console.log(
      "🗑️ Auth header received:",
      authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : "MISSING",
    );

    if (!authHeader) {
      console.error("🗑️ Missing Authorization header");
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("🗑️ Extracted token length:", token.length);
    console.log("🗑️ Token starts with:", token.substring(0, 20) + "...");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    console.log("🗑️ Auth result:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      errorCode: userError?.code,
      errorMessage: userError?.message,
    });

    if (userError || !user) {
      console.error("🗑️ Auth error for user deletion:", userError);
      return new Response(JSON.stringify({ error: "Authentication failed." }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = user.id;
    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // 2. Get user profile to check for Stripe customer ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("stripe_customer_id, email, is_premium")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error(`Error fetching profile for user ${userId}:`, profileError);
      // Continue with deletion even if profile fetch fails
    }

    console.log(
      `📋 User profile: premium=${profile?.is_premium}, stripe_customer=${profile?.stripe_customer_id}`,
    );

    // 3. Clean up Stripe customer (if exists and Stripe is configured)
    if (stripe && profile?.stripe_customer_id) {
      try {
        console.log(
          `🧹 Deleting Stripe customer: ${profile.stripe_customer_id}`,
        );
        await stripe.customers.del(profile.stripe_customer_id);
        console.log(
          `✅ Stripe customer deleted: ${profile.stripe_customer_id}`,
        );
      } catch (stripeError) {
        console.warn(
          `⚠️ Failed to delete Stripe customer ${profile.stripe_customer_id}:`,
          stripeError,
        );
        // Continue with account deletion even if Stripe cleanup fails
      }
    }

    // 4. Delete user data (game history, progress, etc.)
    const { error: userDataError } = await supabaseAdmin
      .from("user_data")
      .delete()
      .eq("user_id", userId);

    if (userDataError) {
      console.warn(
        `⚠️ Failed to delete user_data for ${userId}:`,
        userDataError,
      );
      // Continue with deletion - user_data might not exist
    } else {
      console.log(`✅ Deleted user_data for ${userId}`);
    }

    // 5. Delete user profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.warn(
        `⚠️ Failed to delete user_profiles for ${userId}:`,
        profileDeleteError,
      );
      // Continue with deletion - profile might not exist
    } else {
      console.log(`✅ Deleted user_profiles for ${userId}`);
    }

    // 6. Delete auth user (this is the critical step that requires admin privileges)
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error(
        `❌ CRITICAL: Failed to delete auth user ${userId}:`,
        authDeleteError,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to delete user account. Please contact support.",
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    console.log(`✅ Successfully deleted auth user: ${userId}`);
    console.log(`🎉 Account deletion completed for user: ${userId}`);

    return new Response(
      JSON.stringify({
        message: "Account deleted successfully.",
        userId: userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in delete-user-account:", error);

    let status = 500;
    let errorMessage = "An unexpected error occurred during account deletion.";

    if (
      error.message === "Missing Authorization header" ||
      error.message.includes("Authentication failed")
    ) {
      status = 401;
      errorMessage = "Authentication failed.";
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status,
    });
  }
});
