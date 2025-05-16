import type { GameReport } from '../../utils/gameReportUtils';
import type { GameState } from '../../stores/useGameStore';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  // Takes the game report and current game status, returns true if achieved
  check: (gameReport: GameReport, gameStatus: GameState['gameStatus']) => boolean;
}

export const straightAndNarrowAchievement: Achievement = {
  id: 'straightAndNarrow',
  name: 'Straight and Narrow',
  description: 'Won the game with a path exactly matching the optimal length.',
  check: (gameReport, gameStatus) => {
    // Ensure gameReport is not null and playerPath/optimalPath are available
    if (gameStatus !== 'won' || !gameReport || !gameReport.playerPath || !gameReport.optimalPath) {
      return false;
    }
    return gameReport.playerPath.length === gameReport.optimalPath.length;
  }
};

export const juggernautAchievement: Achievement = {
  id: 'juggernaut',
  name: "I'm the Juggernaut!",
  description: 'Completed the game without using the backtrack feature.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'won' || !gameReport) {
      return false;
    }
    // Achieved if no backtrack events are present or the array is empty
    return !gameReport.backtrackEvents || gameReport.backtrackEvents.length === 0;
  }
};

// Restoring Here Be Dragons Achievement
export const hereBeDragonsAchievement: Achievement = {
  id: 'hereBeDragons',
  name: 'Here Be Dragons',
  description: 'Deviated from the optimal path but managed to find your way back to it.',
  check: (gameReport, gameStatus) => {
    // Allow for won or given_up games, as long as a path was made.
    if (!['won', 'given_up'].includes(gameStatus) || 
        !gameReport || 
        !gameReport.playerPath || 
        !gameReport.optimalPath || 
        gameReport.playerPath.length < 2) { // Must have made at least one move
      return false;
    }

    // If player's path IS the optimal path, they didn't truly deviate and return in the spirit of this achievement.
    // This check is more about *not* awarding it if they also got "Straight and Narrow" (if they won).
    // For lost/given_up, this check might be less critical but ensures a deviation did occur.
    const isIdenticalToOptimal = gameReport.playerPath.length === gameReport.optimalPath.length &&
                                 gameReport.playerPath.every((word, index) => word === gameReport.optimalPath[index]);
    if (isIdenticalToOptimal && gameStatus === 'won') { // Specifically avoid if won and path is perfect
      return false;
    }

    let hasDeviated = false;
    const optimalPathSet = new Set(gameReport.optimalPath);

    for (let i = 1; i < gameReport.playerPath.length; i++) {
      const prevPlayerWord = gameReport.playerPath[i-1];
      const currentPlayerWord = gameReport.playerPath[i];
      const prevWordOptimalIndex = gameReport.optimalPath.indexOf(prevPlayerWord);

      if (prevWordOptimalIndex !== -1) { // Previous word was on the optimal path
        if (prevWordOptimalIndex + 1 < gameReport.optimalPath.length) {
          const expectedOptimalNextWord = gameReport.optimalPath[prevWordOptimalIndex + 1];
          if (currentPlayerWord !== expectedOptimalNextWord) {
            // Deviation: player moved to a word not next on the optimal path.
            hasDeviated = true;
          } else {
            // Player continued on the optimal path.
            if (hasDeviated) {
              // If they were previously deviated and are now back on an optimal sequence from an optimal word,
              // it means they've successfully returned.
              return true;
            }
          }
        } else if (hasDeviated && currentPlayerWord === gameReport.optimalPath[gameReport.optimalPath.length -1] && prevPlayerWord === gameReport.playerPath[gameReport.playerPath.length -2]) {
           // Edge case: player was deviated, and the last move *of their path* is to the endWord (which is on optimal path).
           // This counts as a return if they were deviated before this final step.
           return true;
        }
      } else { // Previous word was NOT on the optimal path.
        if (hasDeviated && optimalPathSet.has(currentPlayerWord)) {
          // Player was in a deviated state and has now landed on *any* word that is part of the optimal path.
          // This is a return.
          return true;
        }
        // If not previously deviated, but landed on an optimal path word from off-path, mark as deviated. 
        // This handles cases where the deviation starts by stepping *off* an optimal path word not covered above.
        // Example: A -> B (optimal), player goes A -> C (off-optimal). C is not optimal. Now hasDeviated is true.
        // Then if C -> D (D is on optimalPathSet), it will be caught by the clause above in the next iteration or this one.
        if(optimalPathSet.has(prevPlayerWord)) { //This condition should not be met due to the outer if-else logic
            //This block indicates an issue with the logic, prevPlayerWord should be on an optimal path
        } else { //prevPlayerWord is NOT on an optimal path. This is part of a deviation.
            hasDeviated = true;
        }

      }
    }
    return false; // No qualifying deviation and return sequence found.
  }
};

