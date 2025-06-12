-- ============================================================================
-- TEMPORARY RLS DISABLE FOR TESTING ANONYMOUS AUTH
-- ============================================================================
-- This script temporarily disables RLS to test if that's blocking anonymous auth
-- IMPORTANT: Only run this for testing, then re-enable RLS immediately after!

-- WARNING: This removes security temporarily - only for debugging!

-- Disable RLS on user_profiles table
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on user_data table  
ALTER TABLE user_data DISABLE ROW LEVEL SECURITY;

-- Test anonymous auth now, then run the re-enable script below

-- ============================================================================
-- TO RE-ENABLE RLS AFTER TESTING (RUN THIS IMMEDIATELY AFTER TESTING!)
-- ============================================================================

-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BETTER SOLUTION: Update RLS policies to allow anonymous users
-- ============================================================================

-- Instead of disabling RLS, we should update the policies to allow anonymous users
-- Run this after testing to fix the real issue:

/*
-- Allow anonymous users to create their own profiles
CREATE POLICY "Allow anonymous profile creation" ON user_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow anonymous users to access their own data
CREATE POLICY "Allow anonymous data access" ON user_data
  FOR ALL
  TO authenticated  
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
*/ 