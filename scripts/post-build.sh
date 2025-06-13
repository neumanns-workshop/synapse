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

# Copy Open Graph image
if [ -f "public/og-image.png" ]; then
    cp public/og-image.png web-build/
    echo "✅ Copied og-image.png"
fi

# Copy favicon files
if [ -f "public/favicon.ico" ]; then
    cp public/favicon.ico web-build/
    echo "✅ Copied favicon.ico"
fi

if [ -f "public/favicon.png" ]; then
    cp public/favicon.png web-build/
    echo "✅ Copied favicon.png"
fi

if [ -f "public/favicon.svg" ]; then
    cp public/favicon.svg web-build/
    echo "✅ Copied favicon.svg"
fi

echo "✅ Post-build script completed" 