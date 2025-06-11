import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";

import {
  Modal,
  Card,
  Text,
  Switch,
  List,
  Divider,
  Button,
  useTheme,
  Dialog,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomIcon from "./CustomIcon";
import { dailyChallengesService } from "../services/DailyChallengesService";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface LabsModalProps {
  visible: boolean;
  onDismiss: () => void;
}

interface ExperimentalFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  betaWarning?: string;
  comingSoon?: boolean;
}

const LabsModal: React.FC<LabsModalProps> = ({ visible, onDismiss }) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const showUpgradePrompt = useGameStore((state) => state.showUpgradePrompt);

  // Premium status state
  const [isPremium, setIsPremium] = useState(false);

  // Check premium status when modal becomes visible
  useEffect(() => {
    if (visible) {
      const checkPremiumStatus = async () => {
        const premiumStatus = await dailyChallengesService.isPremiumUser();
        setIsPremium(premiumStatus);
      };
      checkPremiumStatus();
    }
  }, [visible]);

  // This would eventually be stored in your data store
  const [features, setFeatures] = useState<ExperimentalFeature[]>([
    {
      id: "speed_races",
      name: "Speed Races",
      description:
        "Race against friends or AI to the same target - see who finds the shortest path first!",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "sandbox_mode",
      name: "Sandbox Mode",
      description:
        "Full control over word pair generation - create custom challenges, adjust difficulty, and share with anyone",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "past_game_replay",
      name: "Ghost Path Challenge",
      description:
        "Replay a past game with your previous path removed - find a new route through familiar territory",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "team_challenge",
      name: "Turn-Based Co-op",
      description:
        "Take turns with a friend to solve the same puzzle - share a link and pass moves back and forth",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "mystery_target",
      name: "Mystery Target",
      description:
        "Find the hidden target word using only context clues and nearby words",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "themed_vocabulary",
      name: "Themed Word Sets",
      description:
        "Navigate through specialized vocabularies - medical terms, nature words, technical jargon, and more",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "graph_3d",
      name: "3D Word Space",
      description:
        "Explore word connections in true 3D using advanced t-SNE positioning",
      enabled: false,
      comingSoon: true,
    },
    {
      id: "semantic_sprints",
      name: "Semantic Sprints",
      description:
        "Given a semantic distance target, complete multiple games to achieve the highest combined accuracy!",
      enabled: false,
      comingSoon: true,
    },
  ]);

  const toggleFeature = (id: string) => {
    // No longer needed since all features are coming soon
    // setFeatures(prev => prev.map(feature =>
    //   feature.id === id
    //     ? { ...feature, enabled: !feature.enabled }
    //     : feature
    // ));
  };

  const enabledCount = 0; // All features are coming soon, none enabled

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.surface },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <Dialog.Title style={{ color: colors.primary }}>
                  Lab
                </Dialog.Title>
                <Text
                  variant="bodyMedium"
                  style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
                >
                  Experiments coming to Galaxy Brain users first
                </Text>
              </View>
            </View>
            <Button mode="text" onPress={onDismiss}>
              <CustomIcon source="close" size={20} />
            </Button>
          </View>

          <Divider style={{ marginVertical: 16 }} />

          {/* Status */}
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Text
              variant="bodyMedium"
              style={{ color: colors.onSurfaceVariant }}
            >
              <Text
                style={{ fontWeight: "bold", color: customColors.currentNode }}
              >
                {features.length}
              </Text>{" "}
              experiments in development
            </Text>
          </View>

          {/* Features List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {features.map((feature, index) => (
              <View key={feature.id}>
                <List.Item
                  title={feature.name}
                  description={feature.description}
                  left={() => (
                    <View style={styles.featureIcon}>
                      <CustomIcon
                        source="clock-outline"
                        size={24}
                        color={colors.outline}
                      />
                    </View>
                  )}
                  right={() => (
                    <View
                      style={[
                        styles.comingSoonBadge,
                        { backgroundColor: colors.outline },
                      ]}
                    >
                      <Text
                        style={[
                          styles.comingSoonText,
                          { color: colors.surface },
                        ]}
                      >
                        Soon
                      </Text>
                    </View>
                  )}
                  titleStyle={{ color: colors.onSurface }}
                  descriptionStyle={{ color: colors.onSurfaceVariant }}
                  style={{ paddingVertical: 8 }}
                />

                {index < features.length - 1 && (
                  <Divider style={{ marginLeft: 60 }} />
                )}
              </View>
            ))}
          </ScrollView>

          {/* Upgrade Button for Non-Premium Users */}
          {!isPremium && (
            <>
              <Divider style={{ marginVertical: 16 }} />
              <Button
                mode="contained"
                onPress={() => {
                  onDismiss();
                  showUpgradePrompt("", "experimentalFeatures");
                }}
                style={{
                  backgroundColor: colors.primary,
                  marginBottom: 8,
                }}
                labelStyle={{ color: colors.onPrimary, fontWeight: "bold" }}
                icon={() => (
                  <CustomIcon
                    source="brain"
                    size={20}
                    color={colors.onPrimary}
                  />
                )}
              >
                Sign In/Up
              </Button>
            </>
          )}
        </Card>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    margin: 20,
  },
  safeArea: {
    flex: 1,
  },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    marginTop: 2,
  },
  statusCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  featureIcon: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "center",
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginHorizontal: 60,
    marginBottom: 8,
    borderRadius: 6,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
  },
  footer: {
    paddingTop: 8,
  },
  footerText: {
    textAlign: "center",
    lineHeight: 18,
  },
});

export default LabsModal;
