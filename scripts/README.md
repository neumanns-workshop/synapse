# Word List Filter Tool

This tool helps you filter a list of words against the game's graph data to ensure that only valid words are used in word collections.

## Usage

### Prerequisites

- Node.js installed
- TypeScript installed (`npm install -g typescript`)
- Access to the game's graph.json file

### Setup

1. Compile the TypeScript file:

   ```
   tsc wordListFilter.ts
   ```

2. Prepare your input file:
   - Create a text file with your word list
   - Words can be separated by spaces, newlines, or commas
   - See `example-wordlist.txt` for an example

### Basic Usage

```bash
node wordListFilter.js your-wordlist.txt
```

This will output a JavaScript array of valid words that you can directly copy into your code.

### Advanced Options

```bash
node wordListFilter.js [options] <inputFile>

Options:
  --output, -o <path>   Output path for JSON format
  --format, -f <type>   Output format: 'js' (default) or 'json'
  --graph, -g <path>    Path to graph.json file
  --help, -h            Show this help message
```

#### Examples

Output as JavaScript array (default):

```bash
node wordListFilter.js example-wordlist.txt
```

Output as JSON file:

```bash
node wordListFilter.js -f json -o filtered.json example-wordlist.txt
```

Specify custom graph data path:

```bash
node wordListFilter.js -g ../data/custom-graph.json example-wordlist.txt
```

### Using the Output

#### JavaScript Array Format

Copy the output array directly into your wordCollections.ts file:

```typescript
const musicWordList = [
  "music",
  "melody",
  "rhythm",
  // ... filtered words
];
```

#### JSON Format

The JSON output includes:

- Meta information (total words, valid words, percentage)
- The list of valid words
- The list of invalid words (useful for debugging)

## Creating a Word Collection

After filtering your word list, you can add it to the `wordCollections.ts` file:

```typescript
// In wordCollections.ts
const thematicWordLists = {
  // ... existing lists
  music: [
    "music",
    "melody",
    "rhythm",
    // ... other filtered words
  ],
};

// Then add the collection to allWordCollections
// For example: export const newCollection = createCollection('new-collection', 'New Collection', 'Description of new collection', ['word1', 'word2', 'word3'], { startDate: new Date('YYYY-MM-DD'), endDate: new Date('YYYY-MM-DD'), icon: 'some-icon' });
```

## Troubleshooting

- **File not found errors**: Make sure the paths to your input file and graph data are correct
- **No valid words**: Check that your words are in lowercase and exist in the game's vocabulary
- **Low percentage of valid words**: This is normal. Many words will not be in the game's graph data.
