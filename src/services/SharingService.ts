import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';
import type { GameScore } from './StorageService';

interface ShareGameResultsOptions {
  score: GameScore;
  screenshotRef?: React.RefObject<any>;
  includeScreenshot?: boolean;
}

/**
 * Share game results via the native share dialog
 */
export const shareGameResults = async ({
  score,
  screenshotRef,
  includeScreenshot = true
}: ShareGameResultsOptions): Promise<boolean> => {
  try {
    // Generate share message
    const shareMessage = generateShareMessage(score);
    
    // Options for the share dialog
    const shareOptions: any = {
      message: shareMessage,
      title: 'My Synapse Game Results',
    };

    // If screenshot is requested and we have a reference
    if (includeScreenshot && screenshotRef && screenshotRef.current) {
      const uri = await captureGameScreen(screenshotRef);
      if (uri) {
        // On iOS, we can share both text and image
        if (Platform.OS === 'ios') {
          shareOptions.url = uri;
        } 
        // On Android, we need to choose one or the other
        else {
          shareOptions.message = `${shareMessage}\n`;
          shareOptions.url = uri;
        }
      }
    }

    // Show the share dialog
    const result = await Share.share(shareOptions);
    return result.action !== Share.dismissedAction;
  } catch (error) {
    console.error('Error sharing game results:', error);
    return false;
  }
};

/**
 * Generate a formatted message for sharing
 */
const generateShareMessage = (score: GameScore): string => {
  const { pathLength, timeInSeconds, startWord, targetWord } = score;
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return `I connected "${startWord}" to "${targetWord}" in ${pathLength} steps and ${timeFormatted}! Play Synapse: Semantic Pathways and see if you can beat my score!`;
};

/**
 * Capture a screenshot of the game
 */
const captureGameScreen = async (ref: React.RefObject<any>): Promise<string | null> => {
  try {
    // Capture the view as an image
    const uri = await captureRef(ref, {
      format: 'jpg',
      quality: 0.8,
    });

    // Process the image if needed
    const processedUri = await manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { format: SaveFormat.JPEG, compress: 0.8 }
    );

    return processedUri.uri;
  } catch (error) {
    console.error('Error capturing game screen:', error);
    return null;
  }
};

/**
 * Save the game result image to the device
 */
export const saveGameImage = async (ref: React.RefObject<any>): Promise<string | null> => {
  try {
    // TODO: Implement saving to camera roll or files
    // This will be different between platforms
    // On web, this would download the file

    // Capture the screen
    const uri = await captureGameScreen(ref);
    if (!uri) return null;

    // On native platforms, we could save to camera roll
    // This would require additional permissions
    // TODO: Implement actual saving logic
    
    return uri;
  } catch (error) {
    console.error('Error saving game image:', error);
    return null;
  }
};

/**
 * Generate a deep link to share a specific game setup
 */
export const generateGameDeepLink = (startWord: string, targetWord: string): string => {
  // TODO: Implement proper deep linking with your app's scheme
  // This is a placeholder format
  return `synapse://game?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}`;
};

/**
 * Parse a deep link to extract game parameters
 */
export const parseGameDeepLink = (url: string): { startWord?: string; targetWord?: string } | null => {
  try {
    // TODO: Implement actual deep link parsing
    // This is a placeholder implementation
    const regex = /synapse:\/\/game\?start=([^&]+)&target=([^&]+)/;
    const match = url.match(regex);
    
    if (match && match.length >= 3) {
      return {
        startWord: decodeURIComponent(match[1]),
        targetWord: decodeURIComponent(match[2]),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
};

// TODO: Web platform sharing
export const initializeSharingForWeb = () => {
  // Check if we're running on web
  if (typeof navigator !== 'undefined' && typeof navigator.share !== 'undefined') {
    // Web Share API is available
    // Implementation would adapt the sharing method for Web
  }
}; 