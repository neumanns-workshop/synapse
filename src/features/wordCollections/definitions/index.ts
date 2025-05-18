import type { WordCollection } from "../collection.types.ts";
import { colorsCollection } from "./colors.collection";
import { creaturesCollection } from "./creatures.collection";
import { fantasyCollection } from "./fantasy.collection";
import { gardensCollection } from "./gardens.collection";
import { halloweenCollection } from "./halloween.collection";
import { journeysCollection } from "./journeys.collection";
import { machinesCollection } from "./machines.collection";
import { movementCollection } from "./movement.collection";
import { seasonsCollection } from "./seasons.collection";
import { shapesCollection } from "./shapes.collection";
import { soundsCollection } from "./sounds.collection";
import { texturesCollection } from "./textures.collection";
import { timeCollection } from "./time.collection";
import { toolsCollection } from "./tools.collection";
import { valentinesCollection } from "./valentines.collection";

export const allWordCollections: WordCollection[] = [
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
  halloweenCollection,
  valentinesCollection,
];

// Optionally, re-export all individual collections
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
  halloweenCollection,
  valentinesCollection,
};
