const fs = require("fs");
const path = require("path");

// Define paths to the data files (relative to the project root)
const GRAPH_DATA_PATH = path.join(__dirname, "../src/data/graph.json");
const DEFINITIONS_DATA_PATH = path.join(
  __dirname,
  "../src/data/definitions.json",
);
const WORD_FREQUENCIES_PATH = path.join(
  __dirname,
  "../src/data/word_frequencies.json",
);
const FILTERED_FREQUENCIES_OUTPUT_PATH = path.join(
  __dirname,
  "../src/data/filtered_word_frequencies.json",
);

console.log("Starting frequency filtering process...");

try {
  // 1. Load Data
  console.log(`Loading graph data from: ${GRAPH_DATA_PATH}`);
  const graphDataFile = fs.readFileSync(GRAPH_DATA_PATH, "utf8");
  const graphDataContainer = JSON.parse(graphDataFile);
  // graph.json has a top-level "nodes" key containing the actual graph data
  const graph = graphDataContainer.nodes;
  if (!graph) {
    throw new Error(
      'Could not find "nodes" key in graph.json. Please ensure the structure is { "nodes": { ...graph_data... } }',
    );
  }

  console.log(`Loading definitions data from: ${DEFINITIONS_DATA_PATH}`);
  const definitionsDataFile = fs.readFileSync(DEFINITIONS_DATA_PATH, "utf8");
  const definitions = JSON.parse(definitionsDataFile);

  console.log(`Loading word frequencies from: ${WORD_FREQUENCIES_PATH}`);
  const wordFrequenciesFile = fs.readFileSync(WORD_FREQUENCIES_PATH, "utf8");
  const allFrequencies = JSON.parse(wordFrequenciesFile);

  console.log("Data loaded successfully.");

  // 2. Collect All Unique Game Words
  const gameWords = new Set();

  // From graph data (main words and their neighbors)
  if (graph) {
    for (const word in graph) {
      gameWords.add(word);
      if (graph[word] && graph[word].edges) {
        for (const neighbor in graph[word].edges) {
          gameWords.add(neighbor);
        }
      }
    }
  }
  console.log(`Collected ${gameWords.size} words from graph data.`);

  // From definitions data
  if (definitions) {
    for (const word in definitions) {
      gameWords.add(word);
    }
  }
  console.log(`Total unique game words collected: ${gameWords.size}`);

  // 3. Filter Frequencies
  const filteredFrequencies = {};
  let count = 0;
  for (const word of gameWords) {
    if (Object.prototype.hasOwnProperty.call(allFrequencies, word)) {
      filteredFrequencies[word] = allFrequencies[word];
      count++;
    }
  }
  console.log(
    `Filtered frequencies: ${count} words retained out of ${Object.keys(allFrequencies).length} total original frequencies.`,
  );

  // 4. Save Filtered Data
  fs.writeFileSync(
    FILTERED_FREQUENCIES_OUTPUT_PATH,
    JSON.stringify(filteredFrequencies, null, 2),
  ); // null, 2 for pretty printing
  console.log(
    `Filtered word frequencies saved to: ${FILTERED_FREQUENCIES_OUTPUT_PATH}`,
  );

  // Find and log the rarest words
  const sortedWords = Object.entries(filteredFrequencies)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 20);

  console.log("\nRarest words for achievement testing:");
  sortedWords.forEach((entry, index) => {
    console.log(`${index + 1}. "${entry[0]}" - frequency: ${entry[1]}`);
  });

  console.log("Filtering process completed successfully!");
} catch (error) {
  console.error("Error during frequency filtering process:", error);
  process.exit(1); // Exit with error code
}
