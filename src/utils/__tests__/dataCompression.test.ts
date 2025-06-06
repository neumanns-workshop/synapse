import { describe, expect, it } from "@jest/globals";
import {
  AchievementCompressor,
  TimestampCompressor,
  GameReportCompressor,
  DataCompressor,
  StorageSizeEstimator,
  ACHIEVEMENT_BIT_MAP,
} from "../dataCompression";
import type { GameReport } from "../gameReportUtils";

describe("DataCompression", () => {
  describe("AchievementCompressor", () => {
    it("should convert achievement IDs to bits and back", () => {
      const achievementIds = ["straightAndNarrow", "juggernaut"];
      const bits = AchievementCompressor.stringArrayToBits(achievementIds);
      const convertedBack = AchievementCompressor.bitsToStringArray(bits);

      expect(convertedBack).toEqual(expect.arrayContaining(achievementIds));
      expect(convertedBack.length).toBe(achievementIds.length);
    });

    it("should check if achievement is unlocked", () => {
      const achievementIds = ["straightAndNarrow"];
      const bits = AchievementCompressor.stringArrayToBits(achievementIds);

      expect(AchievementCompressor.isUnlocked("straightAndNarrow", bits)).toBe(
        true,
      );
      expect(AchievementCompressor.isUnlocked("juggernaut", bits)).toBe(false);
    });

    it("should unlock achievements", () => {
      let bits = 0n;
      bits = AchievementCompressor.unlock("straightAndNarrow", bits);
      bits = AchievementCompressor.unlock("juggernaut", bits);

      expect(AchievementCompressor.isUnlocked("straightAndNarrow", bits)).toBe(
        true,
      );
      expect(AchievementCompressor.isUnlocked("juggernaut", bits)).toBe(true);
    });
  });

  describe("TimestampCompressor", () => {
    it("should convert timestamps to days and back", () => {
      const timestamp = Date.now();
      const days = TimestampCompressor.timestampToDays(timestamp);
      const convertedBack = TimestampCompressor.daysToTimestamp(days);

      // Should be within the same day (24 hour difference max)
      expect(Math.abs(convertedBack - timestamp)).toBeLessThan(
        24 * 60 * 60 * 1000,
      );
    });

    it("should compress and decompress achievement timestamps", () => {
      const timestamps = {
        straightAndNarrow: Date.now(),
        juggernaut: Date.now() - 86400000, // 1 day ago
      };

      const compressed = TimestampCompressor.compressTimestamps(timestamps);
      const decompressed = TimestampCompressor.decompressTimestamps(compressed);

      expect(Object.keys(decompressed).sort()).toEqual(
        Object.keys(timestamps).sort(),
      );
      // Check that timestamps are within the same day
      for (const key of Object.keys(timestamps)) {
        expect(Math.abs(decompressed[key] - timestamps[key])).toBeLessThan(
          24 * 60 * 60 * 1000,
        );
      }
    });
  });

  describe("GameReportCompressor", () => {
    const mockGameReport: GameReport = {
      id: "test-game",
      timestamp: Date.now(),
      startWord: "start",
      targetWord: "end",
      playerPath: ["start", "middle", "end"],
      totalMoves: 2,
      moveAccuracy: 85.7,
      status: "won",
      isDailyChallenge: true,
      optimalPath: ["start", "end"],
      suggestedPath: [],
      optimalMovesMade: 1,
      optimalChoices: [],
      missedOptimalMoves: [],
      playerSemanticDistance: 0.5,
      optimalSemanticDistance: 0.3,
      averageSimilarity: 0.8,
      pathEfficiency: 0.9,
    };

    it("should compress and decompress game reports", () => {
      const compressed = GameReportCompressor.compress(mockGameReport);
      const decompressed = GameReportCompressor.decompress(compressed);

      expect(decompressed.status).toBe(mockGameReport.status);
      expect(decompressed.totalMoves).toBe(mockGameReport.totalMoves);
      expect(decompressed.moveAccuracy).toBe(
        Math.round(mockGameReport.moveAccuracy),
      );
      expect(decompressed.isDailyChallenge).toBe(
        mockGameReport.isDailyChallenge,
      );
      expect(decompressed.startWord).toBe(mockGameReport.startWord);
      expect(decompressed.targetWord).toBe(mockGameReport.targetWord);
    });

    it("should handle different game statuses", () => {
      const gaveUpReport = { ...mockGameReport, status: "given_up" as const };
      const compressed = GameReportCompressor.compress(gaveUpReport);
      const decompressed = GameReportCompressor.decompress(compressed);

      expect(decompressed.status).toBe("given_up");
    });

    it("should preserve all critical fields during compression/decompression", () => {
      const comprehensiveGameReport: GameReport = {
        id: "test-game-comprehensive",
        timestamp: Date.now(),
        startTime: Date.now() - 300000, // 5 minutes earlier
        startWord: "start",
        targetWord: "end",
        playerPath: ["start", "middle", "end"],
        totalMoves: 2,
        moveAccuracy: 85.7,
        status: "won",
        isDailyChallenge: true,
        optimalPath: ["start", "end"],
        suggestedPath: [],
        optimalMovesMade: 1,
        optimalChoices: [
          {
            playerPosition: "start",
            playerChose: "middle",
            optimalChoice: "end",
            isGlobalOptimal: false,
            isLocalOptimal: true,
          },
        ],
        missedOptimalMoves: ["At start, chose middle instead of optimal end"],
        playerSemanticDistance: 0.5,
        optimalSemanticDistance: 0.3,
        averageSimilarity: 0.8,
        pathEfficiency: 0.9,
        backtrackEvents: [
          {
            jumpedFrom: "wrong",
            landedOn: "start",
          },
        ],
        earnedAchievements: [
          {
            id: "test-achievement",
            name: "Test Achievement",
            description: "A test achievement",
            icon: "trophy",
            isProgressive: false,
            check: () => false,
          },
        ],
        potentialRarestMoves: [
          {
            word: "rare",
            frequency: 0.001,
            playerChoseThisRarestOption: true,
          },
        ],
      };

      const compressed = GameReportCompressor.compress(comprehensiveGameReport);
      const decompressed = GameReportCompressor.decompress(compressed);

      // Verify all critical fields are preserved
      expect(decompressed.optimalChoices).toHaveLength(1);
      expect(decompressed.optimalChoices[0].playerPosition).toBe("start");
      expect(decompressed.optimalChoices[0].playerChose).toBe("middle");
      expect(decompressed.optimalChoices[0].optimalChoice).toBe("end");

      expect(decompressed.missedOptimalMoves).toHaveLength(1);
      expect(decompressed.missedOptimalMoves[0]).toBe("At start, chose middle instead of optimal end");

      expect(decompressed.backtrackEvents).toHaveLength(1);
      expect(decompressed.backtrackEvents![0].jumpedFrom).toBe("wrong");
      expect(decompressed.backtrackEvents![0].landedOn).toBe("start");

      expect(decompressed.earnedAchievements).toHaveLength(1);
      expect(decompressed.earnedAchievements![0].id).toBe("test-achievement");
      expect(decompressed.earnedAchievements![0].name).toBe("Test Achievement");

      expect(decompressed.potentialRarestMoves).toHaveLength(1);
      expect(decompressed.potentialRarestMoves![0].word).toBe("rare");
      expect(decompressed.potentialRarestMoves![0].frequency).toBe(0.001);
      expect(decompressed.potentialRarestMoves![0].playerChoseThisRarestOption).toBe(true);

      // Verify startTime is preserved (within the same day due to compression)
      expect(decompressed.startTime).toBeDefined();
      if (decompressed.startTime && comprehensiveGameReport.startTime) {
        expect(Math.abs(decompressed.startTime - comprehensiveGameReport.startTime)).toBeLessThan(24 * 60 * 60 * 1000);
      }
    });
  });

  describe("DataCompressor", () => {
    const mockData = {
      user: {
        id: "test-user",
        isPremium: false,
        tutorialComplete: true,
        hasPlayedBefore: true,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      },
      stats: {
        totalGamesPlayed: 10,
        totalWins: 7,
        totalGaveUps: 3,
        achievementsUnlocked: 2,
        cumulativeMoveAccuracySum: 850,
      },
      gameHistory: [
        {
          id: "game1",
          timestamp: Date.now(),
          startWord: "start",
          targetWord: "end",
          playerPath: ["start", "end"],
          totalMoves: 1,
          moveAccuracy: 100,
          status: "won",
          optimalPath: ["start", "end"],
          suggestedPath: [],
          optimalMovesMade: 1,
          optimalChoices: [],
          missedOptimalMoves: [],
          playerSemanticDistance: 0.2,
          optimalSemanticDistance: 0.2,
          averageSimilarity: 0.9,
          pathEfficiency: 1.0,
        },
      ],
      achievements: {
        unlockedIds: ["straightAndNarrow", "juggernaut"],
        viewedIds: ["straightAndNarrow"],
        unlockTimestamps: {
          straightAndNarrow: Date.now(),
          juggernaut: Date.now() - 86400000,
        },
        progressiveCounters: {},
        schemaVersion: 1,
      },
      collections: {},
      dailyChallenges: {
        progress: {},
        freeGamesRemaining: 2,
        lastResetDate: "2024-01-01",
      },
      news: { readArticleIds: [], lastChecked: Date.now() },
      currentGames: { regular: null, challenge: null, temp: null },
      meta: { version: "1.0.0", schemaVersion: 1, deviceId: "test-device" },
      wordCollections: {
        completedIds: [],
        viewedIds: [],
        completionTimestamps: {},
        schemaVersion: 1,
      },
    };

    it("should compress and decompress data correctly", () => {
      const compressed = DataCompressor.compress(mockData);
      const decompressed = DataCompressor.decompress(compressed);

      // Check user data
      expect(decompressed.user.id).toBe(mockData.user.id);
      expect(decompressed.user.isPremium).toBe(mockData.user.isPremium);

      // Check stats
      expect(decompressed.stats.totalGamesPlayed).toBe(
        mockData.stats.totalGamesPlayed,
      );

      // Check achievements
      expect(decompressed.achievements.unlockedIds).toEqual(
        expect.arrayContaining(mockData.achievements.unlockedIds),
      );
      expect(decompressed.achievements.viewedIds).toEqual(
        expect.arrayContaining(mockData.achievements.viewedIds),
      );

      // Check game history
      expect(decompressed.gameHistory.length).toBe(mockData.gameHistory.length);
      expect(decompressed.gameHistory[0].status).toBe(
        mockData.gameHistory[0].status,
      );
    });

    it("should compress and decompress all data structures comprehensively", () => {
      const comprehensiveMockData = {
        user: {
          id: "test-user",
          email: "test@example.com",
          isPremium: true,
          tutorialComplete: true,
          hasPlayedBefore: true,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          purchase: {
            platform: "ios",
            transactionId: "test-transaction",
            purchaseDate: Date.now(),
            validated: true,
          },
          privacy: {
            allowChallengeSharing: true,
            allowStatsSharing: false,
            allowLeaderboards: true,
            dataCollection: false,
          },
        },
        stats: {
          totalGamesPlayed: 50,
          totalWins: 35,
          totalGaveUps: 15,
          achievementsUnlocked: 8,
          cumulativeMoveAccuracySum: 4250,
        },
        gameHistory: [
          {
            id: "game1",
            timestamp: Date.now(),
            startTime: Date.now() - 300000,
            startWord: "start",
            targetWord: "end",
            playerPath: ["start", "middle", "end"],
            totalMoves: 2,
            moveAccuracy: 85.5,
            status: "won",
            optimalPath: ["start", "end"],
            suggestedPath: [],
            optimalMovesMade: 1,
            optimalChoices: [
              {
                playerPosition: "start",
                playerChose: "middle",
                optimalChoice: "end",
                isGlobalOptimal: false,
                isLocalOptimal: true,
              },
            ],
            missedOptimalMoves: ["At start, chose middle instead of optimal end"],
            playerSemanticDistance: 0.5,
            optimalSemanticDistance: 0.3,
            averageSimilarity: 0.8,
            pathEfficiency: 0.9,
            backtrackEvents: [
              {
                jumpedFrom: "wrong",
                landedOn: "start",
              },
            ],
            earnedAchievements: [
              {
                id: "test-achievement",
                name: "Test Achievement",
                description: "A test achievement",
                icon: "trophy",
                isProgressive: false,
                check: () => false,
              },
            ],
          },
        ],
        achievements: {
          unlockedIds: ["straightAndNarrow", "juggernaut"],
          viewedIds: ["straightAndNarrow"],
          unlockTimestamps: {
            straightAndNarrow: Date.now(),
            juggernaut: Date.now() - 86400000,
          },
          progressiveCounters: {
            "slow-and-steady": 15,
          },
          schemaVersion: 1,
        },
        collections: {
          "test-collection": {
            collectedWords: ["word1", "word2", "word3"],
            lastUpdated: Date.now(),
          },
          "another-collection": {
            collectedWords: ["wordA", "wordB"],
            lastUpdated: Date.now() - 86400000,
          },
        },
        wordCollections: {
          completedIds: ["collection1", "collection2"],
          viewedIds: ["collection1"],
          completionTimestamps: {
            collection1: Date.now(),
            collection2: Date.now() - 172800000,
          },
          schemaVersion: 1,
        },
        dailyChallenges: {
          progress: {
            "challenge1": { completed: true, score: 100 },
            "challenge2": { completed: false, score: 0 },
          },
          freeGamesRemaining: 1,
          lastResetDate: "2024-01-15",
        },
        news: {
          readArticleIds: ["article1", "article2", "article3"],
          lastChecked: Date.now(),
        },
        currentGames: {
          regular: {
            startWord: "current",
            targetWord: "goal",
            currentWord: "progress",
            playerPath: ["current", "progress"],
            optimalPath: ["current", "goal"],
            suggestedPathFromCurrent: ["progress", "goal"],
            gameStatus: "playing",
            optimalChoices: [
              {
                playerPosition: "current",
                playerChose: "progress",
                optimalChoice: "goal",
                isGlobalOptimal: false,
                isLocalOptimal: true,
              },
            ],
            backtrackHistory: [],
            pathDisplayMode: {
              player: true,
              optimal: false,
              suggested: true,
              ai: false,
            },
            startTime: Date.now() - 120000,
            isChallenge: false,
            isDailyChallenge: false,
          },
          challenge: null,
          temp: null,
        },
        meta: {
          version: "1.2.0",
          schemaVersion: 2,
          lastSyncAt: Date.now() - 3600000,
          lastBackupAt: Date.now() - 7200000,
          deviceId: "test-device-123",
        },
      };

      const compressed = DataCompressor.compress(comprehensiveMockData);
      const decompressed = DataCompressor.decompress(compressed);

      // Verify all data structures are preserved
      expect(decompressed.user.id).toBe(comprehensiveMockData.user.id);
      expect(decompressed.gameHistory).toHaveLength(1);
      expect(decompressed.achievements.unlockedIds).toEqual(
        expect.arrayContaining(comprehensiveMockData.achievements.unlockedIds),
      );
      expect(decompressed.collections["test-collection"].collectedWords).toEqual(
        expect.arrayContaining(["word1", "word2"]),
      );
      expect(decompressed.currentGames.regular?.startWord).toBe("start");
      expect(decompressed.dailyChallenges.progress["test-challenge"].status).toBe("completed");
      expect(decompressed.news.readArticleIds).toEqual(
        expect.arrayContaining(["article1"]),
      );
    });

    it("should handle sync pipeline compression workflow", () => {
      // Simulate the sync pipeline workflow
      const originalData = comprehensiveMockData;
      
      // Step 1: Compress for cloud storage (like exportCompressedData)
      const compressedForCloud = DataCompressor.compress(originalData);
      
      // Step 2: Simulate cloud storage (JSON stringify/parse like database would do)
      const cloudStorageData = JSON.parse(JSON.stringify(compressedForCloud));
      
      // Step 3: Decompress from cloud (like decompressData)
      const decompressedFromCloud = DataCompressor.decompress(cloudStorageData);
      
      // Verify the round-trip preserves all data
      expect(decompressedFromCloud.user.id).toBe(originalData.user.id);
      expect(decompressedFromCloud.user.isPremium).toBe(originalData.user.isPremium);
      expect(decompressedFromCloud.gameHistory).toHaveLength(originalData.gameHistory.length);
      expect(decompressedFromCloud.achievements.unlockedIds).toEqual(
        expect.arrayContaining(originalData.achievements.unlockedIds),
      );
      expect(decompressedFromCloud.collections["test-collection"].collectedWords).toEqual(
        expect.arrayContaining(originalData.collections["test-collection"].collectedWords),
      );
      expect(decompressedFromCloud.currentGames.regular?.optimalChoices).toHaveLength(
        originalData.currentGames.regular?.optimalChoices?.length || 0,
      );
      
      // Verify compression actually saves space
      const originalSize = JSON.stringify(originalData).length;
      const compressedSize = JSON.stringify(compressedForCloud).length;
      const compressionRatio = compressedSize / originalSize;
      
      console.log(`Sync Pipeline Compression: ${originalSize} → ${compressedSize} bytes (${(compressionRatio * 100).toFixed(1)}% of original)`);
      expect(compressionRatio).toBeLessThan(0.8); // Should be at least 20% compression
    });
  });

  describe("StorageSizeEstimator", () => {
    it("should calculate storage savings", () => {
      const mockData = {
        achievements: {
          unlockedIds: ["straightAndNarrow", "juggernaut", "hereBeDragons"],
          viewedIds: ["straightAndNarrow"],
          unlockTimestamps: {
            straightAndNarrow: Date.now(),
            juggernaut: Date.now(),
          },
          progressiveCounters: {},
          schemaVersion: 1,
        },
        gameHistory: Array(50).fill({
          id: "game",
          timestamp: Date.now(),
          startWord: "start",
          targetWord: "end",
          playerPath: ["start", "middle", "end"],
          totalMoves: 2,
          moveAccuracy: 85,
          status: "won",
          optimalPath: ["start", "end"],
          suggestedPath: [],
          optimalMovesMade: 1,
          optimalChoices: [],
          missedOptimalMoves: [],
          playerSemanticDistance: 0.5,
          optimalSemanticDistance: 0.3,
          averageSimilarity: 0.8,
          pathEfficiency: 0.9,
        }),
      };

      const sizeInfo = StorageSizeEstimator.estimateSize(mockData);

      expect(sizeInfo.original).toBeGreaterThan(0);
      expect(sizeInfo.compressed).toBeGreaterThan(0);
      expect(sizeInfo.compressed).toBeLessThan(sizeInfo.original);
      expect(sizeInfo.savings).toBeGreaterThan(0);
      expect(sizeInfo.savings).toBeLessThan(100);
    });
  });
});
