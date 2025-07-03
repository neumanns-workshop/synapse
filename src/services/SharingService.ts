import { Share, Platform, ShareOptions } from "react-native";
import type { View } from "react-native";

import type {
  ImageResult,
  SaveFormat as ImageManipulatorSaveFormat,
  SaveOptions,
  Action,
} from "expo-image-manipulator";
import { captureRef } from "react-native-view-shot";

import type { GameReport } from "../utils/gameReportUtils";

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

// Import html2canvas conditionally for web screenshot fallback
interface Html2CanvasOptions {
  useCORS?: boolean;
  allowTaint?: boolean;
  backgroundColor?: string | null;
  scale?: number;
  width?: number;
  height?: number;
}

let html2canvas:
  | ((
      element: HTMLElement,
      options?: Html2CanvasOptions,
    ) => Promise<HTMLCanvasElement>)
  | null = null;

if (typeof window !== "undefined") {
  // Only import on web platform
  import("html2canvas")
    .then((module) => {
      html2canvas = module.default;
    })
    .catch(() => {
      console.warn("html2canvas not available for web screenshots");
    });
}

/**
 * Copies a challenge screenshot and text to the clipboard (Web only).
 * Provides multiple formats (image, text, html) for best paste results.
 */
export const copyChallengeToClipboard = async (
  screenshotUri: string,
  message: string,
  link: string,
): Promise<{ success: boolean; error?: string }> => {
  if (Platform.OS !== "web" || !navigator.clipboard) {
    return { success: false, error: "Clipboard API not available" };
  }

  try {
    // 1. Fetch the screenshot data as a blob
    const response = await fetch(screenshotUri);
    const imageBlob = await response.blob();

    // 2. Create the HTML content with the embedded image and text
    const htmlContent = `
      <div>
        <p>${message}</p>
        <img src="${screenshotUri}" alt="Synapse Challenge" />
        <p>Play here: <a href="${link}">${link}</a></p>
      </div>
    `;
    const htmlBlob = new Blob([htmlContent], { type: "text/html" });

    // 3. Create a plain text version
    const textContent = `${message}\n\nPlay here: ${link}`;
    const textBlob = new Blob([textContent], { type: "text/plain" });

    // 4. Use the Clipboard API to write all formats
    await navigator.clipboard.write([
      new ClipboardItem({
        [imageBlob.type]: imageBlob,
        [textBlob.type]: textBlob,
        [htmlBlob.type]: htmlBlob,
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: errorMessage };
  }
};

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
    console.log("🎯 shareChallenge called with:", {
      startWord,
      targetWord,
      includeScreenshot,
    });

    // Generate the secure deep link
    const deepLink = generateSecureGameDeepLink(
      "challenge",
      startWord,
      targetWord,
      theme,
    );

    // Generate challenge message
    const challengeMessage = generateChallengeMessage({
      startWord,
      targetWord,
      playerPath,
      steps,
      optimalPathLength: gameReport?.optimalPath.length
        ? gameReport.optimalPath.length - 1
        : undefined,
    });

    // Web-specific sharing handling
    if (typeof window !== "undefined") {
      console.log("🎯 Web platform detected, checking sharing options...");

      // Check if Web Share API is supported
      if (typeof navigator !== "undefined" && navigator.share) {
        console.log("🎯 Web Share API available, trying...");
        try {
          await navigator.share({
            title: "Synapse Word Challenge",
            text: challengeMessage,
            url: deepLink,
          });
          console.log("🎯 Web Share API succeeded");
          return true;
        } catch (error) {
          console.log("🎯 Web Share API failed:", error);
          // Fall through to clipboard fallback
        }
      } else {
        console.log("🎯 Web Share API not available");
      }

      // Fallback: copy to clipboard with a confirmation
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        console.log("🎯 Clipboard API available, trying...");
        try {
          const textToCopy = `${challengeMessage}\n\n${deepLink}`;
          await navigator.clipboard.writeText(textToCopy);
          console.log("🎯 Clipboard API succeeded");
          return true;
        } catch (clipboardError) {
          console.log("🎯 Clipboard API failed:", clipboardError);
          throw new Error("Could not copy challenge link to clipboard");
        }
      } else {
        console.log("🎯 Clipboard API not available");
        throw new Error("No web sharing options available");
      }
    }

    // Native platform sharing
    const shareContent: { message: string; title?: string; url?: string } = {
      message: challengeMessage,
      title: "Synapse Word Challenge",
    };
    const shareDialogOptions: ShareOptions = {};

    // For native platforms, use the screenshot directly if available
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
        else {
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
    // Generate the secure daily challenge deep link
    const deepLink = generateSecureGameDeepLink(
      "dailychallenge",
      startWord,
      targetWord,
      undefined, // no theme for daily challenges
      challengeId,
    );

    // Generate taunting message
    const tauntMessage = generateDailyChallengeTaunt({
      startWord,
      targetWord,
      aiSteps,
      userSteps,
      userCompleted,
      userGaveUp,
      challengeDate,
      optimalPathLength: gameReport?.optimalPath.length
        ? gameReport.optimalPath.length - 1
        : undefined,
    });

    // Web-specific sharing handling
    if (typeof window !== "undefined") {
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

    // For native platforms, use the screenshot directly if available
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
        } else {
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
 * Generate challenge message for sharing
 */
export const generateChallengeMessage = ({
  startWord,
  targetWord,
  playerPath,
  steps,
  gameStatus,
  optimalPathLength,
}: {
  startWord: string;
  targetWord: string;
  playerPath?: string[];
  steps?: number;
  gameStatus?: "won" | "given_up";
  optimalPathLength?: number;
}): string => {
  // Generate message based on game status
  let challengeMessage: string;
  const pathLength = steps || playerPath?.length || 1;

  if (gameStatus === "won") {
    const stepText = pathLength === 1 ? "step" : "steps";

    // Check if user achieved a perfect game (optimal path)
    const isPerfectGame = optimalPathLength && pathLength === optimalPathLength;

    if (isPerfectGame) {
      challengeMessage = `I got a PERFECT game! Connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText} (the optimal path). Can you match perfection in Synapse?`;
    } else {
      challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText}! Can you beat my score in Synapse?`;
    }
  } else if (gameStatus === "given_up") {
    const stepText = pathLength === 1 ? "step" : "steps";
    challengeMessage = `I gave up trying to connect "${startWord}" to "${targetWord}" after ${pathLength} ${stepText}. Think you can do better in Synapse?`;
  } else {
    // Fallback for when gameStatus is not provided (backwards compatibility)
    const stepText = pathLength === 1 ? "step" : "steps";

    // Check if user achieved a perfect game (optimal path)
    const isPerfectGame = optimalPathLength && pathLength === optimalPathLength;

    if (isPerfectGame) {
      challengeMessage = `I got a PERFECT game! Connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText} (the optimal path). Can you match perfection in Synapse?`;
    } else {
      challengeMessage = `I connected "${startWord}" to "${targetWord}" in ${pathLength} ${stepText}! Can you beat my score in Synapse?`;
    }
  }

  return challengeMessage;
};

/**
 * Capture a screenshot of the game
 */
export const captureGameScreen = async (
  ref: React.RefObject<View | null>,
): Promise<string | null> => {
  try {
    console.log("🔥 DEBUG: Screenshot capture starting", {
      platform: Platform.OS,
      hasRef: !!ref,
      hasRefCurrent: !!ref?.current,
      html2canvasAvailable: typeof html2canvas !== "undefined",
    });

    // For web, we need to handle HTML Canvas/DOM-based screenshot capture
    if (typeof window !== "undefined") {
      // Skip captureRef on web and go straight to html2canvas
      if (ref.current && typeof window !== "undefined" && html2canvas) {
        try {
          console.log("🔥 DEBUG: Attempting html2canvas capture");
          const element = ref.current as unknown as HTMLElement;

          // Check if element is a valid DOM element
          if (element && typeof element.getBoundingClientRect === "function") {
            const rect = element.getBoundingClientRect();
            console.log("🔥 DEBUG: Element found, calling html2canvas", {
              width: rect.width,
              height: rect.height,
              x: rect.x,
              y: rect.y,
            });

            const canvas = await html2canvas(element, {
              useCORS: true,
              allowTaint: false,
              backgroundColor: null,
              scale: 1,
              // Remove fixed dimensions to capture actual element size
              // width: 800,
              // height: 600,
            });

            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            console.log(
              "🔥 DEBUG: html2canvas SUCCESS, dataUrl length:",
              dataUrl.length,
            );
            return dataUrl;
          } else {
            console.error("🔥 DEBUG: Invalid DOM element for screenshot");
            return null;
          }
        } catch (fallbackError) {
          console.error("🔥 DEBUG: html2canvas failed:", fallbackError);
          return null;
        }
      } else {
        console.error("🔥 DEBUG: html2canvas not available or no ref");
        return null;
      }
    }

    // Native platform screenshot capture
    const uri = await captureRef(ref, {
      format: "jpg",
      quality: 0.8,
    });

    // Process the image if needed - but only on native platforms
    if (manipulateAsync && SaveFormat) {
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
    console.error("🔥 DEBUG: Screenshot capture failed with error:", error);
    return null;
  }
};

/**
 * Generate daily challenge taunting message
 */
export const generateDailyChallengeTaunt = ({
  startWord,
  targetWord,
  aiSteps,
  userSteps,
  userCompleted,
  userGaveUp,
  challengeDate,
  optimalPathLength,
}: {
  startWord: string;
  targetWord: string;
  aiSteps: number;
  userSteps?: number;
  userCompleted?: boolean;
  userGaveUp?: boolean;
  challengeDate: string;
  optimalPathLength?: number;
}): string => {
  const stepText = aiSteps === 1 ? "step" : "steps";
  const userStepText = userSteps && userSteps === 1 ? "step" : "steps";

  // Check if user achieved optimal path
  const userGotOptimal = userCompleted && userSteps === optimalPathLength;

  if (userCompleted && userSteps) {
    if (userSteps < aiSteps) {
      if (userGotOptimal) {
        return `🏆 I CRUSHED today's daily challenge! Got the PERFECT solution to "${startWord}" → "${targetWord}" in ${userSteps} ${userStepText} while the AI took ${aiSteps}. Can you match perfection? ${challengeDate}`;
      } else {
        return `💪 I beat the AI on today's daily challenge! Connected "${startWord}" → "${targetWord}" in ${userSteps} ${userStepText} vs AI's ${aiSteps}. Think you can do better? ${challengeDate}`;
      }
    } else if (userSteps === aiSteps) {
      if (userGotOptimal) {
        return `🎯 I matched the AI's PERFECT solution! Connected "${startWord}" → "${targetWord}" in ${userSteps} ${userStepText} (optimal path). Can you do the same? ${challengeDate}`;
      } else {
        return `🤝 I tied with the AI! Both solved "${startWord}" → "${targetWord}" in ${userSteps} ${userStepText}. Can you beat us both? ${challengeDate}`;
      }
    } else {
      if (userGotOptimal) {
        return `🎯 I got the PERFECT solution to "${startWord}" → "${targetWord}" in ${userSteps} ${userStepText}! Even though the AI was faster, I found the optimal path. ${challengeDate}`;
      } else {
        return `🤖 The AI beat me today! I took ${userSteps} ${userStepText} vs AI's ${aiSteps} for "${startWord}" → "${targetWord}". Think you can do better? ${challengeDate}`;
      }
    }
  } else if (userGaveUp) {
    return `😅 I gave up on today's daily challenge "${startWord}" → "${targetWord}" but the AI solved it in ${aiSteps} ${stepText}. Think you can beat the AI? ${challengeDate}`;
  } else {
    return `🤖 The AI solved today's challenge "${startWord}" → "${targetWord}" in ${aiSteps} ${stepText}. Can you beat it? ${challengeDate}`;
  }
};

/**
 * Generate URL hash for security validation
 */
export const generateUrlHash = (data: string): string => {
  // Simple hash function for URL validation (matches edge function)
  let hashValue = 0;
  const secret = "synapse_challenge_2025";
  const combined = data + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hashValue = hashValue * 5 - hashValue + char;
    hashValue = hashValue % 2147483647; // Keep it positive 32-bit
  }
  return Math.abs(hashValue).toString(36).substring(0, 8);
};

