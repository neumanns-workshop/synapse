import React, { useState } from "react";
import { View, Linking, StyleSheet } from "react-native";

import {
  Dialog,
  Text,
  Paragraph,
  Portal,
  useTheme,
  Modal,
  SegmentedButtons,
} from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import AnimatedPaperButton from "./AnimatedButton";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import { useTutorial } from '../context/TutorialContext';

interface AboutModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ visible, onDismiss }) => {
  const { customColors, colors, roundness } = useTheme() as ExtendedTheme;
  const { startTutorial } = useTutorial();
  const [activeTab, setActiveTab] = useState("howToPlay");

  // Scale animation value
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  // Update animation values when visibility changes
  React.useEffect(() => {
    if (visible) {
      // Animate in
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Reset for next time
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const buttons = [
    {
      value: "howToPlay",
      label: "How to Play",
      style: styles.buttonStyle,
      checkedColor: colors.primary,
      uncheckedColor: colors.onSurfaceVariant,
    },
    {
      value: "acknowledgments",
      label: "Acknowledgments",
      style: styles.buttonStyle,
      checkedColor: colors.primary,
      uncheckedColor: colors.onSurfaceVariant,
    },
    {
      value: "contact",
      label: "Contact",
      style: styles.buttonStyle,
      checkedColor: colors.primary,
      uncheckedColor: colors.onSurfaceVariant,
    },
  ];

  const paragraphStyle = {
    color: colors.onSurface,
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 18,
    fontWeight: '400' as const,
  };

  // Add a disclaimer style
  const disclaimerStyle = {
    ...paragraphStyle,
    color: colors.onSurfaceVariant,
    fontSize: 15,
    marginTop: 16,
    fontStyle: 'italic' as const,
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer]}
      >
        <Animated.View style={[animatedStyle, styles.animatedContainer]}>
          <Dialog
            visible={true} // Always visible as parent Modal controls actual visibility
            onDismiss={onDismiss}
            style={[
              styles.dialogBase,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outline,
                borderRadius: roundness * 2, // Apply borderRadius dynamically
              },
            ]}
          >
            <Dialog.Content>
              <SegmentedButtons
                value={activeTab}
                onValueChange={setActiveTab}
                style={styles.segmentedButtons}
                density="medium"
                buttons={buttons}
              />

              {activeTab === "howToPlay" && (
                <>
                  <Dialog.Title
                    style={[
                      styles.tabTitle,
                      { color: colors.primary },
                    ]}
                  >
                    How to Play
                  </Dialog.Title>
                  <Paragraph style={paragraphStyle}>
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.startNode },
                      ]}
                    >
                      Goal:
                    </Text>{" "}
                    Reach the{" "}
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.endNode },
                      ]}
                    >
                      Target
                    </Text>{" "}
                    word from the{" "}
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.startNode },
                      ]}
                    >
                      Start
                    </Text>{" "}
                    word in the fewest moves by choosing related words.
                  </Paragraph>
                  <Paragraph style={paragraphStyle}>
                    <Text style={[styles.boldText, { color: colors.primary }]}>
                      How:
                    </Text>{" "}
                    Tap a neighbor to advance (most similar are listed first). Tap
                    any word in your path or a neighbor to see its definition.
                  </Paragraph>
                  <Paragraph style={paragraphStyle}>
                    <Text style={[styles.boldText, { color: colors.primary }]}>
                      Track Your Path:
                    </Text>{" "}
                    Your path is shown below the graph.{" "}
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.globalOptimalNode },
                      ]}
                    >
                      Optimal Moves
                    </Text>{" "}
                    (on the shortest{" "}
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.startNode },
                      ]}
                    >
                      Start
                    </Text>
                    -to-
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.endNode },
                      ]}
                    >
                      Target
                    </Text>{" "}
                    path) and{" "}
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.localOptimalNode },
                      ]}
                    >
                      Suggested Moves
                    </Text>{" "}
                    (shortest{" "}
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.currentNode },
                      ]}
                    >
                      Current
                    </Text>
                    -to-
                    <Text
                      style={[
                        styles.boldText,
                        { color: customColors.endNode },
                      ]}
                    >
                      Target
                    </Text>{" "}
                    path) are highlighted. The game report analyzes your choices
                    against these.
                  </Paragraph>
                  <Paragraph style={paragraphStyle}>
                    <Text style={[styles.boldText, { color: colors.primary }]}>
                      Backtracking:
                    </Text>{" "}
                    <Text
                      style={[
                        styles.underlineDottedText,
                        { color: customColors.globalOptimalNode },
                      ]}
                    >
                      Optimal
                    </Text>{" "}
                    and{" "}
                    <Text
                      style={[
                        styles.underlineDottedText,
                        { color: customColors.localOptimalNode },
                      ]}
                    >
                      suggested moves
                    </Text>{" "}
                    in your path serve as single-use checkpoints. Tap a word to see
                    its definition; if it is an unused checkpoint, a Backtrack
                    button lets you revert to it. Used checkpoints are{" "}
                    <Text
                      style={[
                        styles.greyedOutText,
                        { color: colors.onSurface },
                      ]}
                    >
                      greyed out
                    </Text>
                    . Backtracks are logged in your report.
                  </Paragraph>
                  <Paragraph style={paragraphStyle}>
                    <Text style={[styles.boldText, { color: colors.error }]}>Stuck?</Text>{' '}
                    If stuck, <Text style={[styles.boldText, { color: colors.error }]}>Give Up</Text> reveals the <Text style={[styles.boldText, { color: customColors.globalOptimalNode }]}>Optimal Path</Text>, a <Text style={[styles.boldText, { color: customColors.localOptimalNode }]}>Suggested Path</Text> (if applicable), and a full game analysis.
                  </Paragraph>
                  <View style={{ marginTop: 24, alignItems: 'center' }}>
                    <AnimatedPaperButton
                      mode="contained"
                      onPress={() => {
                        onDismiss();
                        setTimeout(() => {
                          startTutorial();
                        }, 300); // Wait for modal close animation
                      }}
                      style={{ minWidth: 180 }}
                    >
                      Replay Tutorial
                    </AnimatedPaperButton>
                  </View>
                </>
              )}

              {activeTab === "acknowledgments" && (
                <>
                  <Dialog.Title
                    style={[
                      styles.tabTitle,
                      { color: colors.primary },
                    ]}
                  >
                    Acknowledgments
                  </Dialog.Title>

                  {/* Model */}
                  <Text style={[styles.boldText, { fontSize: 16, color: colors.primary, marginBottom: 4 }]}>Model</Text>
                  <Paragraph style={paragraphStyle}>
                    Word relationships are powered by the{' '}
                    <Text
                      style={{ color: colors.primary, textDecorationLine: 'underline' }}
                      onPress={() => Linking.openURL('https://ollama.com/library/nomic-embed-text')}
                    >
                      nomic-embed-text:v1.5
                    </Text>{' '}model (via Ollama).
                  </Paragraph>

                  {/* Vocabulary */}
                  <Text style={[styles.boldText, { fontSize: 16, color: colors.primary, marginBottom: 4, marginTop: 12 }]}>Vocabulary</Text>
                  <Paragraph style={paragraphStyle}>
                    Custom, lemmatized word list (~5000 words).
                  </Paragraph>

                  {/* Definitions */}
                  <Text style={[styles.boldText, { fontSize: 16, color: colors.primary, marginBottom: 4, marginTop: 12 }]}>Definitions</Text>
                  <Paragraph style={paragraphStyle}>
                    Sourced from{' '}
                    <Text
                      style={{ color: colors.primary, textDecorationLine: 'underline' }}
                      onPress={() => Linking.openURL('https://wordnet.princeton.edu/')}
                    >
                      WordNet
                    </Text>.
                  </Paragraph>

                  {/* Disclaimer */}
                  <Text style={[styles.boldText, { fontSize: 16, color: colors.error, marginBottom: 4, marginTop: 16, letterSpacing: 1 }]}>DISCLAIMER</Text>
                  <Paragraph style={[paragraphStyle, { color: colors.onSurfaceVariant, fontStyle: 'italic', fontSize: 15 }] }>
                    Word embeddings encode meaning in a different way than traditional dictionary definitions. They capture more complex and nuanced relationships from the bodies of text they are trained on. It is important to note that there may be some relationships between words in the already carefully-pruned vocabulary that are surprising or offensive to some users. This is a feature of the underlying model.
                  </Paragraph>
                </>
              )}

              {activeTab === "contact" && (
                <>
                  <Dialog.Title
                    style={[
                      styles.tabTitle,
                      { color: colors.primary },
                    ]}
                  >
                    Contact
                  </Dialog.Title>
                  <Paragraph style={paragraphStyle}>
                    Have feedback, found a bug, or want to request a feature? Reach out any time:
                  </Paragraph>
                  <Paragraph style={[paragraphStyle, { marginTop: 8, marginBottom: 0 }] }>
                    <Text
                      style={{ color: colors.primary, textDecorationLine: 'underline' }}
                      onPress={() => Linking.openURL('mailto:synapse@neumannsworkshop.com')}
                    >
                      synapse@neumannsworkshop.com
                    </Text>
                  </Paragraph>
                </>
              )}
            </Dialog.Content>
          </Dialog>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  animatedContainer: {
    width: "100%",
  },
  dialogBase: {
    borderWidth: 1,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonStyle: {
    flex: 1,
  },
  tabTitle: {
    fontWeight: "bold",
    fontSize: 22,
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
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
  italicText: {
    fontStyle: "italic",
  },
});

export default AboutModal;
