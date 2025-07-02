# Preview Image Upload Implementation

## Overview

This system implements client-side preview image generation and upload for social media sharing. Instead of server-side image generation, users' devices capture perfect screenshots of the actual GraphVisualization component and upload them to Supabase Storage.

## Architecture

### Client-Side Flow
1. User clicks "Share Challenge"
2. App captures screenshot of GraphVisualization component (existing functionality)  
3. Upload image to Supabase Storage with spam protection
4. Generate shareable URL with preview image parameter
5. Social media crawlers get the actual screenshot via og:image meta tag

### Server-Side Flow
1. Social media crawler hits challenge URL
2. Netlify Edge Function detects crawler
3. Returns HTML with og:image pointing to uploaded screenshot
4. Perfect preview displays on social media

## Setup Instructions

### 1. Database Migration

Run the SQL migration in Supabase SQL Editor:

```sql
-- See database/preview-image-storage-migration.sql
```

### 2. Create Storage Bucket

In Supabase Dashboard > Storage:

1. Create new bucket: `preview-images`
2. Make it public
3. Set up storage policies:

```sql
-- Allow uploads for all users
INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) VALUES
('Allow uploads for all users', 'preview-images', 'upload', 'permissive', 'true');

-- Allow public read access  
INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) VALUES
('Allow public read access', 'preview-images', 'select', 'permissive', 'true');
```

### 3. Optional: Set up Cron Jobs

For automatic cleanup, set up cron jobs to run these functions:

```sql
-- Run daily at 2 AM
SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT cleanup_expired_rate_limits();');

-- Run hourly for image cleanup  
SELECT cron.schedule('cleanup-images', '0 * * * *', 'SELECT process_image_cleanup();');
```

## Spam Protection Features

### Rate Limiting
- **10 uploads per hour per user/IP**
- Tracks both authenticated users and anonymous users
- Graceful error messages with retry time

### File Validation
- **Maximum file size: 5MB**
- **Allowed format: JPEG** (from screenshot)
- **Automatic compression** via react-native-view-shot

### Security
- **Row Level Security (RLS)** on all tables
- **User isolation** - users can only see their own data
- **No user modifications** - only inserts allowed

### Auto-Cleanup
- **Images deleted after 7 days**
- **Rate limit records deleted after 24 hours**
- **Processed cleanup records deleted after 30 days**

## Storage Structure

```
preview-images/
├── {user_id}/
│   └── {challenge_id}/
│       └── {timestamp}.jpg
└── anonymous/
    └── {challenge_id}/
        └── {timestamp}.jpg
```

## Usage Examples

### Sharing a Challenge
```javascript
// This happens automatically when user clicks share
const success = await shareChallenge({
  startWord: "cat",
  targetWord: "dog", 
  screenshotRef: graphPreviewRef,
  includeScreenshot: true,
  gameReport: gameReport
});
```

### The resulting URL contains preview parameter:
```
https://synapsegame.ai/challenge?type=challenge&start=cat&target=dog&preview=https://supabase.co/storage/v1/object/public/preview-images/user123/cat-dog-abc123/1672531200000.jpg
```

### Social Media Meta Tags
```html
<meta property="og:image" content="https://supabase.co/storage/v1/object/public/preview-images/user123/cat-dog-abc123/1672531200000.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

## Error Handling

### Rate Limit Exceeded
```javascript
{
  publicUrl: null,
  error: "Rate limit exceeded. Try again in 45 minutes."
}
```

### File Too Large
```javascript
{
  publicUrl: null, 
  error: "Image too large (max 5MB)"
}
```

### Upload Failed
```javascript
{
  publicUrl: null,
  error: "Upload failed"
}
```

## Monitoring

### Check Upload Statistics
```sql
-- Uploads in last hour
SELECT * FROM get_upload_stats('1 hour');

-- Uploads in last day  
SELECT * FROM get_upload_stats('24 hours');
```

### Check Rate Limits
```sql
-- Current rate limit status for user
SELECT COUNT(*) as uploads_last_hour
FROM upload_rate_limits 
WHERE user_id = 'user123' 
AND created_at >= NOW() - INTERVAL '1 hour';
```

### Check Cleanup Queue
```sql
-- Pending cleanups
SELECT COUNT(*) FROM image_cleanup_queue WHERE NOT processed;

-- Overdue cleanups
SELECT COUNT(*) FROM image_cleanup_queue 
WHERE expires_at <= NOW() AND NOT processed;
```

## Benefits vs Server-Side Generation

### ✅ Advantages
- **Perfect Fidelity**: Uses actual React components, not recreations
- **No Server Dependencies**: No canvas, puppeteer, or native libraries
- **Scalable**: Client devices do the work, server just stores files
- **Simple Deployment**: No complex CI/CD setup for native dependencies
- **Cost Efficient**: Storage costs vs compute costs
- **Fast Sharing**: Images generated on-demand when shared

### ⚠️ Considerations  
- **Storage Costs**: ~$0.021/GB/month for storage
- **Bandwidth Costs**: ~$0.09/GB for downloads
- **Requires JavaScript**: Client-side generation needs JS enabled
- **Upload Delays**: Small delay for upload vs instant server generation

## Performance

### Client-Side
- **Screenshot**: ~200-500ms (existing functionality)
- **Upload**: ~1-3 seconds for 1MB image
- **Total Delay**: ~2-4 seconds additional on share

### Server-Side
- **Edge Function**: <50ms to return HTML with meta tags
- **Cache**: 1 hour cache on meta tags for performance

## Security Considerations

### Data Privacy
- Images contain word paths from user gameplay
- No personal information in images
- Auto-deletion after 7 days limits exposure

### Storage Security
- Public read access required for social media
- RLS prevents users from seeing others' upload records
- Rate limiting prevents abuse

### Network Security
- HTTPS for all uploads and downloads
- Supabase handles authentication and authorization
- No direct file system access

## Troubleshooting

### Upload Fails
1. Check network connectivity
2. Verify Supabase credentials
3. Check storage bucket permissions
4. Verify rate limit status

### Images Not Showing
1. Check preview parameter in URL
2. Verify storage bucket is public
3. Test image URL directly
4. Check social media crawler cache

### Rate Limits Hit
1. Wait for reset time
2. Check for unusual usage patterns  
3. Consider adjusting limits for premium users
4. Implement IP-based fallbacks

## Future Enhancements

### Possible Improvements
- **Premium User Benefits**: Higher upload limits, longer retention
- **Image Optimization**: WebP format, better compression
- **CDN Integration**: CloudFlare for faster global delivery
- **Analytics**: Track social media engagement
- **Bulk Cleanup**: Admin tools for storage management

### Monitoring Alerts
- High upload volume alerts
- Storage quota warnings
- Failed upload rate monitoring
- Cleanup queue backlog alerts 