-- ============================================================================
-- FIX RLS POLICIES FOR ANONYMOUS TO PREMIUM CONVERSION FLOW
-- ============================================================================
-- This fixes RLS policies to support: anon sign-in → promo code → premium conversion
-- Maintains security while allowing the intended user flow

-- ============================================================================
-- 1. DROP EXISTING RESTRICTIVE POLICIES
-- ============================================================================

-- Drop existing user_profiles policies that are too restrictive
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "legal_consent_self_access" ON user_profiles;
DROP POLICY IF EXISTS "legal_consent_self_update" ON user_profiles;

-- Drop existing user_data policies that are too restrictive  
DROP POLICY IF EXISTS "Authenticated users can view own data" ON user_data;
DROP POLICY IF EXISTS "Authenticated users can update own data" ON user_data;
DROP POLICY IF EXISTS "Authenticated users can delete own data" ON user_data;
DROP POLICY IF EXISTS "Authenticated users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can only access their own data" ON user_data;

-- ============================================================================
-- 2. CREATE ANONYMOUS-FRIENDLY POLICIES FOR USER_PROFILES
-- ============================================================================

-- Allow authenticated users (including anonymous) to view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users (including anonymous) to create their own profile
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users (including anonymous) to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile (for account deletion)
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- 3. CREATE ANONYMOUS-FRIENDLY POLICIES FOR USER_DATA
-- ============================================================================

-- Allow authenticated users (including anonymous) to access their own data
CREATE POLICY "Users can access own data" ON user_data
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users (including anonymous) to create their own data
CREATE POLICY "Users can create own data" ON user_data
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users (including anonymous) to update their own data
CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own data (for account deletion)
CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. ENSURE RLS IS ENABLED
-- ============================================================================

-- Make sure RLS is enabled on both tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. VERIFY POLICIES
-- ============================================================================

-- Check that policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_data')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================

-- ✅ Anonymous users can now create profiles when they sign in
-- ✅ Anonymous users can store and access their game data  
-- ✅ Security maintained - users can only access their own data
-- ✅ Promo code conversion flow will work properly
-- ✅ Premium users retain full access to their data
-- ✅ Account deletion still works properly

-- The flow now works as intended:
-- 1. Anonymous sign-in creates session ✅
-- 2. Anonymous user can create profile ✅  
-- 3. Anonymous user can play games and store data ✅
-- 4. Promo code converts anonymous user to premium ✅
-- 5. Premium user retains all their data ✅ 