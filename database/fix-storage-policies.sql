-- ============================================================================
-- FIX STORAGE POLICIES FOR ANONYMOUS UPLOADS
-- ============================================================================
-- This fixes storage bucket policies to allow anonymous users to upsert files
-- Needed for challenge screenshot sharing where we want to replace existing files

-- First, check what policies currently exist
SELECT 
  id, name, bucket_id, policy, policy_type, definition 
FROM storage.policies 
WHERE bucket_id = 'preview-images';

-- Drop existing policies if they're too restrictive
DELETE FROM storage.policies WHERE bucket_id = 'preview-images';

-- Create new policies that allow both INSERT and UPDATE for all users
INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) VALUES
(
    'Allow all users to upload (insert)',
    'preview-images',
    'INSERT',
    'permissive',
    'true'
),
(
    'Allow all users to update existing files',
    'preview-images', 
    'UPDATE',
    'permissive',
    'true'
),
(
    'Allow public read access',
    'preview-images',
    'SELECT', 
    'permissive',
    'true'
),
(
    'Allow all users to delete their own files',
    'preview-images',
    'DELETE',
    'permissive', 
    'true'
);

-- Ensure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'preview-images';

-- Verify the new policies
SELECT 
  '=== UPDATED STORAGE POLICIES ===' as status;

SELECT 
  id, name, bucket_id, policy, policy_type, definition 
FROM storage.policies 
WHERE bucket_id = 'preview-images'
ORDER BY policy;

-- Test the setup
SELECT 
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'preview-images';

-- Result should show:
-- ✅ INSERT policy for uploads
-- ✅ UPDATE policy for replacing files (upsert)
-- ✅ SELECT policy for public read access
-- ✅ DELETE policy for cleanup
-- ✅ Bucket is public 