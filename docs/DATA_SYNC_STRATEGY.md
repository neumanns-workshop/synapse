# Data Sync Strategy for Synapse

## 📊 Data Architecture Overview

### Local Storage (The Single Source of Truth)

**All application data is persisted locally** using `AsyncStorage`, managed by the `UnifiedDataStore` singleton. This local-first approach ensures the app is fully functional offline and feels instantaneous to the user.

The core data structure is defined by the `UnifiedAppData` interface in `src/services/UnifiedDataStore.ts`.

### Cloud Sync (For Authenticated Users)

**Authenticated users (both free and premium) have their data synced with Supabase.** This provides a seamless cross-device experience and serves as a backup. The sync process is designed to be resilient and efficient.

Data is stored in two main tables in Supabase:

1.  **`user_profiles`**: Contains queryable, public-facing user metadata like email, premium status, and privacy settings.
2.  **`user_data`**: Stores the complete `UnifiedAppData` object as a single, compressed JSONB blob. This table is not meant to be queried directly but serves as a full backup of the user's state.

## 🔄 The Sync System

Our data synchronization is orchestrated by `ProgressiveSyncService.ts`. While the name is a holdover from a previous iteration, the current system is designed for efficiency and robustness by minimizing network requests.

### Sync Triggers

Data synchronization is automatically triggered in the following scenarios:

1.  **On Authentication State Change**: When a user signs in, the app first syncs data from the cloud, merges it, and then syncs local changes back to the cloud.
2.  **App Foregrounding**: When the app is brought from the background to the foreground, a two-way sync is initiated to ensure data is fresh.

Future enhancements could include periodic background syncs or triggers on critical events like completing a purchase.

### Sync Process

The sync process is as follows:

-   **From Cloud (Download)**:
    1.  The app fetches the entire user data blob from Supabase in a single request (`getCloudData`).
    2.  The fetched cloud data is then merged with the local data using a comprehensive set of merge rules defined in `SyncMergeService.ts`.
    3.  The newly merged data is saved to the local `UnifiedDataStore`, becoming the new source of truth.
    4.  Progress is reported to the UI during this process to provide user feedback.

-   **To Cloud (Upload)**:
    1.  The app takes the current local data from `UnifiedDataStore`.
    2.  The data is compressed.
    3.  The compressed data is uploaded to Supabase in a single request, overwriting the previous cloud backup (`writeCloudData`).

### Merge Strategy & Conflict Resolution

When syncing data, we employ an intelligent merge strategy, managed by `SyncMergeService.ts`, to prevent data loss.

-   **Newer Wins / Additive Merge**: For lists like game history, local and cloud records are combined and de-duplicated. For most other data, the most recently updated record (local or cloud) is kept.
-   **Counters**: For progressive achievement counters, the highest value from local or cloud is retained.
-   **Local In-Progress Games**: The user's current, in-progress game state is always preserved from the local device and is not overwritten by the cloud.

## ⚙️ How It All Fits Together

1.  The **`UnifiedDataStore`** acts as the single source of truth for the application's state on the device.
2.  When a sync is triggered, the **`ProgressiveSyncService`** is called.
3.  `ProgressiveSyncService` calls methods on **`SupabaseService`** to fetch (`getCloudData`) or push (`writeCloudData`) data.
4.  For downloads, the **`SyncMergeService`** is used to intelligently combine the cloud data with the local data.
5.  The final merged data is saved back to `UnifiedDataStore`.
6.  The `ProgressiveSyncService` reports progress to the UI via components like `ProgressiveSyncIndicator`.

This architecture provides a robust, resilient, and user-friendly data synchronization experience.

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
