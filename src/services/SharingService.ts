import { Share, Platform, ShareOptions } from "react-native";
import type { View } from "react-native";

import type {
  ImageResult,
  SaveFormat as ImageManipulatorSaveFormat,
  SaveOptions,
  Action,
} from "expo-image-manipulator";
import { captureRef } from "react-native-view-shot";

import { Logger } from "../utils/logger";
import type {
  GameReport,
  OptimalChoice,
} from "../utils/gameReportUtils";

// Import image manipulator conditionally to avoid web errors

let manipulateAsync:
  | ((
      uri: string,
      actions: Action[], // Using Action[] from expo-image-manipulator
      saveOptions?: SaveOptions,
    ) => Promise<ImageResult>)
  | null = null;
let SaveFormat: typeof ImageManipulatorSaveFormat | null = null;

if (Platform.OS !== "web") {
  // Only import on native platforms
  import("expo-image-manipulator").then((ImageManipulator) => {
    manipulateAsync = ImageManipulator.manipulateAsync;
    SaveFormat = ImageManipulator.SaveFormat;
  });
}

interface ShareChallengeOptions {
  startWord: string;
  targetWord: string;
  playerPath?: string[];
  screenshotRef?: React.RefObject<View | null>;
  includeScreenshot?: boolean;
  steps?: number;
  theme?: string;
  gameReport?: GameReport; // Add game report for encoding
}

interface ShareDailyChallengeOptions {
  challengeId: string;
  startWord: string;
  targetWord: string;
  aiSteps: number;
  userSteps?: number;
  userCompleted?: boolean;
  userGaveUp?: boolean;
  challengeDate: string;
  screenshotRef?: React.RefObject<View | null>;
  includeScreenshot?: boolean;
  gameReport?: GameReport; // Add game report for encoding
}

/**
 * Share a challenge with friends
 */
export const shareChallenge = async ({
  startWord,
  targetWord,
  playerPath,
  screenshotRef,
  includeScreenshot = true,
  steps,
  theme,
  gameReport,
}: ShareChallengeOptions): Promise<boolean> => {
  try {
    // Encode game report data if available
    const encodedPath = gameReport ? encodeGameReportForSharing(gameReport) : "";
    
    // Generate the deep link with encoded path
    const deepLink = generateSecureGameDeepLink(startWord, targetWord, theme, encodedPath);

    // Generate challenge message with emoji path
    const challengeMessage = generateChallengeMessage({
      startWord,
      targetWord,
      playerPath,
      steps,
      deepLink,
      encodedPath,
    });

    // Web-specific sharing handling
    if (Platform.OS === "web") {
      // Check if Web Share API is supported
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "Synapse Word Challenge",
            text: challengeMessage,
            url: deepLink,
          });
          return true;
        } catch (error) {
          // Fall through to clipboard fallback
        }
      }

      // Fallback: copy to clipboard with a confirmation
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          const textToCopy = `${challengeMessage}\n\n${deepLink}`;
          await navigator.clipboard.writeText(textToCopy);

          if (typeof window !== "undefined") {
          }

          return true;
        } catch (clipboardError) {
          throw new Error("Could not copy challenge link to clipboard");
        }
      }
    }

    // Native platform sharing
    const shareContent: { message: string; title?: string; url?: string } = {
      message: challengeMessage,
      title: "Synapse Word Challenge",
    };
    const shareDialogOptions: ShareOptions = {
      // dialogTitle: "Share Synapse Challenge",
      // subject: "Synapse Word Challenge"
    };

    // If screenshot is requested and we have a reference - only for native platforms
    if (
      Platform.OS !== "web" &&
      includeScreenshot &&
      screenshotRef &&
      screenshotRef.current
    ) {
      const uri = await captureGameScreen(screenshotRef);
      if (uri) {
        // On iOS, we can share both text and image (image via url)
        if (Platform.OS === "ios") {
          shareContent.url = uri;
          shareContent.message = challengeMessage;
        }
        // On Android, sharing text with an image URI in shareContent.url might not work as expected.
        // Android typically shares a URI via Intent.ACTION_SEND with Intent.EXTRA_STREAM.
        // The React Native Share API might handle this by prioritizing one.
        // For now, let's ensure the deepLink is part of the message if we can't reliably share both image and link.
        else {
          // Prioritize deep link in message for Android if image is present, or just use deeplink if no image.
          shareContent.message = `${challengeMessage}\n\nPlay here: ${deepLink}`;
        }
      } else {
        // If no screenshot URI, ensure the deep link is in the message for all native platforms
        shareContent.message = `${challengeMessage}\n\nPlay here: ${deepLink}`;
      }
    }

    // Show the share dialog
    const result = await Share.share(shareContent, shareDialogOptions);
    return result.action !== Share.dismissedAction;
  } catch (error) {
    return false;
  }
};

