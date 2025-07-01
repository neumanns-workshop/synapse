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

// Add Supabase import for storage
import { SupabaseService } from "./SupabaseService";

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

if (Platform.OS === "web") {
  // Only import on web platform
  import("html2canvas")
    .then((module) => {
      html2canvas = module.default;
    })
    .catch(() => {
      console.warn("html2canvas not available for web screenshots");
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
 * Upload screenshot to Supabase Storage with spam protection
 */
const uploadScreenshotToStorage = async (
  screenshotUri: string,
  challengeId: string,
): Promise<{ publicUrl: string | null; error: string | null }> => {
  try {
    console.log("🔄 Starting screenshot upload process...", {
      challengeId,
      screenshotUriType: screenshotUri.startsWith("data:")
        ? "data-uri"
        : "blob-url",
      platform: Platform.OS,
    });

    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getSupabaseClient();

    // Get user info for rate limiting
    const user = supabaseService.getUser();
    const userId = user?.id || "anonymous";

    // Create consistent filename (replaces previous uploads)
    const filename = `${userId}/${challengeId}/preview.jpg`;

    // Convert URI to blob for upload
    let blob: Blob;
    if (Platform.OS === "web") {
      // On web, screenshot URI might be a data URI (data:image/jpeg;base64,...)
      if (screenshotUri.startsWith("data:")) {
        // Convert data URI to blob
        const response = await fetch(screenshotUri);
        blob = await response.blob();
      } else {
        // It's a blob URL, fetch it
        const response = await fetch(screenshotUri);
        blob = await response.blob();
      }
    } else {
      // On native, convert file URI to blob
      const response = await fetch(screenshotUri);
      blob = await response.blob();
    }

    console.log("✅ Screenshot blob created successfully", {
      blobSize: blob.size,
      blobType: blob.type,
    });

    // Check file size (max 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      return { publicUrl: null, error: "Image too large (max 5MB)" };
    }

    // Rate limiting check - 10 uploads per hour per user
    const rateLimit = await checkUploadRateLimit(userId);
    if (!rateLimit.allowed) {
      return {
        publicUrl: null,
        error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
      };
    }

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("preview-images")
      .upload(filename, blob, {
        cacheControl: "604800", // 7 days cache
        upsert: true, // Allow overwriting
      });

    if (error) {
      console.error("Storage upload error:", error);
      return { publicUrl: null, error: "Failed to upload image" };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("preview-images")
      .getPublicUrl(filename);

    if (!publicUrlData?.publicUrl) {
      return { publicUrl: null, error: "Failed to get public URL" };
    }

    console.log("🎉 Screenshot uploaded successfully!", {
      filename,
      publicUrl: publicUrlData.publicUrl,
    });

    // Record upload for rate limiting
    await recordUpload(userId);

    // Schedule cleanup (delete after 7 days)
    await scheduleImageCleanup(filename, Date.now() + 7 * 24 * 60 * 60 * 1000);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error) {
    console.error("Error uploading screenshot:", error);
    return { publicUrl: null, error: "Upload failed" };
  }
};

/**
 * Check if user has exceeded upload rate limit
 */
const checkUploadRateLimit = async (
  userId: string,
): Promise<{
  allowed: boolean;
  retryAfter: number;
}> => {
  try {
    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getSupabaseClient();

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Count uploads in last hour
    const { data, error } = await supabase
      .from("upload_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", new Date(oneHourAgo).toISOString());

    if (error) {
      console.error("Rate limit check error:", error);
      // If we can't check, allow it but log the error
      return { allowed: true, retryAfter: 0 };
    }

    const uploadCount = data?.length || 0;
    const maxUploads = 10; // 10 uploads per hour

    if (uploadCount >= maxUploads) {
      // Find oldest upload to calculate retry time
      const oldestUpload = data?.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )[0];

      const retryAfter = oldestUpload
        ? new Date(oldestUpload.created_at).getTime() +
          60 * 60 * 1000 -
          Date.now()
        : 60 * 60 * 1000; // Default to 1 hour

      return { allowed: false, retryAfter: Math.max(0, retryAfter) };
    }

    return { allowed: true, retryAfter: 0 };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // If rate limit check fails, allow the upload
    return { allowed: true, retryAfter: 0 };
  }
};

/**
 * Record upload for rate limiting
 */
const recordUpload = async (userId: string): Promise<void> => {
  try {
    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getSupabaseClient();

    await supabase.from("upload_rate_limits").insert({
      user_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recording upload:", error);
    // Non-critical error, don't fail the upload
  }
};

/**
 * Schedule image cleanup (delete after expiration)
 */
const scheduleImageCleanup = async (
  filename: string,
  expiresAt: number,
): Promise<void> => {
  try {
    const supabaseService = SupabaseService.getInstance();
    const supabase = supabaseService.getSupabaseClient();

    await supabase.from("image_cleanup_queue").insert({
      filename,
      expires_at: new Date(expiresAt).toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error scheduling cleanup:", error);
    // Non-critical error, don't fail the upload
  }
};

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
    // Upload screenshot to get public URL for social media previews
    let previewImageUrl: string | null = null;
    if (includeScreenshot && screenshotRef && screenshotRef.current) {
      const screenshotUri = await captureGameScreen(screenshotRef);
      if (screenshotUri) {
        const challengeId = `${startWord}-${targetWord}`;
        const uploadResult = await uploadScreenshotToStorage(
          screenshotUri,
          challengeId,
        );
        if (uploadResult.error) {
          console.warn("Failed to upload screenshot:", uploadResult.error);
          // Continue without preview image
        } else {
          previewImageUrl = uploadResult.publicUrl;
        }
      }
    }

    // Generate the secure deep link
    const deepLink = generateSecureGameDeepLink(
      "challenge",
      startWord,
      targetWord,
      theme,
      undefined, // no challengeId for regular challenges
      previewImageUrl || undefined,
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
    // Upload screenshot to get public URL for social media previews
    let previewImageUrl: string | null = null;
    if (includeScreenshot && screenshotRef && screenshotRef.current) {
      const screenshotUri = await captureGameScreen(screenshotRef);
      if (screenshotUri) {
        const challengeIdForUpload = `daily-${challengeId}-${startWord}-${targetWord}`;
        const uploadResult = await uploadScreenshotToStorage(
          screenshotUri,
          challengeIdForUpload,
        );
        if (uploadResult.error) {
          console.warn("Failed to upload screenshot:", uploadResult.error);
          // Continue without preview image
        } else {
          previewImageUrl = uploadResult.publicUrl;
        }
      }
    }

    // Generate the secure daily challenge deep link
    const deepLink = generateSecureGameDeepLink(
      "dailychallenge",
      startWord,
      targetWord,
      undefined, // no theme for daily challenges
      challengeId,
      previewImageUrl || undefined,
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
const captureGameScreen = async (
  ref: React.RefObject<View | null>,
): Promise<string | null> => {
  try {
    // For web, we need to handle HTML Canvas/DOM-based screenshot capture
    if (Platform.OS === "web") {
      // Web-specific screenshot capture using HTML Canvas
      try {
        const uri = await captureRef(ref, {
          format: "jpg",
          quality: 0.8,
          result: "data-uri", // Ensure we get a data URI on web
        });

        // On web, captureRef returns a data URI directly
        return uri;
      } catch (webError) {
        console.warn("Web screenshot capture failed:", webError);

        // Fallback: try html2canvas if available
        if (ref.current && typeof window !== "undefined" && html2canvas) {
          try {
            const element = ref.current as unknown as HTMLElement;

            // Check if element is a valid DOM element
            if (
              element &&
              typeof element.getBoundingClientRect === "function"
            ) {
              const canvas = await html2canvas(element, {
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                scale: 1,
                width: 800,
                height: 600,
              });

              // Convert canvas to data URL
              const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
              console.log("✅ html2canvas screenshot generated successfully");
              return dataUrl;
            }
          } catch (fallbackError) {
            console.warn("html2canvas fallback method failed:", fallbackError);
          }
        } else if (ref.current && typeof window !== "undefined") {
          console.log("html2canvas not available, no web screenshot fallback");
        }
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // On web, provide more detailed error information
    if (Platform.OS === "web") {
      console.error("Web screenshot capture failed:", {
        error: errorMessage,
        stack: errorStack,
        refCurrent: ref.current ? "exists" : "null",
        browserSupport: {
          canvas: typeof HTMLCanvasElement !== "undefined",
          blob: typeof Blob !== "undefined",
          fetch: typeof fetch !== "undefined",
        },
      });

      // Provide user-friendly error message for web
      if (
        errorMessage?.includes("permission") ||
        errorMessage?.includes("denied")
      ) {
        console.warn(
          "Screenshot permission denied - this is normal on web browsers for security reasons",
        );
      } else if (
        errorMessage?.includes("network") ||
        errorMessage?.includes("cors")
      ) {
        console.warn("Network or CORS error during screenshot capture");
      } else {
        console.warn("Web screenshot not available - using text-only sharing");
      }
    } else {
      console.error("Native screenshot capture failed:", error);
    }
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
const generateUrlHash = (data: string): string => {
  // Simple hash function for URL validation
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 6);
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
  previewImageUrl?: string, // For uploaded images
): string => {
  // Generate security hash
  const data = challengeId
    ? `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`
    : `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);

  // Build clean parameters
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("start", startWord);
  params.set("target", targetWord);
  params.set("hash", hash);

  if (theme) params.set("theme", theme);
  if (challengeId) params.set("id", challengeId);
  if (previewImageUrl) params.set("preview", previewImageUrl);

  // Use the app's scheme for deep linking
  if (Platform.OS === "web") {
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
      previewImageUrl: params.get("preview") || undefined,
    };
  } catch (error) {
    console.error("Error parsing enhanced game link:", error);
    return null;
  }
};
