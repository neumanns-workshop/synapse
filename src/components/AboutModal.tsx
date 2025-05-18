import React from "react";
import { View, Linking, StyleSheet } from "react-native";

import {
  Dialog,
  Button,
  Text,
  Paragraph,
  Portal,
  useTheme,
} from "react-native-paper";

import type { ExtendedTheme } from "../theme/SynapseTheme";

interface AboutModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ visible, onDismiss }) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[
          styles.dialogBase,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
          },
        ]}
      >
        <Dialog.Title style={[styles.boldText, { color: colors.primary }]}>
          How to Play
        </Dialog.Title>
        <Dialog.Content>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={[styles.boldText, { color: customColors.startNode }]}>
              Goal:
            </Text>{" "}
            Reach the{" "}
            <Text style={[styles.boldText, { color: customColors.endNode }]}>
              End
            </Text>{" "}
            word from the{" "}
            <Text style={[styles.boldText, { color: customColors.startNode }]}>
              Start
            </Text>{" "}
            word in the fewest moves by choosing related words.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={[styles.boldText, { color: colors.primary }]}>
              How:
            </Text>{" "}
            Tap a neighbor to advance (most similar are listed first). Tap any
            word in your path or a neighbor to see its definition.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={[styles.boldText, { color: colors.primary }]}>
              Track Your Path:
            </Text>{" "}
            Your path is shown below the graph.{" "}
            <Text
              style={[
                styles.boldText,
                {
                  color: customColors.globalOptimalNode,
                },
              ]}
            >
              Optimal Moves
            </Text>{" "}
            (on the shortest{" "}
            <Text style={[styles.boldText, { color: customColors.startNode }]}>
              Start
            </Text>
            -to-
            <Text style={[styles.boldText, { color: customColors.endNode }]}>
              End
            </Text>{" "}
            path) and{" "}
            <Text
              style={[
                styles.boldText,
                {
                  color: customColors.localOptimalNode,
                },
              ]}
            >
              Suggested Moves
            </Text>{" "}
            (shortest{" "}
            <Text
              style={[styles.boldText, { color: customColors.currentNode }]}
            >
              Current
            </Text>
            -to-
            <Text style={[styles.boldText, { color: customColors.endNode }]}>
              End
            </Text>{" "}
            path) are highlighted. The game report analyzes your choices against
            these.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={[styles.boldText, { color: colors.primary }]}>
              Backtracking:
            </Text>{" "}
            <Text
              style={[
                styles.underlineDottedText,
                {
                  color: customColors.globalOptimalNode,
                },
              ]}
            >
              Optimal
            </Text>{" "}
            and{" "}
            <Text
              style={[
                styles.underlineDottedText,
                {
                  color: customColors.localOptimalNode,
                },
              ]}
            >
              suggested moves
            </Text>{" "}
            in your path serve as single-use checkpoints. Tap a word to see its
            definition; if it is an unused checkpoint, a Backtrack button lets
            you revert to it. Used checkpoints are{" "}
            <Text style={[styles.greyedOutText, { color: colors.onSurface }]}>
              greyed out
            </Text>
            . Backtracks are logged in your report.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={[styles.boldText, { color: colors.error }]}>
              Stuck?
            </Text>{" "}
            If stuck, Give Up reveals the Optimal Path, a Suggested Path (if
            applicable), and a full game analysis.
          </Paragraph>
          <View
            style={[
              styles.divider,
              {
                borderBottomColor: colors.outline,
              },
            ]}
          />
          <Text
            style={[
              styles.acknowledgementsTitle,
              {
                color: colors.onSurface,
              },
            ]}
          >
            Acknowledgements
          </Text>
          <Paragraph style={{ color: colors.onSurfaceVariant }}>
            Word relationships derived from{" "}
            <Text style={styles.italicText}>
              nomic-embed-text:137m-v1.5-fp16
            </Text>{" "}
            embeddings (via Ollama).
          </Paragraph>
          <Paragraph style={{ color: colors.onSurfaceVariant }}>
            Vocabulary based on a custom, lemmatized word list (~5000 words,
            subject to change).
          </Paragraph>
          <Paragraph style={{ color: colors.onSurfaceVariant }}>
            Definitions sourced from{" "}
            <Text
              style={{ color: colors.primary }}
              onPress={() => Linking.openURL("https://wordnet.princeton.edu/")}
            >
              WordNet
            </Text>
            .
          </Paragraph>
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
  dialogBase: {
    borderWidth: 1,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  boldText: {
    fontWeight: "bold",
  },
  underlineDottedText: {
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
  greyedOutText: {
    opacity: 0.6,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: 8,
  },
  acknowledgementsTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  italicText: {
    fontStyle: "italic",
  },
});

export default AboutModal;
