// ============================================================================
// DATA COMPRESSION UTILITIES
// Phase 1: Easy wins for 70% storage reduction
// ============================================================================

import type { Achievement } from "../features/achievements";
import { allAchievements } from "../features/achievements/definitions";
import type {
  GameReport,
  OptimalChoice,
  BacktrackReportEntry,
  PotentialRarestMove,
} from "./gameReportUtils";

// ============================================================================
// ACHIEVEMENT COMPRESSION
// ============================================================================

// Generate achievement bit map from definitions
export const ACHIEVEMENT_BIT_MAP: Record<string, number> = {};
allAchievements.forEach((achievement, index) => {
  ACHIEVEMENT_BIT_MAP[achievement.id] = index;
});

// Ensure the bit map is consistent by sorting achievements by ID
const sortedAchievementIds = Object.keys(ACHIEVEMENT_BIT_MAP).sort();
sortedAchievementIds.forEach((id, index) => {
  ACHIEVEMENT_BIT_MAP[id] = index;
});

export class AchievementCompressor {
  static stringArrayToBits(achievementIds: string[]): bigint {
    let bits = 0n;
    for (const id of achievementIds) {
      const bitIndex = ACHIEVEMENT_BIT_MAP[id];
      if (bitIndex !== undefined) {
        bits |= 1n << BigInt(bitIndex);
      }
    }
    return bits;
  }

  static bitsToStringArray(bits: bigint): string[] {
    const achievementIds: string[] = [];
    for (const [id, bitIndex] of Object.entries(ACHIEVEMENT_BIT_MAP)) {
      if ((bits & (1n << BigInt(bitIndex))) !== 0n) {
        achievementIds.push(id);
      }
    }
    return achievementIds;
  }

  static isUnlocked(achievementId: string, unlockedBits: bigint): boolean {
    const bitIndex = ACHIEVEMENT_BIT_MAP[achievementId];
    return (
      bitIndex !== undefined && (unlockedBits & (1n << BigInt(bitIndex))) !== 0n
    );
  }

  static unlock(achievementId: string, unlockedBits: bigint): bigint {
    const bitIndex = ACHIEVEMENT_BIT_MAP[achievementId];
    return bitIndex !== undefined
      ? unlockedBits | (1n << BigInt(bitIndex))
      : unlockedBits;
  }

  static markViewed(achievementId: string, viewedBits: bigint): bigint {
    const bitIndex = ACHIEVEMENT_BIT_MAP[achievementId];
    return bitIndex !== undefined
      ? viewedBits | (1n << BigInt(bitIndex))
      : viewedBits;
  }
}

// ============================================================================
// TIMESTAMP COMPRESSION
// ============================================================================

const EPOCH_START = new Date("1970-01-01").getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class TimestampCompressor {
  static timestampToDays(timestamp: number): number {
    return Math.floor((timestamp - EPOCH_START) / MS_PER_DAY);
  }

  static daysToTimestamp(days: number): number {
    return EPOCH_START + days * MS_PER_DAY;
  }

  static compressTimestamps(
    timestamps: Record<string, number>,
  ): Record<number, number> {
    const compressed: Record<number, number> = {};
    for (const [key, timestamp] of Object.entries(timestamps)) {
      const bitIndex = ACHIEVEMENT_BIT_MAP[key];
      if (bitIndex !== undefined) {
        compressed[bitIndex] = this.timestampToDays(timestamp);
      }
    }
    return compressed;
  }

  static decompressTimestamps(
    compressed: Record<number, number>,
  ): Record<string, number> {
    const timestamps: Record<string, number> = {};
    for (const [bitIndexStr, days] of Object.entries(compressed)) {
      const bitIndex = parseInt(bitIndexStr);
      const achievementId = Object.keys(ACHIEVEMENT_BIT_MAP).find(
        (id) => ACHIEVEMENT_BIT_MAP[id] === bitIndex,
      );
      if (achievementId) {
        timestamps[achievementId] = this.daysToTimestamp(days);
      }
    }
    return timestamps;
  }
}

