import type { Achievement } from "../achievement.types";
import { comebackKidAchievement } from "./comebackKid.definition";
import { dancingToADifferentBeatAchievement } from "./dancingToADifferentBeat.definition";
import { dejaVuAchievement } from "./dejaVu.definition";
import { epicyclesUponEpicyclesAchievement } from "./epicyclesUponEpicycles.definition";
import { forgotMyKeysAchievement } from "./forgotMyKeys.definition";
import { hereBeDragonsAchievement } from "./hereBeDragons.definition";
import { juggernautAchievement } from "./juggernaut.definition";
import { looseCannonAchievement } from "./looseCannon.definition";
import { looseCannonWinsAchievement } from "./looseCannonWins.definition";
import { notAllWhoWanderAreLostAchievement } from "./notAllWhoWanderAreLost.definition";
import { puttingOnTheDogAchievement } from "./puttingOnTheDog.definition";
import { sellingSeashellsAchievement } from "./sellingSeashells.definition";
import { sixFeetFromTheEdgeAchievement } from "./sixFeetFromTheEdge.definition";
import { slowAndSteadyAchievement } from "./slowAndSteady.definition";
import { sorryWrongRoomAchievement } from "./sorryWrongRoom.definition";
import { stealingSecondAchievement } from "./stealingSecond.definition";
import { straightAndNarrowAchievement } from "./straightAndNarrow.definition";
import { thoseWhoKnowAchievement } from "./thoseWhoKnow.definition";
import { seasonalExplorerAchievement } from "./seasonalExplorer.achievement";
import { uRobotAchievement } from "./uRobot.achievement";
import { wordCollectorAchievement } from "./wordCollector.achievement";

export const allAchievements: Achievement[] = [
  straightAndNarrowAchievement,
  juggernautAchievement,
  hereBeDragonsAchievement,
  dancingToADifferentBeatAchievement,
  notAllWhoWanderAreLostAchievement,
  sixFeetFromTheEdgeAchievement,
  forgotMyKeysAchievement,
  comebackKidAchievement,
  dejaVuAchievement,
  epicyclesUponEpicyclesAchievement,
  slowAndSteadyAchievement,
  looseCannonAchievement,
  looseCannonWinsAchievement,
  stealingSecondAchievement,
  sorryWrongRoomAchievement,
  thoseWhoKnowAchievement,
  puttingOnTheDogAchievement,
  sellingSeashellsAchievement,
  seasonalExplorerAchievement,
  wordCollectorAchievement,
  uRobotAchievement,
];

// ============================================================================
// ACHIEVEMENT ID STABILITY CHECK
// ============================================================================
// This ensures achievement IDs never accidentally change, which would break
// user progress when syncing with Supabase. DO NOT MODIFY THESE IDs!

const STABLE_ACHIEVEMENT_IDS = [
  "straightAndNarrow",
  "juggernaut",
  "hereBeDragons",
  "dancingToADifferentBeat",
  "notAllWhoWanderAreLost",
  "sixFeetFromTheEdge",
  "forgotMyKeys",
  "comebackKid",
  "dejaVu",
  "epicyclesUponEpicycles",
  "slowAndSteady",
  "looseCannon",
  "looseCannonWins",
  "stealingSecond",
  "sorryWrongRoom",
  "thoseWhoKnow",
  "puttingOnTheDog",
  "sellingSeashells",
  "seasonalExplorer",
  "wordCollector",
  "uRobot",
] as const;

// Validate that achievement IDs match the stable list
if (process.env.NODE_ENV === "development") {
  const currentIds = allAchievements.map((a) => a.id).sort();
  const expectedIds = [...STABLE_ACHIEVEMENT_IDS].sort();

  if (JSON.stringify(currentIds) !== JSON.stringify(expectedIds)) {
    console.error("🚨 ACHIEVEMENT ID MISMATCH DETECTED!");
    console.error("Expected IDs:", expectedIds);
    console.error("Current IDs:", currentIds);
    console.error("This will break user progress! Fix immediately!");
  }
}

// Optionally, re-export all individual achievements if direct access is ever needed
export {
  straightAndNarrowAchievement,
  juggernautAchievement,
  hereBeDragonsAchievement,
  dancingToADifferentBeatAchievement,
  notAllWhoWanderAreLostAchievement,
  sixFeetFromTheEdgeAchievement,
  forgotMyKeysAchievement,
  comebackKidAchievement,
  dejaVuAchievement,
  epicyclesUponEpicyclesAchievement,
  slowAndSteadyAchievement,
  looseCannonAchievement,
  looseCannonWinsAchievement,
  stealingSecondAchievement,
  sorryWrongRoomAchievement,
  thoseWhoKnowAchievement,
  puttingOnTheDogAchievement,
  sellingSeashellsAchievement,
  seasonalExplorerAchievement,
  wordCollectorAchievement,
  uRobotAchievement,
};
