import * as fs from "fs";
import * as path from "path";

// Define the GraphData interface based on what we've seen in the app
interface NodeData {
  edges: Record<string, number>;
  tsne: [number, number];
}

interface GraphData {
  [word: string]: NodeData;
}

/**
 * Filters a list of words against the game's graph data
 *
 * @param words - Array of words to filter
 * @param graphDataPath - Path to the graph.json file (optional)
 * @returns An object with statistics and the filtered word list
 */
async function filterWordList(
  words: string[],
  graphDataPath?: string,
): Promise<{
  totalWords: number;
  validWords: string[];
  invalidWords: string[];
  percentValid: number;
}> {
  // Default path to the graph data, assuming script is in PROJECT_ROOT/scripts/
  const defaultPath = path.join(__dirname, "..", "src", "data", "graph.json");
  const graphPath = graphDataPath || defaultPath;

  try {
    // Load graph data
    console.log(`Loading graph data from ${graphPath}...`);
    const graphRawData = JSON.parse(fs.readFileSync(graphPath, "utf-8"));

    // Handle potential nested structure in graph data
    let graphData: GraphData;
    if (graphRawData.nodes && typeof graphRawData.nodes === "object") {
      console.log('Using nested "nodes" structure');
      graphData = graphRawData.nodes;
    } else {
      console.log("Using top-level graph data");
      graphData = graphRawData;
    }

    // Get the set of valid words from the graph
    const validGraphWords = new Set(Object.keys(graphData));
    console.log(`Graph contains ${validGraphWords.size} words`);

    // Filter the input words
    const validWords: string[] = [];
    const invalidWords: string[] = [];

    for (const word of words) {
      const normalizedWord = word.trim().toLowerCase();
      if (validGraphWords.has(normalizedWord)) {
        validWords.push(normalizedWord);
      } else {
        invalidWords.push(normalizedWord);
      }
    }

    // Calculate statistics
    const totalWords = words.length;
    const percentValid = (validWords.length / totalWords) * 100;

    console.log(`Total words: ${totalWords}`);
    console.log(
      `Valid words: ${validWords.length} (${percentValid.toFixed(1)}%)`,
    );
    console.log(`Invalid words: ${invalidWords.length}`);

    return {
      totalWords,
      validWords,
      invalidWords,
      percentValid,
    };
  } catch (error) {
    console.error("Error filtering word list:", error);
    throw error;
  }
}

/**
 * Formats the output for use in a WordCollection
 *
 * @param filteredResult - The result from filterWordList
 * @param format - Output format ('js' for JavaScript array, 'json' for JSON file)
 * @param outputPath - Path to save the output if format is 'json'
 * @returns Formatted output string or void if writing to file
 */
function formatOutput(
  filteredResult: {
    totalWords: number;
    validWords: string[];
    invalidWords: string[];
    percentValid: number;
  },
  format: "js" | "json" = "js",
  outputPath?: string,
): string | void {
  if (format === "js") {
    // Format as JavaScript array for direct inclusion in code
    const jsArray = JSON.stringify(filteredResult.validWords, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n");

    const output = `[\n${jsArray}\n]`;
    return output;
  } else if (format === "json" && outputPath) {
    // Write to JSON file
    const outputData = {
      meta: {
        totalWords: filteredResult.totalWords,
        validWords: filteredResult.validWords.length,
        invalidWords: filteredResult.invalidWords.length,
        percentValid: filteredResult.percentValid,
      },
      validWords: filteredResult.validWords,
      invalidWords: filteredResult.invalidWords,
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`Output written to ${outputPath}`);
    return;
  }

  throw new Error("Invalid format or missing output path for JSON format");
}

/**
 * Example usage as CLI tool
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Word List Filter Tool

Usage:
  node wordListFilter.js [options] <inputFile>

Options:
  --output, -o <path>   Output path for JSON format
  --format, -f <type>   Output format: 'js' (default) or 'json'
  --graph, -g <path>    Path to graph.json file
  --help, -h            Show this help message

Examples:
  node wordListFilter.js wordlist.txt
  node wordListFilter.js -f json -o filtered.json wordlist.txt
    `);
    return;
  }

  // Parse arguments
  let inputFile: string | undefined;
  let outputPath: string | undefined;
  let format: "js" | "json" = "js";
  let graphPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--output" || arg === "-o") {
      outputPath = args[++i];
    } else if (arg === "--format" || arg === "-f") {
      const formatArg = args[++i];
      if (formatArg === "js" || formatArg === "json") {
        format = formatArg;
      } else {
        throw new Error(`Invalid format: ${formatArg}. Must be 'js' or 'json'`);
      }
    } else if (arg === "--graph" || arg === "-g") {
      graphPath = args[++i];
    } else if (!arg.startsWith("-")) {
      inputFile = arg;
    }
  }

  if (!inputFile) {
    console.error("Error: Input file is required");
    process.exit(1);
  }

  try {
    // Read the input file
    const inputText = fs.readFileSync(inputFile, "utf-8");

    // Split by whitespace and/or commas, and filter out empty strings
    const words = inputText
      .split(/[\s,]+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    // Filter the words
    const result = await filterWordList(words, graphPath);

    // Format and output the result
    if (format === "json" && !outputPath) {
      outputPath = inputFile.replace(/\.\w+$/, "") + ".filtered.json";
    }
    const formattedOutput = formatOutput(result, format, outputPath);
    if (formattedOutput) {
      console.log(formattedOutput);
    }
  } catch (error) {
    // Error is already logged by filterWordList or formatOutput
    process.exit(1);
  }
}

// Execute the main function if the script is run directly
if (require.main === module) {
  main();
}
