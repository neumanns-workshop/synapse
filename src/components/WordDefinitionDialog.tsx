import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Dialog, Button, Text, List, Divider, useTheme } from 'react-native-paper';
import { useGameStore } from '../stores/useGameStore';
import type { ExtendedTheme } from '../theme/SynapseTheme';

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
  pathIndexInPlayerPath
}) => {
  const { colors, customColors } = useTheme() as ExtendedTheme;
  const definitionsData = useGameStore((state) => state.definitionsData);
  const playerPath = useGameStore((state) => state.playerPath);
  const optimalChoices = useGameStore((state) => state.optimalChoices);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const backtrackToWord = useGameStore((state) => state.backtrackToWord);
  
  // Check if this word is a valid backtracking point
  const canBacktrackToWord = React.useMemo(() => {
    // Use pathIndexInPlayerPath directly if it's a valid number
    const wordIndex = (typeof pathIndexInPlayerPath === 'number') ? pathIndexInPlayerPath : playerPath.indexOf(word);

    if (gameStatus !== 'playing' || !playerPath || playerPath.length <= 1) return false;
    
    if (wordIndex <= 0 || wordIndex >= playerPath.length - 1) return false; // Can't backtrack to first or last word
    
    // Check if it's an optimal choice that hasn't been used
    const choiceIndex = wordIndex - 1;
    if (choiceIndex < 0 || choiceIndex >= optimalChoices.length) return false;
    
    const choice = optimalChoices[choiceIndex];
    return (choice.isGlobalOptimal || choice.isLocalOptimal) && !choice.usedAsCheckpoint;
  }, [word, pathIndexInPlayerPath, playerPath, optimalChoices, gameStatus]);
  
  const handleBacktrack = () => {
    if (!canBacktrackToWord) return;
    
    // Use pathIndexInPlayerPath directly if it's a valid number
    const wordIndex = (typeof pathIndexInPlayerPath === 'number') ? pathIndexInPlayerPath : playerPath.indexOf(word);
    
    // Ensure wordIndex is valid before proceeding
    if (wordIndex === -1) {
      console.warn("Word not found in player path for backtracking.");
      return;
    }
    
    backtrackToWord(word, wordIndex);
    onDismiss(); // Close the dialog after backtracking
  };
  
  if (!definitionsData || !word) {
    return null;
  }
  
  const definitions = definitionsData[word] || [];
  
  return (
    <Dialog 
      visible={visible} 
      onDismiss={onDismiss} 
      style={[
        styles.dialog, 
        { 
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          borderWidth: 1,
        }
      ]}
    >
      <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold' }}>{word}</Dialog.Title>
      <Dialog.Content>
        <ScrollView style={styles.scrollView}>
          {definitions.length > 0 ? (
            definitions.map((definition, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />}
                <List.Item
                  title={`Definition ${index + 1}`}
                  description={definition}
                  descriptionNumberOfLines={10}
                  descriptionStyle={[styles.definition, { color: colors.onSurface }]}
                  titleStyle={{ color: colors.onSurface }}
                  left={props => <List.Icon {...props} icon="book-open-variant" color={colors.onSurface} />}
                />
              </React.Fragment>
            ))
          ) : (
            <Text style={[styles.noDefinition, { color: colors.onSurface }]}>No definition available for this word.</Text>
          )}
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions>
        {canBacktrackToWord && (
          <Button 
            mode="text" 
            onPress={handleBacktrack}
            icon="step-backward"
            textColor={colors.primary}
          >
            Backtrack
          </Button>
        )}
        <Button onPress={onDismiss} textColor={colors.primary}>Close</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  scrollView: {
    maxHeight: 300,
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 8,
  },
  noDefinition: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  }
});

export default WordDefinitionDialog; 