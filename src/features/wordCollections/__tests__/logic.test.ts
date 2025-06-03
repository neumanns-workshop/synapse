import { filterCollectionsByDate, testCollectionsForDate } from '../logic';
import type { WordCollection } from '../collection.types';
import { allWordCollections as originalAllWordCollections } from '../definitions'; // For integration-like tests

// Mock console.warn to spy on it
let consoleWarnSpy: jest.SpyInstance;

beforeEach(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
});

describe('filterCollectionsByDate', () => {
  const mockCollections: WordCollection[] = [
    { id: 'always_active', title: 'Always Active', words: ['a'], isWordlistViewable: true },
    {
      id: 'valentines',
      title: "Valentine's Day",
      words: ['love'],
      startDate: new Date(2000, 1, 1), // Feb 1 (year is ignored)
      endDate: new Date(2000, 1, 14), // Feb 14 (year is ignored)
      isWordlistViewable: true,
    },
    {
      id: 'summer_fest',
      title: 'Summer Festival',
      words: ['sun'],
      startDate: new Date(2000, 5, 20), // June 20
      endDate: new Date(2000, 7, 20), // Aug 20
      isWordlistViewable: true,
    },
    {
      id: 'year_end_holiday',
      title: 'Year End Holiday',
      words: ['joy'],
      startDate: new Date(2000, 11, 15), // Dec 15
      endDate: new Date(2001, 0, 10), // Jan 10 (next year, but logic uses month/day)
      isWordlistViewable: true,
    },
    {
      id: 'misconfigured_start_only',
      title: 'Start Date Only',
      words: ['oops'],
      startDate: new Date(2000, 0, 1),
      isWordlistViewable: true,
    },
    {
      id: 'misconfigured_end_only',
      title: 'End Date Only',
      words: ['uh oh'],
      endDate: new Date(2000, 11, 31),
      isWordlistViewable: true,
    },
  ];

  // --- Test Cases ---

  it('should return all collections if testDate is not provided and a collection has no dates', () => {
    const filtered = filterCollectionsByDate([mockCollections[0]]); // Only "Always Active"
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('always_active');
  });

  // Test Valentine's Day (Feb 1 - Feb 14)
  describe('Valentine\'s Day (Feb 1 - Feb 14)', () => {
    const collectionId = 'valentines';
    it('should be active on Feb 7', () => {
      const testDate = new Date(2023, 1, 7); // Feb 7
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Feb 1 (start date)', () => {
      const testDate = new Date(2023, 1, 1); // Feb 1
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Feb 14 (end date)', () => {
      const testDate = new Date(2023, 1, 14); // Feb 14
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should NOT be active on Jan 31', () => {
      const testDate = new Date(2023, 0, 31); // Jan 31
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(false);
    });
    it('should NOT be active on Feb 15', () => {
      const testDate = new Date(2023, 1, 15); // Feb 15
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(false);
    });
  });

  // Test Summer Festival (June 20 - Aug 20)
  describe('Summer Festival (June 20 - Aug 20)', () => {
    const collectionId = 'summer_fest';
    it('should be active on July 15', () => {
      const testDate = new Date(2023, 6, 15); // July 15
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on June 20 (start date)', () => {
      const testDate = new Date(2023, 5, 20); // June 20
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Aug 20 (end date)', () => {
      const testDate = new Date(2023, 7, 20); // Aug 20
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should NOT be active on June 19', () => {
      const testDate = new Date(2023, 5, 19); // June 19
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(false);
    });
    it('should NOT be active on Aug 21', () => {
      const testDate = new Date(2023, 7, 21); // Aug 21
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(false);
    });
  });

  // Test Year End Holiday (Dec 15 - Jan 10)
  describe('Year End Holiday (Dec 15 - Jan 10)', () => {
    const collectionId = 'year_end_holiday';
    it('should be active on Dec 25, 2023', () => {
      const testDate = new Date(2023, 11, 25); // Dec 25
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Jan 5, 2024', () => {
      const testDate = new Date(2024, 0, 5); // Jan 5
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Dec 15 (start date), different year', () => {
      const testDate = new Date(2024, 11, 15); // Dec 15
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Jan 10 (end date), different year', () => {
      const testDate = new Date(2023, 0, 10); // Jan 10
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should NOT be active on Dec 14, 2023', () => {
      const testDate = new Date(2023, 11, 14); // Dec 14
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(false);
    });
    it('should NOT be active on Jan 11, 2024', () => {
      const testDate = new Date(2024, 0, 11); // Jan 11
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(false);
    });
     it('should be active on Dec 31', () => {
      const testDate = new Date(2023, 11, 31); // Dec 31
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
    it('should be active on Jan 1', () => {
      const testDate = new Date(2024, 0, 1); // Jan 1
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === collectionId)).toBe(true);
    });
  });

  // Test misconfigured collections
  describe('Misconfigured Collections', () => {
    it('should treat collection with only startDate as active and warn', () => {
      const testDate = new Date(2023, 5, 1); // Any date
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === 'misconfigured_start_only')).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collection "misconfigured_start_only" is misconfigured')
      );
    });

    it('should treat collection with only endDate as active and warn', () => {
      const testDate = new Date(2023, 5, 1); // Any date
      const filtered = filterCollectionsByDate(mockCollections, testDate);
      expect(filtered.some(c => c.id === 'misconfigured_end_only')).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collection "misconfigured_end_only" is misconfigured')
      );
    });
  });

  it('should correctly filter a mix of collections', () => {
    const testDate = new Date(2023, 1, 7); // Feb 7 (Valentine's should be active)
    const filtered = filterCollectionsByDate(mockCollections, testDate);

    const activeIds = filtered.map(c => c.id);
    expect(activeIds).toContain('always_active');
    expect(activeIds).toContain('valentines');
    expect(activeIds).not.toContain('summer_fest');
    expect(activeIds).not.toContain('year_end_holiday'); // Feb 7 is not in Dec 15 - Jan 10
    expect(activeIds).toContain('misconfigured_start_only'); // Default active
    expect(activeIds).toContain('misconfigured_end_only'); // Default active
  });
});

