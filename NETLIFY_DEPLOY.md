# Netlify Deployment Guide

## Quick Deploy

This repository is configured for Netlify deployment with the included `netlify.toml` configuration.

## Required Environment Variables

Set these environment variables in your Netlify dashboard (Site settings > Environment variables):

### Required for Web App

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `EXPO_PUBLIC_HCAPTCHA_SITE_KEY` - Your hCaptcha site key
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (pk*live* or pk*test*)
- `NODE_ENV` - Set to `production`

### Optional for Analytics

- `EXPO_PUBLIC_ANALYZE_BUNDLE` - Set to `true` to enable bundle analysis

## Build Configuration

- **Build command**: `npm run build:web`
- **Publish directory**: `web-build`
- **Node version**: 18 (configured in netlify.toml)

## Features Included

- SPA routing with client-side navigation
- Security headers (XSS protection, frame options, etc.)
- Optimized caching for static assets
- Automatic redirects for all app routes
- robots.txt and sitemap.xml support

## One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/synapse)

## Manual Deploy Steps

1. Fork this repository
2. Connect your Netlify account to GitHub
3. Create a new site from your forked repository
4. Set the environment variables listed above
5. Deploy!

The site will automatically rebuild when you push changes to your main branch.