// ============================================================================
// GAME REPORT COMPRESSION
// ============================================================================

// Game status flags
const GAME_FLAGS = {
  WON: 1 << 0, // bit 0
  IS_CHALLENGE: 1 << 1, // bit 1
  IS_DAILY: 1 << 2, // bit 2
  GAVE_UP: 1 << 3, // bit 3
} as const;

export interface CompressedGameReport {
  day: number; // Days since epoch (2 bytes)
  flags: number; // Packed booleans (1 byte)
  moves: number; // Move count (1 byte, max 255)
  accuracy: number; // Move accuracy 0-100 (1 byte)
  startWord?: string; // Keep for now, compress later
  endWord?: string; // Keep for now, compress later
  path?: string[]; // Player path - keep for now, compress later
  optimalPath?: string[]; // Optimal path - essential for stats display
  suggestedPath?: string[]; // Suggested path - needed for gave up games
  optimalMovesMade?: number; // Number of optimal moves made
  playerSemanticDistance?: number; // Player's semantic distance
  optimalSemanticDistance?: number; // Optimal semantic distance
  averageSimilarity?: number | null; // Average similarity per move
  pathEfficiency?: number; // Path efficiency metric
  dailyChallengeId?: string; // Daily challenge ID if applicable
  aiPath?: string[]; // AI solution path for daily challenges
  aiModel?: string | null; // AI model used
  // Critical fields for complete game report reconstruction
  optimalChoices?: OptimalChoice[]; // Detailed move-by-move analysis
  missedOptimalMoves?: string[]; // List of suboptimal moves made
  backtrackEvents?: BacktrackReportEntry[]; // Backtracking history
  earnedAchievements?: Achievement[]; // Achievements earned in this game
  potentialRarestMoves?: PotentialRarestMove[]; // Rare move tracking data
  startTime?: number; // Game start timestamp (compressed to days)
}

export class GameReportCompressor {
  static compress(report: GameReport): CompressedGameReport {
    let flags = 0;

    // Pack status flags
    if (report.status === "won") flags |= GAME_FLAGS.WON;
    if (report.status === "given_up") flags |= GAME_FLAGS.GAVE_UP;
    if (report.isDailyChallenge) flags |= GAME_FLAGS.IS_DAILY;

    return {
      day: TimestampCompressor.timestampToDays(report.timestamp || Date.now()),
      flags,
      moves: Math.min(report.totalMoves || 0, 255), // Cap at 255
      accuracy: Math.round(Math.min(report.moveAccuracy || 0, 100)), // Round to integer
      startWord: report.startWord,
      endWord: report.targetWord, // Use targetWord instead of endWord
      path: report.playerPath, // Use playerPath instead of path
      // Preserve essential data for proper stats display
      optimalPath: report.optimalPath,
      suggestedPath: report.suggestedPath,
      optimalMovesMade: report.optimalMovesMade,
      playerSemanticDistance: report.playerSemanticDistance,
      optimalSemanticDistance: report.optimalSemanticDistance,
      averageSimilarity: report.averageSimilarity,
      pathEfficiency: report.pathEfficiency,
      dailyChallengeId: report.dailyChallengeId,
      aiPath: report.aiPath,
      aiModel: report.aiModel,
      // Critical fields for complete game report reconstruction
      optimalChoices: report.optimalChoices,
      missedOptimalMoves: report.missedOptimalMoves,
      backtrackEvents: report.backtrackEvents,
      earnedAchievements: report.earnedAchievements,
      potentialRarestMoves: report.potentialRarestMoves,
      startTime: report.startTime
        ? TimestampCompressor.timestampToDays(report.startTime)
        : undefined,
    };
  }

