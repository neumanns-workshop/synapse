import { Share, Platform, ShareOptions } from "react-native";
import type { View } from "react-native";

import type {
  ImageResult,
  SaveFormat as ImageManipulatorSaveFormat,
  SaveOptions,
  // ImageManipulationAction, // Keeping as any[] as direct export not found, actions can be various object types (CropAction, ResizeAction etc.)
} from "expo-image-manipulator";
import { captureRef } from "react-native-view-shot";

// Import image manipulator conditionally to avoid web errors
let manipulateAsync:
  | ((
      uri: string,
      actions: any[], // Using any[] as actions can be diverse (e.g., CropAction, ResizeAction) and a single union type isn't directly exported.
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
}: ShareChallengeOptions): Promise<boolean> => {
  try {
    // Generate the deep link
    const deepLink = generateGameDeepLink(startWord, targetWord);

    // Generate challenge message
    const challengeMessage = generateChallengeMessage({
      startWord,
      targetWord,
      playerPath,
      steps,
      deepLink,
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
 * Generate a formatted message for sharing a challenge
 */
interface ChallengeMessageOptions {
  startWord: string;
  targetWord: string;
  playerPath?: string[];
  steps?: number;
  deepLink: string;
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
  } = options;

  let challengeMessage = `Can you connect "${startWord}" to "${targetWord}" in Synapse?`;

  // If player completed this challenge, add their score
  if (playerPath && playerPath.length > 1) {
    const pathLength = steps || playerPath.length - 1;
    challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} steps! Can you beat my score in Synapse?`;
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
 * Parse a deep link to extract game parameters
 */
export const parseGameDeepLink = (
  url: string,
): { startWord?: string; targetWord?: string } | null => {
  try {
    let regex;

    // Handle both web URLs and custom scheme URLs
    if (url.includes("://challenge")) {
      // Either custom scheme or web URL with /challenge path
      regex = /(?:\/\/|\/+)challenge\?start=([^&]+)&target=([^&]+)/;
    } else {
      // Legacy or alternative format
      regex = /(?:\/\/|\/+)game\?start=([^&]+)&target=([^&]+)/;
    }

    const match = url.match(regex);

    if (match && match.length >= 3) {
      return {
        startWord: decodeURIComponent(match[1]),
        targetWord: decodeURIComponent(match[2]),
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};
