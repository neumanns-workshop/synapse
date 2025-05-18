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
import type { Achievement } from "../achievement.types";

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
  slowAndSteadyAchievement, // This was an inline object, now imported
  looseCannonAchievement,
  looseCannonWinsAchievement,
  stealingSecondAchievement, // This was an inline object, now imported
  sorryWrongRoomAchievement,
  thoseWhoKnowAchievement,
  puttingOnTheDogAchievement,
  sellingSeashellsAchievement,
];

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
};
