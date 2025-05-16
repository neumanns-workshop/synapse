// Simple test script for date-based collections filtering
// Run this in the browser console to test date-based collections

// Test dates to try
const testDates = [
  { name: "Today's actual date", month: new Date().getMonth() + 1, day: new Date().getDate() },
  { name: "Halloween", month: 10, day: 31 },
  { name: "Valentine's Day", month: 2, day: 14 },
  { name: "Regular day (Summer)", month: 7, day: 15 }
];

// Function to run the tests
async function testAllDates() {
  console.log("==== Testing Date-Based Collections ====");
  
  for (const test of testDates) {
    console.log(`\n----- Testing ${test.name} (${test.month}/${test.day}) -----`);
    
    // Use the store function to test collections for this date
    await useGameStore.getState().testWordCollectionsForDate(test.month, test.day);
    
    // Log collections that are date-specific (have start/end dates)
    const seasonal = useGameStore.getState().wordCollections.filter(c => c.startDate || c.endDate);
    
    if (seasonal.length > 0) {
      console.log(`Found ${seasonal.length} seasonal collections for this date:`);
      seasonal.forEach(c => console.log(` - ${c.id}: ${c.title}`));
    } else {
      console.log("No seasonal collections available on this date");
    }
  }
  
  console.log("\nTest complete! The collections have been temporarily set to the last tested date.");
  console.log("Reload the app to restore the current date's collections.");
}

// Instructions on how to use this
console.log("Copy this entire script and paste it into your browser console while running the app.");
console.log("Then call: testAllDates()"); 