// Restoring Dancing to a Different Beat Achievement
export const dancingToADifferentBeatAchievement: Achievement = {
  id: 'dancingToADifferentBeat',
  name: 'Dancing to a Different Beat',
  description: 'Won the game by forging your own path, never treading the optimal route until the final step.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'won' || !gameReport || !gameReport.optimalChoices || gameReport.optimalChoices.length === 0) {
      return false;
    }
    if (gameReport.optimalChoices.length <= 1) {
      return false;
    }
    for (let i = 0; i < gameReport.optimalChoices.length - 1; i++) {
      if (gameReport.optimalChoices[i].isGlobalOptimal) {
        return false;
      }
    }
    return true;
  }
};

export const notAllWhoWanderAreLostAchievement: Achievement = {
  id: 'notAllWhoWanderAreLost',
  name: 'Not All Who Wander Are Lost',
  description: 'Reached the end (or gave up) having made no optimal or suggested moves, except possibly the final winning one.',
  check: (gameReport, gameStatus) => {
    if (!gameReport || !gameReport.optimalChoices || !['won', 'given_up'].includes(gameStatus)) {
      return false;
    }

    const choicesToEvaluate = [...gameReport.optimalChoices];

    if (gameStatus === 'won' && choicesToEvaluate.length > 0) {
      choicesToEvaluate.pop(); // Exclude the final winning move from the check
    }

    // Must have made at least one move that is subject to the check
    if (choicesToEvaluate.length === 0) {
      return false;
    }

    for (const choice of choicesToEvaluate) {
      if (choice.isGlobalOptimal || choice.isLocalOptimal) {
        return false; // This move was either globally or locally optimal
      }
    }

    return true; // All evaluated moves were neither optimal nor suggested
  }
};

export const sixFeetFromTheEdgeAchievement: Achievement = {
  id: 'sixFeetFromTheEdge',
  name: 'Six Feet From the Edge',
  description: 'Gave up when just a step or two away from the target word.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'given_up' || 
        !gameReport || 
        !gameReport.suggestedPath || 
        gameReport.suggestedPath.length <= 1) { // Path must exist and be longer than just the current word
      return false;
    }

    const movesRemaining = gameReport.suggestedPath.length - 1;
    
    // Award if 1 or 2 moves were remaining
    return movesRemaining === 1 || movesRemaining === 2;
  }
};

// Restoring Forgot My Keys Achievement
export const forgotMyKeysAchievement: Achievement = {
  id: 'forgotMyKeys',
  name: 'Forgot My Keys',
  description: 'Gave up when further (in terms of path length) from the target than when you started.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'given_up' || 
        !gameReport || 
        !gameReport.suggestedPath || 
        !gameReport.optimalPath ||
        gameReport.suggestedPath.length === 0 ||
        gameReport.optimalPath.length === 0) {
      return false;
    }
    return gameReport.suggestedPath.length > gameReport.optimalPath.length;
  }
};

// Restoring Comeback Kid Achievement
export const comebackKidAchievement: Achievement = {
  id: 'comebackKid',
  name: 'Comeback Kid',
  description: 'Won the game after, at some point, being further (in path length) from the target than when you started.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'won' || 
        !gameReport || 
        !gameReport.optimalPath || 
        gameReport.optimalPath.length === 0 ||
        !gameReport.optimalChoices || 
        gameReport.optimalChoices.length === 0) {
      return false;
    }
    const initialHopsToEnd = gameReport.optimalPath.length - 1;
    for (const choice of gameReport.optimalChoices) {
      if (choice.hopsFromPlayerPositionToEnd !== undefined && choice.hopsFromPlayerPositionToEnd > initialHopsToEnd) {
        return true;
      }
    }
    return false;
  }
};

