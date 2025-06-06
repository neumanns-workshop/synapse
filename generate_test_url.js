#!/usr/bin/env node

// Simple hash function for URL validation (matches the one in SharingService.ts)
const generateUrlHash = (data) => {
  let hash = 0;
  const secret = "synapse_challenge_2024"; // Simple secret salt
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 8); // 8-character hash
};

// Generate secure game deep link
const generateSecureGameDeepLink = (startWord, targetWord) => {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);
  const origin = "http://localhost:8081";
  return `${origin}/challenge?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&hash=${hash}`;
};

// Generate secure daily challenge deep link
const generateSecureDailyChallengeDeepLink = (
  challengeId,
  startWord,
  targetWord,
) => {
  const data = `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);
  const origin = "http://localhost:8081";
  return `${origin}/dailychallenge?id=${encodeURIComponent(challengeId)}&start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&hash=${hash}`;
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("Usage:");
  console.log("  node generate_test_url.js <startWord> <targetWord>");
  console.log(
    "  node generate_test_url.js <challengeId> <startWord> <targetWord>",
  );
  console.log("");
  console.log("Examples:");
  console.log("  node generate_test_url.js intersect undoubtedly");
  console.log("  node generate_test_url.js 2025-06-04 attitude ensue");
  process.exit(1);
}

if (args.length === 2) {
  // Regular challenge
  const [startWord, targetWord] = args;
  const url = generateSecureGameDeepLink(startWord, targetWord);
  console.log("✅ Valid challenge URL:");
  console.log(url);
} else if (args.length === 3) {
  // Daily challenge
  const [challengeId, startWord, targetWord] = args;
  const url = generateSecureDailyChallengeDeepLink(
    challengeId,
    startWord,
    targetWord,
  );
  console.log("✅ Valid daily challenge URL:");
  console.log(url);
} else {
  console.log("❌ Invalid number of arguments");
  process.exit(1);
}
