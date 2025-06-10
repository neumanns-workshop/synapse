-- Supabase Security Audit Fixes
-- Run this in your Supabase SQL editor to address security warnings

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE (CRITICAL SECURITY ISSUE)
-- ============================================================================

-- Fix increment_promo_usage function (if it exists)
CREATE OR REPLACE FUNCTION increment_promo_usage(code_value text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.promo_usage_log (promo_code, used_at)
  VALUES (code_value, NOW());
  
  UPDATE public.promo_codes 
  SET usage_count = usage_count + 1 
  WHERE code = code_value;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Grant permission
GRANT EXECUTE ON FUNCTION increment_promo_usage(text) TO service_role;

-- ============================================================================
-- 2. REVIEW ANONYMOUS ACCESS POLICIES
-- ============================================================================

-- Review and tighten RLS policies for user_data table
-- Only allow authenticated users to access their own data
DROP POLICY IF EXISTS "Users can view own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can update own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_data;

-- Create more restrictive policies (no anonymous access)
CREATE POLICY "Authenticated users can view own data" ON public.user_data
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own data" ON public.user_data
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own data" ON public.user_data
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own data" ON public.user_data
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Review and tighten RLS policies for user_profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "legal_consent_self_access" ON public.user_profiles;
DROP POLICY IF EXISTS "legal_consent_self_update" ON public.user_profiles;

-- Create more restrictive policies (no anonymous access)
CREATE POLICY "Authenticated users can view own profile" ON public.user_profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile" ON public.user_profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile" ON public.user_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Keep promo_codes accessible for validation but restrict to necessary operations only
-- You may want to review if anonymous access is actually needed for your app

-- ============================================================================
-- 3. ADD ADDITIONAL SECURITY MEASURES
-- ============================================================================

-- Add function to validate user has proper permissions
CREATE OR REPLACE FUNCTION check_user_permissions(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only allow access if user is accessing their own data or is service_role
  RETURN (
    auth.uid() = target_user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Add audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION log_legal_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log consent changes for audit purposes
  INSERT INTO public.consent_audit_log (
    user_id, 
    old_consent, 
    new_consent, 
    changed_at, 
    changed_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    OLD.legal_consent,
    NEW.legal_consent,
    NOW(),
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Create audit log table (optional but recommended)
CREATE TABLE IF NOT EXISTS public.consent_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  old_consent JSONB,
  new_consent JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id)
);

-- Add RLS to audit log
ALTER TABLE public.consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service_role to read audit logs
CREATE POLICY "Service role can read audit logs" ON public.consent_audit_log
  FOR SELECT 
  TO service_role
  USING (true);

-- Create trigger for consent changes (optional)
-- DROP TRIGGER IF EXISTS consent_audit_trigger ON public.user_profiles;
-- CREATE TRIGGER consent_audit_trigger
--   AFTER UPDATE OF legal_consent ON public.user_profiles
--   FOR EACH ROW EXECUTE FUNCTION log_legal_consent_change();

-- ============================================================================
-- 4. COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION increment_promo_usage IS 'SECURE: Increments promo code usage with fixed search_path';
COMMENT ON FUNCTION check_user_permissions IS 'SECURE: Validates user has permission to access target user data';
COMMENT ON FUNCTION log_legal_consent_change IS 'SECURE: Audit logging for legal consent changes';
COMMENT ON TABLE consent_audit_log IS 'Audit trail for legal consent changes (GDPR compliance)';

-- ============================================================================
-- 5. GRANT APPROPRIATE PERMISSIONS
-- ============================================================================

-- Grant function permissions to authenticated users only
GRANT EXECUTE ON FUNCTION check_user_permissions(UUID) TO authenticated;

-- Service role permissions for audit functions
GRANT EXECUTE ON FUNCTION log_legal_consent_change() TO service_role;
GRANT ALL ON TABLE consent_audit_log TO service_role; 