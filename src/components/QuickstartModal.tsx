import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Linking } from "react-native";

import {
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

import { useTutorial } from "../context/TutorialContext";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import AnimatedPaperButton from "./AnimatedButton";
import CustomIcon from "./CustomIcon";
import ModalCloseButton from "./ModalCloseButton";

interface QuickstartModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const QuickstartModal: React.FC<QuickstartModalProps> = ({
  visible,
  onDismiss,
}) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;
  const { startTutorial } = useTutorial();
  const [activeTab, setActiveTab] = useState("howtoplay");

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const buttons = [
    {
      value: "howtoplay",
      label: "Quickstart",
      style: styles.buttonStyle,
      checkedColor: colors.primary,
      uncheckedColor: colors.onSurfaceVariant,
    },
    {
      value: "tips",
      label: "Tips",
      style: styles.buttonStyle,
      checkedColor: colors.primary,
      uncheckedColor: colors.onSurfaceVariant,
    },
    {
      value: "info",
      label: "Info",
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
    fontWeight: "400" as const,
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContentContainer}
      >
        <Animated.View style={[styles.animatedDialogContainer, animatedStyle]}>
          <View
            style={[
              styles.dialogBase,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outline,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={{ flex: 1 }} />
              <ModalCloseButton onPress={onDismiss} />
            </View>
            <SegmentedButtons
              value={activeTab}
              onValueChange={setActiveTab}
              style={styles.segmentedButtons}
              density="medium"
              buttons={buttons}
            />
            <View style={styles.contentArea}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {activeTab === "howtoplay" && (
                  <>
                    <Text style={[styles.tabTitle, { color: colors.primary }]}>
                      How to Play
                    </Text>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
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
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        How:
                      </Text>{" "}
                      Tap a neighbor to advance (most similar are listed first).
                      Tap any word in your path or a neighbor to see its
                      definition.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
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
                      path) are highlighted. The game report analyzes your
                      choices against these.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Backtracking:
                      </Text>{" "}
                      Tap any word in your path to backtrack there. This keeps
                      your strategy flexible.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        New to word games?
                      </Text>{" "}
                      Try the tutorial for a guided walkthrough!
                    </Paragraph>
                    <View style={{ marginTop: 24, alignItems: "center" }}>
                      <AnimatedPaperButton
                        mode="contained"
                        onPress={() => {
                          onDismiss();
                          startTutorial();
                        }}
                        icon={() => (
                          <CustomIcon
                            source="school"
                            size={20}
                            color={colors.onPrimary}
                          />
                        )}
                        style={{ marginBottom: 16 }}
                      >
                        Start Tutorial
                      </AnimatedPaperButton>
                    </View>
                  </>
                )}

                {activeTab === "tips" && (
                  <>
                    <Text style={[styles.tabTitle, { color: colors.primary }]}>
                      Tips & Strategies
                    </Text>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Semantic Hubs:
                      </Text>{" "}
                      Look for polysemous words that can act as semantic hubs,
                      unlocking new regions of the word network.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Think Both Ways:
                      </Text>{" "}
                      Work backward from the target word too - there might be
                      obvious semantic bridges to aim for from that angle.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Path Visibility:
                      </Text>{" "}
                      Click on the arrows or dots in your path to show or hide
                      it on screen.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Use Definitions:
                      </Text>{" "}
                      Use word definitions to help plan your path and discover
                      unexpected connections.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Strategic Backtracking:
                      </Text>{" "}
                      Go sequentially backward through your path, remembering
                      where you went. Don't hesitate to recover known
                      checkpoints even if it costs a few moves.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Context Matters:
                      </Text>{" "}
                      Think about semantics in terms of the contexts in which
                      words appear, not just categories and traditional
                      dictionary definitions.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Word Selection:
                      </Text>{" "}
                      The wordlist has been designed to be common and
                      categorically evenly distributed via swadesh-style lists.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Learn the Landscape:
                      </Text>{" "}
                      Over time, you'll develop an intuitive sense of the
                      semantic topography - how different regions of meaning
                      connect and flow into each other.
                    </Paragraph>
                    <Paragraph style={[paragraphStyle, styles.paragraph]}>
                      <Text
                        style={[styles.boldText, { color: colors.primary }]}
                      >
                        Practice Daily:
                      </Text>{" "}
                      Regular practice helps you recognize common word
                      relationship patterns and improve your pathfinding skills.
                    </Paragraph>
                  </>
                )}

                {activeTab === "info" && (
                  <>
                    <Text style={[styles.tabTitle, { color: colors.primary }]}>
                      About Synapse
                    </Text>
                    <View style={styles.paragraph}>
                      <Text
                        style={[
                          styles.boldText,
                          {
                            fontSize: 16,
                            color: colors.primary,
                            marginBottom: 4,
                          },
                        ]}
                      >
                        Model
                      </Text>
                      <Paragraph style={paragraphStyle}>
                        Word relationships are powered by the{" "}
                        <Text
                          style={{
                            color: colors.primary,
                            textDecorationLine: "underline",
                          }}
                          onPress={() =>
                            Linking.openURL(
                              "https://ollama.com/library/nomic-embed-text",
                            )
                          }
                        >
                          nomic-embed-text:v1.5
                        </Text>{" "}
                        model (via Ollama).
                      </Paragraph>

                      <Text
                        style={[
                          styles.boldText,
                          {
                            fontSize: 16,
                            color: colors.primary,
                            marginBottom: 4,
                            marginTop: 12,
                          },
                        ]}
                      >
                        Vocabulary
                      </Text>
                      <Paragraph style={paragraphStyle}>
                        Custom, lemmatized word list (~5000 words).
                      </Paragraph>

                      <Text
                        style={[
                          styles.boldText,
                          {
                            fontSize: 16,
                            color: colors.primary,
                            marginBottom: 4,
                            marginTop: 12,
                          },
                        ]}
                      >
                        Daily Challenges
                      </Text>
                      <Paragraph style={paragraphStyle}>
                        New puzzles every day at midnight EST, with performance
                        tracking and achievements to unlock.
                      </Paragraph>

                      <Text
                        style={[
                          styles.boldText,
                          {
                            fontSize: 16,
                            color: colors.primary,
                            marginBottom: 4,
                            marginTop: 12,
                          },
                        ]}
                      >
                        Definitions
                      </Text>
                      <Paragraph style={paragraphStyle}>
                        Sourced from{" "}
                        <Text
                          style={{
                            color: colors.primary,
                            textDecorationLine: "underline",
                          }}
                          onPress={() =>
                            Linking.openURL("https://wordnet.princeton.edu/")
                          }
                        >
                          WordNet
                        </Text>
                        .
                      </Paragraph>

                      {/* Disclaimer */}
                      <Text
                        style={[
                          styles.boldText,
                          {
                            fontSize: 16,
                            color: colors.error,
                            marginBottom: 4,
                            marginTop: 16,
                            letterSpacing: 1,
                          },
                        ]}
                      >
                        DISCLAIMER
                      </Text>
                      <Paragraph
                        style={[
                          paragraphStyle,
                          {
                            color: colors.onSurfaceVariant,
                            fontStyle: "italic",
                            fontSize: 15,
                          },
                        ]}
                      >
                        Word embeddings encode meaning in a different way than
                        traditional dictionary definitions. They capture more
                        complex and nuanced relationships from the bodies of
                        text they are trained on. It is important to note that
                        there may be some relationships between words in the
                        already carefully-pruned vocabulary that are surprising
                        or offensive to some users. This is a feature of the
                        underlying model.
                      </Paragraph>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  animatedDialogContainer: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    flexShrink: 1,
  },
  dialogBase: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 15,
  },
  contentArea: {
    flex: 1,
    overflow: "hidden",
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
    paddingHorizontal: 24,
  },
  boldText: {
    fontWeight: "bold",
  },
  paragraph: {
    paddingHorizontal: 24,
  },
});

export default QuickstartModal;
