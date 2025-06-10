-- Migration to add legal_consent to user_profiles table
-- Run this in your Supabase SQL editor

-- Add legal_consent column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN legal_consent JSONB DEFAULT '{
  "terms_of_service": {
    "accepted": false,
    "version": "1.0",
    "accepted_at": null
  },
  "privacy_policy": {
    "accepted": false, 
    "version": "1.0",
    "accepted_at": null
  },
  "marketing_emails": {
    "accepted": false,
    "accepted_at": null
  },
  "analytics": {
    "accepted": false,
    "accepted_at": null
  }
}'::jsonb;

-- Update existing users to have default consent structure
UPDATE user_profiles 
SET legal_consent = '{
  "terms_of_service": {
    "accepted": false,
    "version": "1.0",
    "accepted_at": null
  },
  "privacy_policy": {
    "accepted": false,
    "version": "1.0",
    "accepted_at": null
  },
  "marketing_emails": {
    "accepted": false,
    "accepted_at": null
  },
  "analytics": {
    "accepted": false,
    "accepted_at": null
  }
}'::jsonb
WHERE legal_consent IS NULL;

-- Optional: Create an index for querying consent status
CREATE INDEX idx_user_profiles_legal_consent 
ON user_profiles USING GIN (legal_consent);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.legal_consent IS 'Tracks user consent to Terms of Service and Privacy Policy with timestamps and versions'; 