import type { GraphData } from "../../services/dataLoader";
import type { WordCollection } from "./collection.types.ts";

// Helper function to ensure no duplicate words in collections
export const deduplicateArray = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

// Extended collection type with availability status
export interface WordCollectionWithStatus extends WordCollection {
  isCurrentlyAvailable: boolean;
}

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

// Check if a single collection is currently available
export const isCollectionAvailable = (
  collection: WordCollection,
  testDate?: Date,
): boolean => {
  const today = testDate || new Date();
  const currentMonth = today.getMonth(); // 0-indexed (January is 0)
  const currentDay = today.getDate(); // 1-indexed

  const { startDate, endDate } = collection;

  // Case 1: No start or end date defined - always active
  if (!startDate && !endDate) {
    return true;
  }

  // Case 2: Both startDate and endDate are defined - Year-agnostic seasonal logic
  if (startDate && endDate) {
    const startMonth = startDate.getMonth(); // 0-indexed
    const startDay = startDate.getDate(); // 1-indexed
    const endMonth = endDate.getMonth(); // 0-indexed
    const endDay = endDate.getDate(); // 1-indexed

    // Scenario A: Range is within the same month (e.g., Oct 15 - Oct 31)
    if (startMonth === endMonth) {
      return (
        currentMonth === startMonth &&
        currentDay >= startDay &&
        currentDay <= endDay
      );
    }
    // Scenario B: Range spans multiple months, not crossing year-end (e.g., Mar 1 - Apr 10)
    else if (startMonth < endMonth) {
      return (
        (currentMonth === startMonth && currentDay >= startDay) || // In start month, on or after start day
        (currentMonth === endMonth && currentDay <= endDay) || // In end month, on or before end day
        (currentMonth > startMonth && currentMonth < endMonth) // In any full month between start and end
      );
    }
    // Scenario C: Range spans multiple months, crossing year-end (e.g., Dec 1 - Jan 20)
    else {
      // startMonth > endMonth
      return (
        (currentMonth === startMonth && currentDay >= startDay) || // In start month (e.g. Dec), on or after start day
        (currentMonth === endMonth && currentDay <= endDay) || // In end month (e.g. Jan), on or before end day
        currentMonth > startMonth || // In any later month of the starting year (e.g. Dec)
        currentMonth < endMonth // In any earlier month of the ending year (e.g. Jan)
      );
    }
  }

  // Case 3: Only startDate or only endDate is defined (misconfiguration)
  // Treat as active and warn.
  if (startDate || endDate) {
    console.warn(
      `Collection "${collection.id}" is misconfigured for date filtering. ` +
        `It should have both startDate and endDate for seasonal activation, or neither. ` +
        `Treating as active by default.`,
    );
    return true;
  }

  // Default to active if no conditions met
  return true;
};

// Get all collections with availability status
export const getAllWordCollectionsWithStatus = async (
  collectionsToProcess: WordCollection[],
  graphData: GraphData,
  testDate?: Date,
): Promise<WordCollectionWithStatus[]> => {
  // Filter words to only include those present in the graphData, but keep all collections
  const collectionsWithFilteredWords = collectionsToProcess.map(
    (collection) => ({
      ...collection,
      words: collection.words.filter((word) =>
        Object.prototype.hasOwnProperty.call(graphData, word),
      ),
    }),
  );

  // Add availability status to each collection
  const collectionsWithStatus: WordCollectionWithStatus[] =
    collectionsWithFilteredWords
      .filter((collection) => collection.words.length > 0) // Only keep collections with words present in graph
      .map((collection) => ({
        ...collection,
        isCurrentlyAvailable: isCollectionAvailable(collection, testDate),
      }));

  return collectionsWithStatus;
};

export const filterCollectionsByDate = (
  collections: WordCollection[],
  testDateInput?: Date, // Optional parameter for testing specific dates
): WordCollection[] => {
  const today = testDateInput || new Date(); // Use provided date or current date
  // We don't normalize 'today' to start of day here if we only care about month/day for seasonal
  // However, for consistency, let's get month/day from the *start* of the testDateInput or today.
  const currentMonth = today.getMonth(); // 0-indexed (January is 0)
  const currentDay = today.getDate(); // 1-indexed

  return collections.filter((collection) => {
    const { startDate, endDate, id: collectionId } = collection;

    // Case 1: No start or end date defined - always active
    if (!startDate && !endDate) {
      return true;
    }

    // Case 2: Both startDate and endDate are defined - Year-agnostic seasonal logic
    if (startDate && endDate) {
      const startMonth = startDate.getMonth(); // 0-indexed
      const startDay = startDate.getDate(); // 1-indexed
      const endMonth = endDate.getMonth(); // 0-indexed
      const endDay = endDate.getDate(); // 1-indexed

      // Scenario A: Range is within the same month (e.g., Oct 15 - Oct 31)
      if (startMonth === endMonth) {
        return (
          currentMonth === startMonth &&
          currentDay >= startDay &&
          currentDay <= endDay
        );
      }
      // Scenario B: Range spans multiple months, not crossing year-end (e.g., Mar 1 - Apr 10)
      else if (startMonth < endMonth) {
        return (
          (currentMonth === startMonth && currentDay >= startDay) || // In start month, on or after start day
          (currentMonth === endMonth && currentDay <= endDay) || // In end month, on or before end day
          (currentMonth > startMonth && currentMonth < endMonth) // In any full month between start and end
        );
      }
      // Scenario C: Range spans multiple months, crossing year-end (e.g., Dec 1 - Jan 20)
      else {
        // startMonth > endMonth
        return (
          (currentMonth === startMonth && currentDay >= startDay) || // In start month (e.g. Dec), on or after start day
          (currentMonth === endMonth && currentDay <= endDay) || // In end month (e.g. Jan), on or before end day
          currentMonth > startMonth || // In any later month of the starting year (e.g. Dec)
          currentMonth < endMonth // In any earlier month of the ending year (e.g. Jan)
        );
      }
    }

    // Case 3: Only startDate or only endDate is defined (misconfiguration)
    // Treat as active and warn.
    // We check this last as it's the fallback for improper configuration.
    if (startDate || endDate) {
      // This implies one is defined, the other is not, due to prior check
      console.warn(
        `Collection "${collectionId}" is misconfigured for date filtering. ` +
          `It should have both startDate and endDate for seasonal activation, or neither. ` +
          `Treating as active by default.`,
      );
      return true;
    }

    // This line should ideally not be reached if the logic above is exhaustive
    // for all combinations of startDate/endDate presence.
    // However, as a fallback, if a collection somehow doesn't fit any case (e.g. undefined dates but not null),
    // let's default to not filtering it out.
    return true; // Default to active if no conditions met (should be rare)
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
