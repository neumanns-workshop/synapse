# Promo Code Implementation for Synapse

## 🎯 **GOAL: PERMANENT PREMIUM ACCOUNTS VIA PROMO CODES**

Create a promo code system that grants **permanent premium access** - just like purchasing, but triggered by codes instead of payment. Perfect for beta testers, marketing campaigns, and grandfathering early supporters.

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Current Flow:**
```
User → Stripe Payment → Webhook → Premium Account Created
```

### **New Promo Flow:**
```
User → Promo Code → Direct Account Creation → Premium Account Created
```

**Same end result: Permanent premium account with full cloud sync, unlimited games, etc.**

---

## 📋 **PHASE 1: IMMEDIATE BETA TESTING (This Weekend)**

### **Quick Implementation for Soft Launch**

#### **1. Add Promo Code Field to Upgrade Prompt**
```typescript
// In UpgradePrompt.tsx
const [showPromoField, setShowPromoField] = useState(false);
const [promoCode, setPromoCode] = useState('');
const [isApplyingPromo, setIsApplyingPromo] = useState(false);

// Hardcoded beta codes for immediate testing
// These codes expire June 30, 2025 but grant PERMANENT premium access
const BETA_CODES = [
  'SYNAPSE2024',    // General beta access
  'BETATESTER',     // Core beta testers
  'EARLYBIRD',      // Early supporters
  'FOUNDER001',     // Individual founder codes
  'FOUNDER002',
  'FOUNDER003',
  // ... up to FOUNDER050
];

// Beta expiration check
const BETA_EXPIRY = new Date('2025-06-30T23:59:59Z');
const isBetaExpired = () => new Date() > BETA_EXPIRY;

const handlePromoCode = async () => {
  const code = promoCode.toUpperCase().trim();
  
  // Check if beta period has expired (codes no longer work after June 30, 2025)
  if (isBetaExpired()) {
    Alert.alert(
      'Beta Period Ended', 
      'The beta testing period has ended. Please purchase premium access to continue.'
    );
    return;
  }
  
  if (!BETA_CODES.includes(code)) {
    Alert.alert('Invalid Code', 'Please check your promo code and try again.');
    return;
  }

  setIsApplyingPromo(true);
  try {
    // Reuse existing account creation flow, but skip Stripe
    const result = await stripeService.createPromoAccount({
      email,
      password,
      emailUpdatesOptIn,
      promoCode: promoCode.toUpperCase()
    });

    if (result.success) {
      Alert.alert(
        'Welcome to Premium!', 
        'Your promo code has been applied. You now have permanent premium access!'
      );
      onDismiss();
    } else {
      Alert.alert('Error', result.error || 'Failed to apply promo code');
    }
  } catch (error) {
    Alert.alert('Error', 'Something went wrong. Please try again.');
  } finally {
    setIsApplyingPromo(false);
  }
};
```

#### **2. Add UI to Upgrade Prompt**
```typescript
// Add this to the UpgradePrompt render method
<View style={styles.promoSection}>
  <TouchableOpacity 
    onPress={() => setShowPromoField(!showPromoField)}
    style={styles.promoToggle}
  >
    <Text style={[styles.promoToggleText, { color: colors.primary }]}>
      Have a promo code?
    </Text>
  </TouchableOpacity>

  {showPromoField && (
    <View style={styles.promoInputContainer}>
      <TextInput
        value={promoCode}
        onChangeText={setPromoCode}
        placeholder="Enter promo code"
        style={[styles.promoInput, { 
          borderColor: colors.outline,
          backgroundColor: colors.surface 
        }]}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Button
        mode="outlined"
        onPress={handlePromoCode}
        disabled={!promoCode.trim() || isApplyingPromo}
        loading={isApplyingPromo}
        style={styles.promoButton}
      >
        Apply Code
      </Button>
    </View>
  )}
</View>
```