/**
 * Share a daily challenge with friends using taunting message
 */
export const shareDailyChallenge = async ({
  challengeId,
  startWord,
  targetWord,
  aiSteps,
  userSteps,
  userCompleted,
  userGaveUp,
  challengeDate,
  screenshotRef,
  includeScreenshot = true,
  gameReport,
}: ShareDailyChallengeOptions): Promise<boolean> => {
  try {
    // Encode game report data if available
    const encodedPath = gameReport ? encodeGameReportForSharing(gameReport) : "";
    
    // Generate the daily challenge deep link with encoded path
    const deepLink = generateSecureDailyChallengeDeepLink(
      challengeId,
      startWord,
      targetWord,
      encodedPath,
    );

    // Generate taunting message with emoji path
    const tauntMessage = generateDailyChallengeTaunt({
      startWord,
      targetWord,
      aiSteps,
      userSteps,
      userCompleted,
      userGaveUp,
      challengeDate,
      encodedPath,
    });

    // Web-specific sharing handling
    if (Platform.OS === "web") {
      // Check if Web Share API is supported
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "Synapse Daily Challenge",
            text: tauntMessage,
            url: deepLink,
          });
          return true;
        } catch (error) {
          // Fall through to clipboard fallback
        }
      }

      // Fallback: copy to clipboard with a confirmation
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          const textToCopy = `${tauntMessage}\n\n${deepLink}`;
          await navigator.clipboard.writeText(textToCopy);
          return true;
        } catch (clipboardError) {
          throw new Error("Could not copy daily challenge link to clipboard");
        }
      }
    }

    // Native platform sharing
    const shareContent: { message: string; title?: string; url?: string } = {
      message: tauntMessage,
      title: "Synapse Daily Challenge",
    };
    const shareDialogOptions: ShareOptions = {};

    // If screenshot is requested and we have a reference - only for native platforms
    if (
      Platform.OS !== "web" &&
      includeScreenshot &&
      screenshotRef &&
      screenshotRef.current
    ) {
      const uri = await captureGameScreen(screenshotRef);
      if (uri) {
        // On iOS, we can share both text and image (image via url)
        if (Platform.OS === "ios") {
          shareContent.url = uri;
          shareContent.message = tauntMessage;
        }
        // On Android, sharing text with an image URI in shareContent.url might not work as expected.
        else {
          shareContent.message = `${tauntMessage}\n\nPlay here: ${deepLink}`;
        }
      } else {
        // If no screenshot URI, ensure the deep link is in the message for all native platforms
        shareContent.message = `${tauntMessage}\n\nPlay here: ${deepLink}`;
      }
    }

    // Show the share dialog
    const result = await Share.share(shareContent, shareDialogOptions);
    return result.action !== Share.dismissedAction;
  } catch (error) {
    return false;
  }
};

/**
 * Generate a formatted message for sharing a challenge
 */
interface ChallengeMessageOptions {
  startWord: string;
  targetWord: string;
  playerPath?: string[];
  steps?: number;
  deepLink: string;
  gameStatus?: "won" | "given_up";
  encodedPath?: string; // Add encoded path for emoji display
}

