-- ============================================================================
-- SYNAPSE INITIAL SCHEMA MIGRATION
-- This creates all tables needed for the Synapse word game app
-- Includes compression support for efficient cloud sync
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES TABLE
-- Stores queryable user information for easy access and management
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE,
  platform_purchase_data JSONB DEFAULT NULL,
  privacy_settings JSONB DEFAULT '{
    "allow_challenge_sharing": true,
    "allow_stats_sharing": true,
    "allow_leaderboards": true,
    "data_collection": false,
    "email_updates": false
  }'::jsonb,
  stripe_customer_id TEXT UNIQUE
);

-- ============================================================================
-- USER DATA TABLE
-- Stores complete app data backup with compression support
-- ============================================================================

CREATE TABLE user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  device_id TEXT,
  schema_version INTEGER DEFAULT 1,
  is_compressed BOOLEAN DEFAULT TRUE, -- New data uses compression by default
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_premium ON user_profiles(is_premium);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);

-- User data indexes
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_device_id ON user_data(device_id);
CREATE INDEX idx_user_data_updated_at ON user_data(updated_at);
CREATE INDEX idx_user_data_is_compressed ON user_data(is_compressed);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User data policies
CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, privacy_settings)
  VALUES (
    NEW.id,
    NEW.email,
    '{
      "allow_challenge_sharing": true,
      "allow_stats_sharing": true,
      "allow_leaderboards": true,
      "data_collection": false,
      "email_updates": false
    }'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
-- Drop existing trigger first if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'Stores queryable user profile information including premium status and privacy settings';
COMMENT ON TABLE user_data IS 'Stores complete app data backup with compression support for efficient sync';

COMMENT ON COLUMN user_data.is_compressed IS 'Indicates if the data JSONB is compressed using our custom compression algorithm';
COMMENT ON COLUMN user_data.data IS 'Complete app data - compressed by default for efficiency';
COMMENT ON COLUMN user_profiles.platform_purchase_data IS 'Purchase validation data for premium subscriptions';
COMMENT ON COLUMN user_profiles.privacy_settings IS 'User privacy preferences for social features and communications';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'user_profiles table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_data') THEN
    RAISE EXCEPTION 'user_data table was not created';
  END IF;
  
  RAISE NOTICE 'Schema migration completed successfully!';
  RAISE NOTICE 'Tables created: user_profiles, user_data';
  RAISE NOTICE 'Compression support: ENABLED (is_compressed column)';
  RAISE NOTICE 'RLS policies: ENABLED';
  RAISE NOTICE 'Auto-profile creation: ENABLED';
END $$; 