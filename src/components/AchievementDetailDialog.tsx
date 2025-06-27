import React from "react";
import { StyleSheet, View } from "react-native";

import { Portal, Dialog, Text, useTheme } from "react-native-paper";

import type { Achievement } from "../features/achievements";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import AnimatedButton from "./AnimatedButton";
import CustomIcon from "./CustomIcon";
import ModalCloseButton from "./ModalCloseButton";

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
        <ModalCloseButton onPress={onDismiss} style={{ top: 12, right: 12 }} />
        <View style={styles.titleContainer}>
          <Dialog.Title style={[styles.dialogTitle, { color: colors.primary }]}>
            {achievement.name}
          </Dialog.Title>
          {/* <AnimatedButton
            mode="text"
            onPress={onDismiss}
            icon={() => (
              <CustomIcon source="close" size={24} color={colors.onSurface} />
            )}
            style={styles.closeButton}
            contentStyle={styles.closeButtonContent}
          >
            ""
          </AnimatedButton> */}
        </View>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {achievement.description}
          </Text>
        </Dialog.Content>
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 8,
  },
  dialogTitle: {
    fontWeight: "bold",
    flex: 1,
  },
  /* closeButton: {
    margin: 0,
    minWidth: 40,
    width: 40,
    height: 40,
  },
  closeButtonContent: {
    width: 40,
    height: 40,
    margin: 0,
  }, */
});

export default AchievementDetailDialog;