  static decompress(compressed: CompressedGameReport): GameReport {
    // Determine status from flags
    let status: "won" | "given_up" = "given_up";
    if (compressed.flags & GAME_FLAGS.WON) status = "won";
    else if (compressed.flags & GAME_FLAGS.GAVE_UP) status = "given_up";

    return {
      id: `${compressed.day}_${compressed.moves}`, // Generate ID from compressed data
      timestamp: TimestampCompressor.daysToTimestamp(compressed.day),
      startWord: compressed.startWord || "",
      targetWord: compressed.endWord || "", // Use targetWord to match interface
      playerPath: compressed.path || [], // Use playerPath to match interface
      totalMoves: compressed.moves,
      moveAccuracy: compressed.accuracy,
      status,
      isDailyChallenge: !!(compressed.flags & GAME_FLAGS.IS_DAILY),
      // Restore preserved data instead of using empty defaults
      optimalPath: compressed.optimalPath || [],
      suggestedPath: compressed.suggestedPath || [],
      optimalMovesMade: compressed.optimalMovesMade || 0,
      optimalChoices: compressed.optimalChoices || [],
      missedOptimalMoves: compressed.missedOptimalMoves || [],
      playerSemanticDistance: compressed.playerSemanticDistance || 0,
      optimalSemanticDistance: compressed.optimalSemanticDistance || 0,
      averageSimilarity: compressed.averageSimilarity || null,
      pathEfficiency: compressed.pathEfficiency || 0,
      dailyChallengeId: compressed.dailyChallengeId,
      aiPath: compressed.aiPath || [],
      aiModel: compressed.aiModel || null,
      // Critical fields for complete game report reconstruction
      backtrackEvents: compressed.backtrackEvents,
      earnedAchievements: compressed.earnedAchievements || [],
      potentialRarestMoves: compressed.potentialRarestMoves,
      startTime: compressed.startTime
        ? TimestampCompressor.daysToTimestamp(compressed.startTime)
        : undefined,
    };
  }
}

// ============================================================================
// GAME HISTORY MANAGEMENT
// ============================================================================

export class GameHistoryManager {
  private static readonly MAX_HISTORY_SIZE = 100;

  static limitHistory(history: GameReport[]): GameReport[] {
    // Sort by timestamp (newest first) and take only the most recent
    return history
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, this.MAX_HISTORY_SIZE);
  }

  static compressHistory(history: GameReport[]): CompressedGameReport[] {
    const limitedHistory = this.limitHistory(history);
    return limitedHistory.map((report) =>
      GameReportCompressor.compress(report),
    );
  }

  static decompressHistory(compressed: CompressedGameReport[]): GameReport[] {
    return compressed.map((report) => GameReportCompressor.decompress(report));
  }
}

// ============================================================================
// COMPRESSED DATA INTERFACES
// ============================================================================

export interface CompressedAchievements {
  unlockedBits: string; // BigInt as string for JSON serialization
  viewedBits: string; // BigInt as string for JSON serialization
  unlockTimestamps: Record<number, number>; // bitIndex -> days since epoch
  progressiveCounters: Record<string, number>; // Keep as-is for now
  schemaVersion: number;
}

// Compressed current game state
export interface CompressedPersistentGameState {
  startWord: string | null;
  targetWord: string | null;
  currentWord: string | null;
  playerPath: string[];
  optimalPath: string[];
  suggestedPathFromCurrent: string[];
  gameStatus: string; // Simplified from complex enum
  optimalChoices: OptimalChoice[];
  backtrackHistory: BacktrackReportEntry[];
  pathDisplayMode: {
    player: boolean;
    optimal: boolean;
    suggested: boolean;
    ai?: boolean;
  };
  startTimeDay: number; // Compressed to days since epoch
  isChallenge?: boolean;
  isDailyChallenge?: boolean;
  aiPath?: string[];
  currentDailyChallengeId?: string;
  potentialRarestMovesThisGame?: PotentialRarestMove[];
}

// Compressed collections data
export interface CompressedCollections {
  [collectionId: string]: {
    collectedWords: string[];
    lastUpdatedDay: number; // Compressed to days since epoch
  };
}

// Compressed word collections tracking
export interface CompressedWordCollections {
  completedIds: string[];
  viewedIds: string[];
  completionTimestampsCompressed: Record<string, number>; // collectionId -> days since epoch
  schemaVersion: number;
}

