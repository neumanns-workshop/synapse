import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Webhook Error: Missing Stripe signature");
      return new Response("Missing signature", { status: 400 });
    }

    if (!webhookSecret) {
      console.error("Webhook Error: Missing webhook secret");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response("Invalid signature", { status: 400 });
    }

    console.log(`Webhook verified: ${event.id}, Type: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  console.log(
    `Processing checkout.session.completed for session ID: ${session.id}`,
  );

  if (session.payment_status !== "paid") {
    console.log(
      `Session ${session.id} payment_status is ${session.payment_status}, not 'paid'. Skipping.`,
    );
    return;
  }

  const supabaseUserId = session.client_reference_id;
  const stripeCustomerId = session.customer as string;

  if (!supabaseUserId) {
    console.error(
      `Webhook Error: client_reference_id missing from checkout.session.completed ${session.id}. Cannot process.`,
    );
    return;
  }

  if (!stripeCustomerId) {
    console.error(
      `Webhook Error: Stripe customer ID missing from checkout.session.completed ${session.id}. Cannot process.`,
    );
    return;
  }

  console.log(
    `Attempting to upgrade Supabase user: ${supabaseUserId}, Stripe customer: ${stripeCustomerId}`,
  );

  // Update or create user profile with validated purchase data
  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: supabaseUserId,
        is_premium: true,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
        platform_purchase_data: {
          platform: "stripe",
          transactionId: session.id,
          purchaseDate: Date.now(),
          validated: true,
          lastValidated: Date.now(),
        },
      },
      {
        onConflict: "id",
      },
    );

  if (profileError) {
    console.error(
      `CRITICAL ERROR: Failed to upsert user_profiles for Supabase user ${supabaseUserId}:`,
      profileError,
    );
    throw new Error(`Failed to upsert user_profiles: ${profileError.message}`);
  }

  console.log(
    `Successfully confirmed premium status for Supabase user ${supabaseUserId}. is_premium: true, stripe_customer_id: ${stripeCustomerId}, validated: true`,
  );
}
