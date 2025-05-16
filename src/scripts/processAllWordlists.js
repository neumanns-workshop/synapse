const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);
const wordlistsDir = path.join(__dirname, 'themed-wordlists');

// Map the filename to a nice collection name
const fileToCollectionName = {
  'seasons-weather.txt': 'seasons',
  'colors-light.txt': 'colors',
  'shapes-patterns.txt': 'shapes',
  'movement-motion.txt': 'movement',
  'textures-materials.txt': 'textures',
  'sounds-silence.txt': 'sounds',
  'creatures.txt': 'creatures',
  'tools-instruments.txt': 'tools',
  'maps-journeys.txt': 'journeys',
  'light-fantasy.txt': 'fantasy',
  'whimsy-nonsense.txt': 'whimsy',
  'time-change.txt': 'time',
  'machines-mechanisms.txt': 'machines',
  'gardens-growth.txt': 'gardens'
};

// Map collection names to nice display names and descriptions
const collectionDisplay = {
  seasons: { title: 'Seasons & Weather', desc: 'Explore terms related to climate, seasons, and atmospheric conditions' },
  colors: { title: 'Colors & Light', desc: 'Discover words that evoke visual perception, hues, and illumination' },
  shapes: { title: 'Shapes & Patterns', desc: 'Play with geometric forms, arrangements, and visual structures' },
  movement: { title: 'Movement & Motion', desc: 'Connect words that express action, dynamics, and physical movement' },
  textures: { title: 'Textures & Materials', desc: 'Feel your way through tactile terms and physical substances' },
  sounds: { title: 'Sounds & Silence', desc: 'Listen for words that evoke auditory experiences from noise to quiet' },
  creatures: { title: 'Creatures Real & Imagined', desc: 'Encounter words related to animals, beings, and mythical entities' },
  tools: { title: 'Tools & Instruments', desc: 'Discover implements for making, measuring, and manipulating' },
  journeys: { title: 'Maps & Journeys', desc: 'Navigate through terms of travel, exploration, and wayfinding' },
  fantasy: { title: 'Light Fantasy', desc: 'Wander through mildly magical and enchanting terminology' },
  whimsy: { title: 'Whimsy & Nonsense', desc: 'Delight in playful, fanciful, and sometimes silly expressions' },
  time: { title: 'Time & Change', desc: 'Contemplate concepts of duration, transformation, and temporal flow' },
  machines: { title: 'Machines & Mechanisms', desc: 'Explore the language of devices, systems, and technological constructs' },
  gardens: { title: 'Gardens & Growth', desc: 'Nurture connections between terms of cultivation, plants, and development' }
};

// Icons for each collection
const collectionIcons = {
  seasons: 'weather-sunny-alert',
  colors: 'palette',
  shapes: 'shape',
  movement: 'run',
  textures: 'texture-box',
  sounds: 'volume-high',
  creatures: 'paw',
  tools: 'tools',
  journeys: 'map',
  fantasy: 'magic-staff',
  whimsy: 'emoticon-excited',
  time: 'clock-time-eight',
  machines: 'cog',
  gardens: 'flower'
};

async function processWordlists() {
  // Get all wordlist files
  const files = fs.readdirSync(wordlistsDir);
  
  const output = {
    collections: {}
  };
  
  for (const file of files) {
    if (!file.endsWith('.txt')) continue;
    
    const filePath = path.join(wordlistsDir, file);
    const collectionKey = fileToCollectionName[file];
    
    if (!collectionKey) {
      console.log(`Warning: No collection key for ${file}`);
      continue;
    }
    
    try {
      // Run the filter script on each wordlist
      const { stdout } = await execPromise(`node wordListFilter.js "${filePath}"`);
      
      // Extract the array from output
      const match = stdout.match(/\[\s*\[([\s\S]*?)\]\s*\]/);
      if (!match) {
        console.error(`Failed to parse output for ${file}`);
        continue;
      }
      
      // Parse the array content
      const content = match[1].trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('');
      
      // Store in our output object
      output.collections[collectionKey] = {
        words: JSON.parse(`[${content}]`),
        title: collectionDisplay[collectionKey].title,
        description: collectionDisplay[collectionKey].desc,
        icon: collectionIcons[collectionKey]
      };
      
      console.log(`Processed ${file}: ${output.collections[collectionKey].words.length} valid words`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  // Generate the final output code for wordCollections.ts
  let codeOutput = '// AUTO-GENERATED THEMED WORD COLLECTIONS\n\n';
  
  // Generate thematic word lists object
  codeOutput += 'const thematicWordLists = {\n';
  for (const [key, collection] of Object.entries(output.collections)) {
    codeOutput += `  ${key}: [\n`;
    codeOutput += collection.words.map(word => `    '${word}'`).join(',\n');
    codeOutput += '\n  ],\n\n';
  }
  codeOutput += '};\n\n';
  
  // Generate collection creation code
  codeOutput += '// Collection creation code\n';
  codeOutput += 'export const themedCollections: WordCollection[] = [\n';
  for (const [key, collection] of Object.entries(output.collections)) {
    codeOutput += `  createCollection(\n`;
    codeOutput += `    '${key}',\n`;
    codeOutput += `    '${collection.title}',\n`;
    codeOutput += `    '${collection.description}',\n`;
    codeOutput += `    thematicWordLists.${key},\n`;
    codeOutput += `    { icon: '${collection.icon}' }\n`;
    codeOutput += `  ),\n`;
  }
  codeOutput += '];\n';
  
  // Write the output to a file
  fs.writeFileSync(
    path.join(__dirname, 'generatedCollections.js'), 
    codeOutput
  );
  
  console.log('Generated collections file written to generatedCollections.js');
}

processWordlists().catch(console.error); 