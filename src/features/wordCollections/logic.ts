import type { WordCollection } from "./collection.types.ts";
import type { GraphData } from "../../services/dataLoader";

// Helper function to ensure no duplicate words in collections
export const deduplicateArray = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

// Template function for creating collections
export const createCollection = (
  id: string,
  title: string,
  words: string[],
  options?: {
    startDate?: Date;
    endDate?: Date;
    icon?: string;
    isWordlistViewable?: boolean;
  },
): WordCollection => ({
  id,
  title,
  words: deduplicateArray(words), // Ensure words are deduplicated upon creation
  isWordlistViewable: options?.isWordlistViewable ?? false,
  ...options,
});

export const filterCollectionsByDate = (
  collections: WordCollection[],
  testDateInput?: Date, // Optional parameter for testing specific dates
): WordCollection[] => {
  const today = testDateInput || new Date(); // Use provided date or current date
  today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

  return collections.filter((collection) => {
    // If no start or end date, it's always active
    if (!collection.startDate && !collection.endDate) {
      return true;
    }

    // If only startDate is defined, active on or after startDate
    if (collection.startDate && !collection.endDate) {
      const startDate = new Date(collection.startDate);
      startDate.setHours(0, 0, 0, 0);
      return today >= startDate;
    }

    // If only endDate is defined, active on or before endDate
    if (!collection.startDate && collection.endDate) {
      const endDate = new Date(collection.endDate);
      endDate.setHours(0, 0, 0, 0);
      return today <= endDate;
    }

    // If both are defined, active between startDate and endDate (inclusive)
    if (collection.startDate && collection.endDate) {
      const startDate = new Date(collection.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(collection.endDate);
      endDate.setHours(0, 0, 0, 0);
      return today >= startDate && today <= endDate;
    }

    return false; // Should not happen if logic above is correct
  });
};

export const testCollectionsForDate = (
  collections: WordCollection[],
  month: number, // 1-12 (January is 1)
  day: number,
): WordCollection[] => {
  // Validate month and day
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    console.error("Invalid month or day for testing collections.");
    return [];
  }
  const testDate = new Date(new Date().getFullYear(), month - 1, day);
  return filterCollectionsByDate(collections, testDate);
};

export const filterWordCollections = (
  collections: WordCollection[],
  graphData: GraphData,
): WordCollection[] => {
  return collections
    .map((collection) => ({
      ...collection,
      words: collection.words.filter((word) =>
        Object.prototype.hasOwnProperty.call(graphData, word),
      ),
    }))
    .filter((collection) => collection.words.length > 0); // Only keep collections with words present in graph
};

export const getFilteredWordCollections = async (
  collectionsToProcess: WordCollection[],
  graphData: GraphData,
  testDate?: Date,
): Promise<WordCollection[]> => {
  // Filter by date (if applicable)
  collectionsToProcess = filterCollectionsByDate(
    collectionsToProcess,
    testDate,
  );

  // Filter words to only include those present in the graphData
  collectionsToProcess = filterWordCollections(collectionsToProcess, graphData);

  return collectionsToProcess;
};
