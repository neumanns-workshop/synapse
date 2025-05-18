import React from "react";
import { StyleSheet } from "react-native";

import { Portal, Dialog, Text, Button, useTheme } from "react-native-paper";

import type { Achievement } from "../features/achievements";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface AchievementDetailDialogProps {
  achievement: Achievement | null;
  visible: boolean;
  onDismiss: () => void;
}

const AchievementDetailDialog: React.FC<AchievementDetailDialogProps> = ({
  achievement,
  visible,
  onDismiss,
}) => {
  const { colors } = useTheme() as ExtendedTheme;

  if (!achievement) return null;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[
          styles.dialogContainer,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}
      >
        <Dialog.Title style={[styles.dialogTitle, { color: colors.primary }]}>
          {achievement.name}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {achievement.description}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.primary}>
            Close
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialogContainer: {
    borderWidth: 1,
    borderRadius: 8,
    maxWidth: 500,
    width: "90%",
    alignSelf: "center",
  },
  dialogTitle: {
    fontWeight: "bold",
  },
});

export default AchievementDetailDialog;
