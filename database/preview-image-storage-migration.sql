-- Migration: Preview Image Storage System
-- This migration sets up tables for client-side image upload with spam protection
-- Run this in Supabase SQL Editor

-- Create storage bucket for preview images (if not exists)
-- This should be run in the Supabase dashboard or via the JavaScript client
-- INSERT INTO storage.buckets (id, name, public) VALUES ('preview-images', 'preview-images', true);

-- Create table for upload rate limiting
CREATE TABLE IF NOT EXISTS upload_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL, -- Can be actual user ID or "anonymous" for unauthenticated users
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET, -- Optional: track by IP for additional protection
    user_agent TEXT -- Optional: track user agent for bot detection
);

-- Create index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_user_time 
ON upload_rate_limits (user_id, created_at DESC);

-- Create index for IP-based rate limiting (optional)
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_ip_time 
ON upload_rate_limits (ip_address, created_at DESC);

-- Create table for image cleanup scheduling
CREATE TABLE IF NOT EXISTS image_cleanup_queue (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE, -- Storage path: user_id/challenge_id/timestamp.jpg
    expires_at TIMESTAMPTZ NOT NULL, -- When to delete the image
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE, -- Whether cleanup has been processed
    processed_at TIMESTAMPTZ -- When cleanup was processed
);

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_image_cleanup_expires 
ON image_cleanup_queue (expires_at) WHERE NOT processed;

-- Create index for processed status
CREATE INDEX IF NOT EXISTS idx_image_cleanup_processed 
ON image_cleanup_queue (processed, expires_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on rate limiting table
ALTER TABLE upload_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits" ON upload_rate_limits
    FOR SELECT USING (
        user_id = COALESCE(auth.uid()::text, 'anonymous')
    );

-- Policy: Users can insert their own rate limit records
CREATE POLICY "Users can insert own rate limits" ON upload_rate_limits
    FOR INSERT WITH CHECK (
        user_id = COALESCE(auth.uid()::text, 'anonymous')
    );

-- Policy: No updates or deletes by users (only system cleanup)
CREATE POLICY "No user updates on rate limits" ON upload_rate_limits
    FOR UPDATE USING (false);

CREATE POLICY "No user deletes on rate limits" ON upload_rate_limits
    FOR DELETE USING (false);

-- Enable RLS on cleanup queue table
ALTER TABLE image_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see cleanup records for their own images
CREATE POLICY "Users can view own cleanup records" ON image_cleanup_queue
    FOR SELECT USING (
        filename LIKE (COALESCE(auth.uid()::text, 'anonymous') || '/%')
    );

-- Policy: Users can insert cleanup records for their own images
CREATE POLICY "Users can insert own cleanup records" ON image_cleanup_queue
    FOR INSERT WITH CHECK (
        filename LIKE (COALESCE(auth.uid()::text, 'anonymous') || '/%')
    );

-- Policy: No updates or deletes by users (only system)
CREATE POLICY "No user updates on cleanup queue" ON image_cleanup_queue
    FOR UPDATE USING (false);

CREATE POLICY "No user deletes on cleanup queue" ON image_cleanup_queue
    FOR DELETE USING (false);

-- Function to cleanup expired rate limit records (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete rate limit records older than 24 hours
    DELETE FROM upload_rate_limits 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Log cleanup
    RAISE NOTICE 'Cleaned up expired rate limit records';
END;
$$;

-- Function to process image cleanup queue (run via cron)
CREATE OR REPLACE FUNCTION process_image_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    -- Process expired images
    FOR cleanup_record IN 
        SELECT id, filename 
        FROM image_cleanup_queue 
        WHERE expires_at <= NOW() 
        AND NOT processed 
        ORDER BY expires_at 
        LIMIT 100 -- Process in batches
    LOOP
        -- Delete from storage (this would be done via Edge Function or client)
        -- For now, just mark as processed
        UPDATE image_cleanup_queue 
        SET processed = true, processed_at = NOW()
        WHERE id = cleanup_record.id;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    -- Clean up old processed records (older than 30 days)
    DELETE FROM image_cleanup_queue 
    WHERE processed = true 
    AND processed_at < NOW() - INTERVAL '30 days';
    
    -- Log cleanup
    RAISE NOTICE 'Processed % image cleanup records', deleted_count;
END;
$$;

-- Storage bucket policies (to be applied in Supabase dashboard)
-- Note: These need to be created via the Supabase dashboard or storage API

/*
-- Bucket policy for preview-images bucket:
-- Allow uploads for authenticated and anonymous users with file size limits
-- Allow public read access for social media crawlers

INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) VALUES
(
    'Allow uploads for all users',
    'preview-images',
    'upload',
    'permissive',
    'true' -- Allow all uploads (size limits handled in client code)
),
(
    'Allow public read access',
    'preview-images', 
    'select',
    'permissive',
    'true' -- Allow public read access for social media
);
*/

-- Create a function to get upload stats (for monitoring)
CREATE OR REPLACE FUNCTION get_upload_stats(time_window INTERVAL DEFAULT '1 hour')
RETURNS TABLE (
    time_period TEXT,
    total_uploads BIGINT,
    unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        time_window::TEXT as time_period,
        COUNT(*) as total_uploads,
        COUNT(DISTINCT user_id) as unique_users
    FROM upload_rate_limits 
    WHERE created_at >= NOW() - time_window;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE upload_rate_limits IS 'Tracks image uploads for rate limiting (10 uploads per hour per user)';
COMMENT ON TABLE image_cleanup_queue IS 'Schedules automatic deletion of preview images after 7 days';
COMMENT ON FUNCTION cleanup_expired_rate_limits() IS 'Cleanup function to run daily via cron';
COMMENT ON FUNCTION process_image_cleanup() IS 'Cleanup function to run hourly via cron for image deletion';
COMMENT ON FUNCTION get_upload_stats(INTERVAL) IS 'Get upload statistics for monitoring';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON upload_rate_limits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_queue_expires_at ON image_cleanup_queue (expires_at) WHERE NOT processed;

COMMIT; 