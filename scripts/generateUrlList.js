#!/usr/bin/env node

// Hash function matching SharingService.ts
function generateUrlHash(data) {
  let hash = 0;
  const secret = "synapse_challenge_2025";
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36).substring(0, 8);
}

// Generate challenge URL
function generateChallengeUrl(startWord, targetWord, theme = 'summer-vibes') {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);
  return `https://synapse.game/challenge?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&theme=${encodeURIComponent(theme)}&hash=${hash}`;
}

// Sample challenges for testing
const testChallenges = [
  ['music', 'memory'],
  ['star', 'infinite'],
  ['guitar', 'story'],
  ['bird', 'calm'],
  ['sun', 'eternal']
];

console.log('🎮 Synapse Challenge URLs for QR Code Generation');
console.log('='.repeat(60));
console.log();

testChallenges.forEach(([start, target], index) => {
  const url = generateChallengeUrl(start, target);
  console.log(`${index + 1}. ${start} → ${target}`);
  console.log(`   ${url}`);
  console.log();
});

console.log('📋 How to use:');
console.log('1. Copy any URL above');
console.log('2. Paste into any QR code generator (qr-code-generator.com, etc.)');
console.log('3. Download/print the QR code');
console.log('4. Test by scanning with your phone camera!');
console.log();
console.log('✅ These URLs use the exact same hash algorithm as your in-game QR codes.'); 