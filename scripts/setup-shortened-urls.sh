#!/bin/bash

# Setup script for Synapse shortened URLs
# Verifies and configures Supabase for the new hash-based preview system

set -e  # Exit on any error

echo "🔧 Setting up Supabase for shortened URLs..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if connected to Supabase
print_status "Checking Supabase connection..."
if ! supabase status > /dev/null 2>&1; then
    print_error "Not connected to Supabase. Run 'supabase link' first."
    exit 1
fi
print_success "Connected to Supabase"

# 1. Check and create storage bucket
print_status "Checking storage bucket 'preview-images'..."

# Check if bucket exists using SQL query
BUCKET_EXISTS=$(supabase db query --sql "SELECT COUNT(*) FROM storage.buckets WHERE id = 'preview-images';" --format csv | tail -n 1)

if [ "$BUCKET_EXISTS" -eq "0" ]; then
    print_warning "Storage bucket 'preview-images' does not exist. Creating..."
    
    # Create bucket via SQL since CLI doesn't have direct bucket creation
    supabase db query --sql "
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'preview-images', 
        'preview-images', 
        true, 
        5242880, 
        array['image/jpeg', 'image/jpg']
    );
    "
    print_success "Created storage bucket 'preview-images'"
else
    print_success "Storage bucket 'preview-images' already exists"
fi

# 2. Check and create storage policies
print_status "Checking storage policies..."

UPLOAD_POLICY_EXISTS=$(supabase db query --sql "SELECT COUNT(*) FROM storage.policies WHERE bucket_id = 'preview-images' AND name = 'Allow uploads for all users';" --format csv | tail -n 1)

if [ "$UPLOAD_POLICY_EXISTS" -eq "0" ]; then
    print_warning "Upload policy missing. Creating..."
    supabase db query --sql "
    INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) 
    VALUES ('Allow uploads for all users', 'preview-images', 'upload', 'permissive', 'true');
    "
    print_success "Created upload policy"
else
    print_success "Upload policy already exists"
fi

READ_POLICY_EXISTS=$(supabase db query --sql "SELECT COUNT(*) FROM storage.policies WHERE bucket_id = 'preview-images' AND name = 'Allow public read access';" --format csv | tail -n 1)

if [ "$READ_POLICY_EXISTS" -eq "0" ]; then
    print_warning "Read policy missing. Creating..."
    supabase db query --sql "
    INSERT INTO storage.policies (name, bucket_id, policy, policy_type, definition) 
    VALUES ('Allow public read access', 'preview-images', 'select', 'permissive', 'true');
    "
    print_success "Created read policy"
else
    print_success "Read policy already exists"
fi

# 3. Check and create database tables
print_status "Checking required database tables..."

RATE_LIMITS_EXISTS=$(supabase db query --sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'upload_rate_limits';" --format csv | tail -n 1)

CLEANUP_QUEUE_EXISTS=$(supabase db query --sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'image_cleanup_queue';" --format csv | tail -n 1)

if [ "$RATE_LIMITS_EXISTS" -eq "0" ] || [ "$CLEANUP_QUEUE_EXISTS" -eq "0" ]; then
    print_warning "Database tables missing. Running migration..."
    
    if [ -f "database/preview-image-storage-migration.sql" ]; then
        supabase db query --file database/preview-image-storage-migration.sql
        print_success "Database migration completed"
    else
        print_error "Migration file not found: database/preview-image-storage-migration.sql"
        exit 1
    fi
else
    print_success "Required database tables exist"
fi

# 4. Verify bucket is public
print_status "Verifying bucket public access..."
BUCKET_PUBLIC=$(supabase db query --sql "SELECT public FROM storage.buckets WHERE id = 'preview-images';" --format csv | tail -n 1)

if [ "$BUCKET_PUBLIC" != "t" ]; then
    print_warning "Bucket is not public. Making public..."
    supabase db query --sql "UPDATE storage.buckets SET public = true WHERE id = 'preview-images';"
    print_success "Bucket made public"
else
    print_success "Bucket is public"
fi

# 5. Test the setup
print_status "Testing the setup..."

# Get Supabase URL for testing
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')

if [ -z "$SUPABASE_URL" ]; then
    print_error "Could not determine Supabase URL"
    exit 1
fi

print_success "Supabase URL: $SUPABASE_URL"

# Test storage URL format
TEST_STORAGE_URL="${SUPABASE_URL}/storage/v1/object/public/preview-images/anonymous/test123/test123.jpg"
print_status "Test storage URL: $TEST_STORAGE_URL"

# Test with curl if available
if command -v curl > /dev/null 2>&1; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -I "$TEST_STORAGE_URL" || echo "000")
    if [ "$HTTP_STATUS" -eq "404" ]; then
        print_success "Storage access working (404 expected for non-existent file)"
    elif [ "$HTTP_STATUS" -eq "403" ]; then
        print_error "Storage access forbidden (check policies)"
    else
        print_warning "Storage returned HTTP $HTTP_STATUS (may be OK)"
    fi
else
    print_warning "curl not available, skipping HTTP test"
fi

# 6. Check if Supabase URL matches edge function
print_status "Checking edge function configuration..."

EDGE_FUNCTION_FILE="netlify/edge-functions/challenge-preview.ts"
if [ -f "$EDGE_FUNCTION_FILE" ]; then
    # Extract URL from edge function
    EDGE_URL=$(grep -o 'https://[^"]*\.supabase\.co' "$EDGE_FUNCTION_FILE" | head -n 1)
    
    if [ "$EDGE_URL" = "${SUPABASE_URL}" ]; then
        print_success "Edge function URL matches Supabase URL"
    else
        print_warning "Edge function URL mismatch:"
        echo "  Edge function: $EDGE_URL"
        echo "  Supabase URL:  $SUPABASE_URL"
        echo "  You may need to update $EDGE_FUNCTION_FILE"
    fi
else
    print_warning "Edge function file not found: $EDGE_FUNCTION_FILE"
fi

# 7. Summary
echo ""
echo "=================================================="
print_success "Setup completed! Summary:"
echo "✅ Storage bucket 'preview-images' configured"
echo "✅ Storage policies for uploads and public access"
echo "✅ Database tables for rate limiting and cleanup"
echo "✅ Bucket is public for social media access"
echo ""
print_status "Next steps:"
echo "1. Deploy your changes to Netlify"
echo "2. Test challenge sharing to verify short URLs"
echo "3. Check shared links show favicon and preview images"
echo ""
print_status "Expected results:"
echo "• URLs shortened from ~500 to ~100 characters"
echo "• Shared links show Synapse favicon"
echo "• Preview images work or gracefully fallback"
echo "• Game flow unchanged - challenges start immediately"
echo ""
echo "🎉 Ready for release!" 