describe('testCollectionsForDate', () => {
  // This function primarily uses filterCollectionsByDate, so we're mostly testing the integration
  // We will use the actual `allWordCollections` for a more integration-style test here,
  // assuming they are defined correctly (especially Halloween and Valentines if present)

  const halloweenCollectionFromDefs = originalAllWordCollections.find(c => c.id === 'halloween');
  const valentinesCollectionFromDefs = originalAllWordCollections.find(c => c.id === 'valentines');

  it('should return Halloween collection if date is Oct 31', () => {
    if (!halloweenCollectionFromDefs) {
      // If Halloween isn't in definitions, this test is not applicable
      console.log("Skipping Halloween test as it's not in current definitions.");
      return;
    }
     // Ensure defined halloween has start/end dates
    expect(halloweenCollectionFromDefs.startDate).toBeDefined();
    expect(halloweenCollectionFromDefs.endDate).toBeDefined();

    const filtered = testCollectionsForDate(originalAllWordCollections, 10, 31); // Month is 1-indexed
    expect(filtered.some(c => c.id === 'halloween')).toBe(true);
  });

  it('should NOT return Halloween collection if date is Oct 1', () => {
     if (!halloweenCollectionFromDefs || !halloweenCollectionFromDefs.startDate) {
      console.log("Skipping Halloween test as it's not in current definitions or misconfigured for this test.");
      return;
    }
    // Assuming Halloween starts Oct 15 as per typical definition
    const halloweenStartDateDay = halloweenCollectionFromDefs.startDate.getDate();
    if (halloweenStartDateDay > 1) { // Only run if Halloween doesn't start on the 1st
        const filtered = testCollectionsForDate(originalAllWordCollections, 10, 1);
        expect(filtered.some(c => c.id === 'halloween')).toBe(false);
    } else {
        console.log("Skipping Halloween Oct 1 test as definition starts on or before the 1st.");
    }
  });

  it('should return Valentines collection if date is Feb 14', () => {
    if (!valentinesCollectionFromDefs) {
      console.log("Skipping Valentines test as it's not in current definitions.");
      return;
    }
    expect(valentinesCollectionFromDefs.startDate).toBeDefined();
    expect(valentinesCollectionFromDefs.endDate).toBeDefined();

    const filtered = testCollectionsForDate(originalAllWordCollections, 2, 14);
    expect(filtered.some(c => c.id === 'valentines')).toBe(true);
  });

  it('should return always active collections regardless of date for testCollectionsForDate', () => {
    const alwaysActive = originalAllWordCollections.filter(c => !c.startDate && !c.endDate);
    if (alwaysActive.length === 0) {
        console.log("Skipping always active test for testCollectionsForDate as none are defined.");
        return;
    }
    // Test with a date where no specific seasonal collections are expected
    const filtered = testCollectionsForDate(originalAllWordCollections, 7, 1); // July 1st
    const filteredAlwaysActiveIds = filtered.filter(c => !c.startDate && !c.endDate).map(c => c.id);

    alwaysActive.forEach(aac => {
        expect(filteredAlwaysActiveIds).toContain(aac.id);
    });
    expect(filtered.length).toBeGreaterThanOrEqual(alwaysActive.length);
  });

   it('should return an empty array if month/day is invalid', () => {
    const filtered = testCollectionsForDate(originalAllWordCollections, 13, 1); // Invalid month
    expect(filtered).toEqual([]);
    // testCollectionsForDate has its own console.error for this, which is fine.
  });
}); 