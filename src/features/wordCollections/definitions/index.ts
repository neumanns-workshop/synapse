import type { WordCollection } from "../collection.types.ts";
import { affectionCollection } from "./affection.collection";
import { amberHarvestCollection } from "./amberHarvest.collection";
import { autumnEquinoxCollection } from "./autumnEquinox.collection";
import { bloomCollection } from "./bloom.collection";
import { ciderEmberCollection } from "./ciderEmber.collection";
import { colorsCollection } from "./colors.collection";
import { creaturesCollection } from "./creatures.collection";
import { fantasyCollection } from "./fantasy.collection";
import { fogFrostCollection } from "./fogFrost.collection";
import { gardensCollection } from "./gardens.collection";
import { gratitudeGatheringCollection } from "./gratitudeGathering.collection";
import { greeningCollection } from "./greening.collection";
import { highSunCollection } from "./highSun.collection";
import { journeysCollection } from "./journeys.collection";
import { longNightCollection } from "./longNight.collection";
import { machinesCollection } from "./machines.collection";
import { movementCollection } from "./movement.collection";
import { renewalCollection } from "./renewal.collection";
import { ripeningCollection } from "./ripening.collection";
import { seasonsCollection } from "./seasons.collection";
import { shapesCollection } from "./shapes.collection";
import { soundsCollection } from "./sounds.collection";
import { springEquinoxCollection } from "./springEquinox.collection";
import { summerSolsticeCollection } from "./summerSolstice.collection";
import { texturesCollection } from "./textures.collection";
import { timeCollection } from "./time.collection";
import { toolsCollection } from "./tools.collection";

// Import seasonal collections

// Import new pagan equinox/solstice collections
import { winterSolsticeCollection } from "./winterSolstice.collection";

export const allWordCollections: WordCollection[] = [
  // Always-available collections
  colorsCollection,
  shapesCollection,
  movementCollection,
  texturesCollection,
  soundsCollection,
  creaturesCollection,
  toolsCollection,
  journeysCollection,
  fantasyCollection,
  timeCollection,
  machinesCollection,
  gardensCollection,
  seasonsCollection,

  // Seasonal collections (with date ranges) - Full year coverage
  renewalCollection, // January
  affectionCollection, // February (includes Valentine's themes)
  springEquinoxCollection, // March 18-23 (Ostara)
  greeningCollection, // March-April
  bloomCollection, // April-May
  summerSolsticeCollection, // June 18-23 (Litha)
  highSunCollection, // June-July
  ripeningCollection, // July-August
  amberHarvestCollection, // September
  autumnEquinoxCollection, // September 20-25 (Mabon)
  ciderEmberCollection, // October (includes Halloween themes)
  fogFrostCollection, // November
  gratitudeGatheringCollection, // November-December overlap
  longNightCollection, // December
  winterSolsticeCollection, // December 18-23 (Yule)
];

// Re-export collections for direct access if needed
export {
  colorsCollection,
  shapesCollection,
  movementCollection,
  texturesCollection,
  soundsCollection,
  creaturesCollection,
  toolsCollection,
  journeysCollection,
  fantasyCollection,
  timeCollection,
  machinesCollection,
  gardensCollection,
  seasonsCollection,
  // Seasonal collections
  renewalCollection,
  affectionCollection,
  springEquinoxCollection,
  greeningCollection,
  bloomCollection,
  summerSolsticeCollection,
  highSunCollection,
  ripeningCollection,
  amberHarvestCollection,
  autumnEquinoxCollection,
  ciderEmberCollection,
  fogFrostCollection,
  longNightCollection,
  gratitudeGatheringCollection,
  winterSolsticeCollection,
};
