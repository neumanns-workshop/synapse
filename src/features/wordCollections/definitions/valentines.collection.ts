import type { WordCollection } from "../collection.types";
import { createCollection } from "../logic";

const valentinesWordList = [
  "love",
  "heart",
  "rose",
  "pink",
  "red",
  "sweet",
  "kiss",
  "passion",
  "hug",
  "embrace",
  "adore",
  "affection",
  "care",
  "cherish",
  "romance",
  "poem",
  "verse",
  "note",
  "card",
  "gift",
  "date",
  "couple",
  "partner",
  "pair",
  "flower",
  "bouquet",
  "chocolate",
  "candy",
  "treat",
  "charm",
  "arrow",
  "soul",
  "mate",
  "tender",
  "warm",
];

export const valentinesCollection: WordCollection = createCollection(
  "valentines",
  "Valentine's Day",
  valentinesWordList,
  {
    icon: "heart",
    isWordlistViewable: true,
    startDate: new Date(new Date().getFullYear(), 1, 1), // February 1st
    endDate: new Date(new Date().getFullYear(), 1, 15), // February 15th
  },
);
