// ============================================================================
// COMPRESSION DEBUG UTILITIES
// Use these in your app to test and verify compression is working
// ============================================================================

import { unifiedDataStore } from "../services/UnifiedDataStore";
import { StorageSizeEstimator, DataCompressor } from "./dataCompression";

export class CompressionDebug {
  /**
   * Test compression on current user data and log results
   */
  static async testCurrentDataCompression(): Promise<void> {
    try {
      console.log("🧪 Testing compression on current user data...");

      const currentData = await unifiedDataStore.exportData();
      const sizeInfo = StorageSizeEstimator.estimateSize(currentData);

      console.log("📊 Compression Results:");
      console.log(
        `   Original size: ${sizeInfo.original} bytes (${(sizeInfo.original / 1024).toFixed(1)} KB)`,
      );
      console.log(
        `   Compressed size: ${sizeInfo.compressed} bytes (${(sizeInfo.compressed / 1024).toFixed(1)} KB)`,
      );
      console.log(`   Savings: ${sizeInfo.savings}% reduction`);

      // Test specific components
      await this.testAchievementCompression(currentData);
      await this.testGameHistoryCompression(currentData);
    } catch (error) {
      console.error("❌ Error testing compression:", error);
    }
  }

  /**
   * Test achievement compression specifically
   */
  static async testAchievementCompression(data?: any): Promise<void> {
    try {
      const currentData = data || (await unifiedDataStore.exportData());
      const achievements = currentData.achievements;

      if (!achievements || achievements.unlockedIds.length === 0) {
        console.log("🏆 No achievements to test compression on");
        return;
      }

      const originalSize = JSON.stringify(achievements).length;
      const compressed = DataCompressor.compress({ achievements });
      const compressedSize = JSON.stringify(compressed.achievements).length;
      const savings = Math.round(
        ((originalSize - compressedSize) / originalSize) * 100,
      );

      console.log("🏆 Achievement Compression:");
      console.log(
        `   Unlocked: ${achievements.unlockedIds.length} achievements`,
      );
      console.log(`   Original: ${originalSize} bytes`);
      console.log(`   Compressed: ${compressedSize} bytes`);
      console.log(`   Savings: ${savings}%`);
    } catch (error) {
      console.error("❌ Error testing achievement compression:", error);
    }
  }

  /**
   * Test game history compression specifically
   */
  static async testGameHistoryCompression(data?: any): Promise<void> {
    try {
      const currentData = data || (await unifiedDataStore.exportData());
      const gameHistory = currentData.gameHistory;

      if (!gameHistory || gameHistory.length === 0) {
        console.log("🎮 No game history to test compression on");
        return;
      }

      const originalSize = JSON.stringify(gameHistory).length;
      const compressed = DataCompressor.compress({ gameHistory });
      const compressedSize = JSON.stringify(compressed.gameHistory).length;
      const savings = Math.round(
        ((originalSize - compressedSize) / originalSize) * 100,
      );

      console.log("🎮 Game History Compression:");
      console.log(`   Games: ${gameHistory.length} games`);
      console.log(`   Original: ${originalSize} bytes`);
      console.log(`   Compressed: ${compressedSize} bytes`);
      console.log(`   Savings: ${savings}%`);
    } catch (error) {
      console.error("❌ Error testing game history compression:", error);
    }
  }

  /**
   * Generate mock data to test compression at scale
   */
  static async testCompressionAtScale(): Promise<void> {
    try {
      console.log("📈 Testing compression at scale with mock data...");

      // Generate mock data with many achievements and games
      const mockData = {
        achievements: {
          unlockedIds: [
            "straight-and-narrow",
            "juggernaut",
            "here-be-dragons",
            "dancing-to-different-beat",
            "not-all-who-wander-are-lost",
            "six-feet-from-the-edge",
            "forgot-my-keys",
            "comeback-kid",
          ],
          viewedIds: ["straight-and-narrow", "juggernaut"],
          unlockTimestamps: {
            "straight-and-narrow": Date.now(),
            juggernaut: Date.now() - 86400000,
            "here-be-dragons": Date.now() - 172800000,
          },
          progressiveCounters: {
            "slow-and-steady": 15,
            "loose-cannon": 3,
          },
          schemaVersion: 1,
        },
        gameHistory: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `game-${i}`,
            timestamp: Date.now() - i * 3600000, // 1 hour apart
            startWord: "start",
            targetWord: "finish",
            playerPath: ["start", "middle", "almost", "finish"],
            totalMoves: 3,
            moveAccuracy: 75 + Math.random() * 25, // 75-100%
            status: Math.random() > 0.2 ? "won" : "given_up",
            isDailyChallenge: Math.random() > 0.8,
            optimalPath: ["start", "optimal", "finish"],
            suggestedPath: [],
            optimalMovesMade: 2,
            optimalChoices: [],
            missedOptimalMoves: [],
            playerSemanticDistance: 0.5,
            optimalSemanticDistance: 0.3,
            averageSimilarity: 0.8,
            pathEfficiency: 0.9,
          })),
      };

      const sizeInfo = StorageSizeEstimator.estimateSize(mockData);

      console.log("📈 Scale Test Results:");
      console.log(`   Mock data: 8 achievements, 100 games`);
      console.log(
        `   Original: ${sizeInfo.original} bytes (${(sizeInfo.original / 1024).toFixed(1)} KB)`,
      );
      console.log(
        `   Compressed: ${sizeInfo.compressed} bytes (${(sizeInfo.compressed / 1024).toFixed(1)} KB)`,
      );
      console.log(`   Savings: ${sizeInfo.savings}% reduction`);

      // Extrapolate to larger scales
      const scaleFactor = 10;
      const scaledOriginal = sizeInfo.original * scaleFactor;
      const scaledCompressed = sizeInfo.compressed * scaleFactor;

      console.log(`📊 Extrapolated (${scaleFactor}x scale):`);
      console.log(
        `   Original: ${(scaledOriginal / 1024 / 1024).toFixed(1)} MB`,
      );
      console.log(
        `   Compressed: ${(scaledCompressed / 1024 / 1024).toFixed(1)} MB`,
      );
      console.log(
        `   Savings: ${((scaledOriginal - scaledCompressed) / 1024 / 1024).toFixed(1)} MB saved`,
      );
    } catch (error) {
      console.error("❌ Error testing compression at scale:", error);
    }
  }

  /**
   * Add this to your global debug object
   */
  static addToGlobalDebug(): void {
    if (typeof global !== "undefined") {
      // @ts-ignore
      global.compressionDebug = {
        test: () => CompressionDebug.testCurrentDataCompression(),
        testScale: () => CompressionDebug.testCompressionAtScale(),
        testAchievements: () => CompressionDebug.testAchievementCompression(),
        testGameHistory: () => CompressionDebug.testGameHistoryCompression(),
      };

      console.log(
        "🔧 Added compression debug utilities to global.compressionDebug",
      );
      console.log("   Usage: compressionDebug.test()");
    }
  }
}

// Auto-add to global in development
if (__DEV__) {
  CompressionDebug.addToGlobalDebug();
}
