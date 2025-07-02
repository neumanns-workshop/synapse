#!/bin/bash

# Simple verification script for Synapse shortened URLs
# This checks what we can with CLI and guides you through manual verification

set -e

echo "🔧 Verifying Supabase setup for shortened URLs..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_manual() {
    echo -e "${YELLOW}📋 MANUAL CHECK: $1${NC}"
}

# Check if connected to Supabase
print_status "Checking Supabase connection..."
if ! supabase status > /dev/null 2>&1; then
    print_error "Not connected to Supabase. Run 'supabase link' first."
    exit 1
fi
print_success "Connected to Supabase"

# Get Supabase URL for testing
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
if [ -z "$SUPABASE_URL" ]; then
    print_error "Could not determine Supabase URL"
    exit 1
fi
print_success "Supabase URL: $SUPABASE_URL"

# Manual checks section
echo ""
echo "=================================================="
print_status "MANUAL VERIFICATION REQUIRED:"
echo "=================================================="

print_manual "1. Storage bucket 'preview-images'"
echo "   → Go to Supabase Dashboard > Storage"
echo "   → Check if 'preview-images' bucket exists"
echo "   → Verify bucket is PUBLIC (required for social media)"
echo ""

print_manual "2. Storage policies"
echo "   → In Storage > preview-images > Policies"
echo "   → Should have 'Allow uploads for all users' (INSERT)"
echo "   → Should have 'Allow public read access' (SELECT)"
echo ""

print_manual "3. Database tables (SQL Editor)"
echo "   → Go to Supabase Dashboard > SQL Editor"
echo "   → Run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('upload_rate_limits', 'image_cleanup_queue');"
echo "   → Should return both table names"
echo ""

print_manual "4. If tables missing, run migration:"
echo "   → Copy content from: database/preview-image-storage-migration.sql"
echo "   → Paste and run in SQL Editor"
echo ""

# Test storage URL format
TEST_STORAGE_URL="${SUPABASE_URL}/storage/v1/object/public/preview-images/anonymous/test123/test123.jpg"
print_status "Test storage URL format:"
echo "   $TEST_STORAGE_URL"

# Test with curl if available
if command -v curl > /dev/null 2>&1; then
    print_status "Testing storage access..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -I "$TEST_STORAGE_URL" || echo "000")
    if [ "$HTTP_STATUS" -eq "404" ]; then
        print_success "Storage access working (404 expected for non-existent file)"
    elif [ "$HTTP_STATUS" -eq "403" ]; then
        print_error "Storage access forbidden - check bucket is public and policies exist"
    else
        print_warning "Storage returned HTTP $HTTP_STATUS"
        echo "   • 404 = Good (file doesn't exist but access works)"
        echo "   • 403 = Bad (permissions issue)"
        echo "   • 200 = Unexpected (file shouldn't exist)"
    fi
else
    print_warning "curl not available, skipping HTTP test"
fi

# Check edge function configuration
print_status "Checking edge function configuration..."
EDGE_FUNCTION_FILE="netlify/edge-functions/challenge-preview.ts"
if [ -f "$EDGE_FUNCTION_FILE" ]; then
    EDGE_URL=$(grep -o 'https://[^"]*\.supabase\.co' "$EDGE_FUNCTION_FILE" | head -n 1)
    
    if [ "$EDGE_URL" = "${SUPABASE_URL}" ]; then
        print_success "Edge function URL matches Supabase URL"
    else
        print_warning "Edge function URL mismatch:"
        echo "  Edge function: $EDGE_URL"
        echo "  Supabase URL:  $SUPABASE_URL"
        print_manual "Update $EDGE_FUNCTION_FILE with correct URL"
    fi
else
    print_warning "Edge function file not found: $EDGE_FUNCTION_FILE"
fi

# Summary
echo ""
echo "=================================================="
print_status "QUICK SETUP GUIDE:"
echo "=================================================="

echo "🔧 Complete these steps in Supabase Dashboard:"
echo ""
echo "1. Storage > Create bucket 'preview-images' (public)"
echo "2. Storage > preview-images > Policies:"
echo "   • INSERT: Allow uploads for all users = true"
echo "   • SELECT: Allow public read access = true"
echo "3. SQL Editor > Run migration if tables missing"
echo ""

print_status "Test after setup:"
echo "1. Share a challenge from your app"
echo "2. URL should be ~100 chars (vs ~500+ before)"
echo "3. Shared link should show Synapse favicon"
echo "4. Preview should work or gracefully fallback"
echo ""

print_status "Files changed in this update:"
echo "✅ netlify/edge-functions/challenge-preview.ts (added favicon)"
echo "✅ src/services/SharingService.ts (hash-based filenames)"
echo "📋 database/preview-image-storage-migration.sql (run if needed)"
echo ""

print_success "Summary: URLs will be dramatically shorter and show proper branding!"
echo "💡 The game flow logic is unchanged - challenges start immediately" 