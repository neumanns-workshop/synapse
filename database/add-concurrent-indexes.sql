-- Add Concurrent Indexes for Better Performance
-- Run these ONE AT A TIME in Supabase SQL Editor (not as a transaction)
-- Wait for each to complete before running the next

-- Index 1: Optimize rate limit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_rate_limits_user_time_concurrent 
ON upload_rate_limits (user_id, created_at DESC);

-- Index 2: Optimize cleanup queue queries  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_cleanup_queue_expires_processed 
ON image_cleanup_queue (expires_at, processed) WHERE NOT processed;

-- Index 3: Optimize error log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_error_logs_user_time 
ON upload_error_logs (user_id, created_at DESC);

-- After all indexes are created, analyze the tables
ANALYZE upload_rate_limits;
ANALYZE image_cleanup_queue;
ANALYZE upload_error_logs; 