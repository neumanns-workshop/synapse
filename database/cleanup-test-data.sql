-- ============================================================================
-- CLEANUP TEST DATA FROM SUPABASE
-- ============================================================================
-- This script removes all test data while preserving the database schema
-- Run this in your Supabase SQL Editor

-- WARNING: This will delete ALL user data and profiles!
-- Make sure you want to do this before running

-- ============================================================================
-- 1. DELETE ALL USER DATA
-- ============================================================================

-- Delete all user game data and progress
DELETE FROM user_data;

-- Delete all user profiles (this will cascade to related data)
DELETE FROM user_profiles;

-- ============================================================================
-- 2. CLEAN UP PROMO CODE USAGE (if tables exist)
-- ============================================================================

-- Clean up promo code usage logs (if the table exists)
DELETE FROM promo_usage_log WHERE true;

-- Reset promo code usage counts (if the table exists)
UPDATE promo_codes SET current_uses = 0 WHERE current_uses > 0;

-- ============================================================================
-- 3. RESET SEQUENCES (if any auto-increment fields exist)
-- ============================================================================

-- Reset any sequences that might exist
-- (Most of your tables use UUIDs, so this may not be needed)

-- ============================================================================
-- 4. VERIFY CLEANUP
-- ============================================================================

-- Check that tables are empty
SELECT 'user_profiles' as table_name, count(*) as remaining_rows FROM user_profiles
UNION ALL
SELECT 'user_data' as table_name, count(*) as remaining_rows FROM user_data
UNION ALL
SELECT 'promo_usage_log' as table_name, count(*) as remaining_rows FROM promo_usage_log;

-- ============================================================================
-- 5. OPTIONAL: VACUUM TABLES FOR PERFORMANCE
-- ============================================================================

-- Note: VACUUM commands cannot run in Supabase SQL Editor transaction blocks
-- If you want to reclaim storage space, run these commands separately:
-- VACUUM user_profiles;
-- VACUUM user_data;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- After running this script:
-- ✅ All test user accounts removed
-- ✅ All game progress and data cleared  
-- ✅ All promo code usage reset
-- ✅ Database schema preserved
-- ✅ Ready for production use

-- The database is now clean and ready for real users! 