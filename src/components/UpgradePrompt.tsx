import React, { useState } from "react";
import { View, StyleSheet, Modal as RNModal } from "react-native";

import { Text, Button, Card, useTheme } from "react-native-paper";

import StripeService from "../services/StripeService";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import CustomIcon from "./CustomIcon";
import ModalCloseButton from "./ModalCloseButton";

// Define different upgrade contexts for targeted messaging
export type UpgradeContext =
  | "freeGamesLimited" // User hit free game limit
  | "pastChallenges" // User wants access to past daily challenges
  | "experimentalFeatures" // User wants Labs/experimental features
  | "generalUpgrade" // General upgrade promotion from menu/about
  | "syncAndProgress"; // User wants to sync progress across devices

interface UpgradePromptProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
  remainingFreeGames: number;
  context?: UpgradeContext;
  customMessage?: string; // Optional custom message to override defaults
}

// Context-specific content configuration
const getContextContent = (
  context: UpgradeContext,
  remainingFreeGames: number,
  pricing: { displayPrice: string; productName: string },
) => {
  const baseFeatures = [
    { icon: "infinity", text: "Unlimited random games daily" },
    { icon: "calendar-check", text: "Access to all past daily challenges" },
    { icon: "sync", text: "Sync progress across all devices" },
    { icon: "flask", text: "Early access to Lab features" },
  ];

  // Use "Galaxy Brain" for user-facing text instead of the full product name
  const userFacingBrandName = "Galaxy Brain";

  switch (context) {
    case "freeGamesLimited":
      return {
        title: "Ready for Unlimited Play?",
        description: `You've used your 2 free random games today. Upgrade to ${userFacingBrandName} for ${pricing.displayPrice} and play without limits!`,
        primaryFeatures: baseFeatures,
        reminder:
          "Daily challenges and shared challenges are always free! Your free games reset at 12:00 AM EST.",
        ctaText: "Sign In/Up",
      };

    case "pastChallenges":
      return {
        title: "Unlock Your Challenge History",
        description: `${userFacingBrandName} users can access all past daily challenges - never miss a puzzle again!`,
        primaryFeatures: [
          {
            icon: "calendar-check",
            text: "Access to all past daily challenges",
          },
          { icon: "history", text: "Replay any challenge you've missed" },
          { icon: "trophy", text: "Complete your challenge collection" },
          { icon: "sync", text: "Sync progress across all devices" },
        ],
        reminder:
          "Catch up on missed challenges and complete your puzzle journey!",
        ctaText: "Sign In/Up",
      };

    case "experimentalFeatures":
      return {
        title: "Get Early Access to the Lab",
        description: `Unlock experimental features with a ${userFacingBrandName} account for just ${pricing.displayPrice}!`,
        primaryFeatures: [
          { icon: "flask", text: "Early access to experimental features" },
          { icon: "brain", text: "New game modes and mechanics" },
          { icon: "tune", text: "Have a say in the future of Synapse" },
          { icon: "sync", text: "Cloud sync for all your progress" },
        ],
        reminder:
          "Be part of the future of Synapse - get exclusive early access!",
        ctaText: "Sign In/Up",
      };

    case "syncAndProgress":
      return {
        title: "Keep Your Progress Forever",
        description: `Never lose your progress again! ${userFacingBrandName} syncs everything across all your devices for just ${pricing.displayPrice}.`,
        primaryFeatures: [
          { icon: "sync", text: "Sync progress across all devices" },
          { icon: "cloud-upload", text: "Automatic cloud backup" },
          { icon: "devices", text: "Play on phone, tablet, or web seamlessly" },
          { icon: "infinity", text: "Unlimited gameplay as a bonus" },
        ],
        reminder:
          "Your achievements, stats, and progress stay with you everywhere!",
        ctaText: "Sign In/Up",
      };

    case "generalUpgrade":
    default:
      return {
        title: `Upgrade to ${userFacingBrandName}`,
        description: `Ready to unlock the full Synapse experience for just ${pricing.displayPrice}?`,
        primaryFeatures: baseFeatures,
        reminder:
          remainingFreeGames === 0
            ? "You've used your 2 free games today. Daily challenges and shared challenges are always free!"
            : "Keep your progress forever and play without limits!",
        ctaText: "Sign In/Up",
      };
  }
};

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  remainingFreeGames,
  context = "generalUpgrade",
  customMessage,
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const setDailiesModalVisible = useGameStore(
    (state) => state.setDailiesModalVisible,
  );
  const [stripeService] = useState(() => StripeService.getInstance());
  const [pricing] = useState(stripeService.getPricingInfo());

  // Get context-specific content
  const contextContent = getContextContent(
    context,
    remainingFreeGames,
    pricing,
  );

  const handleUpgrade = async () => {
    // Close the dailies modal if it's open
    setDailiesModalVisible(false);
    // Go to AuthScreen where payment will be handled
    onUpgrade();
  };

  // Debug logging
  console.log(
    "UpgradePrompt: render called with visible =",
    visible,
    "context =",
    context,
    "remainingFreeGames =",
    remainingFreeGames,
  );

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {visible && (
          <View style={styles.modalContent}>
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <CustomIcon
                    source="brain"
                    size={32}
                    color={customColors.localOptimalNode}
                  />
                  <Text
                    variant="headlineSmall"
                    style={[styles.title, { color: colors.onSurface }]}
                  >
                    {contextContent.title}
                  </Text>
                </View>
                <ModalCloseButton onPress={onDismiss} />
              </View>

              <View style={styles.content}>
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.description,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {customMessage || contextContent.description}
                </Text>

                <View style={styles.featuresList}>
                  {contextContent.primaryFeatures.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <CustomIcon
                        source={feature.icon}
                        size={20}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.featureText,
                          { color: colors.onSurface },
                        ]}
                      >
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text
                  variant="bodyMedium"
                  style={[
                    styles.reminder,
                    {
                      color:
                        context === "freeGamesLimited" &&
                        remainingFreeGames === 0
                          ? colors.error
                          : colors.onSurfaceVariant,
                      fontStyle:
                        context === "freeGamesLimited" &&
                        remainingFreeGames === 0
                          ? "italic"
                          : "normal",
                    },
                  ]}
                >
                  {contextContent.reminder}
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={styles.dismissButton}
                >
                  Maybe Later
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpgrade}
                  style={styles.upgradeButton}
                  icon={() => (
                    <CustomIcon
                      source="brain"
                      size={20}
                      color={colors.onPrimary}
                    />
                  )}
                >
                  {contextContent.ctaText}
                </Button>
              </View>
            </Card>
          </View>
        )}
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999, // Very high z-index
    elevation: 9999, // Very high elevation for Android
  },
  modalContent: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    maxWidth: 400,
    width: "100%",
    minWidth: 300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12, // Add margin to ensure space for close button
  },
  title: {
    textAlign: "left", // Change to left align since we have an icon
    fontWeight: "bold",
    flex: 1, // Allow title to take remaining space but wrap properly
    flexShrink: 1, // Allow title to shrink if needed
  },
  content: {
    marginBottom: 24,
  },
  description: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    paddingLeft: 24,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  reminder: {
    textAlign: "center",
    fontSize: 14,
    paddingTop: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dismissButton: {
    flex: 1,
  },
  upgradeButton: {
    flex: 1,
  },
});

export default UpgradePrompt;
