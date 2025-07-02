-- Fix Preview Image Issues in Production
-- Run this in Supabase SQL Editor to resolve current problems

-- 1. Clean up old rate limit records (older than 24 hours)
DELETE FROM upload_rate_limits 
WHERE created_at < NOW() - INTERVAL '24 hours';

-- 2. Clean up old image cleanup queue records
DELETE FROM image_cleanup_queue 
WHERE processed = true 
AND processed_at < NOW() - INTERVAL '30 days';

-- 3. Remove duplicate/conflicting cleanup queue entries
DELETE FROM image_cleanup_queue a 
WHERE a.id NOT IN (
    SELECT MIN(b.id) 
    FROM image_cleanup_queue b 
    WHERE a.filename = b.filename
);

-- 4. Add missing indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_rate_limits_user_id_created_at 
ON upload_rate_limits (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_cleanup_queue_filename_processed 
ON image_cleanup_queue (filename, processed);

-- 5. Optimize the rate limit check with a more efficient function
CREATE OR REPLACE FUNCTION check_upload_rate_limit(p_user_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    upload_count BIGINT,
    allowed BOOLEAN,
    oldest_upload TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    one_hour_ago TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
BEGIN
    SELECT 
        COUNT(*) as count,
        MIN(created_at) as oldest
    INTO 
        upload_count, 
        oldest_upload
    FROM upload_rate_limits 
    WHERE user_id = p_user_id 
    AND created_at >= one_hour_ago;
    
    allowed := upload_count < p_limit;
    
    RETURN NEXT;
END;
$$;

-- 6. Add monitoring view for upload statistics
CREATE OR REPLACE VIEW upload_stats AS
SELECT 
    user_id,
    COUNT(*) as total_uploads,
    MIN(created_at) as first_upload,
    MAX(created_at) as last_upload,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM upload_rate_limits
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id, DATE_TRUNC('hour', created_at)
ORDER BY last_upload DESC;

-- 7. Create a function to clean up expired images from storage
-- (This would need to be called by a cron job or edge function)
CREATE OR REPLACE FUNCTION get_expired_images(batch_size INTEGER DEFAULT 100)
RETURNS TABLE (
    id BIGINT,
    filename TEXT,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        iq.id,
        iq.filename,
        iq.expires_at
    FROM image_cleanup_queue iq
    WHERE iq.expires_at <= NOW()
    AND NOT iq.processed
    ORDER BY iq.expires_at
    LIMIT batch_size;
END;
$$;

-- 8. Add better error logging table
CREATE TABLE IF NOT EXISTS upload_error_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    error_type TEXT NOT NULL, -- 'rate_limit', 'storage_timeout', 'cleanup_conflict', etc.
    error_message TEXT,
    context JSONB, -- Additional error context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for error logs
CREATE INDEX IF NOT EXISTS idx_upload_error_logs_type_time 
ON upload_error_logs (error_type, created_at DESC);

-- RLS for error logs
ALTER TABLE upload_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can insert error logs" ON upload_error_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view error logs" ON upload_error_logs
    FOR SELECT USING (false); -- Only allow via service role

-- 9. Analyze tables for better query planning
ANALYZE upload_rate_limits;
ANALYZE image_cleanup_queue;

-- 10. Check current statistics
SELECT 
    'Rate Limit Records' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as recent_records
FROM upload_rate_limits
UNION ALL
SELECT 
    'Cleanup Queue Records' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE NOT processed) as pending_records
FROM image_cleanup_queue;

COMMIT; 