// Compressed daily challenges
export interface CompressedDailyChallenges {
  progress: Record<string, unknown>; // Keep progress as-is for now (complex nested structure)
  freeGamesRemaining: number;
  lastResetDate: string; // Keep as string date
}

// Compressed news tracking
export interface CompressedNews {
  readArticleIds: string[];
  lastCheckedDay: number; // Compressed to days since epoch
}

// Compressed metadata
export interface CompressedMeta {
  version: string;
  schemaVersion: number;
  lastSyncAtDay?: number; // Compressed to days since epoch
  lastBackupAtDay?: number; // Compressed to days since epoch
  deviceId?: string;
}

export interface CompressedUnifiedAppData {
  user: {
    id: string;
    email?: string;
    isPremium: boolean;
    tutorialComplete: boolean;
    hasPlayedBefore: boolean;
    createdAt: number; // Keep full timestamp for user creation
    lastActiveAt: number; // Keep full timestamp for recent activity
    purchase?: unknown; // Keep as-is (complex validation data)
    privacy?: unknown; // Keep as-is (simple boolean flags)
  };
  stats: {
    totalGamesPlayed: number;
    totalWins: number;
    totalGaveUps: number;
    achievementsUnlocked: number;
    cumulativeMoveAccuracySum: number;
  };
  gameHistory: CompressedGameReport[]; // Compressed and limited
  achievements: CompressedAchievements; // Compressed
  collections: CompressedCollections; // Now compressed
  dailyChallenges: CompressedDailyChallenges; // Now compressed
  news: CompressedNews; // Now compressed
  currentGames: {
    regular: CompressedPersistentGameState | null;
    challenge: CompressedPersistentGameState | null;
    temp: CompressedPersistentGameState | null;
  }; // Now compressed
  meta: CompressedMeta; // Now compressed
  wordCollections: CompressedWordCollections; // Now compressed
}

// ============================================================================
// ADDITIONAL COMPRESSION HELPERS
// ============================================================================

export class PersistentGameStateCompressor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compress(gameState: any): CompressedPersistentGameState {
    return {
      startWord: gameState.startWord,
      targetWord: gameState.targetWord,
      currentWord: gameState.currentWord,
      playerPath: gameState.playerPath || [],
      optimalPath: gameState.optimalPath || [],
      suggestedPathFromCurrent: gameState.suggestedPathFromCurrent || [],
      gameStatus: gameState.gameStatus || "playing",
      optimalChoices: gameState.optimalChoices || [],
      backtrackHistory: gameState.backtrackHistory || [],
      pathDisplayMode: gameState.pathDisplayMode || {
        player: true,
        optimal: false,
        suggested: false,
        ai: false,
      },
      startTimeDay: TimestampCompressor.timestampToDays(
        gameState.startTime || Date.now(),
      ),
      isChallenge: gameState.isChallenge,
      isDailyChallenge: gameState.isDailyChallenge,
      aiPath: gameState.aiPath,
      currentDailyChallengeId: gameState.currentDailyChallengeId,
      potentialRarestMovesThisGame: gameState.potentialRarestMovesThisGame,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decompress(compressed: CompressedPersistentGameState): any {
    return {
      startWord: compressed.startWord,
      targetWord: compressed.targetWord,
      currentWord: compressed.currentWord,
      playerPath: compressed.playerPath || [],
      optimalPath: compressed.optimalPath || [],
      suggestedPathFromCurrent: compressed.suggestedPathFromCurrent || [],
      gameStatus: compressed.gameStatus || "playing",
      optimalChoices: compressed.optimalChoices || [],
      backtrackHistory: compressed.backtrackHistory || [],
      pathDisplayMode: compressed.pathDisplayMode || {
        player: true,
        optimal: false,
        suggested: false,
        ai: false,
      },
      startTime: TimestampCompressor.daysToTimestamp(compressed.startTimeDay),
      isChallenge: compressed.isChallenge,
      isDailyChallenge: compressed.isDailyChallenge,
      aiPath: compressed.aiPath,
      currentDailyChallengeId: compressed.currentDailyChallengeId,
      potentialRarestMovesThisGame: compressed.potentialRarestMovesThisGame,
    };
  }
}

export class CollectionsCompressor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compress(collections: any): CompressedCollections {
    const compressed: CompressedCollections = {};
    for (const [collectionId, data] of Object.entries(collections || {})) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collectionData = data as any;
      compressed[collectionId] = {
        collectedWords: collectionData.collectedWords || [],
        lastUpdatedDay: TimestampCompressor.timestampToDays(
          collectionData.lastUpdated || Date.now(),
        ),
      };
    }
    return compressed;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decompress(compressed: CompressedCollections): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decompressed: any = {};
    for (const [collectionId, data] of Object.entries(compressed || {})) {
      decompressed[collectionId] = {
        collectedWords: data.collectedWords || [],
        lastUpdated: TimestampCompressor.daysToTimestamp(data.lastUpdatedDay),
      };
    }
    return decompressed;
  }
}