export const generateChallengeMessage = (
  options: ChallengeMessageOptions,
): string => {
  const {
    startWord,
    targetWord,
    playerPath,
    steps,
    deepLink: _deepLink,
    gameStatus,
    encodedPath,
  } = options;

  let challengeMessage = `Can you connect "${startWord}" to "${targetWord}" in Synapse?`;

  // If player has a path (either completed or gave up)
  if (playerPath && playerPath.length > 1) {
    const pathLength = steps || playerPath.length - 1;

    if (gameStatus === "won") {
      const stepText = pathLength === 1 ? "step" : "steps";
      challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText}! Can you beat my score in Synapse?`;
    } else if (gameStatus === "given_up") {
      const stepText = pathLength === 1 ? "step" : "steps";
      challengeMessage = `I gave up trying to connect "${startWord}" to "${targetWord}" after ${pathLength} ${stepText}. Think you can do better in Synapse?`;
    } else {
      // Fallback for when gameStatus is not provided (backwards compatibility)
      const stepText = pathLength === 1 ? "step" : "steps";
      challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText}! Can you beat my score in Synapse?`;
    }
  }

  // Add emoji path if available
  if (encodedPath) {
    const emojiPath = pathEncodingToEmojis(encodedPath);
    challengeMessage += `\n\n${emojiPath}`;
  }

  // We won't include the deep link in the message as it will be included as URL in the share options
  return challengeMessage;
};

/**
 * Capture a screenshot of the game
 */
const captureGameScreen = async (
  ref: React.RefObject<View | null>,
): Promise<string | null> => {
  try {
    // For web, show a more helpful message about limitations
    if (Platform.OS === "web") {
    }

    // Capture the view as an image
    const uri = await captureRef(ref, {
      format: "jpg",
      quality: 0.8,
    });

    // Process the image if needed - but only on native platforms
    if (Platform.OS !== "web" && manipulateAsync && SaveFormat) {
      const processedImageResult = await manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { format: SaveFormat.JPEG, compress: 0.8 },
      );
      if (processedImageResult && processedImageResult.uri) {
        return processedImageResult.uri;
      }
    }

    // On web, just return the original URI or if processing failed
    return uri;
  } catch (error) {
    // On web, provide more detailed error information
    if (Platform.OS === "web") {
    }
    return null;
  }
};

/**
 * Generate a deep link to share a specific game setup
 * @deprecated Use generateSecureGameDeepLink instead - this function creates insecure URLs without hash validation
 */
export const generateGameDeepLink = (
  startWord: string,
  targetWord: string,
): string => {
  // Use the app's scheme for deep linking
  // For web, use the web URL format
  if (Platform.OS === "web") {
    // Use current origin or a fixed URL for the web version
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://synapse-game.example.com";
    return `${origin}/challenge?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}`;
  }

  // For native apps, use the custom scheme
  return `synapse://challenge?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}`;
};

/**
 * Generate a deep link for daily challenge sharing with taunting message
 * @deprecated Use generateSecureDailyChallengeDeepLink instead - this function creates insecure URLs without hash validation
 */
export const generateDailyChallengeDeepLink = (
  challengeId: string,
  startWord: string,
  targetWord: string,
): string => {
  // Use the app's scheme for deep linking
  // For web, use the web URL format
  if (Platform.OS === "web") {
    // Use current origin or a fixed URL for the web version
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://synapse-game.example.com";
    return `${origin}/dailychallenge?id=${encodeURIComponent(challengeId)}&start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}`;
  }

  // For native apps, use the custom scheme
  return `synapse://dailychallenge?id=${encodeURIComponent(challengeId)}&start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}`;
};

/**
 * Generate a taunting message for daily challenge sharing based on AI performance
 */
interface DailyChallengeTauntOptions {
  startWord: string;
  targetWord: string;
  aiSteps: number;
  userSteps?: number;
  userCompleted?: boolean;
  userGaveUp?: boolean;
  challengeDate: string;
  encodedPath?: string; // Add encoded path for emoji display
}

