-- Complete Database Reset via SQL
-- WARNING: This will delete ALL data and custom schema!
-- Run this in Supabase SQL Editor

-- Drop all custom tables
DROP TABLE IF EXISTS user_data CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop any custom types
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- Drop any custom functions you may have created
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop any custom triggers
-- Note: Triggers are automatically dropped with CASCADE above

-- Verify cleanup (optional - run this to see what's left)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- After running this, you can re-run your schema creation script 