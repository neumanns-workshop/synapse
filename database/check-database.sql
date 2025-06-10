-- Check if required tables exist and their schema
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_data')
ORDER BY table_name;

-- 2. Check user_profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check user_data table structure  
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_data' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_data')
  AND schemaname = 'public';

-- 5. Check existing data (should be empty based on your screenshots)
SELECT 'user_profiles' as table_name, count(*) as row_count FROM user_profiles
UNION ALL
SELECT 'user_data' as table_name, count(*) as row_count FROM user_data;

-- 6. Test if we can insert data (this will help identify permission issues)
-- This is just a test - we'll rollback
BEGIN;
  INSERT INTO user_profiles (id, email, is_premium) 
  VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', false);
  
  SELECT 'Insert test successful' as result;
ROLLBACK; 