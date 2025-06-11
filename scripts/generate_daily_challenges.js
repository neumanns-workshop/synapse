const fs = require("fs");
const path = require("path");

// Get the input file from command line argument
const inputFile = process.argv[2];
if (!inputFile) {
  console.error(
    "Please provide the path to the sampled results file as an argument",
  );
  process.exit(1);
}

// Load the sampled puzzles
const solvedPuzzlesPath = path.join(__dirname, inputFile);
const solvedPuzzles = JSON.parse(fs.readFileSync(solvedPuzzlesPath, "utf8"));

console.log(`Loaded ${solvedPuzzles.length} sampled puzzles`);

// Verify we have enough puzzles
if (solvedPuzzles.length < 365) {
  console.error(`Not enough sampled puzzles: ${solvedPuzzles.length} < 365`);
  process.exit(1);
}

// Generate consecutive daily challenges starting from today
const startDate = new Date();
startDate.setHours(0, 0, 0, 0);

const dailyChallenges = {
  version: "2.0",
  lastUpdated: new Date().toISOString().split("T")[0],
  description: "Daily challenges generated from heuristic solver puzzles",
  challenges: [],
};

// Create daily challenges for the next year (365 days)
for (let i = 0; i < Math.min(365, solvedPuzzles.length); i++) {
  const challengeDate = new Date(startDate);
  challengeDate.setDate(startDate.getDate() + i);

  const dateString = challengeDate.toISOString().split("T")[0];
  const puzzle = solvedPuzzles[i];

  const challenge = {
    id: dateString,
    date: dateString,
    startWord: puzzle.startWord,
    targetWord: puzzle.endWord,
    optimalPathLength: puzzle.optimalPathLength,
    // Store the heuristic solution for reference (optional)
    aiSolution: {
      path: puzzle.llmPath,
      stepsTaken: puzzle.stepsTaken,
      model: puzzle.model,
      heuristicScore: puzzle.heuristic_score,
    },
  };

  dailyChallenges.challenges.push(challenge);
}

// Write the new daily challenges file
const outputPath = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "daily_challenges_v2.json",
);
fs.writeFileSync(outputPath, JSON.stringify(dailyChallenges, null, 2));

console.log(`Generated ${dailyChallenges.challenges.length} daily challenges`);
console.log(`Saved to: ${outputPath}`);
console.log(
  `Date range: ${dailyChallenges.challenges[0].date} to ${dailyChallenges.challenges[dailyChallenges.challenges.length - 1].date}`,
);
