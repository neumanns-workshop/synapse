// Simple test for date-based word collections
import { allWordCollections } from "./src/features/wordCollections/definitions";
import { filterCollectionsByDate } from "./src/features/wordCollections/logic";

// Create test dates
const testDates = [
  { name: "Today's actual date", date: new Date() },
  { name: "Halloween", date: new Date(new Date().getFullYear(), 9, 31) }, // October 31st (0-indexed month)
  { name: "Valentine's Day", date: new Date(new Date().getFullYear(), 1, 14) }, // February 14th
  {
    name: "Regular Summer Day",
    date: new Date(new Date().getFullYear(), 6, 15),
  }, // July 15th
];

// Test function
function testAndLogCollectionsForDate(date: Date, _label: string) {
  // Filter collections by the test date
  const filtered = filterCollectionsByDate(allWordCollections, date);

  // Look for seasonal collections specifically
  const seasonal = filtered.filter((c) => c.startDate || c.endDate);

  if (seasonal.length > 0) {
    // Seasonal collections available
  } else {
    // No seasonal collections available
  }
}

// Run tests
testDates.forEach((test) => {
  testAndLogCollectionsForDate(test.date, test.name);
});

// Extra test: check year transition
const nextYearTestDate = new Date(new Date().getFullYear() + 1, 1, 14);
const nextYearTestFiltered = filterCollectionsByDate(
  allWordCollections,
  nextYearTestDate,
);
const nextYearTestSeasonal = nextYearTestFiltered.filter(
  (c) => c.startDate || c.endDate,
);

if (nextYearTestSeasonal.length > 0) {
  // Next year's seasonal collections found
} else {
  // No seasonal collections found for next year
}

// Additional note about year rollover
