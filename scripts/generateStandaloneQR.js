#!/usr/bin/env node

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Generate challenge URL with proper hash
function generateChallengeUrl(
  startWord,
  targetWord,
  theme = "summer-vibes",
  baseUrl = "https://synapse.game",
) {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const hash = generateUrlHash(data);
  return `${baseUrl}/challenge?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&theme=${encodeURIComponent(theme)}&hash=${hash}`;
}

// Generate QR code as PNG file
async function generateQRPNG(url, filename, size = 300) {
  const outputPath = path.join(__dirname, "qr_codes", `${filename}.png`);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await QRCode.toFile(outputPath, url, {
    width: size,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return outputPath;
}

// Generate QR code as SVG
async function generateQRSVG(url, filename, size = 300) {
  const outputPath = path.join(__dirname, "qr_codes", `${filename}.svg`);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svg = await QRCode.toString(url, {
    type: "svg",
    width: size,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  fs.writeFileSync(outputPath, svg);
  return outputPath;
}

// Generate QR code as Data URL (for embedding)
async function generateQRDataURL(url, size = 300) {
  return await QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "Usage: node generateStandaloneQR.js <startWord> <targetWord> [theme] [format] [size]",
    );
    console.log("");
    console.log("Examples:");
    console.log("  node generateStandaloneQR.js music memory");
    console.log(
      "  node generateStandaloneQR.js star infinite summer-vibes png 400",
    );
    console.log("  node generateStandaloneQR.js guitar story summer-vibes svg");
    console.log("");
    console.log("Formats: png, svg, dataurl");
    process.exit(1);
  }

  const startWord = args[0];
  const targetWord = args[1];
  const theme = args[2] || "summer-vibes";
  const format = args[3] || "png";
  const size = parseInt(args[4]) || 300;

  try {
    // Generate the challenge URL
    const url = generateChallengeUrl(startWord, targetWord, theme);
    const filename = `${startWord}-${targetWord}-${theme}`;

    console.log(`🎮 Challenge: ${startWord} → ${targetWord}`);
    console.log(`🏷️  Theme: ${theme}`);
    console.log(`🔗 URL: ${url}`);
    console.log("");

    if (format === "png") {
      const outputPath = await generateQRPNG(url, filename, size);
      console.log(`🖼️  PNG QR Code: ${outputPath}`);
    } else if (format === "svg") {
      const outputPath = await generateQRSVG(url, filename, size);
      console.log(`📄 SVG QR Code: ${outputPath}`);
    } else if (format === "dataurl") {
      const dataUrl = await generateQRDataURL(url, size);
      console.log(`📋 Data URL:`);
      console.log(dataUrl);
    } else {
      console.log("❌ Invalid format. Use: png, svg, or dataurl");
      process.exit(1);
    }

    console.log("");
    console.log("✅ QR code generated successfully!");
  } catch (error) {
    console.error("❌ Error generating QR code:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
