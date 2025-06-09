import {
  isCollectionAvailable,
  getAllWordCollectionsWithStatus,
  getFilteredWordCollections,
  testCollectionsForDate,
} from '../logic';
import { WordCollection } from '../collection.types';
import { GraphData } from '../../../services/dataLoader';

describe('Seasonal Word Collections Logic', () => {
  const mockGraphData: GraphData = {
    love: { edges: { heart: 1 }, tsne: [0, 0] },
    heart: { edges: { love: 1 }, tsne: [1, 1] },
    sun: { edges: { summer: 1 }, tsne: [2, 2] },
    summer: { edges: { sun: 1 }, tsne: [3, 3] },
    snow: { edges: { winter: 1 }, tsne: [4, 4] },
    winter: { edges: { snow: 1 }, tsne: [5, 5] },
    joy: { edges: { celebration: 1 }, tsne: [6, 6] },
    celebration: { edges: { joy: 1 }, tsne: [7, 7] },
  };

  const testCollections: WordCollection[] = [
    {
      id: 'always_active',
      title: 'Always Active Collection',
      words: ['love', 'heart'],
      isWordlistViewable: true,
    },
    {
      id: 'valentines',
      title: 'Valentine\'s Day',
      words: ['love', 'heart'],
      startDate: new Date(2000, 1, 10), // Feb 10
      endDate: new Date(2000, 1, 20), // Feb 20
      isWordlistViewable: true,
    },
    {
      id: 'summer_solstice',
      title: 'Summer Solstice',
      words: ['sun', 'summer'],
      startDate: new Date(2000, 5, 15), // June 15
      endDate: new Date(2000, 7, 15), // Aug 15
      isWordlistViewable: true,
    },
    {
      id: 'winter_holidays',
      title: 'Winter Holidays',
      words: ['snow', 'winter'],
      startDate: new Date(2000, 11, 20), // Dec 20
      endDate: new Date(2001, 0, 5), // Jan 5 (crosses year boundary)
      isWordlistViewable: true,
    },
    {
      id: 'new_years',
      title: 'New Year Celebration',
      words: ['joy', 'celebration'],
      startDate: new Date(2000, 11, 31), // Dec 31
      endDate: new Date(2001, 0, 1), // Jan 1 (single day crossing year)
      isWordlistViewable: true,
    },
    {
      id: 'same_month_range',
      title: 'Same Month Range',
      words: ['love'],
      startDate: new Date(2000, 2, 10), // Mar 10
      endDate: new Date(2000, 2, 20), // Mar 20
      isWordlistViewable: true,
    },
  ];

  describe('isCollectionAvailable', () => {
    describe('Always Active Collections', () => {
      it('should return true for collections with no start/end dates', () => {
        const alwaysActive = testCollections[0];
        expect(isCollectionAvailable(alwaysActive)).toBe(true);
        expect(isCollectionAvailable(alwaysActive, new Date(2023, 5, 15))).toBe(true);
      });
    });

    describe('Same Month Date Ranges', () => {
      const collection = testCollections.find(c => c.id === 'same_month_range')!;

      it('should be active within the date range', () => {
        const testDate = new Date(2023, 2, 15); // Mar 15
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active on start date', () => {
        const testDate = new Date(2023, 2, 10); // Mar 10
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active on end date', () => {
        const testDate = new Date(2023, 2, 20); // Mar 20
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should not be active before start date', () => {
        const testDate = new Date(2023, 2, 9); // Mar 9
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });

      it('should not be active after end date', () => {
        const testDate = new Date(2023, 2, 21); // Mar 21
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });
    });

    describe('Multi-Month Date Ranges (Non-Year-Crossing)', () => {
      const collection = testCollections.find(c => c.id === 'summer_solstice')!;

      it('should be active in start month after start date', () => {
        const testDate = new Date(2023, 5, 20); // June 20
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active in middle month', () => {
        const testDate = new Date(2023, 6, 15); // July 15
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active in end month before end date', () => {
        const testDate = new Date(2023, 7, 10); // Aug 10
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should not be active before start date in start month', () => {
        const testDate = new Date(2023, 5, 10); // June 10
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });

      it('should not be active after end date in end month', () => {
        const testDate = new Date(2023, 7, 20); // Aug 20
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });
    });

    describe('Year-Crossing Date Ranges', () => {
      const collection = testCollections.find(c => c.id === 'winter_holidays')!;

      it('should be active in December after start date', () => {
        const testDate = new Date(2023, 11, 25); // Dec 25
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active on December 31', () => {
        const testDate = new Date(2023, 11, 31); // Dec 31
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active on January 1', () => {
        const testDate = new Date(2024, 0, 1); // Jan 1
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active in January before end date', () => {
        const testDate = new Date(2024, 0, 3); // Jan 3
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should not be active before start date in December', () => {
        const testDate = new Date(2023, 11, 15); // Dec 15
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });

      it('should not be active after end date in January', () => {
        const testDate = new Date(2024, 0, 10); // Jan 10
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });

      it('should not be active in middle months', () => {
        const testDate = new Date(2023, 5, 15); // June 15
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });
    });

    describe('Single Day Year-Crossing Range', () => {
      const collection = testCollections.find(c => c.id === 'new_years')!;

      it('should be active on December 31', () => {
        const testDate = new Date(2023, 11, 31); // Dec 31
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should be active on January 1', () => {
        const testDate = new Date(2024, 0, 1); // Jan 1
        expect(isCollectionAvailable(collection, testDate)).toBe(true);
      });

      it('should not be active on December 30', () => {
        const testDate = new Date(2023, 11, 30); // Dec 30
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });

      it('should not be active on January 2', () => {
        const testDate = new Date(2024, 0, 2); // Jan 2
        expect(isCollectionAvailable(collection, testDate)).toBe(false);
      });
    });
  });

  describe('getAllWordCollectionsWithStatus', () => {
    it('should return collections with availability status', async () => {
      const testDate = new Date(2023, 1, 15); // Feb 15 - Valentine's should be active
      const result = await getAllWordCollectionsWithStatus(testCollections, mockGraphData, testDate);

      expect(result).toHaveLength(testCollections.length);
      
      const alwaysActive = result.find(c => c.id === 'always_active');
      expect(alwaysActive?.isCurrentlyAvailable).toBe(true);

      const valentines = result.find(c => c.id === 'valentines');
      expect(valentines?.isCurrentlyAvailable).toBe(true);

      const summer = result.find(c => c.id === 'summer_solstice');
      expect(summer?.isCurrentlyAvailable).toBe(false);
    });

    it('should filter out collections with no words in graph', async () => {
      const collectionsWithMissingWords: WordCollection[] = [
        {
          id: 'missing_words',
          title: 'Missing Words',
          words: ['nonexistent1', 'nonexistent2'],
          isWordlistViewable: true,
        },
        ...testCollections,
      ];

      const result = await getAllWordCollectionsWithStatus(collectionsWithMissingWords, mockGraphData);
      
      // Should not include the collection with missing words
      expect(result.find(c => c.id === 'missing_words')).toBeUndefined();
      expect(result).toHaveLength(testCollections.length);
    });

    it('should filter words not present in graph data', async () => {
      const collectionsWithSomeValidWords: WordCollection[] = [
        {
          id: 'partial_valid',
          title: 'Partially Valid',
          words: ['love', 'nonexistent', 'heart'], // 2 valid, 1 invalid
          isWordlistViewable: true,
        },
      ];

      const result = await getAllWordCollectionsWithStatus(collectionsWithSomeValidWords, mockGraphData);
      
      expect(result).toHaveLength(1);
      expect(result[0].words).toEqual(['love', 'heart']);
      expect(result[0].words).not.toContain('nonexistent');
    });
  });

  describe('getFilteredWordCollections', () => {
    it('should return filtered collections based on date and graph data', async () => {
      const testDate = new Date(2023, 1, 15); // Feb 15
      const result = await getFilteredWordCollections(testCollections, mockGraphData, testDate);

      // Should include always active and valentines (active on Feb 15)
      expect(result.find(c => c.id === 'always_active')).toBeDefined();
      expect(result.find(c => c.id === 'valentines')).toBeDefined();
      
      // Should not include summer (not active in Feb)
      expect(result.find(c => c.id === 'summer_solstice')).toBeUndefined();
    });

    it('should handle collections with no valid words gracefully', async () => {
      const emptyGraphData: GraphData = {};
      const result = await getFilteredWordCollections(testCollections, emptyGraphData);

      expect(result).toHaveLength(0);
    });
  });

  describe('testCollectionsForDate', () => {
    it('should return collections active on specific date', () => {
      const result = testCollectionsForDate(testCollections, 2, 15); // Feb 15
      
      expect(result.find(c => c.id === 'always_active')).toBeDefined();
      expect(result.find(c => c.id === 'valentines')).toBeDefined();
      expect(result.find(c => c.id === 'summer_solstice')).toBeUndefined();
    });

    it('should handle year-crossing collections correctly', () => {
      const decResult = testCollectionsForDate(testCollections, 12, 25); // Dec 25
      expect(decResult.find(c => c.id === 'winter_holidays')).toBeDefined();

      const janResult = testCollectionsForDate(testCollections, 1, 3); // Jan 3
      expect(janResult.find(c => c.id === 'winter_holidays')).toBeDefined();
    });

    it('should return empty array for invalid dates', () => {
      expect(testCollectionsForDate(testCollections, 13, 1)).toEqual([]);
      expect(testCollectionsForDate(testCollections, 1, 32)).toEqual([]);
      expect(testCollectionsForDate(testCollections, 0, 15)).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle collections with undefined dates gracefully', () => {
      const collectionWithUndefinedDates: WordCollection = {
        id: 'undefined_dates',
        title: 'Undefined Dates',
        words: ['love'],
        startDate: undefined,
        endDate: undefined,
        isWordlistViewable: true,
      };

      expect(isCollectionAvailable(collectionWithUndefinedDates)).toBe(true);
    });

    it('should handle leap year dates correctly', () => {
      const leapYearCollection: WordCollection = {
        id: 'leap_year',
        title: 'Leap Year Test',
        words: ['love'],
        startDate: new Date(2000, 1, 28), // Feb 28
        endDate: new Date(2000, 1, 29), // Feb 29
        isWordlistViewable: true,
      };

      // Test on leap year
      const leapYearDate = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      expect(isCollectionAvailable(leapYearCollection, leapYearDate)).toBe(true);

      // Test on non-leap year (Feb 29 doesn't exist, but our logic uses month/day)
      const nonLeapYearDate = new Date(2023, 1, 28); // Feb 28, 2023
      expect(isCollectionAvailable(leapYearCollection, nonLeapYearDate)).toBe(true);
    });

    it('should handle collections with same start and end date', () => {
      const singleDayCollection: WordCollection = {
        id: 'single_day',
        title: 'Single Day',
        words: ['love'],
        startDate: new Date(2000, 6, 4), // July 4
        endDate: new Date(2000, 6, 4), // July 4
        isWordlistViewable: true,
      };

      const testDate = new Date(2023, 6, 4); // July 4
      expect(isCollectionAvailable(singleDayCollection, testDate)).toBe(true);

      const wrongDate = new Date(2023, 6, 5); // July 5
      expect(isCollectionAvailable(singleDayCollection, wrongDate)).toBe(false);
    });
  });
}); 