-- Migration to add email_updates to existing user_profiles privacy_settings
-- Run this in your Supabase SQL editor

-- Update existing user profiles to include email_updates field (default false for privacy)
UPDATE user_profiles 
SET privacy_settings = privacy_settings || '{"email_updates": false}'::jsonb
WHERE privacy_settings IS NOT NULL 
AND NOT (privacy_settings ? 'email_updates');

-- For any profiles that might have NULL privacy_settings, set the default
UPDATE user_profiles 
SET privacy_settings = '{
  "allow_challenge_sharing": true,
  "allow_stats_sharing": true,
  "allow_leaderboards": false,
  "data_collection": false,
  "email_updates": false
}'::jsonb
WHERE privacy_settings IS NULL; 