-- Fix RLS policies for promo codes to allow edge function access
-- Run this in your Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Prevent unauthorized modifications" ON promo_codes;
DROP POLICY IF EXISTS "Allow usage log insertion" ON promo_usage_log;
DROP POLICY IF EXISTS "Admin only access to usage logs" ON promo_usage_log;
DROP POLICY IF EXISTS "Prevent unauthorized user modifications" ON promo_codes;

-- Add correct policies for promo_codes
CREATE POLICY "Allow service role access" ON promo_codes
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Add correct policies for promo_usage_log  
CREATE POLICY "Allow service role usage log access" ON promo_usage_log
  FOR ALL 
  USING (auth.role() = 'service_role'); 