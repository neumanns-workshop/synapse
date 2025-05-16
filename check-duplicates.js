// Script to check for duplicate words in word collections
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/features/wordCollections/wordCollections.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Regular expressions to find all word arrays
const arrayRegex = /deduplicateArray\(\[\s*([\s\S]*?)\s*\]\)/g;
const wordRegex = /'([^']+)'/g;

let match;
let duplicatesFound = false;

// Check each array in the file
while ((match = arrayRegex.exec(content)) !== null) {
  const arrayContent = match[1];
  const wordCounts = {};
  
  let wordMatch;
  while ((wordMatch = wordRegex.exec(arrayContent)) !== null) {
    const word = wordMatch[1];
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  const duplicates = Object.entries(wordCounts).filter(([_, count]) => count > 1);
  
  if (duplicates.length > 0) {
    const arrayStart = arrayContent.substring(0, 50) + '...';
    console.log(`Found duplicates in array starting with "${arrayStart}":`);
    duplicates.forEach(([word, count]) => {
      console.log(`  - "${word}" appears ${count} times`);
    });
    duplicatesFound = true;
  }
}

if (!duplicatesFound) {
  console.log('Success! No duplicates found in any word arrays.');
  console.log('All word collections have been properly deduplicated.');
} else {
  console.log('\nDuplicates found! Check the output above for details.');
} 