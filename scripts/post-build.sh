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

# Inject Open Graph and Twitter Card meta tags into index.html
if [ -f "web-build/index.html" ]; then
    # Create the meta tags to inject
    META_TAGS='<meta property="og:title" content="Synapse: Semantic Pathways"/><meta property="og:description" content="Navigate between words through semantic connections. Find the shortest path from start to target by choosing related words. Daily AI challenges and friend competitions!"/><meta property="og:type" content="website"/><meta property="og:image" content="https://synapsegame.ai/og-image.png"/><meta property="og:image:width" content="512"/><meta property="og:image:height" content="512"/><meta property="og:image:alt" content="Synapse Game Logo"/><meta property="og:url" content="https://synapsegame.ai"/><meta property="og:site_name" content="Synapse Game"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Synapse: Semantic Pathways"/><meta name="twitter:description" content="Navigate between words through semantic connections. Find the shortest path from start to target by choosing related words. Daily AI challenges and friend competitions!"/><meta name="twitter:image" content="https://synapsegame.ai/og-image.png"/><meta name="twitter:image:alt" content="Synapse Game Logo"/>'
    
    # Insert meta tags before the closing </head> tag
    sed -i.bak "s|</head>|$META_TAGS</head>|" web-build/index.html
    rm web-build/index.html.bak
    echo "✅ Injected Open Graph and Twitter Card meta tags"
fi

echo "✅ Post-build script completed" 