export class WordCollectionsCompressor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compress(wordCollections: any): CompressedWordCollections {
    const completionTimestampsCompressed: Record<string, number> = {};
    for (const [collectionId, timestamp] of Object.entries(
      wordCollections?.completionTimestamps || {},
    )) {
      completionTimestampsCompressed[collectionId] =
        TimestampCompressor.timestampToDays(timestamp as number);
    }

    return {
      completedIds: wordCollections?.completedIds || [],
      viewedIds: wordCollections?.viewedIds || [],
      completionTimestampsCompressed,
      schemaVersion: wordCollections?.schemaVersion || 1,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decompress(compressed: CompressedWordCollections): any {
    const completionTimestamps: Record<string, number> = {};
    for (const [collectionId, days] of Object.entries(
      compressed?.completionTimestampsCompressed || {},
    )) {
      completionTimestamps[collectionId] =
        TimestampCompressor.daysToTimestamp(days);
    }

    return {
      completedIds: compressed?.completedIds || [],
      viewedIds: compressed?.viewedIds || [],
      completionTimestamps,
      schemaVersion: compressed?.schemaVersion || 1,
    };
  }
}

export class NewsCompressor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compress(news: any): CompressedNews {
    return {
      readArticleIds: news?.readArticleIds || [],
      lastCheckedDay: TimestampCompressor.timestampToDays(
        news?.lastChecked || Date.now(),
      ),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decompress(compressed: CompressedNews): any {
    return {
      readArticleIds: compressed?.readArticleIds || [],
      lastChecked: TimestampCompressor.daysToTimestamp(
        compressed?.lastCheckedDay || 0,
      ),
    };
  }
}

export class MetaCompressor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compress(meta: any): CompressedMeta {
    return {
      version: meta?.version || "1.0.0",
      schemaVersion: meta?.schemaVersion || 1,
      lastSyncAtDay: meta?.lastSyncAt
        ? TimestampCompressor.timestampToDays(meta.lastSyncAt)
        : undefined,
      lastBackupAtDay: meta?.lastBackupAt
        ? TimestampCompressor.timestampToDays(meta.lastBackupAt)
        : undefined,
      deviceId: meta?.deviceId,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decompress(compressed: CompressedMeta): any {
    return {
      version: compressed?.version || "1.0.0",
      schemaVersion: compressed?.schemaVersion || 1,
      lastSyncAt: compressed?.lastSyncAtDay
        ? TimestampCompressor.daysToTimestamp(compressed.lastSyncAtDay)
        : undefined,
      lastBackupAt: compressed?.lastBackupAtDay
        ? TimestampCompressor.daysToTimestamp(compressed.lastBackupAtDay)
        : undefined,
      deviceId: compressed?.deviceId,
    };
  }
}

// ============================================================================
// MAIN COMPRESSION/DECOMPRESSION FUNCTIONS
// ============================================================================

export class DataCompressor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compress(data: any): CompressedUnifiedAppData {
    return {
      ...data,
      gameHistory: GameHistoryManager.compressHistory(data.gameHistory || []),
      achievements: {
        unlockedBits: AchievementCompressor.stringArrayToBits(
          data.achievements?.unlockedIds || [],
        ).toString(),
        viewedBits: AchievementCompressor.stringArrayToBits(
          data.achievements?.viewedIds || [],
        ).toString(),
        unlockTimestamps: TimestampCompressor.compressTimestamps(
          data.achievements?.unlockTimestamps || {},
        ),
        progressiveCounters: data.achievements?.progressiveCounters || {},
        schemaVersion: data.achievements?.schemaVersion || 1,
      },
      collections: CollectionsCompressor.compress(data.collections),
      wordCollections: WordCollectionsCompressor.compress(data.wordCollections),
      news: NewsCompressor.compress(data.news),
      meta: MetaCompressor.compress(data.meta),
      currentGames: {
        regular: data.currentGames?.regular
          ? PersistentGameStateCompressor.compress(data.currentGames.regular)
          : null,
        challenge: data.currentGames?.challenge
          ? PersistentGameStateCompressor.compress(data.currentGames.challenge)
          : null,
        temp: data.currentGames?.temp
          ? PersistentGameStateCompressor.compress(data.currentGames.temp)
          : null,
      },
      dailyChallenges: {
        progress: data.dailyChallenges?.progress || {},
        freeGamesRemaining: data.dailyChallenges?.freeGamesRemaining ?? 2,
        lastResetDate: data.dailyChallenges?.lastResetDate || "",
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static decompress(compressed: CompressedUnifiedAppData): any {
    return {
      ...compressed,
      gameHistory: GameHistoryManager.decompressHistory(
        compressed.gameHistory || [],
      ),
      achievements: {
        unlockedIds: AchievementCompressor.bitsToStringArray(
          BigInt(compressed.achievements?.unlockedBits || "0"),
        ),
        viewedIds: AchievementCompressor.bitsToStringArray(
          BigInt(compressed.achievements?.viewedBits || "0"),
        ),
        unlockTimestamps: TimestampCompressor.decompressTimestamps(
          compressed.achievements?.unlockTimestamps || {},
        ),
        progressiveCounters: compressed.achievements?.progressiveCounters || {},
        schemaVersion: compressed.achievements?.schemaVersion || 1,
      },
      collections: CollectionsCompressor.decompress(compressed.collections),
      wordCollections: WordCollectionsCompressor.decompress(
        compressed.wordCollections,
      ),
      news: NewsCompressor.decompress(compressed.news),
      meta: MetaCompressor.decompress(compressed.meta),
      currentGames: {
        regular: compressed.currentGames?.regular
          ? PersistentGameStateCompressor.decompress(
              compressed.currentGames.regular,
            )
          : null,
        challenge: compressed.currentGames?.challenge
          ? PersistentGameStateCompressor.decompress(
              compressed.currentGames.challenge,
            )
          : null,
        temp: compressed.currentGames?.temp
          ? PersistentGameStateCompressor.decompress(
              compressed.currentGames.temp,
            )
          : null,
      },
      dailyChallenges: {
        progress: compressed.dailyChallenges?.progress || {},
        freeGamesRemaining: compressed.dailyChallenges?.freeGamesRemaining ?? 2,
        lastResetDate: compressed.dailyChallenges?.lastResetDate || "",
      },
    };
  }
}

// ============================================================================
// STORAGE SIZE ESTIMATION
// ============================================================================

export class StorageSizeEstimator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static estimateSize(data: any): {
    original: number;
    compressed: number;
    savings: number;
  } {
    const originalJson = JSON.stringify(data);
    const compressedData = DataCompressor.compress(data);
    const compressedJson = JSON.stringify(compressedData);

    const original = originalJson.length;
    const compressed = compressedJson.length;
    const savings = Math.round(((original - compressed) / original) * 100);

    return { original, compressed, savings };
  }
}
