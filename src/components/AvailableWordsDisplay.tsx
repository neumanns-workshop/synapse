import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Chip, Text, Card, useTheme } from 'react-native-paper';
import { useGameStore } from '../stores/useGameStore';
import type { ExtendedTheme } from '../theme/SynapseTheme';

// Component to display available neighboring words for selection
const AvailableWordsDisplay = ({ onWordSelect }: { onWordSelect: (word: string) => void }) => {
  const { customColors, colors } = useTheme() as ExtendedTheme;
  
  // Get the graph data, current word, and available words from the game store
  const graphData = useGameStore((state) => state.graphData);
  const currentWord = useGameStore((state) => state.currentWord);
  const gameStatus = useGameStore((state) => state.gameStatus);
  
  // Only allow selection when the game is in playing mode
  const isPlaying = gameStatus === 'playing';

  // Derive available neighboring words from graph data
  const [availableWords, setAvailableWords] = useState<Array<{ word: string; similarity: number }>>([]);

  useEffect(() => {
    if (!graphData || !currentWord || !isPlaying) {
      setAvailableWords([]);
      return;
    }

    const edges = graphData[currentWord]?.edges || {};
    const words = Object.entries(edges).map(([word, similarity]) => ({
      word,
      similarity: similarity as number,
    }));

    // Sort by similarity (higher first)
    const sortedWords = [...words].sort((a, b) => b.similarity - a.similarity);
    setAvailableWords(sortedWords);
  }, [graphData, currentWord, isPlaying]);

  if (!isPlaying || !availableWords.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.transparentContent}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {availableWords.map((item) => (
            <Chip
              key={item.word}
              mode="outlined"
              onPress={() => onWordSelect(item.word)}
              style={[
                styles.wordChip,
                { borderColor: colors.onSurface }
              ]}
              textStyle={[styles.chipText, { color: colors.onSurface }]}
            >
              {item.word}
            </Chip>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 5,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  transparentContent: {
    backgroundColor: 'transparent',
  },
  scrollView: {
    maxHeight: 250,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
    paddingHorizontal: 12,
  },
  wordChip: {
    width: 160,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  chipText: {
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    fontSize: 15,
  },
});

export default AvailableWordsDisplay; 