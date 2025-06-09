# Stripe Webhook Debug Checklist

Your Stripe webhook setup is not working. Here's a systematic approach to debug and fix it:

## 🔍 Current Status
- ✅ Webhook endpoint is accessible (returns 401 without signature - expected)
- ❌ No rows in Supabase tables (`user_data`, `user_profiles`)
- ❌ No events in Stripe webhook dashboard
- ❌ Payment appears successful but account creation fails

## 🚨 Most Likely Issues

### 1. Missing Environment Variables in Supabase Edge Functions

**Check these in Supabase Dashboard → Settings → Edge Functions → Environment variables:**

```
STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook setup)
SUPABASE_URL=https://dvihvgdmmqdixmuuttve.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (your service role key)
```

**How to fix:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/dvihvgdmmqdixmuuttve)
2. Settings → Edge Functions → Environment variables
3. Add each missing variable

### 2. Webhook Not Configured in Stripe Dashboard

**Check Stripe Dashboard → Webhooks:**

- Endpoint URL: `https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`
- Status: Should be "Enabled"

**How to fix:**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/stripe-webhook`
4. Select events: `checkout.session.completed`
5. Copy the webhook secret and add to Supabase environment variables

### 3. Database Tables Missing or Incorrect Schema

**Check if tables exist in Supabase:**
1. Go to Supabase Dashboard → Table Editor
2. Verify `user_profiles` and `user_data` tables exist
3. Check if they have the correct columns

**How to fix:**
Run this SQL in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_data');

-- If they don't exist, run the schema creation script
-- (See supabase-schema-creation.sql in your codebase)
```

## 🧪 Testing Steps

### Step 1: Test Edge Functions
1. Edit `debug-webhook-with-auth.js` and add your `SUPABASE_ANON_KEY`
2. Run: `node debug-webhook-with-auth.js`
3. Look for specific error messages

### Step 2: Check Supabase Logs
1. Go to Supabase Dashboard → Edge Functions → stripe-webhook → Logs
2. Look for any error messages when webhook is called

### Step 3: Test Webhook Manually
1. Use Stripe CLI: `stripe listen --forward-to https://dvihvgdmmqdixmuuttve.supabase.co/functions/v1/stripe-webhook`
2. Create a test payment
3. Check if webhook receives the event

### Step 4: Verify Database Permissions
1. Check if RLS (Row Level Security) is properly configured
2. Verify service role key has admin permissions

## 🔧 Quick Fixes

### Fix 1: Redeploy Edge Functions
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy verify-payment-simple
```

### Fix 2: Reset Database Schema
If tables are corrupted, run the schema creation script:
```sql
-- See supabase-schema-creation.sql in your codebase
```

### Fix 3: Test with Fresh Stripe Session
Create a new test payment to get a fresh session ID and test the flow.

## 🚨 Emergency Debugging

If nothing else works, check these:

1. **Supabase Project Status**: Is your project active and not paused?
2. **Stripe Account Status**: Is your Stripe account in good standing?
3. **Network Issues**: Can you reach both Supabase and Stripe from your location?
4. **API Key Validity**: Are your Stripe keys still valid and not expired?

## 📋 Verification Checklist

- [ ] Environment variables set in Supabase Edge Functions
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Database tables exist with correct schema
- [ ] Edge Functions deployed successfully
- [ ] Webhook secret matches between Stripe and Supabase
- [ ] Service role key has proper permissions
- [ ] Test payment creates webhook event in Stripe
- [ ] Webhook logs show successful processing in Supabase

## 🆘 If Still Not Working

1. Check Supabase Edge Function logs for detailed error messages
2. Check Stripe webhook delivery logs for failed attempts
3. Create a minimal test case with just the webhook handler
4. Contact Supabase support if Edge Functions are not working
5. Contact Stripe support if webhooks are not being delivered

## 📞 Support Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Supabase Dashboard](https://supabase.com/dashboard/project/dvihvgdmmqdixmuuttve)
- [Stripe Dashboard](https://dashboard.stripe.com) 