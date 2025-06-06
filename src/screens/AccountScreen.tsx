import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, StyleSheet, Pressable } from "react-native";

import {
  Modal,
  Portal,
  Text,
  Card,
  Button,
  List,
  Switch,
  ActivityIndicator,
  Snackbar,
  Dialog,
} from "react-native-paper";
import CustomIcon from "../components/CustomIcon";

import { useAuth } from "../context/AuthContext";
import { useTheme as useAppTheme } from "../context/ThemeContext";
import { unifiedDataStore } from "../services/UnifiedDataStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface AccountScreenProps {
  onClose: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ onClose }) => {
  const { theme: appTheme } = useAppTheme();
  const auth = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [localPremiumStatus, setLocalPremiumStatus] = useState<boolean | null>(
    null,
  );

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleSignOut = () => {
    console.log("🔓 AccountScreen handleSignOut called");
    auth.signOut();
    onClose();
  };

  const handleSyncData = async () => {
    console.log("🔄 Manual sync started from AccountScreen");
    setIsSyncing(true);
    try {
      // Sync local data to cloud first
      console.log("🔄 Starting manual upload to cloud...");
      const uploadResult = await auth.syncDataToCloud();
      console.log("🔄 Upload result:", uploadResult);
      if (uploadResult.error) {
        console.log("🔄 Upload failed:", uploadResult.error);
        throw new Error("Failed to upload data to cloud");
      }
      console.log("🔄 Upload completed successfully");

      // Then sync cloud data back to local (in case there were updates)
      console.log("🔄 Starting manual download from cloud...");
      const downloadResult = await auth.syncDataFromCloud();
      console.log("🔄 Download result:", downloadResult);
      if (downloadResult.error) {
        console.log("🔄 Download failed:", downloadResult.error);
        throw new Error("Failed to download data from cloud");
      }
      console.log("🔄 Download completed successfully");

      console.log("🔄 Manual sync completed successfully");
      showMessage("Data synced successfully!");
    } catch (error) {
      console.log("🔄 Manual sync failed:", error);
      Alert.alert("Sync Error", "Failed to sync data. Please try again.");
    } finally {
      console.log("🔄 Setting isSyncing to false");
      setIsSyncing(false);
    }
  };

  const handleEmailPreferenceChange = async (value: boolean) => {
    setIsUpdatingPreferences(true);
    try {
      const { error } = await auth.updateEmailPreferences(value);
      if (error) {
        throw error;
      }
      showMessage(
        value ? "You will now receive email updates" : "Email updates disabled",
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update email preferences. Please try again.",
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleDataCollectionChange = async (value: boolean) => {
    setIsUpdatingPreferences(true);
    try {
      const { error } = await auth.updatePrivacySettings({ data_collection: value });
      if (error) {
        throw error;
      }
      showMessage(
        value ? "Analytics enabled - thank you for helping improve Synapse!" : "Analytics disabled",
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update analytics preference. Please try again.",
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleLeaderboardsChange = async (value: boolean) => {
    setIsUpdatingPreferences(true);
    try {
      const { error } = await auth.updatePrivacySettings({ allow_leaderboards: value });
      if (error) {
        throw error;
      }
      showMessage(
        value ? "Leaderboard participation enabled" : "Leaderboard participation disabled",
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update leaderboard preference. Please try again.",
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleDeleteAccount = () => {
    console.log("🗑️ Delete account button pressed!");
    setDeleteDialogVisible(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteDialogVisible(false);
    setIsUpdatingPreferences(true);
    try {
      console.log("🗑️ Starting account deletion process...");
      const { error } = await auth.deleteAccount();
      
      if (error) {
        console.error("🗑️ Account deletion failed:", error);
        // Check if it's a function not found error
        if (error.message?.includes("delete-user-account") || error.message?.includes("Function not found")) {
          showMessage("Account deletion functionality is being implemented. Please contact support if you need to delete your account immediately.");
        } else {
          showMessage("Failed to delete account. Please try again or contact support if the problem persists.");
        }
      } else {
        console.log("🗑️ Account deletion successful");
        showMessage("Your Galaxy Brain account has been permanently deleted. Thank you for using Synapse.");
        setTimeout(() => onClose(), 2000); // Close after showing message
      }
    } catch (error) {
      console.error("🗑️ Unexpected error during account deletion:", error);
      showMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  useEffect(() => {
    const loadLocalPremiumStatus = async () => {
      const status = await unifiedDataStore.isPremiumUser();
      setLocalPremiumStatus(status);
    };

    loadLocalPremiumStatus();
  }, []);

  if (auth.isLoading) {
    return (
      <Portal>
        <Modal
          visible={true}
          onDismiss={onClose}
          contentContainerStyle={[
            styles.modalContent,
            {
              backgroundColor: appTheme.colors.surface,
              borderColor: appTheme.colors.outline,
            },
          ]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={appTheme.colors.primary} />
            <Text
              style={[styles.loadingText, { color: appTheme.colors.onSurface }]}
            >
              Loading account...
            </Text>
          </View>
        </Modal>
      </Portal>
    );
  }

  if (!auth.user || !auth.profile) {
    return (
      <Portal>
        <Modal
          visible={true}
          onDismiss={onClose}
          contentContainerStyle={[
            styles.modalContent,
            {
              backgroundColor: appTheme.colors.surface,
              borderColor: appTheme.colors.outline,
            },
          ]}
        >
          <View style={styles.errorContainer}>
            <Text
              style={[styles.errorText, { color: appTheme.colors.onSurface }]}
            >
              Account not available
            </Text>
            <Button
              onPress={onClose}
              mode="contained"
              style={styles.closeButton}
            >
              Close
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  }

  const profile = auth.profile;
  const createdDate = new Date(profile.created_at).toLocaleDateString();
  const emailUpdatesEnabled = profile.privacy_settings?.email_updates || false;
  const dataCollectionEnabled = profile.privacy_settings?.data_collection || false;
  const leaderboardsEnabled = profile.privacy_settings?.allow_leaderboards ?? true;

  return (
    <Portal>
      <Modal
        visible={true}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContent,
          {
            backgroundColor: appTheme.colors.surface,
            borderColor: appTheme.colors.outline,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: appTheme.colors.onBackground }]}>
            Account
          </Text>
          <View style={styles.headerButtons}>
            <Button
              mode="contained"
              onPress={handleSignOut}
              compact
              buttonColor={appTheme.colors.error}
              icon={() => <CustomIcon source="brain" size={18} color={appTheme.colors.onError} />}
              style={{ marginRight: 8 }}
              labelStyle={{
                color: appTheme.colors.onError,
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              Sign Out
            </Button>
            <Button
              mode="text"
              onPress={onClose}
              icon={() => <CustomIcon source="close" size={20} color={appTheme.colors.onSurfaceVariant} />}
              compact
              labelStyle={{ color: appTheme.colors.onSurfaceVariant }}
            >
              Close
            </Button>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Account Information */}
          <Card
            style={[
              styles.card,
              {
                backgroundColor: appTheme.colors.surfaceVariant,
                borderColor: appTheme.colors.outline,
              },
            ]}
          >
            <Card.Content>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: appTheme.colors.primary },
                ]}
              >
                Account Information
              </Text>

              <List.Item
                title="Email"
                description={profile.email}
                left={(props) => (
                  <CustomIcon source="email" size={24} color={appTheme.colors.primary} />
                )}
                titleStyle={{ color: appTheme.colors.onSurface }}
                descriptionStyle={{ color: appTheme.colors.onSurfaceVariant }}
              />

              <List.Item
                title="Account Type"
                description={profile.is_premium ? "Galaxy Brain" : "Free"}
                left={(props) => (
                  <CustomIcon 
                    source={profile.is_premium ? "brain" : "account"} 
                    size={24} 
                    color={appTheme.colors.primary} 
                  />
                )}
                titleStyle={{ color: appTheme.colors.onSurface }}
                descriptionStyle={{ color: appTheme.colors.onSurfaceVariant }}
              />

              <List.Item
                title="Member Since"
                description={createdDate}
                left={(props) => (
                  <CustomIcon source="calendar" size={24} color={appTheme.colors.primary} />
                )}
                titleStyle={{ color: appTheme.colors.onSurface }}
                descriptionStyle={{ color: appTheme.colors.onSurfaceVariant }}
              />
            </Card.Content>
          </Card>

          {/* Data Sync */}
          <Card
            style={[
              styles.card,
              {
                backgroundColor: appTheme.colors.surfaceVariant,
                borderColor: appTheme.colors.outline,
              },
            ]}
          >
            <Card.Content>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: appTheme.colors.primary },
                ]}
              >
                Data Sync
              </Text>

              <Text
                style={[
                  styles.sectionDescription,
                  { color: appTheme.colors.onSurfaceVariant },
                ]}
              >
                Keep your progress, achievements, and settings synced across all
                your devices.
              </Text>

              <Button
                mode="outlined"
                onPress={handleSyncData}
                disabled={isSyncing}
                loading={isSyncing}
                icon={() => <CustomIcon source="sync" size={20} color={appTheme.colors.primary} />}
                style={[
                  styles.syncButton,
                  { borderColor: appTheme.colors.primary },
                ]}
                labelStyle={{ color: appTheme.colors.primary }}
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </Card.Content>
          </Card>

          {/* Email Preferences */}
          <Card
            style={[
              styles.card,
              {
                backgroundColor: appTheme.colors.surfaceVariant,
                borderColor: appTheme.colors.outline,
              },
            ]}
          >
            <Card.Content>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: appTheme.colors.primary },
                ]}
              >
                Preferences
              </Text>

              <List.Item
                title="Email Updates"
                description="Receive news and updates via email"
                left={(props) => (
                  <CustomIcon source="email-newsletter" size={24} color={appTheme.colors.primary} />
                )}
                right={() => (
                  <Switch
                    value={emailUpdatesEnabled}
                    onValueChange={handleEmailPreferenceChange}
                    disabled={isUpdatingPreferences}
                    color={appTheme.colors.primary}
                  />
                )}
                titleStyle={{ color: appTheme.colors.onSurface }}
                descriptionStyle={{ color: appTheme.colors.onSurfaceVariant }}
              />

              <List.Item
                title="Analytics & Improvement"
                description="Help improve Synapse with anonymized usage data"
                left={(props) => (
                  <CustomIcon source="chart-line" size={24} color={appTheme.colors.primary} />
                )}
                right={() => (
                  <Switch
                    value={dataCollectionEnabled}
                    onValueChange={handleDataCollectionChange}
                    disabled={isUpdatingPreferences}
                    color={appTheme.colors.primary}
                  />
                )}
                titleStyle={{ color: appTheme.colors.onSurface }}
                descriptionStyle={{ color: appTheme.colors.onSurfaceVariant }}
              />

              <List.Item
                title="Leaderboard Participation"
                description="Share daily challenge scores for percentile rankings"
                left={(props) => (
                  <CustomIcon source="trophy" size={24} color={appTheme.colors.primary} />
                )}
                right={() => (
                  <Switch
                    value={leaderboardsEnabled}
                    onValueChange={handleLeaderboardsChange}
                    disabled={isUpdatingPreferences}
                    color={appTheme.colors.primary}
                  />
                )}
                titleStyle={{ color: appTheme.colors.onSurface }}
                descriptionStyle={{ color: appTheme.colors.onSurfaceVariant }}
              />
            </Card.Content>
          </Card>

          {/* Privacy Policy */}
          <Card
            style={[
              styles.card,
              {
                backgroundColor: appTheme.colors.surfaceVariant,
                borderColor: appTheme.colors.outline,
              },
            ]}
          >
            <Card.Content>
              <Pressable
                onPress={() => setPrivacyExpanded(!privacyExpanded)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: appTheme.colors.primary },
                  ]}
                >
                  Privacy & Data
                </Text>
                <CustomIcon
                  source={privacyExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={appTheme.colors.primary}
                />
              </Pressable>

              {privacyExpanded && (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[
                      styles.privacyText,
                      { color: appTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    <Text style={{ fontWeight: "bold" }}>Your Privacy Matters:</Text> Synapse is designed with privacy in mind. We only collect data necessary to provide and improve the game experience, and to explore semantic reasoning for independent research.
                  </Text>

                  <Text
                    style={[
                      styles.privacyText,
                      { color: appTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    <Text style={{ fontWeight: "bold" }}>What We Collect:</Text> Game progress, achievements, and anonymized usage patterns (if enabled above). We never sell your data or share it with third parties.
                  </Text>

                  <Text
                    style={[
                      styles.privacyText,
                      { color: appTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    <Text style={{ fontWeight: "bold" }}>Your Control:</Text> You can disable analytics, manage email preferences, and delete your account at any time. All data is encrypted and securely stored.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Danger Zone */}
          <Card
            style={[
              styles.card,
              {
                backgroundColor: appTheme.colors.errorContainer,
                borderColor: appTheme.colors.error,
              },
            ]}
          >
            <Card.Content>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: appTheme.colors.error },
                ]}
              >
                ⚠️ Danger Zone
              </Text>

              <Text
                style={[
                  styles.privacyText,
                  { color: appTheme.colors.onErrorContainer },
                ]}
              >
                <Text style={{ fontWeight: "bold" }}>Permanent Actions:</Text> These actions cannot be undone. Please proceed with caution.
              </Text>

              <Button
                mode="outlined"
                onPress={handleDeleteAccount}
                icon={() => <CustomIcon source="delete-forever" size={20} color={appTheme.colors.error} />}
                style={[
                  styles.deleteButton,
                  { borderColor: appTheme.colors.error },
                ]}
                labelStyle={{ color: appTheme.colors.error }}
              >
                Delete Account Forever
              </Button>
            </Card.Content>
          </Card>


        </ScrollView>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{ 
            backgroundColor: appTheme.colors.inverseSurface,
            marginHorizontal: 20,
            maxWidth: 500,
            alignSelf: "center",
          }}
        >
          <Text style={{ 
            color: appTheme.colors.inverseOnSurface,
            flexWrap: "wrap",
            textAlign: "center",
          }}>
            {snackbarMessage}
          </Text>
        </Snackbar>
      </Modal>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        style={{
          backgroundColor: appTheme.colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: appTheme.colors.outline,
          maxWidth: 500,
          alignSelf: "center",
        }}
      >
        <Dialog.Title 
          style={{ 
            color: appTheme.colors.error,
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            paddingBottom: 8,
          }}
        >
          ⚠️ Delete Galaxy Brain Account
        </Dialog.Title>
        <Dialog.Content style={{ paddingHorizontal: 20 }}>
          <Card
            style={{
              backgroundColor: appTheme.colors.errorContainer,
              borderColor: appTheme.colors.error,
              borderWidth: 1,
              marginBottom: 16,
            }}
          >
            <Card.Content style={{ padding: 16 }}>
              <Text style={{ 
                color: appTheme.colors.onErrorContainer, 
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
                This will permanently delete your Galaxy Brain account and all associated data. This action cannot be undone.
              </Text>
              <Text style={{ 
                color: appTheme.colors.error, 
                fontWeight: "bold", 
                fontSize: 14,
                marginBottom: 8,
              }}>
                You will lose your Galaxy Brain benefits:
              </Text>
              <View style={{ marginLeft: 8 }}>
                <Text style={{ color: appTheme.colors.onErrorContainer, fontSize: 14, lineHeight: 22 }}>
                  • Unlimited random games daily
                </Text>
                <Text style={{ color: appTheme.colors.onErrorContainer, fontSize: 14, lineHeight: 22 }}>
                  • Access to all past daily challenges
                </Text>
                <Text style={{ color: appTheme.colors.onErrorContainer, fontSize: 14, lineHeight: 22 }}>
                  • Sync progress across all devices
                </Text>
                <Text style={{ color: appTheme.colors.onErrorContainer, fontSize: 14, lineHeight: 22 }}>
                  • Early access to Lab features
                </Text>
              </View>
            </Card.Content>
          </Card>
          <Text style={{ 
            color: appTheme.colors.onSurface, 
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "center",
          }}>
            Are you absolutely sure?
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Button
            mode="outlined"
            onPress={() => setDeleteDialogVisible(false)}
            style={{ 
              flex: 1,
              marginRight: 8,
              borderColor: appTheme.colors.outline,
            }}
            labelStyle={{ color: appTheme.colors.onSurface }}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={confirmDeleteAccount}
            loading={isUpdatingPreferences}
            disabled={isUpdatingPreferences}
            buttonColor={appTheme.colors.error}
            icon={() => !isUpdatingPreferences ? <CustomIcon source="delete-forever" size={18} color={appTheme.colors.onError} /> : undefined}
            style={{ flex: 1 }}
            labelStyle={{ 
              color: appTheme.colors.onError,
              fontWeight: "bold",
            }}
          >
            Delete Forever
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    padding: 15,
    borderRadius: 12,
    maxHeight: "90%",
    flex: 1,
    borderWidth: 1,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  privacyText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  syncButton: {
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  closeButton: {
    marginTop: 16,
  },
});

export default AccountScreen;
