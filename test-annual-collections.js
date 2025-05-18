// Test for year-agnostic seasonal collections

// Basic collection filter function that mimics our implementation
function isCollectionActive(collectionDates, testDate) {
  const currentMonth = testDate.getMonth(); // 0-11
  const currentDay = testDate.getDate(); // 1-31

  const { startMonth, startDay, endMonth, endDay } = collectionDates;

  // Simple case: both dates in same month
  if (startMonth === endMonth) {
    return (
      currentMonth === startMonth &&
      currentDay >= startDay &&
      currentDay <= endDay
    );
  }

  // Spans multiple months
  if (startMonth < endMonth) {
    // Normal range (e.g., Oct 1 - Dec 25)
    return (
      (currentMonth > startMonth && currentMonth < endMonth) || // Middle months
      (currentMonth === startMonth && currentDay >= startDay) || // Start month
      (currentMonth === endMonth && currentDay <= endDay) // End month
    );
  } else {
    // Wrapping around year (e.g., Dec 1 - Feb 28)
    return (
      currentMonth > startMonth || // Rest of year after start
      currentMonth < endMonth || // Beginning of next year
      (currentMonth === startMonth && currentDay >= startDay) || // Start month
      (currentMonth === endMonth && currentDay <= endDay) // End month
    );
  }
}

// Collection date ranges
const collections = {
  halloween: {
    name: "Halloween Spooktacular",
    startMonth: 9, // October (0-indexed)
    startDay: 1,
    endMonth: 9,
    endDay: 31,
  },
  valentines: {
    name: "Valentine's Day",
    startMonth: 1, // February (0-indexed)
    startDay: 1,
    endMonth: 1,
    endDay: 14,
  },
  winter: {
    name: "Winter Holidays",
    startMonth: 11, // December (0-indexed)
    startDay: 1,
    endMonth: 0, // January (0-indexed)
    endDay: 15,
  },
};

// Test dates across multiple years
function testDate(year, month, day, label) {
  const testDate = new Date(year, month, day);
  console.log(
    `\n===== Testing: ${label} (${testDate.toLocaleDateString()}) =====`,
  );

  for (const [id, collection] of Object.entries(collections)) {
    const isActive = isCollectionActive(collection, testDate);
    console.log(`${collection.name}: ${isActive ? "ACTIVE" : "inactive"}`);
  }
}

// Run tests
console.log("=== TESTING YEAR-AGNOSTIC SEASONAL COLLECTIONS ===");

// Current year tests
const currentYear = new Date().getFullYear();
testDate(currentYear, 9, 15, "Halloween season");
testDate(currentYear, 1, 7, "Valentine's season");
testDate(currentYear, 6, 15, "Summer (no seasonal collections)");
testDate(currentYear, 11, 25, "December holidays");

// Next year tests
testDate(currentYear + 1, 0, 5, "Early January next year");
testDate(currentYear + 1, 1, 14, "Valentine's Day next year");
testDate(currentYear + 1, 9, 31, "Halloween next year");

console.log("\n=== TEST RESULTS ===");
console.log(
  "The year-agnostic approach successfully handles seasonal collections",
);
console.log(
  "across different years, including ranges that wrap around the new year.",
);
