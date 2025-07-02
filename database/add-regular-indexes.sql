-- Add Regular Indexes for Better Performance
-- Run this entire script in Supabase SQL Editor

-- These regular indexes will work fine since your tables are still small
-- They'll create quickly without the CONCURRENTLY restrictions

-- Index 1: Optimize rate limit queries
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_user_time_v2
ON upload_rate_limits (user_id, created_at DESC);

-- Index 2: Optimize cleanup queue queries  
CREATE INDEX IF NOT EXISTS idx_image_cleanup_expires_v2
ON image_cleanup_queue (expires_at) WHERE NOT processed;

-- Index 3: Optimize error log queries (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'upload_error_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_upload_error_logs_user_time_v2
        ON upload_error_logs (user_id, created_at DESC);
    END IF;
END $$;

-- Update table statistics
ANALYZE upload_rate_limits;
ANALYZE image_cleanup_queue;

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('upload_rate_limits', 'image_cleanup_queue', 'upload_error_logs')
AND indexname LIKE '%_v2'
ORDER BY tablename, indexname; 