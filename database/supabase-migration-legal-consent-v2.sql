-- Enhanced Legal Consent Migration v2
-- Run this in your Supabase SQL editor after the initial legal consent migration

-- Function to update user legal consent
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
  UPDATE user_profiles 
  SET 
    legal_consent = COALESCE(legal_consent, '{}'::jsonb) || consent_update,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has accepted required legal terms
CREATE OR REPLACE FUNCTION check_required_legal_consent(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_consent JSONB;
  result JSONB;
BEGIN
  SELECT legal_consent INTO user_consent
  FROM user_profiles 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current legal consent status
CREATE OR REPLACE FUNCTION get_user_legal_consent(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_consent JSONB;
BEGIN
  SELECT legal_consent INTO user_consent
  FROM user_profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(user_consent, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for legal consent functions
-- Users can only access their own consent data
CREATE POLICY legal_consent_self_access ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY legal_consent_self_update ON user_profiles
  FOR UPDATE  
  USING (auth.uid() = id);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_consent_terms 
ON user_profiles ((legal_consent->'terms_of_service'->>'accepted'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_consent_privacy 
ON user_profiles ((legal_consent->'privacy_policy'->>'accepted'));

-- Add constraint to ensure legal_consent is valid JSON
ALTER TABLE user_profiles 
ADD CONSTRAINT valid_legal_consent 
CHECK (legal_consent IS NULL OR jsonb_typeof(legal_consent) = 'object');

COMMENT ON FUNCTION update_user_legal_consent IS 'Updates user legal consent for specified type (terms_of_service, privacy_policy, marketing_emails, analytics)';
COMMENT ON FUNCTION check_required_legal_consent IS 'Checks if user has accepted required legal terms and returns compliance status';
COMMENT ON FUNCTION get_user_legal_consent IS 'Returns user''s current legal consent status'; 