export const generateDailyChallengeTaunt = (
  options: DailyChallengeTauntOptions,
): string => {
  const {
    startWord,
    targetWord,
    aiSteps,
    userSteps,
    userCompleted,
    userGaveUp,
    challengeDate,
    encodedPath,
  } = options;

  const dateObj = new Date(challengeDate);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // If user completed it, compare with AI
  if (userCompleted && userSteps) {
    const userMoveText = userSteps === 1 ? "move" : "moves";
    const aiMoveText = aiSteps === 1 ? "move" : "moves";

    let message: string;
    if (userSteps < aiSteps) {
      message = `I crushed the AI on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText} (AI took ${aiSteps} ${aiMoveText}). Think you can beat me?`;
    } else if (userSteps === aiSteps) {
      message = `I matched the AI on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText}. Can you do better?`;
    } else {
      message = `I got ${formattedDate}'s challenge in ${userSteps} ${userMoveText} ("${startWord}" → "${targetWord}"). The AI did it in ${aiSteps} ${aiMoveText}... can you beat us both?`;
    }
    
    // Add emoji path if available
    if (encodedPath) {
      const emojiPath = pathEncodingToEmojis(encodedPath);
      message += `\n\n${emojiPath}`;
    }
    
    return message;
  }

  // If user gave up, acknowledge that but still challenge them
  if (userGaveUp) {
    const aiMoveText = aiSteps === 1 ? "move" : "moves";
    
    let message: string;
    if (userSteps && userSteps > 0) {
      const moveText = userSteps === 1 ? "move" : "moves";
      message = `I couldn't get ${formattedDate}'s challenge ("${startWord}" → "${targetWord}") and gave up after ${userSteps} ${moveText}, but the AI got it in ${aiSteps} ${aiMoveText}. Can you beat the AI in less than ${aiSteps} moves?`;
    } else {
      message = `I couldn't get ${formattedDate}'s challenge ("${startWord}" → "${targetWord}") and had to give up, but the AI got it in ${aiSteps} ${aiMoveText}. Can you beat the AI in less than ${aiSteps} moves?`;
    }
    
    // Add emoji path if available
    if (encodedPath) {
      const emojiPath = pathEncodingToEmojis(encodedPath);
      message += `\n\n${emojiPath}`;
    }
    
    return message;
  }

  // If user hasn't attempted it or no steps recorded, just taunt with AI score
  const aiMoveText = aiSteps === 1 ? "move" : "moves";
  let message = `I beat the AI in ${aiSteps} ${aiMoveText} on ${formattedDate}'s challenge ("${startWord}" → "${targetWord}"). Can you do better?`;
  
  // Add emoji path if available
  if (encodedPath) {
    const emojiPath = pathEncodingToEmojis(encodedPath);
    message += `\n\n${emojiPath}`;
  }
  
  return message;
};

/**
 * Simple hash function for URL validation
 */
const generateUrlHash = (data: string): string => {
  let hash = 0;
  const secret = "synapse_challenge_2025"; // Simple secret salt
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 8); // 8-character hash
};

/**
 * Validate a challenge URL hash
 */
const validateChallengeHash = (
  startWord: string,
  targetWord: string,
  providedHash: string,
): boolean => {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const expectedHash = generateUrlHash(data);
  return expectedHash === providedHash;
};

/**
 * Generate a secure deep link with hash validation
 */
export const generateSecureGameDeepLink = (
  startWord: string,
  targetWord: string,
  theme?: string,
  encodedPath?: string,
): string => {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);

  // Build base URL parameters
  const params = `start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&hash=${hash}`;
  const themeParam = theme ? `&theme=${encodeURIComponent(theme)}` : "";
  const shareParam = encodedPath ? `&share=${encodeURIComponent(encodedPath)}` : "";
  const fullParams = `${params}${themeParam}${shareParam}`;

  // Use the app's scheme for deep linking
  // For web, use the web URL format
  if (Platform.OS === "web") {
    // Use current origin or a fixed URL for the web version
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://synapse-game.example.com";
    return `${origin}/challenge?${fullParams}`;
  }

  // For native apps, use the custom scheme
  return `synapse://challenge?${fullParams}`;
};

/**
 * Validate a daily challenge URL hash
 */