export const dejaVuAchievement: Achievement = {
  id: 'dejaVu',
  name: 'Déjà Vu',
  description: 'Revisited a word you had already been to in your current path.',
  check: (gameReport, gameStatus) => {
    if (!['won', 'given_up'].includes(gameStatus) ||
        !gameReport ||
        !gameReport.playerPath ||
        gameReport.playerPath.length < 3) { // Need at least A -> B -> A to have a revisit
      return false;
    }

    const visitedWords = new Set<string>();
    for (const word of gameReport.playerPath) {
      if (visitedWords.has(word)) {
        return true; // Found a revisited word
      }
      visitedWords.add(word);
    }
    return false; // No word was revisited
  }
};

export const epicyclesUponEpicyclesAchievement: Achievement = {
  id: 'epicyclesUponEpicycles',
  name: 'Epicycles Upon Epicycles',
  description: 'Demonstrated a truly circuitous path by revisiting at least two different words.',
  check: (gameReport, gameStatus) => {
    if (!['won', 'given_up'].includes(gameStatus) ||
        !gameReport ||
        !gameReport.playerPath ||
        gameReport.playerPath.length < 5) { // Min length for A->B->A -> C->B (5 words, 2 distinct revisits)
      return false;
    }

    const wordsEncounteredInPath = new Set<string>();
    const distinctRevisitedWords = new Set<string>();

    for (const word of gameReport.playerPath) {
      if (wordsEncounteredInPath.has(word)) {
        // This word is being revisited in the current path traversal
        distinctRevisitedWords.add(word);
      }
      wordsEncounteredInPath.add(word);
    }
    // Award if at least 2 *different* words were the subject of a revisit.
    return distinctRevisitedWords.size >= 2;
  }
};

// Restoring Loose Cannon
export const looseCannonAchievement: Achievement = {
  id: 'looseCannon',
  name: 'Loose Cannon',
  description: 'Gave up the game having charted a wild course, choosing the least similar neighbor at least 50% of the time.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'given_up' || // Ensure game was given up
        !gameReport || 
        !gameReport.optimalChoices || 
        gameReport.optimalChoices.length === 0) {
      return false;
    }
    let leastSimilarChoices = 0;
    for (const choice of gameReport.optimalChoices) {
      if (choice.choseLeastSimilarNeighbor) {
        leastSimilarChoices++;
      }
    }
    return leastSimilarChoices / gameReport.optimalChoices.length >= 0.5;
  }
};

// Restoring Loose Cannon, but the Best We've Got
export const looseCannonWinsAchievement: Achievement = {
  id: 'looseCannonWins',
  name: 'Loose Cannon, but the Best We\'ve Got',
  description: 'Despite a wild course, choosing the least similar neighbor at least 50% of the time, you still managed to win!',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'won' || 
        !gameReport || 
        !gameReport.optimalChoices || 
        gameReport.optimalChoices.length === 0) {
      return false;
    }
    let leastSimilarChoices = 0;
    for (const choice of gameReport.optimalChoices) {
      if (choice.choseLeastSimilarNeighbor) {
        leastSimilarChoices++;
      }
    }
    return leastSimilarChoices / gameReport.optimalChoices.length >= 0.5;
  }
};

// Adding the new achievement "Sorry, Wrong Room"
export const sorryWrongRoomAchievement: Achievement = {
  id: 'sorry-wrong-room',
  name: 'Sorry, Wrong Room',
  description: 'Won or gave up the game after using the backtrack feature more than 3 times. A true journey of second (and third, and fourth...) guesses!',
  // icon: '↪️', // Placeholder icon
  check: (gameReport, gameStatus) => {
    if (!['won', 'given_up'].includes(gameStatus) || !gameReport || !gameReport.backtrackEvents) {
      return false;
    }
    return gameReport.backtrackEvents.length > 3;
  },
};

// New Achievement: "Those Who Know"
export const thoseWhoKnowAchievement: Achievement = {
  id: 'thoseWhoKnow',
  name: 'Those Who Know',
  description: 'Selected a word that was both the rarest available option and an optimal move.',
  check: (gameReport, gameStatus) => {
    if (!['won', 'given_up'].includes(gameStatus) || !gameReport || !gameReport.optimalChoices) {
      return false;
    }
    return gameReport.optimalChoices.some(choice => 
      choice.choseRarestNeighbor === true && 
      (choice.isGlobalOptimal === true || choice.isLocalOptimal === true)
    );
  }
};

