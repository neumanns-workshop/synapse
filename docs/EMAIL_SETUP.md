# Email Setup for Synapse Game

## Overview

Synapse uses **Resend** for email delivery with **synapsegame.ai** as the primary domain. We have three distinct email addresses for different purposes:

- **`noreply@synapsegame.ai`** - Transactional emails (auth, system)
- **`news@synapsegame.ai`** - Marketing emails (newsletters, updates)
- **`support@synapsegame.ai`** - Customer support emails

## 1. Resend Setup

### Create Account

1. Sign up at [resend.com](https://resend.com)
2. Verify your account

### Add Domain

1. Go to **Domains** in Resend dashboard
2. Add **synapsegame.ai** as your domain
3. Get the DNS records to add to Cloudflare

## 2. Cloudflare DNS Configuration

Add these DNS records in your **synapsegame.ai** Cloudflare account:

### MX Record

- **Name**: `send`
- **Content**: `feedback-smtp.us-east-1.amazonses.com`
- **Priority**: `10`
- **TTL**: Auto

### TXT Records

```
Name: send
Content: v=spf1 include:amazonses.com ~all

Name: resend._domainkey
Content: p=MIGfMA0GCSqGSIb3DQEBAQUAA... (from Resend dashboard)

Name: _dmarc
Content: v=DMARC1; p=none;
```

## 3. Environment Variables

Add these to your environment configuration:

```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_NOREPLY_EMAIL=noreply@synapsegame.ai
RESEND_NEWS_EMAIL=news@synapsegame.ai
RESEND_SUPPORT_EMAIL=support@synapsegame.ai
```

## 4. Supabase Configuration

### SMTP Settings

In your Supabase project settings → Authentication:

- **Enable custom SMTP**: ✅
- **Host**: `smtp.resend.com`
- **Port**: `587`
- **Username**: `resend`
- **Password**: `YOUR_RESEND_API_KEY`
- **Sender email**: `noreply@synapsegame.ai`
- **Sender name**: `Synapse`

## 5. Email Types & Usage

### Transactional Emails (`noreply@synapsegame.ai`)

- Sign up verification
- Password reset
- Email change confirmation
- Account security notifications

**Handled by**: Supabase Auth automatically

### Marketing Emails (`news@synapsegame.ai`)

- Welcome emails for new users
- Premium welcome emails
- Game updates and newsletters
- Feature announcements

**Handled by**: `EmailService.sendWelcomeEmail()`, `EmailService.sendPremiumWelcomeEmail()`

**Legal Requirement**: Users must opt-in to "news and updates" consent

### Support Emails (`support@synapsegame.ai`)

- Customer support responses
- Bug report acknowledgments
- Premium subscription help

**Handled by**: `EmailService.sendSupportEmail()`

## 6. Testing

### Test Auth Emails

```bash
node scripts/test-email.js
```

### Test Custom Emails

```javascript
import EmailService from "../src/services/EmailService";

const emailService = EmailService.getInstance();

// Test welcome email
await emailService.sendWelcomeEmail("user@example.com", {
  name: "Test User",
  appUrl: "https://synapsegame.ai",
});

// Test support email
await emailService.sendSupportEmail(
  "user@example.com",
  "Thanks for contacting support",
  "<h1>We received your message</h1>",
  "We received your message",
);
```

## 7. Legal Compliance

### Email Consent Tracking

- Users must consent to receive marketing emails (`news@synapsegame.ai`)
- Transactional emails (`noreply@synapsegame.ai`) don't require consent
- Support emails (`support@synapsegame.ai`) are contextual responses

### Unsubscribe Requirements

- Marketing emails must include unsubscribe links
- Update `EmailService` templates to include unsubscribe URLs
- Implement unsubscribe endpoint in your app

### Email Templates

All email templates include:

- Professional branding
- Clear sender identification
- Unsubscribe information
- Contact information
- Legal disclaimers

## 8. Monitoring

### Resend Dashboard

- Monitor delivery rates
- Track bounces and complaints
- View sending statistics

### Supabase Auth Logs

- Check authentication email logs
- Monitor failed deliveries
- Debug SMTP connection issues

## 9. Free Tier Limits

**Resend Free Tier**:

- 100 emails per day
- 3,000 emails per month
- Perfect for early-stage app

**Upgrade triggers**:

- Upgrade to Pro ($20/month) when hitting limits
- Monitor usage in Resend dashboard

## 10. Troubleshooting

### Common Issues

**"SMTP connection failed"**

- Check Supabase SMTP settings
- Verify Resend API key is correct
- Ensure DNS records are propagated

**"Domain not verified"**

- Check Cloudflare DNS records
- Wait up to 48 hours for propagation
- Use DNS propagation checker tools

**"Emails not being sent"**

- Check Resend dashboard for errors
- Verify API key in environment variables
- Test with `scripts/test-email.js`

### Support

- **Resend**: [resend.com/docs](https://resend.com/docs)
- **Supabase Auth**: [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