#### **3. Extend StripeService for Promo Accounts**
```typescript
// In StripeService.ts
public async createPromoAccount(signupData: {
  email: string;
  password: string;
  emailUpdatesOptIn: boolean;
  promoCode: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Create anonymous user first (same as Stripe flow)
    const { data: anonSessionData, error: anonError } =
      await this.supabaseService.signInAnonymously();

    if (anonError || !anonSessionData?.user?.id) {
      throw new Error('Failed to create temporary session');
    }

    const anonymousUserId = anonSessionData.user.id;
    const anonymousUserJwt = anonSessionData.session.access_token;

    // Store conversion details (same as Stripe flow)
    await this.unifiedStore.storePendingConversionDetails(anonymousUserId, {
      email: signupData.email,
      password: signupData.password,
      emailUpdatesOptIn: signupData.emailUpdatesOptIn,
      anonymousUserJwt: anonymousUserJwt,
      promoCode: signupData.promoCode, // Track which code was used
    });

    // Grant premium immediately (optimistic)
    await this.unifiedStore.setPremiumStatus(true);

    // Create premium profile with promo metadata
    const profileResult = await this.supabaseService.createPromoProfile(
      anonymousUserId,
      signupData.email,
      signupData.promoCode
    );

    if (profileResult.error) {
      throw new Error('Failed to create premium profile');
    }

    // Convert anonymous user to permanent account
    const { data: finalizeResult, error: finalizeError } =
      await this.supabaseService.invokeFunction(
        "finalize-promo-account", // New edge function
        { 
          temporaryUserId: anonymousUserId, 
          email: signupData.email, 
          password: signupData.password,
          promoCode: signupData.promoCode
        },
        anonymousUserJwt
      );

    if (finalizeError || !finalizeResult) {
      throw new Error('Failed to finalize promo account');
    }

    // Cleanup
    await this.unifiedStore.clearPendingConversionDetails(anonymousUserId);

    return { success: true };
  } catch (error) {
    console.error('Error creating promo account:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

---

## 📋 **PHASE 2: FULL PROMO CODE SYSTEM (Next Week)**

### **Database Schema**
```sql
-- Add promo tracking to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN promo_code_used TEXT,
ADD COLUMN promo_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_grandfathered BOOLEAN DEFAULT FALSE; -- Permanent flag for beta testers

-- Create promo_codes table for management
CREATE TABLE promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata for tracking
  created_by TEXT, -- Who created this code
  campaign_name TEXT, -- Marketing campaign tracking
  notes TEXT -- Additional notes
);

-- Indexes
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_expires ON promo_codes(expires_at);
CREATE INDEX idx_user_profiles_promo ON user_profiles(promo_code_used);

-- RLS policies
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Only allow reading promo codes (validation), no user modifications
CREATE POLICY "Allow promo code validation" ON promo_codes
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
```

### **Edge Functions**

#### **1. Validate Promo Code Function**
```typescript
// supabase/functions/validate-promo-code/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { code } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if code exists and is valid
    const { data: promoCode, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promoCode) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Invalid promo code' 
      }));
    }

    // Check expiration
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Promo code has expired' 
      }));
    }

    // Check usage limits
    if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Promo code has reached its usage limit' 
      }));
    }

    return new Response(JSON.stringify({ 
      valid: true, 
      description: promoCode.description 
    }));

  } catch (error) {
    return new Response(JSON.stringify({ 
      valid: false, 
      error: 'Failed to validate promo code' 
    }), { status: 500 });
  }
});
```

#### **2. Finalize Promo Account Function**
```typescript
// supabase/functions/finalize-promo-account/index.ts
// Similar to finalize-premium-account but with promo tracking

