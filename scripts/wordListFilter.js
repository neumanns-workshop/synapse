"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === "function" ? Iterator : Object).prototype,
      );
    return (
      (g.next = verb(0)),
      (g.throw = verb(1)),
      (g.return = verb(2)),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y.return
                  : op[0]
                    ? y.throw || ((t = y.return) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
/**
 * Filters a list of words against the game's graph data
 *
 * @param words - Array of words to filter
 * @param graphDataPath - Path to the graph.json file (optional)
 * @returns An object with statistics and the filtered word list
 */
function filterWordList(words, graphDataPath) {
  return __awaiter(this, void 0, void 0, function () {
    var defaultPath,
      graphPath,
      graphRawData,
      graphData,
      validGraphWords,
      validWords,
      invalidWords,
      _i,
      words_1,
      word,
      normalizedWord,
      totalWords,
      percentValid;
    return __generator(this, function (_a) {
      defaultPath = path.join(__dirname, "..", "src", "data", "graph.json"); // MODIFIED PATH
      graphPath = graphDataPath || defaultPath;
      try {
        // Load graph data
        console.log("Loading graph data from ".concat(graphPath, "..."));
        graphRawData = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
        graphData = void 0;
        if (graphRawData.nodes && typeof graphRawData.nodes === "object") {
          console.log('Using nested "nodes" structure');
          graphData = graphRawData.nodes;
        } else {
          console.log("Using top-level graph data");
          graphData = graphRawData;
        }
        validGraphWords = new Set(Object.keys(graphData));
        console.log("Graph contains ".concat(validGraphWords.size, " words"));
        validWords = [];
        invalidWords = [];
        for (_i = 0, words_1 = words; _i < words_1.length; _i++) {
          word = words_1[_i];
          normalizedWord = word.trim().toLowerCase();
          if (validGraphWords.has(normalizedWord)) {
            validWords.push(normalizedWord);
          } else {
            invalidWords.push(normalizedWord);
          }
        }
        totalWords = words.length;
        percentValid = (validWords.length / totalWords) * 100;
        console.log("Total words: ".concat(totalWords));
        console.log(
          "Valid words: "
            .concat(validWords.length, " (")
            .concat(percentValid.toFixed(1), "%)"),
        );
        console.log("Invalid words: ".concat(invalidWords.length));
        return [
          2 /*return*/,
          {
            totalWords: totalWords,
            validWords: validWords,
            invalidWords: invalidWords,
            percentValid: percentValid,
          },
        ];
      } catch (error) {
        console.error("Error filtering word list:", error);
        throw error;
      }
    });
  });
}
/**
 * Formats the output for use in a WordCollection
 *
 * @param filteredResult - The result from filterWordList
 * @param format - Output format ('js' for JavaScript array, 'json' for JSON file)
 * @param outputPath - Path to save the output if format is 'json'
 * @returns Formatted output string or void if writing to file
 */
function formatOutput(filteredResult, format, outputPath) {
  if (format === void 0) {
    format = "js";
  }
  if (format === "js") {
    // Format as JavaScript array for direct inclusion in code
    var jsArray = JSON.stringify(filteredResult.validWords, null, 2)
      .split("\n")
      .map(function (line) {
        return "  " + line;
      })
      .join("\n");
    var output = "[\n".concat(jsArray, "\n]");
    return output;
  } else if (format === "json" && outputPath) {
    // Write to JSON file
    var outputData = {
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
    console.log("Output written to ".concat(outputPath));
    return;
  }
  throw new Error("Invalid format or missing output path for JSON format");
}
/**
 * Example usage as CLI tool
 */
function main() {
  return __awaiter(this, void 0, void 0, function () {
    var args,
      inputFile,
      outputPath,
      format,
      graphPath,
      i,
      arg,
      formatArg,
      inputText,
      words,
      result,
      formattedOutput,
      error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          args = process.argv.slice(2);
          // Check for help flag
          if (args.includes("--help") || args.includes("-h")) {
            console.log(
              "\nWord List Filter Tool\n\nUsage:\n  node wordListFilter.js [options] <inputFile>\n\nOptions:\n  --output, -o <path>   Output path for JSON format\n  --format, -f <type>   Output format: 'js' (default) or 'json'\n  --graph, -g <path>    Path to graph.json file\n  --help, -h            Show this help message\n\nExamples:\n  node wordListFilter.js wordlist.txt\n  node wordListFilter.js -f json -o filtered.json wordlist.txt\n    ",
            );
            return [2 /*return*/];
          }
          format = "js";
          for (i = 0; i < args.length; i++) {
            arg = args[i];
            if (arg === "--output" || arg === "-o") {
              outputPath = args[++i];
            } else if (arg === "--format" || arg === "-f") {
              formatArg = args[++i];
              if (formatArg === "js" || formatArg === "json") {
                format = formatArg;
              } else {
                throw new Error(
                  "Invalid format: ".concat(
                    formatArg,
                    ". Must be 'js' or 'json'",
                  ),
                );
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
          _a.label = 1;
        case 1:
          _a.trys.push([1, 3, , 4]);
          inputText = fs.readFileSync(inputFile, "utf-8");
          words = inputText
            .split(/[\s,]+/)
            .map(function (word) {
              return word.trim();
            })
            .filter(function (word) {
              return word.length > 0;
            });
          return [4 /*yield*/, filterWordList(words, graphPath)];
        case 2:
          result = _a.sent();
          // Format and output the result
          if (format === "json" && !outputPath) {
            outputPath = inputFile.replace(/\.\w+$/, "") + ".filtered.json";
          }
          formattedOutput = formatOutput(result, format, outputPath);
          if (formattedOutput) {
            console.log(formattedOutput);
          }
          return [3 /*break*/, 4];
        case 3:
          error_1 = _a.sent();
          // Error is already logged by filterWordList or formatOutput
          process.exit(1);
          return [3 /*break*/, 4];
        case 4:
          return [2 /*return*/];
      }
    });
  });
}
// Execute the main function if the script is run directly
if (require.main === module) {
  main();
}