const validateDailyChallengeHash = (
  challengeId: string,
  startWord: string,
  targetWord: string,
  providedHash: string,
): boolean => {
  const data = `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const expectedHash = generateUrlHash(data);
  return expectedHash === providedHash;
};

/**
 * Generate a secure daily challenge deep link with hash validation
 */
export const generateSecureDailyChallengeDeepLink = (
  challengeId: string,
  startWord: string,
  targetWord: string,
  encodedPath?: string,
): string => {
  const data = `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);

  // Build base URL parameters
  const baseParams = `id=${encodeURIComponent(challengeId)}&start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&hash=${hash}`;
  const shareParam = encodedPath ? `&share=${encodeURIComponent(encodedPath)}` : "";
  const fullParams = `${baseParams}${shareParam}`;

  // Use the app's scheme for deep linking
  // For web, use the web URL format
  if (Platform.OS === "web") {
    // Use current origin or a fixed URL for the web version
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://synapse-game.example.com";
    return `${origin}/dailychallenge?${fullParams}`;
  }

  // For native apps, use the custom scheme
  return `synapse://dailychallenge?${fullParams}`;
};

/**
 * Parse a deep link to extract game parameters with validation
 */
export const parseGameDeepLink = (
  url: string,
): {
  startWord?: string;
  targetWord?: string;
  theme?: string;
  isValid?: boolean;
} | null => {
  try {
    Logger.debug(" parseGameDeepLink: Parsing URL:", url);

    // Handle both web URLs and custom scheme URLs - REQUIRE hash validation
    if (url.includes("://challenge") || url.includes("/challenge")) {
      // Updated regex to handle theme parameter in either position
      const secureRegex =
        /(?:\/\/|\/+)challenge\?start=([^&]+)&target=([^&]+)&(?:hash=([^&]+)&theme=([^&]+)|theme=([^&]+)&hash=([^&]+)|hash=([^&]+))/;
      const secureMatch = url.match(secureRegex);

      if (secureMatch && secureMatch.length >= 4) {
        const startWord = decodeURIComponent(secureMatch[1]);
        const targetWord = decodeURIComponent(secureMatch[2]);

        // Handle different parameter orders
        let providedHash: string;
        let theme: string | undefined;

        if (secureMatch[3] && secureMatch[4]) {
          // hash=X&theme=Y format
          providedHash = secureMatch[3];
          theme = decodeURIComponent(secureMatch[4]);
        } else if (secureMatch[5] && secureMatch[6]) {
          // theme=Y&hash=X format
          theme = decodeURIComponent(secureMatch[5]);
          providedHash = secureMatch[6];
        } else if (secureMatch[7]) {
          // hash=X only format
          providedHash = secureMatch[7];
          theme = undefined;
        } else {
          Logger.debug(" parseGameDeepLink: Unable to parse hash from URL");
          return null;
        }

        const isValid = validateChallengeHash(
          startWord,
          targetWord,
          providedHash,
        );
        Logger.debug(" parseGameDeepLink: Hash validation result:", isValid);

        if (!isValid) {
          Logger.debug(" parseGameDeepLink: Invalid hash - rejecting URL");
          return null; // Reject invalid URLs
        }

        return {
          startWord,
          targetWord,
          theme,
          isValid: true,
        };
      }

      // Reject URLs without hash
      Logger.debug(
        "🎮 parseGameDeepLink: No hash found in challenge URL - rejecting",
      );
      return null;
    }

    // Legacy format still supported for non-challenge URLs
    const legacyRegex = /(?:\/\/|\/+)game\?start=([^&]+)&target=([^&]+)/;
    Logger.debug(" parseGameDeepLink: Testing legacy regex");
    const legacyMatch = url.match(legacyRegex);

    if (legacyMatch && legacyMatch.length >= 3) {
      console.log(
        "🎮 parseGameDeepLink: Legacy URL format - rejecting (use /challenge with hash)",
      );
      return null; // Reject legacy URLs without hash
    }

    Logger.debug(" parseGameDeepLink: No valid URL format found");
    return null;
  } catch (error) {
    console.error("🎮 parseGameDeepLink: Error parsing URL:", error);
    return null;
  }
};

/**
 * Parse a daily challenge deep link to extract challenge parameters with validation
 */
