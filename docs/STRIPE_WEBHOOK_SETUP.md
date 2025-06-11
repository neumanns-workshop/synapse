# Stripe Webhook Setup for Production

This guide sets up a production-ready payment flow using Stripe webhooks for reliable account creation.

## Architecture Overview

```
User Payment Flow:
1. User fills signup form → Stripe Checkout
2. Payment completed → Stripe sends webhook
3. Webhook creates account → User can sign in
4. Client verifies payment → Shows success message
```

## Setup Steps

### 1. Deploy Edge Functions

```bash
# Deploy the webhook handler
supabase functions deploy stripe-webhook

# Deploy the simple verification function
supabase functions deploy verify-payment-simple
```

### 2. Set Environment Variables

In your Supabase dashboard (Settings → Edge Functions → Environment variables):

```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook setup)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (optional)
5. Copy the webhook secret and add it to your environment variables

### 4. Test the Webhook

```bash
# Use Stripe CLI to test locally (optional)
stripe listen --forward-to https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/stripe-webhook

# Or test with a real payment in test mode
```

## How It Works

### Payment Flow

1. **User initiates payment**: Fills out signup form, clicks "Purchase Premium"
2. **Stripe Checkout**: User completes payment on Stripe's secure page
3. **Webhook triggered**: Stripe sends `checkout.session.completed` event
4. **Account creation**: Webhook handler creates Supabase account with premium status
5. **User returns**: Redirected back to app with success message
6. **User signs in**: Can now sign in with the credentials they used during checkout

### Key Benefits

- **Reliable**: Stripe retries failed webhooks automatically
- **Secure**: Account creation happens server-side with service role
- **Fast**: User gets immediate feedback, account creation happens in background
- **Robust**: No race conditions or client-side authentication issues

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**

   - Check webhook URL is correct
   - Verify webhook secret is set in environment variables
   - Check Stripe webhook logs for delivery attempts

2. **Account creation failing**

   - Check Edge Function logs in Supabase dashboard
   - Verify SUPABASE_SERVICE_ROLE_KEY is set correctly
   - Ensure user_profiles and user_data tables exist

3. **Payment verification failing**
   - Check STRIPE_SECRET_KEY is set
   - Verify session ID format is correct
   - Check if session has expired (test sessions expire after 24 hours)

### Debugging Commands

```bash
# Check function logs
# (Go to Supabase Dashboard → Edge Functions → stripe-webhook → Logs)

# Test webhook endpoint
curl -X POST https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test simple verification
curl -X POST https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/verify-payment-simple \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"sessionId": "cs_test_..."}'
```

## Production Considerations

1. **Use live Stripe keys** for production
2. **Set up monitoring** for webhook failures
3. **Implement retry logic** for critical operations
4. **Add logging** for payment events
5. **Set up alerts** for failed account creations

## Security Notes

- Webhook endpoint verifies Stripe signature
- Service role key is only used server-side
- User passwords are hashed by Supabase
- No sensitive data is logged

## Next Steps

1. Test the complete flow with a test payment
2. Monitor webhook delivery in Stripe dashboard
3. Check account creation in Supabase dashboard
4. Set up production webhook with live keys
