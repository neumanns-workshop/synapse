import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Text, Button, Card, useTheme, Icon } from 'react-native-paper';
import type { ExtendedTheme } from '../theme/SynapseTheme';

interface UpgradePromptProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
  remainingFreeGames: number;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  remainingFreeGames
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;

  // Debug logging
  console.log('UpgradePrompt: render called with visible =', visible, 'remainingFreeGames =', remainingFreeGames);

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[
        styles.modal,
        { backgroundColor: 'transparent' } // Make modal background transparent
      ]}
    >
      {visible && (
        <View style={styles.modalContent}>
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <Icon
                source="crown"
                size={48}
                color={customColors.achievementIcon}
              />
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: colors.onSurface }]}
              >
                Upgrade to Premium
              </Text>
            </View>

            <View style={styles.content}>
              <Text
                variant="bodyLarge"
                style={[styles.description, { color: colors.onSurfaceVariant }]}
              >
                You've used all your free games for today!
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Icon source="infinity" size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.onSurface }]}>
                    Unlimited random games daily
                  </Text>
                </View>
                
                <View style={styles.featureItem}>
                  <Icon source="calendar-check" size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.onSurface }]}>
                    Access to all past daily challenges
                  </Text>
                </View>
                
                <View style={styles.featureItem}>
                  <Icon source="account-group" size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.onSurface }]}>
                    Global leaderboards and competitions
                  </Text>
                </View>
                
                <View style={styles.featureItem}>
                  <Icon source="book-open" size={20} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.onSurface }]}>
                    Unique themed word collections
                  </Text>
                </View>
              </View>

              {remainingFreeGames === 0 && (
                <Text
                  variant="bodyMedium"
                  style={[styles.reminder, { color: colors.error }]}
                >
                  Remember: Daily challenges and player challenges are always free!
                </Text>
              )}
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
                onPress={onUpgrade}
                style={styles.upgradeButton}
              >
                Upgrade Now
              </Button>
            </View>
          </Card>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    maxWidth: 400,
    width: '100%',
    minWidth: 300,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 24,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  reminder: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 14,
    paddingTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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