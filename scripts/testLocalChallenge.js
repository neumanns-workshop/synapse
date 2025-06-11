#!/usr/bin/env node

// Simple hash function for URL validation (matches the one in SharingService.ts)
const generateUrlHash = (data) => {
  let hash = 0;
  const secret = "synapse_challenge_2025"; // Simple secret salt
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 8); // 8-character hash
};

// Generate localhost challenge URL
const generateLocalhostChallengeUrl = (
  startWord,
  targetWord,
  theme = "summer-vibes",
) => {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);
  const origin = "http://192.168.0.14:19006";
  return `${origin}/challenge?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&theme=${encodeURIComponent(theme)}&hash=${hash}`;
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(
    "Usage: node testLocalChallenge.js <startWord> <targetWord> [theme]",
  );
  console.log("");
  console.log("Examples:");
  console.log("  node testLocalChallenge.js music memory");
  console.log("  node testLocalChallenge.js star infinite summer-vibes");
  console.log("");
  console.log("Or try one of these summer-vibes challenges:");
  console.log("  node testLocalChallenge.js music memory");
  console.log("  node testLocalChallenge.js star infinite");
  console.log("  node testLocalChallenge.js guitar story");
  process.exit(1);
}

const startWord = args[0];
const targetWord = args[1];
const theme = args[2] || "summer-vibes";

const url = generateLocalhostChallengeUrl(startWord, targetWord, theme);

console.log(`🎮 Testing themed challenge: ${startWord} → ${targetWord}`);
console.log(`🏷️ Theme: ${theme}`);
console.log(`🔗 URL: ${url}`);
console.log("");
console.log("Copy this URL into your browser while the dev server is running!");
