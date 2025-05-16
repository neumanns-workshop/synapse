// Simple test for seasonal collections

// Mock the current date to test different scenarios
function runDateBasedTest(testDate) {
  // Original Date constructor
  const OriginalDate = Date;
  
  // Mock Date to return our test date
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        return testDate;
      }
      return new OriginalDate(...args);
    }
    
    static now() {
      return testDate.getTime();
    }
  };
  
  // Import the collections module with our mocked Date
  try {
    // We're faking imports by logging what would happen
    console.log(`\n===== Testing with date: ${testDate.toLocaleDateString()} =====`);
    
    // Check Halloween (Oct 31)
    const isHalloweenActive = testDate.getMonth() === 9 && 
                             testDate.getDate() >= 1 && 
                             testDate.getDate() <= 31;
                             
    // Check Valentine's (Feb 1-14)
    const isValentinesActive = testDate.getMonth() === 1 && 
                              testDate.getDate() >= 1 && 
                              testDate.getDate() <= 14;
    
    console.log("Active seasonal collections:");
    if (isHalloweenActive) {
      console.log(" - halloween: Halloween Spooktacular");
    }
    if (isValentinesActive) {
      console.log(" - valentines: Valentine's Day");
    }
    if (!isHalloweenActive && !isValentinesActive) {
      console.log(" - None (only regular collections would be visible)");
    }
    
    // Show what would happen next year
    const nextYear = new Date(testDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    console.log(`\nNext year (${nextYear.getFullYear()}) on same date: ${nextYear.toLocaleDateString()}`);
    console.log("With current implementation, collections would need to be reinitialized");
    console.log("to update their date ranges for the new year.");
    
  } finally {
    // Restore original Date
    global.Date = OriginalDate;
  }
}

// Test dates
console.log("===== TESTING SEASONAL COLLECTIONS =====");

// Test today
console.log("\n>> TESTING TODAY:");
runDateBasedTest(new Date());

// Test Halloween
console.log("\n>> TESTING HALLOWEEN:");
runDateBasedTest(new Date(new Date().getFullYear(), 9, 31)); // Oct 31

// Test Valentine's Day
console.log("\n>> TESTING VALENTINE'S DAY:");
runDateBasedTest(new Date(new Date().getFullYear(), 1, 14)); // Feb 14

// Test middle of summer
console.log("\n>> TESTING SUMMER DAY:");
runDateBasedTest(new Date(new Date().getFullYear(), 6, 15)); // July 15

console.log("\n===== RECOMMENDATIONS =====");
console.log("1. Year handling: Consider making collections repeat annually by checking");
console.log("   only month and day, regardless of year");
console.log("2. Update the collection date logic when the app starts to use the current year");
console.log("3. Add more seasonal collections for other holidays or special events"); 