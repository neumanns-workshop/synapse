import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Portal,
  Text,
  useTheme,
  Modal,
  Dialog as PaperDialog,
} from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import type { Achievement } from "../features/achievements";
import type { ExtendedTheme } from "../theme/SynapseTheme";
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

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.back(1.5)),
      });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      scale.value = withTiming(0.9, {
        duration: 150,
        easing: Easing.in(Easing.ease),
      });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity]);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  if (!achievement) return null;

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContentContainer}
      >
        <Animated.View
          style={[styles.animatedDialogContainer, animatedContentStyle]}
        >
          <View
            style={[
              styles.dialogBase,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outline,
              },
            ]}
          >
            <ModalCloseButton
              onPress={onDismiss}
              style={{ top: 12, right: 12 }}
            />
            <View style={styles.titleContainer}>
              <PaperDialog.Title
                style={[styles.dialogTitle, { color: colors.primary }]}
              >
                {achievement.name}
              </PaperDialog.Title>
            </View>
            <PaperDialog.Content style={styles.contentContainer}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.descriptionText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {achievement.description}
              </Text>
            </PaperDialog.Content>
          </View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContentContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 20,
  },
  animatedDialogContainer: {
    width: "100%",
    maxWidth: 500,
  },
  dialogBase: {
    borderRadius: 16,
    borderWidth: 1,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 48, // space for close button
    paddingLeft: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  dialogTitle: {
    fontWeight: "bold",
    fontSize: 22,
    lineHeight: 28,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default AchievementDetailDialog;
