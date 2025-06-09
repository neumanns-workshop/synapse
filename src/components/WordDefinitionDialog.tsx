import React from "react";
import { ScrollView, StyleSheet, type ViewStyle, View } from "react-native";

import {
  Text,
  List,
  Divider,
  useTheme,
  Portal,
  Modal,
  Dialog as PaperDialog,
} from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import AnimatedPaperButton from "./AnimatedButton";
import CustomIcon from "./CustomIcon";
import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";

interface WordDefinitionDialogProps {
  word: string;
  visible: boolean;
  onDismiss: () => void;
  pathIndexInPlayerPath?: number | null;
}

const WordDefinitionDialog: React.FC<WordDefinitionDialogProps> = ({
  word,
  visible,
  onDismiss,
  pathIndexInPlayerPath,
}) => {
  const theme = useTheme() as ExtendedTheme;
  const { colors } = theme;

  const definitionsData = useGameStore((state) => state.definitionsData);
  const playerPath = useGameStore((state) => state.playerPath);
  const optimalChoices = useGameStore((state) => state.optimalChoices);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const backtrackToWord = useGameStore((state) => state.backtrackToWord);
  const backtrackHistory = useGameStore((state) => state.backtrackHistory);

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

  const renderListItemIcon = React.useCallback(
    (props: { color: string; style: ViewStyle }) => (
      <CustomIcon
        source="book-open-variant"
        size={24}
        color={colors.onSurface}
      />
    ),
    [colors.onSurface],
  );

  const canBacktrackToWord = React.useMemo(() => {
    const wordIndex =
      typeof pathIndexInPlayerPath === "number"
        ? pathIndexInPlayerPath
        : playerPath.indexOf(word);
    if (gameStatus !== "playing" || !playerPath || playerPath.length <= 1)
      return false;
    if (wordIndex <= 0 || wordIndex >= playerPath.length - 1) return false;
    const choiceIndex = wordIndex - 1;
    if (choiceIndex < 0 || choiceIndex >= optimalChoices.length) return false;
    const choice = optimalChoices[choiceIndex];
    return (
      (choice.isGlobalOptimal || choice.isLocalOptimal) &&
      !choice.usedAsCheckpoint &&
      !backtrackHistory.some((event) => event.landedOn === word)
    );
  }, [
    word,
    pathIndexInPlayerPath,
    playerPath,
    optimalChoices,
    gameStatus,
    backtrackHistory,
  ]);

  const handleBacktrack = () => {
    if (!canBacktrackToWord) return;
    const wordIndex =
      typeof pathIndexInPlayerPath === "number"
        ? pathIndexInPlayerPath
        : playerPath.indexOf(word);
    if (wordIndex === -1) {
      console.warn("Word not found in player path for backtracking.");
      return;
    }
    backtrackToWord(word, wordIndex);
    onDismiss();
  };

  if (!definitionsData || !word) {
    return null;
  }
  const definitions = definitionsData[word] || [];

  if (!visible && opacity.value === 0) {
    return null;
  }

  const buttonTextColor = theme.dark ? colors.onSurface : colors.primary;

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
            <PaperDialog.Title
              style={[styles.dialogTitle, { color: colors.primary }]}
            >
              {word}
            </PaperDialog.Title>
            <PaperDialog.Content>
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {definitions.length > 0 ? (
                  definitions.map((definition, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && (
                        <Divider
                          style={[
                            styles.divider,
                            { backgroundColor: colors.outline },
                          ]}
                        />
                      )}
                      <List.Item
                        title={`Definition ${index + 1}`}
                        description={definition}
                        descriptionNumberOfLines={0}
                        descriptionStyle={[
                          styles.definition,
                          { color: colors.onSurface },
                        ]}
                        titleStyle={{ color: colors.onSurface }}
                        left={renderListItemIcon}
                      />
                    </React.Fragment>
                  ))
                ) : (
                  <Text
                    style={[styles.noDefinition, { color: colors.onSurface }]}
                  >
                    No definition available for this word.
                  </Text>
                )}
              </ScrollView>
            </PaperDialog.Content>
            <PaperDialog.Actions>
              {canBacktrackToWord && (
                <AnimatedPaperButton
                  mode="text"
                  onPress={handleBacktrack}
                  icon={() => (
                    <CustomIcon
                      source="step-backward"
                      size={20}
                      color={buttonTextColor}
                    />
                  )}
                  textColor={buttonTextColor}
                >
                  Backtrack
                </AnimatedPaperButton>
              )}
              <AnimatedPaperButton
                onPress={onDismiss}
                textColor={buttonTextColor}
              >
                Close
              </AnimatedPaperButton>
            </PaperDialog.Actions>
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
    padding: 16,
  },
  animatedDialogContainer: {
    width: "90%",
    maxWidth: 700,
    maxHeight: "90%",
  },
  dialogBase: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
  },
  dialogTitle: {
    fontWeight: "bold",
  },
  scrollView: {
    maxHeight: 400, // Fixed height instead of percentage to prevent cutoff
    paddingHorizontal: 4, // Add some padding for better readability
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 8,
  },
  noDefinition: {
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
});

export default WordDefinitionDialog;
