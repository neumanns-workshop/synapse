import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client with SERVICE_ROLE_KEY for admin actions
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
    // 1. Check for JWT and authenticate the request (even if not strictly used for admin actions below, it's good practice)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    const { data: { user: callingUser }, error: callingUserError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (callingUserError || !callingUser) {
      console.error("Auth error for calling user:", callingUserError);
      return new Response(JSON.stringify({ error: "Authentication failed for calling user." }), { status: 401, headers: corsHeaders });
    }

    // 2. Get parameters from request body
    const { temporaryUserId, email, password } = await req.json();
    if (!temporaryUserId || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required parameters: temporaryUserId, email, password" }), { status: 400, headers: corsHeaders });
    }

    // 3. Verify the temporary user is marked as premium in user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("is_premium, email")
      .eq("id", temporaryUserId)
      .single();

    if (profileError) {
      console.error(`Error fetching profile for temporaryUserId ${temporaryUserId}:`, profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch user profile for verification." }), { status: 500, headers: corsHeaders });
    }

    if (!profile || !profile.is_premium) {
      console.warn(`Attempt to finalize account for non-premium user or user not found: ${temporaryUserId}`);
      return new Response(JSON.stringify({ error: "User is not marked as premium or does not exist." }), { status: 403, headers: corsHeaders });
    }

    // 4. Update Auth User (convert anonymous to permanent, update credentials)
    const { data: updatedAuthUser, error: updateAuthUserError } = await supabaseAdmin.auth.admin.updateUserById(
      temporaryUserId,
      { 
        email: email, 
        password: password,
        email_confirm: true, // Mark email as confirmed
      }
    );

    if (updateAuthUserError) {
      console.error(`Error updating auth user ${temporaryUserId}:`, updateAuthUserError);
      return new Response(JSON.stringify({ error: "Failed to update user authentication details." }), { status: 500, headers: corsHeaders });
    }

    // 5. Update email in user_profiles if it's different or was null
    if (profile.email !== email) {
        const { error: updateProfileEmailError } = await supabaseAdmin
            .from("user_profiles")
            .update({ email: email, updated_at: new Date().toISOString() })
            .eq("id", temporaryUserId);

        if (updateProfileEmailError) {
            // Log this error but don't fail the whole operation if auth user was updated.
            // The core part (auth conversion) succeeded. Profile email can be fixed or might not be critical.
            console.warn(`User auth updated, but failed to update email in user_profiles for ${temporaryUserId}:`, updateProfileEmailError);
        } else {
            console.log(`Successfully updated email in user_profiles for ${temporaryUserId} to ${email}`);
        }
    }
    
    console.log(`Successfully finalized premium account for user ID: ${temporaryUserId}, email: ${email}`);
    return new Response(JSON.stringify({ message: "Account finalized successfully.", userId: updatedAuthUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in finalize-premium-account:", error);
    let status = 400;
    if (error.message === "Missing Authorization header" || error.message.includes("Authentication failed")) {
        status = 401;
    } else if (error.message.includes("Failed to fetch user profile") || error.message.includes("Failed to update user")) {
        status = 500;
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status,
      },
    );
  }
}); 