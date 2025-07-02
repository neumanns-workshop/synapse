-- Monitor Preview Image System Health
-- Run this in Supabase SQL Editor to check system status

-- 1. Current system statistics
SELECT 
    'Rate Limit Records (Last Hour)' as metric,
    COUNT(*) as value,
    'records' as unit
FROM upload_rate_limits
WHERE created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'Rate Limit Records (Last 24h)' as metric,
    COUNT(*) as value,
    'records' as unit
FROM upload_rate_limits
WHERE created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Cleanup Queue (Pending)' as metric,
    COUNT(*) as value,
    'records' as unit
FROM image_cleanup_queue
WHERE NOT processed

UNION ALL

SELECT 
    'Cleanup Queue (Expired)' as metric,
    COUNT(*) as value,
    'records' as unit
FROM image_cleanup_queue
WHERE expires_at <= NOW() AND NOT processed

UNION ALL

SELECT 
    'Storage Bucket Usage' as metric,
    COUNT(DISTINCT filename) as value,
    'files' as unit
FROM image_cleanup_queue

ORDER BY metric;

-- 2. Recent upload activity by user
SELECT 
    user_id,
    COUNT(*) as uploads_last_hour,
    MAX(created_at) as last_upload,
    CASE 
        WHEN COUNT(*) >= 10 THEN 'RATE LIMITED'
        WHEN COUNT(*) >= 7 THEN 'HIGH USAGE'
        ELSE 'NORMAL'
    END as status
FROM upload_rate_limits
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
ORDER BY uploads_last_hour DESC
LIMIT 20;

-- 3. Error patterns (if error logging is enabled)
SELECT 
    error_type,
    COUNT(*) as error_count,
    MAX(created_at) as last_occurrence,
    string_agg(DISTINCT error_message, '; ' ORDER BY error_message) as sample_messages
FROM upload_error_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY error_count DESC;

-- 4. Cleanup queue health
SELECT 
    CASE 
        WHEN expires_at <= NOW() AND NOT processed THEN 'Expired (Needs Cleanup)'
        WHEN expires_at > NOW() AND NOT processed THEN 'Active'
        WHEN processed THEN 'Processed'
    END as status,
    COUNT(*) as count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM image_cleanup_queue
GROUP BY status
ORDER BY status;

-- 5. Performance check - recent query times
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM upload_rate_limits 
WHERE user_id = 'test-user' 
AND created_at >= NOW() - INTERVAL '1 hour';

-- 6. Storage bucket size estimation (if accessible)
SELECT 
    'Estimated Storage Usage' as metric,
    pg_size_pretty(COUNT(*) * 50000) as estimated_size, -- Assuming avg 50KB per image
    COUNT(*) as total_files
FROM image_cleanup_queue
WHERE NOT processed;

-- 7. Recommendations based on current state
WITH stats AS (
    SELECT 
        (SELECT COUNT(*) FROM upload_rate_limits WHERE created_at >= NOW() - INTERVAL '1 hour') as recent_uploads,
        (SELECT COUNT(*) FROM image_cleanup_queue WHERE expires_at <= NOW() AND NOT processed) as expired_images,
        (SELECT COUNT(*) FROM upload_rate_limits WHERE created_at < NOW() - INTERVAL '24 hours') as old_rate_limits
)
SELECT 
    CASE 
        WHEN recent_uploads > 100 THEN 'HIGH TRAFFIC: Monitor for performance issues'
        WHEN expired_images > 50 THEN 'ACTION NEEDED: Run image cleanup'
        WHEN old_rate_limits > 1000 THEN 'ACTION NEEDED: Clean up old rate limit records'
        ELSE 'SYSTEM HEALTHY'
    END as recommendation,
    recent_uploads,
    expired_images,
    old_rate_limits
FROM stats; 