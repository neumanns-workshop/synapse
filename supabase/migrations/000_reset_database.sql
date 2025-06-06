-- ============================================================================
-- DATABASE RESET SCRIPT (DEVELOPMENT ONLY)
-- WARNING: This will delete ALL custom data and schema!
-- Only run this during development before you have real users
-- ============================================================================

-- Drop all custom tables (CASCADE removes dependent objects)
DROP TABLE IF EXISTS user_data CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop any custom types
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- Drop custom triggers first (they reference auth.users which we can't drop)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop custom functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'Database reset completed!';
  RAISE NOTICE 'All custom tables, functions, and triggers have been removed.';
  RAISE NOTICE 'You can now run the initial schema migration.';
END $$; 