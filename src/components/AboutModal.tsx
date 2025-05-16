import React from 'react';
import { View, Linking } from 'react-native';
import { Dialog, Button, Text, Paragraph, Portal, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '../theme/SynapseTheme';

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
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          borderWidth: 1,
          maxWidth: 700,
          width: '100%',
          alignSelf: 'center'
        }}
      >
        <Dialog.Title style={{ color: colors.primary, fontWeight: 'bold' }}>How to Play</Dialog.Title>
        <Dialog.Content>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={{ fontWeight: 'bold', color: customColors.startNode }}>Goal:</Text> Reach the <Text style={{ fontWeight: 'bold', color: customColors.endNode }}>End</Text> word from the <Text style={{ fontWeight: 'bold', color: customColors.startNode }}>Start</Text> word in the fewest moves by choosing related words.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={{ fontWeight: 'bold', color: colors.primary }}>How:</Text> Tap a neighbor to advance (most similar are listed first). Tap any word in your path or a neighbor to see its definition.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={{ fontWeight: 'bold', color: colors.primary }}>Track Your Path:</Text> Your path is shown below the graph. <Text style={{ fontWeight: 'bold', color: customColors.globalOptimalNode }}>Optimal Moves</Text> (on the shortest <Text style={{ fontWeight: 'bold', color: customColors.startNode }}>Start</Text>-to-<Text style={{ fontWeight: 'bold', color: customColors.endNode }}>End</Text> path) and <Text style={{ fontWeight: 'bold', color: customColors.localOptimalNode }}>Suggested Moves</Text> (shortest <Text style={{ fontWeight: 'bold', color: customColors.currentNode }}>Current</Text>-to-<Text style={{ fontWeight: 'bold', color: customColors.endNode }}>End</Text> path) are highlighted. The game report analyzes your choices against these.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={{ fontWeight: 'bold', color: colors.primary }}>Backtracking:</Text> <Text style={{ color: customColors.globalOptimalNode, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>Optimal</Text> and <Text style={{ color: customColors.localOptimalNode, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>suggested moves</Text> in your path serve as single-use checkpoints. Tap a word to see its definition; if it's an unused checkpoint, a "Backtrack" button lets you revert to it. Used checkpoints are <Text style={{ color: colors.onSurface, opacity: 0.6 }}>greyed out</Text>. Backtracks are logged in your report.
          </Paragraph>
          <Paragraph style={{ color: colors.onSurface }}>
            <Text style={{ fontWeight: 'bold', color: colors.error }}>Stuck?</Text> If stuck, "Give Up" reveals the Optimal Path, a Suggested Path (if applicable), and a full game analysis.
          </Paragraph>
          
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.outline, marginVertical: 8 }} />
          <Text style={{ color: colors.onSurface, fontWeight: 'bold', marginBottom: 4 }}>Acknowledgements</Text>
          <Paragraph style={{ color: colors.onSurfaceVariant }}>
            Word relationships derived from <Text style={{ fontStyle: 'italic' }}>nomic-embed-text:137m-v1.5-fp16</Text> embeddings (via Ollama).
          </Paragraph>
          <Paragraph style={{ color: colors.onSurfaceVariant }}>
            Vocabulary based on a custom, lemmatized word list (~5000 words, subject to change).
          </Paragraph>
          <Paragraph style={{ color: colors.onSurfaceVariant }}>
            Definitions sourced from <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://wordnet.princeton.edu/')}>WordNet</Text>.
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.primary}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default AboutModal; 