/**
 * Generate a secure deep link with hash validation
 */
export const generateSecureGameDeepLink = (
  type: "challenge" | "dailychallenge",
  startWord: string,
  targetWord: string,
  theme?: string,
  challengeId?: string, // For daily challenges
): string => {
  // Generate security hash (must match upload and edge function logic)
  const challengeData = challengeId
    ? `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`
    : `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;

  // Hashing no longer includes userId, it's based on challenge data only
  const hash = generateUrlHash(challengeData);

  // Build clean parameters (no preview or uid parameter for shorter URLs)
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("start", startWord);
  params.set("target", targetWord);
  params.set("hash", hash);

  if (theme) params.set("theme", theme);
  if (challengeId) params.set("id", challengeId);

  // Use the app's scheme for deep linking
  if (typeof window !== "undefined") {
    // Use current origin or a fixed URL for the web version
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://synapsegame.ai";
    return `${origin}/challenge?${params.toString()}`;
  }

  // For native apps, use the custom scheme
  return `synapse://challenge?${params.toString()}`;
};

/**
 * Parse enhanced game link to extract challenge parameters
 */
export const parseEnhancedGameLink = (
  url: string,
): {
  type?: string;
  startWord?: string;
  targetWord?: string;
  challengeId?: string;
  theme?: string;
  hash?: string;
  uid?: string; // Keep for parsing old links
  previewImageUrl?: string;
} | null => {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      type: params.get("type") || undefined,
      startWord: params.get("start") || undefined,
      targetWord: params.get("target") || undefined,
      challengeId: params.get("id") || undefined,
      theme: params.get("theme") || undefined,
      hash: params.get("hash") || undefined,
      uid: params.get("uid") || undefined, // Keep for old links
      previewImageUrl: params.get("preview") || undefined,
    };
  } catch (error) {
    console.error("Error parsing enhanced game link:", error);
    return null;
  }
};
