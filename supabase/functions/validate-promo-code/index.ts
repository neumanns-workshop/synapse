import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({
          valid: false,
          redeemed: false,
          error: "Server configuration error",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const requestData = await req.json();
    const { code, userEmail, userId, userAgent } = requestData;

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({
          valid: false,
          redeemed: false,
          error: "Promo code is required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const normalizedCode = code.toUpperCase().trim();
    console.log(`Validating promo code: ${normalizedCode}`);

    // Step 1: Validate the promo code
    const { data: promoCode, error: fetchError } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .single();

    console.log(`Promo code query result:`, { promoCode, fetchError });

    if (fetchError || !promoCode) {
      console.log(`Invalid promo code: ${normalizedCode}`);
      return new Response(
        JSON.stringify({
          valid: false,
          redeemed: false,
          error: "Invalid promo code",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Step 2: Check expiration
    if (promoCode.expires_at && new Date(promoCode.expires_at) <= new Date()) {
      console.log(`Expired promo code: ${normalizedCode}`);
      return new Response(
        JSON.stringify({
          valid: false,
          redeemed: false,
          error: "Promo code has expired",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Step 3: Check usage limits
    if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
      console.log(`Usage limit reached for promo code: ${normalizedCode}`);
      return new Response(
        JSON.stringify({
          valid: false,
          redeemed: false,
          error: "Promo code has reached its usage limit",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Step 4: Increment usage counter
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from("promo_codes")
      .update({
        current_uses: promoCode.current_uses + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", promoCode.id)
      .select();

    if (updateError) {
      console.error(`Failed to update usage count:`, updateError);
      return new Response(
        JSON.stringify({
          valid: false,
          redeemed: false,
          error: "Failed to redeem promo code",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Step 5: Log usage (optional, simplified)
    try {
      await supabaseAdmin.from("promo_usage_log").insert({
        promo_code_id: promoCode.id,
        code: normalizedCode,
        user_id: userId,
        user_email: userEmail,
        user_agent: userAgent,
        was_successful: true,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn("Failed to log usage, but continuing:", logError);
      // Don't fail the whole request if logging fails
    }

    console.log(`Successfully redeemed promo code: ${normalizedCode}`);

    // Step 6: Return success response
    return new Response(
      JSON.stringify({
        valid: true,
        redeemed: true,
        promoDetails: {
          description: promoCode.description,
          campaignName: promoCode.campaign_name,
          usageCount: promoCode.current_uses + 1,
          maxUses: promoCode.max_uses,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in validate-promo-code:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        redeemed: false,
        error: "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
