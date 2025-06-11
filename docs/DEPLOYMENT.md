# Deployment Guide for Synapse

This guide covers deploying Synapse to production environments including web, iOS App Store, and Google Play Store.

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g @expo/cli`)
- EAS CLI installed (`npm install -g eas-cli`)
- Configured Apple Developer account (for iOS)
- Configured Google Play Developer account (for Android)

## Environment Setup

### 1. Configure Environment Variables

Create production `.env` file:
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your-production-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-production-stripe-key

# Captcha
EXPO_PUBLIC_HCAPTCHA_SITE_KEY=your-production-hcaptcha-key

# App Configuration
EXPO_PUBLIC_APP_ENV=production
```

### 2. Update Configuration Files

Update `app.json` with production values:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

Update `eas.json` with your Apple/Google credentials.

## Web Deployment

### Build for Web
```bash
# Build optimized web bundle
npm run build:web
```

### Deploy to Hosting Provider

#### Netlify (Recommended)
```bash
# Build for production
npm run build:web

# Deploy using netlify.toml configuration
# See NETLIFY_DEPLOY.md for complete setup instructions
```

#### Custom Server
```bash
# Build and serve the web-build directory
npm run build:web
# Serve files from web-build/ with proper MIME types
```

#### Custom Server
```bash
# Build and serve the web-build directory
npm run build:web
# Serve files from web-build/ with proper MIME types
```

## Mobile App Deployment

### Initial Setup
```bash
# Login to Expo
eas login

# Configure the project
eas init
```

### iOS App Store

1. **Build for iOS**
```bash
npm run build:production
```

2. **Submit to App Store**
```bash
npm run submit:ios
```

3. **App Store Connect**
- Add app metadata, screenshots, and descriptions
- Set up pricing and availability
- Submit for review

### Google Play Store

1. **Build for Android**
```bash
npm run build:production
```

2. **Submit to Google Play**
```bash
npm run submit:android
```

3. **Google Play Console**
- Add store listing information
- Set up pricing and distribution
- Submit for review

## Over-the-Air Updates

### Publishing Updates
```bash
# Publish update to production
npm run update:production
```

### Update Policies
- Critical bug fixes: Immediate OTA update
- Feature updates: Next app store release
- Breaking changes: New app version required

## Pre-Release Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Bundle size analysis completed (`npm run analyze-bundle`)

### Functionality
- [ ] Authentication flow tested
- [ ] Payment integration verified
- [ ] Data sync working across devices
- [ ] Offline functionality tested
- [ ] Performance optimizations verified

### Compliance
- [ ] Privacy policy updated
- [ ] Terms of service current
- [ ] App store guidelines compliance
- [ ] Platform-specific requirements met

### Configuration
- [ ] Environment variables set
- [ ] API keys configured
- [ ] Error reporting enabled
- [ ] Analytics configured

## Post-Release Monitoring

### Metrics to Track
- App crashes and errors
- User engagement metrics
- Performance benchmarks
- Revenue and conversion rates

### Monitoring Tools
- Expo Insights for crash reporting
- Google Analytics for web
- Platform-specific analytics (App Store Connect, Google Play Console)

## Rollback Procedures

### Web Rollback
```bash
# Revert to previous deployment
# (depends on hosting provider)
```

### Mobile Rollback
```bash
# Publish previous version as OTA update
eas update --branch production --message "Rollback to previous version"
```

## Security Considerations

- Never commit sensitive keys to version control
- Use environment-specific configurations
- Regularly update dependencies
- Monitor for security vulnerabilities
- Implement proper error handling to avoid information leakage

## Support and Maintenance

- Monitor app store reviews and ratings
- Respond to user feedback promptly
- Plan regular updates and feature releases
- Maintain documentation and deployment procedures 