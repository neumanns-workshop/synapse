#!/bin/bash

# Post-build script for Synapse web deployment
# This script copies necessary static files to the web-build directory

echo "Running post-build script..."

# Copy static files from public directory to web-build
if [ -f "public/robots.txt" ]; then
    cp public/robots.txt web-build/
    echo "✅ Copied robots.txt"
fi

if [ -f "public/sitemap.xml" ]; then
    cp public/sitemap.xml web-build/
    echo "✅ Copied sitemap.xml"
fi

echo "✅ Post-build script completed" 