import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CustomIconProps {
  source: string;
  size?: number;
  color?: string;
  style?: any;
}

const CustomIcon: React.FC<CustomIconProps> = ({ source, size = 24, color, style }) => {
  return (
    <MaterialCommunityIcons
      name={source as any}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default CustomIcon; 