// New Achievement: "Putting on the Dog"
export const puttingOnTheDogAchievement: Achievement = {
  id: 'puttingOnTheDog',
  name: 'Putting on the Dog',
  description: 'Selected the rarest word that was offered as an option throughout the entire game and won.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'won' || // Require win
        !gameReport || 
        !gameReport.potentialRarestMoves || 
        gameReport.potentialRarestMoves.length === 0) {
      return false;
    }

    let overallRarestFrequency = Infinity;
    for (const potentialMove of gameReport.potentialRarestMoves) {
      if (potentialMove.frequency < overallRarestFrequency) {
        overallRarestFrequency = potentialMove.frequency;
      }
    }

    if (overallRarestFrequency === Infinity) {
      return false;
    }

    return gameReport.potentialRarestMoves.some(potentialMove => 
      potentialMove.frequency === overallRarestFrequency && 
      potentialMove.playerChoseThisRarestOption === true
    );
  }
};



// New Achievement: "Selling Seashells"
export const sellingSeashellsAchievement: Achievement = {
  id: 'sellingSeashells',
  name: 'Selling Seashells',
  description: 'Chose three words in a row that start with the same letter and won.',
  check: (gameReport, gameStatus) => {
    if (gameStatus !== 'won' || 
        !gameReport || 
        !gameReport.playerPath || 
        gameReport.playerPath.length < 3) {
      return false;
    }
    
    const path = gameReport.playerPath;
    // Check if there are three consecutive words starting with the same letter
    for (let i = 0; i < path.length - 2; i++) {
      const firstLetter1 = path[i].charAt(0).toLowerCase();
      const firstLetter2 = path[i + 1].charAt(0).toLowerCase();
      const firstLetter3 = path[i + 2].charAt(0).toLowerCase();
      
      if (firstLetter1 === firstLetter2 && firstLetter2 === firstLetter3) {
        return true;
      }
    }
    
    return false;
  }
};

// Final list of achievements
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
  // Renamed from Dog Star and updated
  {
    id: 'slow-and-steady',
    name: 'Slow and Steady',
    description:
      'Win by choosing the most semantically similar neighbor at least 50% of the time.',
    check: (gameReport, gameStatus) => {
      if (gameStatus !== 'won' || !gameReport || !gameReport.optimalChoices || gameReport.optimalChoices.length === 0) {
        return false;
      }
      const mostSimilarChoiceMoves = gameReport.optimalChoices.filter(
        (oc) => oc.choseMostSimilarNeighbor,
      ).length;
      const totalMoves = gameReport.optimalChoices.length;
      return totalMoves > 0 && mostSimilarChoiceMoves / totalMoves >= 0.5;
    },
  },
  looseCannonAchievement,
  looseCannonWinsAchievement,
  // New achievement
  {
    id: 'stealing-second',
    name: 'Stealing Second with a Foot on First',
    description:
      'Gave up, having chosen the most semantically similar neighbor at least 50% of the time.',
    check: (gameReport, gameStatus) => {
      if (gameStatus !== 'given_up' || // Ensure game was given up
          !gameReport || 
          !gameReport.optimalChoices || 
          gameReport.optimalChoices.length === 0) {
        return false;
      }
      const mostSimilarChoiceMoves = gameReport.optimalChoices.filter(
        (oc) => oc.choseMostSimilarNeighbor,
      ).length;
      const totalMoves = gameReport.optimalChoices.length;
      return totalMoves > 0 && mostSimilarChoiceMoves / totalMoves >= 0.5;
    },
  },
  sorryWrongRoomAchievement,
  thoseWhoKnowAchievement,
  puttingOnTheDogAchievement,
  sellingSeashellsAchievement,
];

// Function to evaluate all achievements for a given game report and status
export const evaluateAchievements = (gameReport: GameReport, gameStatus: GameState['gameStatus']): Achievement[] => {
  if (!gameReport) {
    return [];
  }
  // Only evaluate for 'won' status, or if an achievement itself doesn't depend on winning.
  // For now, most will, so this is a general guard.
  // Individual achievement 'check' functions are responsible for their specific win condition logic.
  return allAchievements.filter(achievement => achievement.check(gameReport, gameStatus));
}; 