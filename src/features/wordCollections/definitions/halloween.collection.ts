import type { WordCollection } from "../collection.types";
import { createCollection } from "../logic";

const halloweenWordList = [
  "ghost",
  "shadow",
  "dark",
  "night",
  "moon",
  "bat",
  "web",
  "spider",
  "witch",
  "brew",
  "spell",
  "potion",
  "magic",
  "spirit",
  "soul",
  "hollow",
  "mystery",
  "fear",
  "scare",
  "spooky",
  "trick",
  "treat",
  "mask",
  "costume",
  "disguise",
  "bone",
  "skull",
  "skeleton",
  "grave",
  "tomb",
  "howl",
  "creature",
  "beast",
  "monster",
  "myth",
  "legend",
  "tale",
  "story",
  "whisper",
  "fog",
  "mist",
];

export const halloweenCollection: WordCollection = createCollection(
  "halloween",
  "Spooky Season",
  halloweenWordList,
  {
    icon: "ghost",
    isWordlistViewable: true,
    startDate: new Date(new Date().getFullYear(), 9, 15), // October 15th
    endDate: new Date(new Date().getFullYear(), 10, 1), // November 1st
  },
);
