# Data Sync Strategy for Synapse

## 📊 Data Architecture Overview

### Local Storage (Everyone)

**All data is persisted locally via `UnifiedDataStore`** - this ensures the app works offline and provides instant performance.

```typescript
interface UnifiedAppData {
  user: UserProfile & Settings
  stats: GameStatistics
  gameHistory: GameReport[] (last 50 games)
  achievements: AchievementProgress
  collections: WordCollectionProgress
  dailyChallenges: DailyChallengeData
  news: NewsPreferences
  currentGames: CurrentGameStates
  meta: SyncMetadata
}
```

### Cloud Sync (Premium Users Only)

**Premium users get automatic cloud backup** via Supabase with two tables:

#### 1. `user_profiles` Table (Queryable Profile Data)

```sql
user_profiles {
  id: uuid (references auth.users)
  email: string
  created_at: timestamp
  updated_at: timestamp
  is_premium: boolean
  platform_purchase_data: jsonb {
    platform: 'ios' | 'android' | 'web' | 'stripe'
    transactionId: string
    purchaseDate: number
    receiptData: string
    validated: boolean
    lastValidated: number
  }
  privacy_settings: jsonb {
    allow_challenge_sharing: boolean
    allow_stats_sharing: boolean
    allow_leaderboards: boolean
    data_collection: boolean
    email_updates: boolean
  }
}
```

#### 2. `user_data` Table (Full Data Backup)

```sql
user_data {
  user_id: uuid (references auth.users)
  data: jsonb (complete UnifiedAppData)
  device_id: string
  schema_version: integer
  created_at: timestamp
  updated_at: timestamp
}
```

## 🔄 Sync Behavior

### For All Users (Free & Premium)

- **Local persistence**: Everything saved locally
- **Instant performance**: No network dependency
- **Offline support**: Full functionality without internet

### For Premium Users Only

- **Automatic cloud backup**: Data synced on auth state changes
- **Cross-device sync**: Restore progress on new devices
- **Data security**: Encrypted backup in Supabase

## 🚀 Sync Implementation

### When Sync Happens

1. **On Login**: `syncLocalDataToCloud()` + `syncCloudDataToLocal()`
2. **On Game Completion**: `syncLocalDataToCloud()` (if premium)
3. **On Achievement Unlock**: `syncLocalDataToCloud()` (if premium)
4. **On Purchase**: `syncPurchaseData()` + full sync

### Sync Methods

```typescript
// Full bidirectional sync
await supabaseService.syncLocalDataToCloud();
await supabaseService.syncCloudDataToLocal();

// Purchase-specific sync
await supabaseService.syncPurchaseData(purchaseData);
```

## 💰 In-App Purchase (IAP) Implementation

### 1. Install IAP Package

```bash
npx expo install expo-in-app-purchases
```

### 2. Configure App Store/Play Store

**iOS (App Store Connect):**

- Create in-app purchase: `synapse_premium_unlock`
- Type: Non-Consumable
- Price: $5

**Android (Google Play Console):**

- Create managed product: `synapse_premium_unlock`
- Type: Managed product
- Price: $5

### 3. Implementation Code

```typescript
// services/IAPService.ts
import * as InAppPurchases from "expo-in-app-purchases";

class IAPService {
  private productId = "synapse_premium_unlock";

  async initializeIAP() {
    await InAppPurchases.connectAsync();
    return await InAppPurchases.getProductsAsync([this.productId]);
  }

  async purchasePremium() {
    try {
      const result = await InAppPurchases.purchaseItemAsync(this.productId);

      if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
        // Verify purchase server-side (recommended)
        await this.verifyPurchase(result);

        // Sync purchase data to Supabase
        await supabaseService.syncPurchaseData({
          platform: Platform.OS as "ios" | "android",
          transactionId: result.transactionId,
          purchaseDate: Date.now(),
          receiptData: result.receiptData,
          validated: true,
          lastValidated: Date.now(),
        });

        return { success: true };
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      return { success: false, error };
    }
  }
}
```

### 4. Purchase Flow Integration

```typescript
// In your upgrade/purchase screen
const handlePurchase = async () => {
  const result = await iapService.purchasePremium();

  if (result.success) {
    // Update local state immediately
    await unifiedStore.setPremiumStatus(true);

    // Show success message
    Alert.alert(
      "Welcome to Premium!",
      "Your purchase was successful and your data will now sync across devices.",
    );

    // Navigate to premium features
    navigation.goBack();
  } else {
    Alert.alert("Purchase Failed", "Please try again.");
  }
};
```

## 🔐 Premium Feature Access

### Check Premium Status

```typescript
// Check if user has premium access
const isPremium = await unifiedStore.isPremiumUser();
const isAuthenticated = supabaseService.isAuthenticated();

// Premium features require both purchase AND auth
const canUsePremiumFeatures = isPremium && isAuthenticated;
```

### Premium Feature Examples

- **Cloud sync**: Automatic backup/restore
- **Unlimited daily challenges**: No 2-game limit
- **Advanced statistics**: Detailed analytics
- **Export data**: Download complete progress
- **Priority support**: Email support access

## 📋 Database Setup Checklist

### Supabase Tables to Create/Update

#### 1. Update `user_profiles` table:

```sql
-- Add platform_purchase_data column
ALTER TABLE user_profiles
ADD COLUMN platform_purchase_data JSONB;

-- Update privacy_settings to include email_updates
UPDATE user_profiles
SET privacy_settings = privacy_settings || '{"email_updates": false}'::jsonb
WHERE privacy_settings IS NOT NULL
AND NOT (privacy_settings ? 'email_updates');
```

#### 2. Create `user_data` table:

```sql
CREATE TABLE user_data (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  device_id TEXT,
  schema_version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Add RLS policies
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own data" ON user_data
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_data_updated_at BEFORE UPDATE
    ON user_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## ✅ Ready for Production

The data sync architecture is now ready for:

1. **Local-first operation** for all users
2. **Premium cloud sync** for paying users
3. **IAP integration** for iOS/Android
4. **Cross-device sync** for premium users
5. **Offline resilience** for everyone

The system gracefully handles network issues and provides a smooth upgrade path from free to premium users.
