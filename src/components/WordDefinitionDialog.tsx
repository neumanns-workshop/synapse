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

import { useGameStore } from "../stores/useGameStore";
import type { ExtendedTheme } from "../theme/SynapseTheme";
import AnimatedPaperButton from "./AnimatedButton";
import CustomIcon from "./CustomIcon";

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
  const { colors, customColors } = theme;

  const definitionsData = useGameStore((state) => state.definitionsData);
  const playerPath = useGameStore((state) => state.playerPath);
  const optimalChoices = useGameStore((state) => state.optimalChoices);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const backtrackToWord = useGameStore((state) => state.backtrackToWord);
  const backtrackHistory = useGameStore((state) => state.backtrackHistory);

  // Get current game report for post-game optimal choice info
  const gameReportModalReport = useGameStore(
    (state) => state.gameReportModalReport,
  );

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

  // Calculate optimal choice information for post-game analysis
  const optimalChoiceInfo = React.useMemo(() => {
    // Only show for completed games
    if (gameStatus === "playing" || !gameReportModalReport) return null;

    const wordIndex =
      typeof pathIndexInPlayerPath === "number"
        ? pathIndexInPlayerPath
        : playerPath.indexOf(word);

    // Only show for words that were the result of a choice (not the start word)
    if (wordIndex <= 0) return null;

    const choiceIndex = wordIndex - 1;
    const reportOptimalChoices = gameReportModalReport.optimalChoices;

    if (choiceIndex < 0 || choiceIndex >= reportOptimalChoices.length)
      return null;

    const choice = reportOptimalChoices[choiceIndex];

    // Only show if this was a suboptimal choice
    if (choice.isGlobalOptimal || choice.isLocalOptimal) return null;

    return {
      playerChoice: choice.playerChose,
      optimalChoice: choice.optimalChoice,
      playerPosition: choice.playerPosition,
      isGlobalOptimal: choice.isGlobalOptimal,
      isLocalOptimal: choice.isLocalOptimal,
    };
  }, [
    gameStatus,
    gameReportModalReport,
    word,
    pathIndexInPlayerPath,
    playerPath,
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
            <View style={styles.titleContainer}>
              <PaperDialog.Title
                style={[styles.dialogTitle, { color: colors.primary }]}
              >
                {word}
              </PaperDialog.Title>
              <AnimatedPaperButton
                mode="text"
                onPress={onDismiss}
                icon={() => (
                  <CustomIcon
                    source="close"
                    size={24}
                    color={colors.onSurface}
                  />
                )}
                style={styles.closeButton}
                contentStyle={styles.closeButtonContent}
              >
                ""
              </AnimatedPaperButton>
            </View>
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

                {/* Show optimal choice information for completed games */}
                {optimalChoiceInfo && (
                  <>
                    <Divider
                      style={[
                        styles.divider,
                        { backgroundColor: colors.outline, marginVertical: 12 },
                      ]}
                    />
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.optimalChoiceText,
                        { color: colors.onSurface },
                      ]}
                    >
                      Optimal:{" "}
                      <Text
                        style={{
                          fontWeight: "bold",
                          color: customColors.globalOptimalNode,
                        }}
                      >
                        {optimalChoiceInfo.optimalChoice}
                      </Text>
                    </Text>
                  </>
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
    maxHeight: "80%",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 8,
  },
  dialogTitle: {
    fontWeight: "bold",
    fontSize: 20,
    flex: 1,
  },
  closeButton: {
    margin: 0,
    minWidth: 40,
    width: 40,
    height: 40,
  },
  closeButtonContent: {
    width: 40,
    height: 40,
    margin: 0,
  },
  scrollView: {
    maxHeight: 400,
  },
  definition: {
    fontSize: 16,
    lineHeight: 24,
  },
  noDefinition: {
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  optimalChoiceText: {
    lineHeight: 20,
  },
});

export default WordDefinitionDialog;
