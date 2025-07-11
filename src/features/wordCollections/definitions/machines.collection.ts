import type { WordCollection } from "../collection.types";
import { createCollection } from "../logic";

const machinesWordList = [
  "gear",
  "lever",
  "piston",
  "coil",
  "dial",
  "machine",
  "mechanism",
  "device",
  "apparatus",
  "gadget",
  "contraption",
  "appliance",
  "instrument",
  "tool",
  "implement",
  "motor",
  "engine",
  "turbine",
  "generator",
  "circuit",
  "wire",
  "cable",
  "switch",
  "button",
  "handle",
  "knob",
  "gauge",
  "meter",
  "display",
  "screen",
  "monitor",
  "sensor",
  "antenna",
  "signal",
  "battery",
  "power",
  "energy",
  "current",
  "electric",
  "electronic",
  "mechanical",
  "robot",
  "computer",
  "processor",
  "memory",
  "storage",
  "data",
  "input",
  "output",
  "network",
  "system",
  "program",
  "digital",
  "automatic",
  "manual",
  "wheel",
  "axle",
  "shaft",
  "spring",
  "bolt",
  "pump",
];

export const machinesCollection: WordCollection = createCollection(
  "machines",
  "Machines & Mechanisms",
  machinesWordList,
  { icon: "robot-industrial", isWordlistViewable: true }, // Example icon
);
