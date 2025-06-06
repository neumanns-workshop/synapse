-- ============================================================================
-- SUPABASE EDGE FUNCTIONS FOR STRIPE INTEGRATION
-- These need to be deployed to your Supabase project as Edge Functions
-- ============================================================================

/*
  Create these as separate TypeScript files in your Supabase project:
  
  1. supabase/functions/create-checkout-session/index.ts
  2. supabase/functions/verify-payment/index.ts
  
  Then deploy with:
  supabase functions deploy create-checkout-session
  supabase functions deploy verify-payment
*/

-- Edge Function 1: create-checkout-session
-- File: supabase/functions/create-checkout-session/index.ts
/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.6.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      priceAmount, 
      currency, 
      userId, 
      userEmail, 
      productName, 
      productDescription,
      successUrl,
      cancelUrl 
    } = await req.json()

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl + `&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
*/

-- Edge Function 2: verify-payment
-- File: supabase/functions/verify-payment/index.ts
/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.6.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      // Payment was successful
      return new Response(
        JSON.stringify({ 
          success: true, 
          paymentIntentId: session.payment_intent,
          userId: session.metadata?.userId 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not completed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
*/

-- ============================================================================
-- ENVIRONMENT VARIABLES NEEDED
-- ============================================================================

/*
  Add these to your Supabase project settings -> Edge Functions -> Environment variables:
  
  STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key)
  STRIPE_PUBLISHABLE_KEY=pk_test_... (your Stripe publishable key)
  
  And add to your .env file:
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
*/

-- ============================================================================
-- STRIPE DASHBOARD SETUP
-- ============================================================================

/*
  1. Create a Stripe account at https://stripe.com
  2. Get your API keys from https://dashboard.stripe.com/test/apikeys
  3. No need to create products - we create them dynamically in the checkout session
  4. Set up webhooks (optional but recommended for production):
     - Endpoint: https://your-project.supabase.co/functions/v1/stripe-webhook
     - Events: checkout.session.completed, payment_intent.succeeded
*/ 