import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useTheme, Text } from "react-native-paper";

import GraphVisualization from "../components/GraphVisualization";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { useGameStore } from "../stores/useGameStore";
import type { GameReport } from "../utils/gameReportUtils";
import { generateEnhancedGameDeepLink } from "../services/SharingService";

// Import t-SNE coordinates for coordinate reconstruction
import tsneCoordinates from "../../data/tsne_coordinates.json";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PreviewImageScreenProps {
  // These will be parsed from URL parameters - no props needed as we get everything from URL
}

/**
 * Reconstruct the player path words from coordinate data and quality encoding
 */
const reconstructPlayerPathFromCoordinates = (
  coordinates: Array<{ x: number; y: number }>,
  quality: string,
  startWord: string,
  targetWord: string,
  coordinatesData: Record<string, [number, number]>,
): string[] => {
  const playerPath: string[] = [startWord];

  // If we have coordinate data, try to match the coordinates to actual words
  if (coordinates.length > 1) {
    // Create a reverse lookup for coordinates to words
    const coordToWord = new Map<string, string>();
    Object.entries(coordinatesData).forEach(([word, [x, y]]) => {
      const key = `${Math.round(x * 10)},${Math.round(y * 10)}`;
      coordToWord.set(key, word);
    });

    // Try to match each coordinate to a word
    for (let i = 1; i < coordinates.length - 1; i++) {
      const coord = coordinates[i];
      const key = `${Math.round(coord.x * 10)},${Math.round(coord.y * 10)}`;
      const word = coordToWord.get(key);

      if (word && word !== startWord && word !== targetWord) {
        playerPath.push(word);
      } else {
        // Fallback: find closest word to this coordinate
        let closestWord = "";
        let minDistance = Infinity;

        Object.entries(coordinatesData).forEach(([candidateWord, [x, y]]) => {
          if (candidateWord === startWord || candidateWord === targetWord)
            return;

          const distance = Math.sqrt((x - coord.x) ** 2 + (y - coord.y) ** 2);
          if (distance < minDistance) {
            minDistance = distance;
            closestWord = candidateWord;
          }
        });

        if (closestWord && minDistance < 50) {
          // Only add if reasonably close
          playerPath.push(closestWord);
        }
      }
    }
  }

  // Always end with target word
  playerPath.push(targetWord);

  return playerPath;
};

/**
 * Reconstruct GameReport from URL parameters for preview generation
 */
const reconstructGameReportFromParams = (
  urlParams: URLSearchParams,
): GameReport | null => {
  const type = urlParams.get("type");
  const startWord = urlParams.get("start");
  const targetWord = urlParams.get("target");
  const quality = urlParams.get("quality") || "";
  const tsne = urlParams.get("tsne") || "";
  const _share = urlParams.get("share") || "";
  const date = urlParams.get("date"); // For daily challenges

  if (!type || !startWord || !targetWord) {
    return null;
  }

  // Decode coordinates from tsne parameter
  const coordinates: Array<{ x: number; y: number }> = [];
  const coordinatesData = tsneCoordinates as unknown as Record<
    string,
    [number, number]
  >;

  if (tsne) {
    const points = tsne.split(";");
    points.forEach((point) => {
      const [xStr, yStr] = point.split(",");
      if (xStr && yStr) {
        // Convert back from base36 and divide by 10 to restore decimal
        const x = parseInt(xStr, 36) / 10;
        const y = parseInt(yStr, 36) / 10;
        coordinates.push({ x, y });
      }
    });
  }

  // Reconstruct player path from coordinates and quality data
  let playerPath: string[];
  if (coordinates.length > 0) {
    playerPath = reconstructPlayerPathFromCoordinates(
      coordinates,
      quality,
      startWord,
      targetWord,
      coordinatesData,
    );
  } else {
    // Minimal fallback path
    playerPath = [startWord, targetWord];
  }

  // Determine game status from quality encoding
  let status: "won" | "given_up" = "won";
  if (quality.includes("C")) {
    // Has current position marker, indicating gave up
    status = "given_up";
  } else if (quality.includes("R")) {
    // Has remaining path, indicating gave up
    status = "given_up";
  }

  // Create GameReport for preview
  const gameReport: GameReport = {
    id: `preview_${startWord}_${targetWord}_${Date.now()}`,
    timestamp: Date.now(),
    startWord,
    targetWord,
    playerPath,
    totalMoves: playerPath.length - 1,
    moveAccuracy: 1.0,
    status,
    isDailyChallenge: type === "dailychallenge",
    dailyChallengeId: date || undefined,

    // Required fields for GraphVisualization
    optimalPath: [startWord, targetWord], // Simplified
    suggestedPath:
      status === "given_up"
        ? [playerPath[playerPath.length - 1], targetWord]
        : [],
    optimalMovesMade: 0,
    optimalChoices: [],
    missedOptimalMoves: [],
    playerSemanticDistance: 0,
    optimalSemanticDistance: 0,
    averageSimilarity: null,
    pathEfficiency: 1.0,
    aiPath: [],
    aiModel: null,
    backtrackEvents: [],
    earnedAchievements: [],
    potentialRarestMoves: [],
  };

  return gameReport;
};

