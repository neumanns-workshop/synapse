-- Enhanced Legal Consent Migration v2 - SECURE VERSION
-- Run this in your Supabase SQL editor to replace the previous functions with secure versions
-- This fixes the "Function Search Path Mutable" security warnings

-- Drop existing functions first
DROP FUNCTION IF EXISTS update_user_legal_consent(UUID, VARCHAR(50), BOOLEAN, VARCHAR(10));
DROP FUNCTION IF EXISTS check_required_legal_consent(UUID);
DROP FUNCTION IF EXISTS get_user_legal_consent(UUID);

-- Function to update user legal consent (SECURE VERSION)
CREATE OR REPLACE FUNCTION update_user_legal_consent(
  user_id UUID,
  consent_type VARCHAR(50),
  accepted BOOLEAN,
  version VARCHAR(10) DEFAULT '1.0'
)
RETURNS VOID AS $$
DECLARE
  consent_update JSONB;
BEGIN
  -- Create the consent update object
  consent_update := jsonb_build_object(
    consent_type, jsonb_build_object(
      'accepted', accepted,
      'accepted_at', CASE WHEN accepted THEN NOW() ELSE NULL END,
      'version', version
    )
  );
  
  -- Update the user's legal consent
  UPDATE public.user_profiles 
  SET 
    legal_consent = COALESCE(legal_consent, '{}'::jsonb) || consent_update,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Function to check if user has accepted required legal terms (SECURE VERSION)
CREATE OR REPLACE FUNCTION check_required_legal_consent(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_consent JSONB;
  result JSONB;
BEGIN
  SELECT legal_consent INTO user_consent
  FROM public.user_profiles 
  WHERE id = user_id;
  
  IF user_consent IS NULL THEN
    RETURN jsonb_build_object(
      'compliant', false,
      'missing', jsonb_build_array('terms_of_service', 'privacy_policy')
    );
  END IF;
  
  -- Check if required consents are accepted
  result := jsonb_build_object(
    'compliant', 
    COALESCE((user_consent->'terms_of_service'->>'accepted')::boolean, false) AND
    COALESCE((user_consent->'privacy_policy'->>'accepted')::boolean, false),
    'terms_accepted', COALESCE((user_consent->'terms_of_service'->>'accepted')::boolean, false),
    'privacy_accepted', COALESCE((user_consent->'privacy_policy'->>'accepted')::boolean, false),
    'marketing_emails', COALESCE((user_consent->'marketing_emails'->>'accepted')::boolean, false),
    'analytics', COALESCE((user_consent->'analytics'->>'accepted')::boolean, false)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Function to get user's current legal consent status (SECURE VERSION)
CREATE OR REPLACE FUNCTION get_user_legal_consent(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_consent JSONB;
BEGIN
  SELECT legal_consent INTO user_consent
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(user_consent, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Update existing functions to be secure (if they exist)
-- Note: You may need to recreate these if they exist in your database

-- Secure the handle_new_user function (if it exists)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, created_at)
  VALUES (new.id, new.email, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Secure the update_updated_at_column function (if it exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = '';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_legal_consent(UUID, VARCHAR(50), BOOLEAN, VARCHAR(10)) TO authenticated;
GRANT EXECUTE ON FUNCTION check_required_legal_consent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_legal_consent(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_legal_consent IS 'SECURE: Updates user legal consent for specified type (terms_of_service, privacy_policy, marketing_emails, analytics)';
COMMENT ON FUNCTION check_required_legal_consent IS 'SECURE: Checks if user has accepted required legal terms and returns compliance status';
COMMENT ON FUNCTION get_user_legal_consent IS 'SECURE: Returns user''s current legal consent status'; 