import React from "react";
import { View, StyleSheet } from "react-native";

import { Text, Button, Card } from "react-native-paper";

import { useTheme } from "../context/ThemeContext";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; onRetry: () => void }>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    // In production, you might want to send to crash reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            onRetry={this.handleRetry}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{
  error?: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  const { theme } = useTheme();
  const colors = theme.colors as ExtendedTheme["colors"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Card style={[styles.card, { backgroundColor: colors.errorContainer }]}>
        <Card.Content>
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: colors.onErrorContainer }]}
          >
            Something went wrong
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: colors.onErrorContainer }]}
          >
            An unexpected error occurred. Please try again.
          </Text>
          {__DEV__ && error && (
            <Text
              variant="bodySmall"
              style={[styles.errorDetails, { color: colors.onErrorContainer }]}
            >
              {error.message}
            </Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={onRetry}
            buttonColor={colors.primary}
            textColor={colors.onPrimary}
          >
            Try Again
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  message: {
    textAlign: "center",
    marginBottom: 16,
  },
  errorDetails: {
    fontFamily: "monospace",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.8,
  },
});

export default ErrorBoundary;