serve(async (req) => {
  try {
    const { temporaryUserId, email, password, promoCode } = await req.json();
    
    // 1. Validate promo code again (security)
    const validation = await validatePromoCode(promoCode);
    if (!validation.valid) {
      throw new Error('Invalid promo code');
    }

    // 2. Convert anonymous user to permanent user
    const { data: updateResult, error: updateError } = 
      await supabaseAdmin.auth.admin.updateUserById(temporaryUserId, {
        email: email,
        password: password,
        email_confirm: true
      });

    if (updateError) throw updateError;

    // 3. Update user profile with promo metadata
    await supabaseAdmin.from('user_profiles').update({
      email: email,
      is_premium: true,
      is_grandfathered: true, // Mark as grandfathered beta tester
      promo_code_used: promoCode,
      promo_activated_at: new Date().toISOString(),
      platform_purchase_data: {
        platform: "promo",
        transactionId: `promo_${promoCode}_${Date.now()}`,
        purchaseDate: Date.now(),
        validated: true,
        lastValidated: Date.now(),
      }
    }).eq('id', temporaryUserId);

    // 4. Increment promo code usage
    await supabaseAdmin.rpc('increment_promo_usage', { 
      promo_code: promoCode 
    });

    return new Response(JSON.stringify({ success: true }));

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { status: 400 });
  }
});
```

### **Promo Code Management**

#### **Beta Tester Codes (Permanent Grandfathering)**
```sql
-- Insert beta tester codes with June 30, 2025 expiration
-- BUT users who activate these codes get PERMANENT premium access
INSERT INTO promo_codes (code, description, max_uses, expires_at, campaign_name, notes) VALUES
('SYNAPSE2024', 'General beta access - permanent premium', 100, '2025-06-30 23:59:59', 'Beta Launch', 'Grandfathered beta testers'),
('BETATESTER', 'Core beta tester access', 50, '2025-06-30 23:59:59', 'Beta Launch', 'Inner circle testers'),
('EARLYBIRD', 'Early supporter access', 200, '2025-06-30 23:59:59', 'Beta Launch', 'Early adopters'),
('FOUNDER001', 'Personal founder invite #1', 1, '2025-06-30 23:59:59', 'Founder Invites', 'Personal invite'),
('FOUNDER002', 'Personal founder invite #2', 1, '2025-06-30 23:59:59', 'Founder Invites', 'Personal invite'),
-- ... continue for FOUNDER003 through FOUNDER050
('WORDNERD', 'Word game enthusiast code', 500, '2025-06-30 23:59:59', 'Community', 'Word game community'),
('PUZZLEFAN', 'Puzzle lover code', 300, '2025-06-30 23:59:59', 'Community', 'Puzzle community');
```

#### **Marketing Campaign Codes**
```sql
-- Time-limited marketing codes
INSERT INTO promo_codes (code, description, expires_at, campaign_name) VALUES
('LAUNCH50', 'Launch week special', '2024-12-31 23:59:59', 'Launch Week'),
('PODCAST20', 'Podcast listener bonus', '2024-06-30 23:59:59', 'Podcast Marketing'),
('TWITTER10', 'Twitter follower code', '2024-03-31 23:59:59', 'Social Media'),
('REDDIT25', 'Reddit community code', '2024-04-15 23:59:59', 'Reddit Marketing');
```

---

## 🎯 **BETA TESTER GRANDFATHERING STRATEGY**

### **Why This Approach is Perfect:**
1. **Permanent Premium Access** - Beta testers get the same permanent premium as paying customers
2. **Full Feature Access** - Cloud sync, unlimited games, all collections, etc.
3. **Trackable** - We know exactly who used promo codes vs. who paid
4. **Scalable** - Can create unlimited codes for different campaigns
5. **Professional** - Clean UI, proper account creation flow

### **Beta Tester Instructions:**
```
🎮 Welcome to Synapse Beta!

You're getting PERMANENT premium access as a thank you for testing!

⏰ IMPORTANT: Beta codes expire June 30, 2025 - but once you activate yours, you keep premium FOREVER!

1. Go to: https://synapse.game
2. Play a few games to get the feel
3. When you hit the upgrade prompt, click "Have a promo code?"
4. Enter: BETATESTER (or your personal code)
5. Create your account - you now have PERMANENT premium!

🎁 Grandfathered Features (FOREVER):
✅ Unlimited daily games
✅ Access to all past daily challenges  
✅ Cloud sync across devices
✅ All word collections
✅ Priority support
✅ Grandfathered status (even after beta ends!)

💡 Pro tip: Activate your code before June 30, 2025 to lock in these benefits permanently!

Let me know what you think! 🧠✨
```

---

## 🚀 **IMPLEMENTATION TIMELINE**

### **This Weekend (Phase 1):**
- [ ] Add promo code field to UpgradePrompt
- [ ] Implement hardcoded beta code validation
- [ ] Extend StripeService for promo accounts
- [ ] Test with 3-5 close friends

### **Next Week (Phase 2):**
- [ ] Create database schema for promo codes
- [ ] Build edge functions for validation
- [ ] Create promo code management interface
- [ ] Expand beta to 20-50 people

### **Future Enhancements:**
- [ ] Admin dashboard for code management
- [ ] Usage analytics and reporting
- [ ] Bulk code generation
- [ ] Integration with marketing campaigns

---

## ✅ **SUCCESS CRITERIA**

### **For Beta Testers:**
- ✅ Permanent premium account created
- ✅ Full access to all premium features
- ✅ Cloud sync working across devices
- ✅ Tracked as "promo" user for analytics
- ✅ Same experience as paying customers

### **For Future Marketing:**
- ✅ Scalable code generation system
- ✅ Usage tracking and limits
- ✅ Expiration date support
- ✅ Campaign attribution
- ✅ Easy management interface

**This system gives your beta testers the VIP treatment they deserve while building infrastructure you'll use for years!** 🎯 