import React from "react";
import { View, StyleSheet, Text, Platform } from "react-native";

import { useTheme } from "react-native-paper";

// Type definitions for QR code components
interface QRCodeWebProps {
  value: string;
  size: number;
  bgColor: string;
  fgColor: string;
}

interface QRCodeNativeProps {
  value: string;
  size: number;
  backgroundColor: string;
  color: string;
}

// Platform-specific QR code imports
let QRCode: React.ComponentType<QRCodeWebProps> | null = null;
let QRCodeSVG: React.ComponentType<QRCodeNativeProps> | null = null;

if (Platform.OS === "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    QRCode = require("react-qr-code").default;
  } catch (e) {
    console.warn("react-qr-code not available for web");
  }
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    QRCodeSVG = require("react-native-qrcode-svg").default;
  } catch (e) {
    console.warn("react-native-qrcode-svg not available for native");
  }
}

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  overlay?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 120,
  overlay = false,
}) => {
  const theme = useTheme();

  const renderQRCode = () => {
    if (Platform.OS === "web" && QRCode) {
      return (
        <QRCode
          value={value}
          size={size}
          bgColor={theme.colors.surface}
          fgColor={theme.colors.onSurface}
        />
      );
    } else if (Platform.OS !== "web" && QRCodeSVG) {
      return (
        <QRCodeSVG
          value={value}
          size={size}
          backgroundColor={theme.colors.surface}
          color={theme.colors.onSurface}
        />
      );
    } else {
      return (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            QR
          </Text>
        </View>
      );
    }
  };

  if (overlay) {
    return (
      <View
        style={[
          styles.overlayContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        {renderQRCode()}
        <Text style={[styles.overlayLabel, { color: theme.colors.onSurface }]}>
          Play
        </Text>
      </View>
    );
  }

  return <View style={styles.container}>{renderQRCode()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overlayLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  fallback: {
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
