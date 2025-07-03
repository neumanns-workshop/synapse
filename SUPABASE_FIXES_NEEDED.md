# Supabase Fixes Needed for Shortened URLs

## 🚨 Critical Issues to Fix

### 1. **Storage Bucket Setup**

Check if the `preview-images` bucket exists and is properly configured:

**In Supabase Dashboard > Storage:**

1. **Create bucket** (if it doesn't exist):
   - Name: `preview-images`
   - Public: ✅ **YES** (required for social media crawlers)

2. **Check bucket policies**:
   ```sql
   -- Run in SQL Editor to check existing policies
   SELECT * FROM storage.policies WHERE bucket_id = 'preview-images';
   ```

3. **Add required policies** (if missing):
   ```sql
   -- Allow uploads for all authenticated users (including anonymous)
   INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) VALUES
   ('Allow uploads for all users', 'preview-images', 'upload', 'permissive', 'true');

   -- Allow public read access for social media
   INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) VALUES
   ('Allow public read access', 'preview-images', 'select', 'permissive', 'true');
   ```

### 2. **Database Tables for Rate Limiting**

Check if these tables exist:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('upload_rate_limits', 'image_cleanup_queue');
```

**If missing, run the migration:**
```sql
-- Copy and run the entire contents of: database/preview-image-storage-migration.sql
```

### 3. **Storage Path Structure Change**

⚠️ **BREAKING CHANGE**: File paths have changed!

**Old structure:**
```
preview-images/
├── {userId}/
│   └── {challengeId}/
│       └── preview.jpg
└── anonymous/
    └── {challengeId}/
        └── preview.jpg
```

**New structure:**
```
preview-images/
├── {userId}/
│   └── {challengeHash}/
│       └── {challengeHash}.jpg
└── anonymous/
    └── {challengeHash}/
        └── {challengeHash}.jpg
```

**Action needed:**
- **Existing preview images will be orphaned** (won't be found by new system)
- **Option 1**: Delete old images manually (they'll auto-expire anyway)
- **Option 2**: Run migration script to move files (more complex)

### 4. **Verify Supabase URL in Netlify**

The edge function currently uses your hardcoded URL:
```
https://dyhvgdmmqdixmuuttve.supabase.co
```

**Check this is correct:**
1. Go to your Supabase project dashboard
2. Settings > API
3. Verify the URL matches what's in the edge function

**If different, update:**
- File: `netlify/edge-functions/challenge-preview.ts`
- Line: `const baseStorageUrl = "https://YOUR-ACTUAL-URL.supabase.co/storage/v1/object/public/preview-images";`

### 5. **Test Storage Access**

Test if the new path structure works:

```bash
# Test if you can access storage directly
curl -I "https://dyhvgdmmqdixmuuttve.supabase.co/storage/v1/object/public/preview-images/anonymous/test123/test123.jpg"
```

Should return `404 Not Found` (not permission error)

## 🔧 Quick Setup Commands

Run these in your Supabase SQL Editor:

```sql
-- 1. Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'preview-images';

-- 2. Check policies exist  
SELECT * FROM storage.policies WHERE bucket_id = 'preview-images';

-- 3. Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('upload_rate_limits', 'image_cleanup_queue');

-- 4. Test RLS policies work for anonymous users
SELECT auth.uid(); -- Should return a UUID even for anonymous users
```

## ⚠️ What Will Break Without These Fixes

1. **No favicon in shared links** ✅ (Fixed in edge function)
2. **Preview images won't load** ❌ (Need bucket + policies)
3. **Upload errors for users** ❌ (Need database tables)
4. **Rate limiting broken** ❌ (Need database tables)
5. **Long URLs still generated** ✅ (Fixed in sharing service)

## 🧪 Testing After Fixes

1. **Share a challenge** from the app
2. **Check URL length** - should be ~100 characters vs ~500+
3. **Open shared link** - should show Synapse favicon
4. **Check social media preview** - should show screenshot or fallback image

## 📋 Deployment Checklist

- [ ] Storage bucket `preview-images` exists and is public
- [ ] Storage policies allow uploads and public reads  
- [ ] Database tables `upload_rate_limits` and `image_cleanup_queue` exist
- [ ] RLS policies allow anonymous user access
- [ ] Supabase URL in edge function is correct
- [ ] Test URL shortening works (100 chars vs 500+)
- [ ] Test shared links show favicon
- [ ] Test preview images load (or graceful fallback)

---

**Expected Results:**
- ✅ URLs shortened from ~500 to ~100 characters
- ✅ Shared links show Synapse favicon  
- ✅ Preview images work or gracefully fallback to default
- ✅ Game flow unchanged - challenges start immediately 