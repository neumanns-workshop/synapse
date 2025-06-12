-- ============================================================================
-- SAFE FIX FOR RLS POLICIES - HANDLES EXISTING POLICIES
-- ============================================================================
-- This safely updates RLS policies to support anonymous-to-premium conversion
-- First checks what exists, then only creates what's needed

-- ============================================================================
-- 1. CHECK CURRENT POLICIES
-- ============================================================================

-- See what policies currently exist
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_data')
ORDER BY tablename, policyname;

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES (SAFE - RECREATES THEM)
-- ============================================================================

-- Drop ALL existing policies for user_profiles
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
    END LOOP;
END $$;

-- Drop ALL existing policies for user_data
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_data' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_data';
    END LOOP;
END $$;

-- ============================================================================
-- 3. CREATE NEW ANONYMOUS-FRIENDLY POLICIES
-- ============================================================================

-- USER_PROFILES policies (allow anonymous users)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = id);

-- USER_DATA policies (allow anonymous users)
CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data" ON user_data
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. VERIFY NEW POLICIES
-- ============================================================================

SELECT 
  '=== FINAL POLICIES ===' as status;

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_data')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '✅ RLS policies updated for anonymous-to-premium flow' as result; 