// Simple test for date-based word collections
import type { GraphData } from './src/services/dataLoader';
import { 
  WordCollection, 
  filterCollectionsByDate,
  rawWordCollections
} from './src/features/wordCollections/wordCollections';

// Mock a minimal graph data object (needed for filtering)
const mockGraphData: GraphData = {
  'ghost': { edges: {}, tsne: [0, 0] },
  'love': { edges: {}, tsne: [0, 0] },
  'heart': { edges: {}, tsne: [0, 0] },
  'witch': { edges: {}, tsne: [0, 0] },
  'web': { edges: {}, tsne: [0, 0] },
  'rose': { edges: {}, tsne: [0, 0] },
};

// Create test dates
const testDates = [
  { name: "Today's actual date", date: new Date() },
  { name: "Halloween", date: new Date(new Date().getFullYear(), 9, 31) }, // October 31st (0-indexed month)
  { name: "Valentine's Day", date: new Date(new Date().getFullYear(), 1, 14) }, // February 14th
  { name: "Regular Summer Day", date: new Date(new Date().getFullYear(), 6, 15) }, // July 15th
];

// Test function
function testCollectionsForDate(date: Date, label: string) {
  console.log(`\n===== Testing collections for ${label}: ${date.toLocaleDateString()} =====`);
  
  // Filter collections by the test date
  const filtered = filterCollectionsByDate(rawWordCollections, date);
  
  console.log(`Found ${filtered.length} collections out of ${rawWordCollections.length} total`);
  
  // Look for seasonal collections specifically
  const seasonal = filtered.filter(c => c.startDate || c.endDate);
  
  if (seasonal.length > 0) {
    console.log("\nSeasonal collections available on this date:");
    seasonal.forEach(c => console.log(` - ${c.id}: ${c.title}`));
    
    // Optional: Print which words in these collections are in our mock graph
    console.log("\nWords from these collections in our mock graph:");
    seasonal.forEach(collection => {
      const wordsInGraph = collection.words.filter(word => word in mockGraphData);
      console.log(` - ${collection.title}: ${wordsInGraph.join(', ')}`);
    });
  } else {
    console.log("\nNo seasonal collections available on this date");
  }
}

// Run tests
console.log("==== DATE-BASED WORD COLLECTION TESTS ====");
testDates.forEach(test => {
  testCollectionsForDate(test.date, test.name);
});

// Extra test: check year transition
const nextYearDate = new Date(new Date().getFullYear() + 1, 1, 14); // Next year's Valentine's Day
console.log(`\n\n===== TESTING NEXT YEAR: ${nextYearDate.toLocaleDateString()} =====`);
const nextYearFiltered = filterCollectionsByDate(rawWordCollections, nextYearDate);
const nextYearSeasonal = nextYearFiltered.filter(c => c.startDate || c.endDate);

if (nextYearSeasonal.length > 0) {
  console.log("Next year's seasonal collections:");
  nextYearSeasonal.forEach(c => console.log(` - ${c.id}: ${c.title}`));
} else {
  console.log("No seasonal collections found for next year's date");
  console.log("NOTE: This is expected if collections use the current year in their date range!");
}

// Additional note about year rollover
console.log("\nIMPORTANT: The current implementation creates dates using the current year.");
console.log("For collections to work across years, you should update the code to");
console.log("recreate date ranges each time the app starts, or use a different approach");
console.log("for determining seasonal collections."); 