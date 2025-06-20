import type { WordCollection } from "../collection.types";
import { createCollection } from "../logic";

const timeWordList = [
  "dusk",
  "shift",
  "echo",
  "rust",
  "sprout",
  "time",
  "clock",
  "watch",
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
  "decade",
  "century",
  "era",
  "future",
  "past",
  "present",
  "history",
  "memory",
  "tradition",
  "heritage",
  "legacy",
  "ancestor",
  "generation",
  "evolution",
  "transition",
  "transformation",
  "change",
  "alter",
  "modify",
  "adjust",
  "adapt",
  "convert",
  "switch",
  "vary",
  "proceed",
  "progress",
  "develop",
  "grow",
  "mature",
  "wither",
  "decay",
  "erode",
  "fade",
  "dim",
  "birth",
  "death",
  "renewal",
  "revival",
  "beginning",
  "middle",
  "end",
  "start",
  "finish",
  "origin",
  "conclusion",
  "dawn",
  "morning",
  "noon",
  "afternoon",
  "evening",
  "night",
  "midnight",
  "sunrise",
  "sunset",
  "season",
  "spring",
  "summer",
  "autumn",
  "fall",
  "winter",
  "cycle",
  "routine",
  "rhythm",
  "tempo",
  "pace",
  "speed",
  "swift",
  "slow",
  "sudden",
  "instant",
  "moment",
  "while",
  "duration",
  "forever",
  "temporary",
  "appear",
  "disappear",
  "phase",
  "stage",
  "step",
  "process",
  "pattern",
  "repeat",
  "regular",
  "constant",
  "fixed",
];

export const timeCollection: WordCollection = createCollection(
  "time",
  "Time & Change",
  timeWordList,
  { icon: "clock-outline", isWordlistViewable: true },
);
