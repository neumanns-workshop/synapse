import React from "react";
import { StyleProp, TextStyle } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CustomIconProps {
  source: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

const CustomIcon: React.FC<CustomIconProps> = ({
  source,
  size = 24,
  color,
  style,
}) => {
  return (
    <MaterialCommunityIcons
      name={source as keyof typeof MaterialCommunityIcons.glyphMap}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default CustomIcon;
