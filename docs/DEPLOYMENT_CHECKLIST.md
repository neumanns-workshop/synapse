# 🚀 Synapse Production Deployment Checklist

> **⚠️ DEPRECATED**: This checklist was written for Vercel deployment. The project now uses **Netlify** for deployment.  
> **Please refer to `NETLIFY_DEPLOY.md` for current deployment instructions.**

## Overview

Complete checklist for deploying Synapse word navigation game to production at `synapsegame.ai` using Vercel.

---

## 📋 Phase 1: Prerequisites & Account Setup

### 1.1 Required Accounts

- [ ] **GitHub Account** - For code repository
- [ ] **Vercel Account** - For hosting and deployment
- [ ] **Domain Provider** - For synapsegame.ai domain (if not already owned)
- [ ] **hCaptcha Account** - For bot protection
- [ ] **Supabase Account** - For backend services (if using)
- [ ] **Stripe Account** - For payments (if premium features)

### 1.2 Development Environment Ready

- [ ] All tests passing (`npm test`)
- [ ] Web build working (`npm run build:web`)
- [ ] TypeScript compilation clean (`npx tsc --noEmit`)
- [ ] No critical linter errors (`npm run lint`)

---

## 📋 Phase 2: Environment Variables & Secrets Setup

### 2.1 hCaptcha Configuration

