import React from "react";
import { StyleSheet } from "react-native";
import { IconButton, useTheme } from "react-native-paper";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import CustomIcon from "./CustomIcon";

interface ModalCloseButtonProps {
  onPress: () => void;
  style?: object;
}

const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({
  onPress,
  style,
}) => {
  const { colors } = useTheme() as ExtendedTheme;

  return (
    <IconButton
      icon={() => (
        <CustomIcon source="close" size={24} color={colors.onSurface} />
      )}
      size={24}
      onPress={onPress}
      style={[styles.closeButton, style]}
    />
  );
};

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    right: 5,
    top: 5,
    zIndex: 1,
    margin: 0,
  },
});

export default ModalCloseButton;