const PreviewImageScreen: React.FC<PreviewImageScreenProps> = () => {
  const theme = useTheme();
  const [gameReport, setGameReport] = useState<GameReport | null>(null);
  const [challengeLink, setChallengeLink] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  // Load initial data
  const loadInitialData = useGameStore((state) => state.loadInitialData);

  useEffect(() => {
    const initializePreview = async () => {
      try {
        // Load essential data first
        await loadInitialData();

        // Parse URL parameters
        const urlParams = new URLSearchParams(
          Platform.OS === "web" && typeof window !== "undefined"
            ? window.location.search
            : "",
        );

        // Reconstruct GameReport from parameters
        const reconstructedReport = reconstructGameReportFromParams(urlParams);
        if (reconstructedReport) {
          setGameReport(reconstructedReport);

          // Recreate the challenge link for QR code
          const type = urlParams.get("type") as "challenge" | "dailychallenge";
          const startWord = urlParams.get("start") || "";
          const targetWord = urlParams.get("target") || "";
          const theme = urlParams.get("theme");
          const share = urlParams.get("share");
          const quality = urlParams.get("quality");
          const tsne = urlParams.get("tsne");
          const date = urlParams.get("date");

          const link = generateEnhancedGameDeepLink(
            type,
            startWord,
            targetWord,
            theme || undefined,
            share || undefined,
            quality || undefined,
            tsne || undefined,
            date || undefined,
          );
          setChallengeLink(link);
        }

        setIsReady(true);
      } catch (error) {
        console.error("Error initializing preview:", error);
        setIsReady(true); // Show error state
      }
    };

    initializePreview();
  }, [loadInitialData]);

  // Show loading state while initializing
  if (!isReady) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <Text>Loading preview...</Text>
      </View>
    );
  }

  // Show error state if no game report
  if (!gameReport) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <Text>Invalid preview parameters</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      testID="preview-container"
    >
      {/* Graph preview with identical styling to GameReportModal */}
      <View style={{ position: "relative" }}>
        <View
          style={[
            styles.graphPreviewContainer,
            { borderColor: theme.colors.outline },
          ]}
        >
          <GraphVisualization
            height={180}
            gameReport={gameReport}
            pathDisplayModeOverride={{
              player: true,
              optimal: false,
              suggested: false,
            }}
          />
        </View>
        {/* QR code overlay - exact same as sharing dialog */}
        <QRCodeDisplay value={challengeLink} size={60} overlay />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    width: 600,
    height: 400,
  },
  // Exact same styles as GameReportModal
  graphPreviewContainer: {
    height: 180,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
  },
});

export default PreviewImageScreen;
