export interface WordCollection {
  id: string;
  title: string;
  words: string[];
  startDate?: Date; // Optional: for time-limited collections
  endDate?: Date; // Optional: for time-limited collections
  icon?: string; // Optional: icon name for the collection
  isWordlistViewable: boolean; // Add this flag to control wordlist visibility
}