- [ ] Sign up at [hCaptcha.com](https://hcaptcha.com)
- [ ] Create new site for `synapsegame.ai`
- [ ] Get production site key
- [ ] Get secret key for server-side verification
- [ ] Test keys work with your domain

### 2.2 Supabase Production Setup

- [ ] Create production Supabase project (separate from dev)
- [ ] Configure production database schema
- [ ] Set up Row Level Security (RLS) policies
- [ ] Get production API keys
- [ ] Configure authentication providers
- [ ] Set up database backup schedule

### 2.3 Stripe Configuration (if using payments)

- [ ] Create production Stripe account
- [ ] Get production API keys
- [ ] Set up webhooks for production domain
- [ ] Configure products and pricing
- [ ] Test checkout flow in Stripe test mode first

### 2.4 Environment Variables List

Create production `.env` file with:

```bash
# Required for production
EXPO_PUBLIC_HCAPTCHA_SITE_KEY=your_production_hcaptcha_site_key
EXPO_PUBLIC_SUPABASE_URL=your_production_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_production_stripe_key
EXPO_PUBLIC_APP_ENV=production

# Server-side secrets (for API routes)
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Optional analytics/monitoring
VERCEL_ANALYTICS_ID=your_vercel_analytics_id
```

---

## 📋 Phase 3: GitHub Repository Setup

### 3.1 Repository Configuration

- [ ] Ensure code is in GitHub repository
- [ ] Repository is **private** (contains secrets in git history)
- [ ] Main branch is `main` or `master`
- [ ] All sensitive files in `.gitignore`
- [ ] Clean commit history (no exposed secrets)

### 3.2 Branch Protection (Recommended)

- [ ] Enable branch protection on main branch
- [ ] Require pull request reviews
- [ ] Require status checks to pass
- [ ] Enable "Delete head branch" auto-cleanup

### 3.3 Repository Secrets (if using GitHub Actions)

- [ ] Add all environment variables as repository secrets
- [ ] Test deployment workflow if configured

---

## 📋 Phase 4: Vercel Setup & Initial Deployment

### 4.1 Vercel Project Setup

- [ ] Sign up/login to [Vercel](https://vercel.com)
- [ ] Connect GitHub account to Vercel
- [ ] Import Synapse repository to Vercel
- [ ] Choose framework preset: **"Other"** (since it's Expo web)

### 4.2 Build Configuration

- [ ] Set **Build Command**: `npm run build:web`
- [ ] Set **Output Directory**: `web-build`
- [ ] Set **Install Command**: `npm install`
- [ ] Set **Development Command**: `npm start`

### 4.3 Environment Variables in Vercel

Add all production environment variables:

- [ ] Go to Project Settings → Environment Variables
- [ ] Add all variables from your production `.env`
- [ ] Set environment to **"Production"**
- [ ] **DO NOT** commit `.env` to repository

### 4.4 Initial Deployment Test

- [ ] Deploy from Vercel dashboard
- [ ] Check deployment logs for errors
- [ ] Test deployed app at vercel-generated URL
- [ ] Verify all features work (auth, captcha, payments)

---

## 📋 Phase 5: Domain Configuration

### 5.1 Domain Setup

- [ ] Purchase `synapsegame.ai` if not owned
- [ ] Add domain to Vercel project
- [ ] Configure DNS records at domain provider:
  ```
  Type: A     Name: @        Value: 76.76.19.61
  Type: AAAA  Name: @        Value: 2600:1f14:ab8:f500::61
  Type: CNAME Name: www      Value: cname.vercel-dns.com
  ```

### 5.2 SSL & Security

- [ ] Vercel automatically provisions SSL certificate
- [ ] Verify HTTPS works at `https://synapsegame.ai`
- [ ] Test www redirect: `https://www.synapsegame.ai`
- [ ] Check SSL rating at [SSL Labs](https://www.ssllabs.com/ssltest/)

### 5.3 Performance Optimization

- [ ] Enable Vercel Analytics in project settings
- [ ] Enable Vercel Speed Insights
- [ ] Configure caching headers in `vercel.json`
- [ ] Test site speed at [PageSpeed Insights](https://pagespeed.web.dev/)

---

## 📋 Phase 6: Production Testing & Validation

### 6.1 Functional Testing

- [ ] **Game Mechanics**: Test word navigation works
- [ ] **User Authentication**: Sign up/in/out flows
- [ ] **hCaptcha**: Bot protection triggers and works
- [ ] **Daily Challenges**: Load and play correctly
- [ ] **Premium Features**: Payments and upgrades work
- [ ] **Responsive Design**: Test on mobile/tablet/desktop
- [ ] **Browser Compatibility**: Test Chrome, Firefox, Safari, Edge

### 6.2 Performance Testing

- [ ] **Load Time**: First Contentful Paint < 2s
- [ ] **Bundle Size**: Check for reasonable bundle sizes
- [ ] **Memory Usage**: No memory leaks during gameplay
- [ ] **Network**: Test on slow connections

### 6.3 Security Testing

- [ ] **Anti-tampering**: Console warnings appear
- [ ] **Environment Variables**: No secrets exposed in client
- [ ] **HTTPS**: All requests are secure
- [ ] **Content Security Policy**: No XSS vulnerabilities

### 6.4 SEO & Meta Tags

- [ ] **Page Title**: Descriptive and includes keywords
- [ ] **Meta Description**: Compelling and under 160 characters
- [ ] **Open Graph**: Social sharing previews work
- [ ] **Favicon**: Displays correctly across devices
- [ ] **Robots.txt**: Allows indexing (if desired)

---

## 📋 Phase 7: Monitoring & Analytics Setup

### 7.1 Error Monitoring

- [ ] Set up error tracking (Sentry, LogRocket, or Vercel Analytics)
- [ ] Configure alert thresholds
- [ ] Test error reporting works

### 7.2 Analytics

- [ ] Set up Google Analytics or similar
- [ ] Configure conversion tracking
- [ ] Set up user flow analysis
- [ ] Monitor key metrics (DAU, session duration, conversion)

### 7.3 Uptime Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure downtime alerts
- [ ] Test notification system

---

## 📋 Phase 8: Launch Preparation

### 8.1 Pre-Launch Checklist

- [ ] **Backup Strategy**: Database and code backups configured
- [ ] **Rollback Plan**: Know how to quickly revert deployment
- [ ] **Support Process**: Customer support email/system ready
- [ ] **Documentation**: User guides and FAQ prepared
- [ ] **Legal**: Privacy policy and terms of service updated

### 8.2 Launch Day

- [ ] Final deployment to production
- [ ] Monitor error rates and performance
- [ ] Test critical user flows
- [ ] Check social media sharing works
- [ ] Announce launch on planned channels

---

## 📋 Phase 9: Post-Launch Operations

### 9.1 Daily Monitoring (First Week)

- [ ] Check error rates and logs
- [ ] Monitor user feedback
- [ ] Verify daily challenges load correctly
- [ ] Check payment processing
- [ ] Monitor site performance

### 9.2 Updates & Maintenance Process

#### For Code Updates:

1. [ ] Make changes in development branch
2. [ ] Test thoroughly locally
3. [ ] Create pull request
4. [ ] Deploy to preview environment (Vercel preview)
5. [ ] Test preview deployment
6. [ ] Merge to main branch
7. [ ] Automatic deployment to production
8. [ ] Monitor deployment success
9. [ ] Test production after deployment

#### For Content Updates (Daily Challenges):

1. [ ] Update challenge data files
2. [ ] Test in development
3. [ ] Deploy via same process above
4. [ ] Verify new challenges appear correctly

#### For Emergency Fixes:

1. [ ] Use Vercel's instant rollback feature
2. [ ] Or hotfix directly to main branch
3. [ ] Monitor fix deployment
4. [ ] Create post-incident review

---

## 📋 Phase 10: Scaling & Optimization

### 10.1 Performance Optimization

- [ ] Monitor Core Web Vitals monthly
- [ ] Optimize bundle sizes if needed
- [ ] Add service worker for caching
- [ ] Consider CDN for assets

### 10.2 Infrastructure Scaling

- [ ] Monitor Vercel usage and limits
- [ ] Scale Supabase plan if needed
- [ ] Consider edge functions for performance
- [ ] Monitor and optimize database queries

---

## 🆘 Emergency Procedures

### Deployment Rollback

```bash
# Via Vercel CLI
vercel --prod --rollback [DEPLOYMENT_URL]

# Or via Vercel Dashboard
# Go to Deployments → Select previous deployment → Promote to Production
```

### Environment Variable Updates

1. Update in Vercel Dashboard
2. Redeploy (automatic or manual trigger)
3. Verify changes took effect

### Domain Issues

- Check DNS propagation: `dig synapsegame.ai`
- Verify Vercel domain configuration
- Check SSL certificate status

---

## 📞 Support Contacts

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Domain Registrar**: [Contact info for your domain provider]
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **hCaptcha Support**: [hcaptcha.com/contact](https://hcaptcha.com/contact)

---

## ✅ Final Verification

After completing all steps:

- [ ] Site loads at `https://synapsegame.ai`
- [ ] All game features work correctly
- [ ] Payment processing functional
- [ ] Mobile experience optimized
- [ ] Error monitoring active
- [ ] Update process documented and tested
- [ ] Team trained on deployment procedures

---

_Last updated: [Current Date]_
_Review and update this checklist monthly_
