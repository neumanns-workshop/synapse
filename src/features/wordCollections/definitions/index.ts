import type { WordCollection } from "../collection.types.ts";
import { colorsCollection } from "./colors.collection";
import { creaturesCollection } from "./creatures.collection";
import { fantasyCollection } from "./fantasy.collection";
import { gardensCollection } from "./gardens.collection";
import { journeysCollection } from "./journeys.collection";
import { machinesCollection } from "./machines.collection";
import { movementCollection } from "./movement.collection";
import { seasonsCollection } from "./seasons.collection";
import { shapesCollection } from "./shapes.collection";
import { soundsCollection } from "./sounds.collection";
import { texturesCollection } from "./textures.collection";
import { timeCollection } from "./time.collection";
import { toolsCollection } from "./tools.collection";

// Import seasonal collections
import { renewalCollection } from "./renewal.collection";
import { affectionCollection } from "./affection.collection";
import { greeningCollection } from "./greening.collection";
import { bloomCollection } from "./bloom.collection";
import { highSunCollection } from "./highSun.collection";
import { ripeningCollection } from "./ripening.collection";
import { amberHarvestCollection } from "./amberHarvest.collection";
import { ciderEmberCollection } from "./ciderEmber.collection";
import { fogFrostCollection } from "./fogFrost.collection";
import { longNightCollection } from "./longNight.collection";
import { equinoxSolsticeCollection } from "./equinoxSolstice.collection";
import { gratitudeGatheringCollection } from "./gratitudeGathering.collection";

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
  renewalCollection,           // January
  affectionCollection,         // February (includes Valentine's themes)
  greeningCollection,          // March-April
  bloomCollection,             // April-May
  highSunCollection,           // June-July
  ripeningCollection,          // July-August
  amberHarvestCollection,      // September
  ciderEmberCollection,        // October (includes Halloween themes)
  fogFrostCollection,          // November
  longNightCollection,         // December
  gratitudeGatheringCollection, // November-December overlap
  equinoxSolsticeCollection,   // Year-round celestial anchor
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
  greeningCollection,
  bloomCollection,
  highSunCollection,
  ripeningCollection,
  amberHarvestCollection,
  ciderEmberCollection,
  fogFrostCollection,
  longNightCollection,
  equinoxSolsticeCollection,
  gratitudeGatheringCollection,
};