export const parseDailyChallengeDeepLink = (
  url: string,
): {
  challengeId?: string;
  startWord?: string;
  targetWord?: string;
  isValid?: boolean;
} | null => {
  try {
    // Handle both web URLs and custom scheme URLs for daily challenges - REQUIRE hash validation
    if (url.includes("://dailychallenge") || url.includes("/dailychallenge")) {
      // Only accept hash-validated URLs
      const secureRegex =
        /(?:\/\/|\/+)dailychallenge\?id=([^&]+)&start=([^&]+)&target=([^&]+)&hash=([^&]+)/;
      const secureMatch = url.match(secureRegex);

      if (secureMatch && secureMatch.length >= 5) {
        const challengeId = decodeURIComponent(secureMatch[1]);
        const startWord = decodeURIComponent(secureMatch[2]);
        const targetWord = decodeURIComponent(secureMatch[3]);
        const providedHash = secureMatch[4];

        const isValid = validateDailyChallengeHash(
          challengeId,
          startWord,
          targetWord,
          providedHash,
        );
        Logger.debug(
          "🎮 parseDailyChallengeDeepLink: Hash validation result:",
          isValid,
        );

        if (!isValid) {
          Logger.debug(
            "🎮 parseDailyChallengeDeepLink: Invalid hash - rejecting URL",
          );
          return null; // Reject invalid URLs
        }

        return {
          challengeId,
          startWord,
          targetWord,
          isValid: true,
        };
      }

      // Reject URLs without hash
      Logger.debug(
        "🎮 parseDailyChallengeDeepLink: No hash found in daily challenge URL - rejecting",
      );
      return null;
    }

    return null;
  } catch (error) {
    console.error("🎮 parseDailyChallengeDeepLink: Error parsing URL:", error);
    return null;
  }
};

/**
 * Encode game report data into a compact visual representation
 * S = Start (🟩), T = Target (🟥), C = Current (🟦), N = Normal (⬜), 
 * G = Global optimal (🟨), L = Local optimal (🟪), R = Remaining path (⚫)
 */
export const encodeGameReportForSharing = (report: GameReport): string => {
  const { playerPath, optimalChoices, suggestedPath, status } = report;
  
  if (!playerPath || playerPath.length === 0) {
    return "";
  }

  let encoded = "";
  
  // Process each word in the player's path
  for (let i = 0; i < playerPath.length; i++) {
    const word = playerPath[i];
    
    if (i === 0) {
      // Start word
      encoded += "S";
    } else if (i === playerPath.length - 1) {
      // Last word in path
      if (status === "won") {
        // If won, last word is the target
        encoded += "T";
      } else {
        // If gave up, last word is current position
        encoded += "C";
      }
    } else {
      // Middle words - check if they were optimal moves
      const choiceIndex = i - 1; // Choice index is one less than word index
      const choice = optimalChoices?.[choiceIndex];
      
      if (choice && choice.playerChose === word) {
        if (choice.isGlobalOptimal) {
          encoded += "G";
        } else if (choice.isLocalOptimal) {
          encoded += "L";
        } else {
          encoded += "N";
        }
      } else {
        encoded += "N";
      }
    }
  }
  
  // If player gave up, add remaining path from suggested path
  if (status === "given_up" && suggestedPath && suggestedPath.length > 1) {
    // Skip the first word of suggested path (it's the current position, already encoded as C)
    for (let i = 1; i < suggestedPath.length - 1; i++) {
      encoded += "R";
    }
    // Last word of suggested path is the target
    encoded += "T";
  }
  
  return encoded;
};

/**
 * Convert encoded path to emoji representation for display
 */
export const pathEncodingToEmojis = (encoded: string): string => {
  return encoded
    .split("")
    .map((char) => {
      switch (char) {
        case "S": return "🟩"; // Start - green square
        case "T": return "🟥"; // Target - red square  
        case "C": return "🟦"; // Current - blue square
        case "N": return "⬜"; // Normal - light gray square
        case "G": return "🟨"; // Global optimal - yellow square
        case "L": return "🟪"; // Local optimal - purple square
        case "R": return "⚫"; // Remaining path - dark circle
        default: return char;
      }
    })
    .join("");
};
