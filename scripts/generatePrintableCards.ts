#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ThemedChallenge {
  id: string;
  startWord: string;
  targetWord: string;
  optimalPathLength: number;
  theme: string;
  description: string;
  url: string;
  hash: string;
}

interface ChallengeData {
  generatedAt: string;
  description: string;
  totalChallenges: number;
  themes: Array<{
    theme: string;
    name: string;
    description: string;
    challenges: ThemedChallenge[];
  }>;
}

// Generate QR code URL using API service
function getQRCodeImageUrl(data: string, size: number = 200): string {
  const encodedData = encodeURIComponent(data);
  // Using qr-server.com API - reliable and fast
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=png&margin=10`;
}

import { execSync } from 'child_process';

// Generate AI challenge using heuristic solver
function getAIChallenge(startWord: string, targetWord: string, optimalLength: number): string {
  try {
    // Call the heuristic solver with new CLI command
    const result = execSync(
      `python3 heuristic_solver.py --solve-pair "${startWord}" "${targetWord}"`,
      { encoding: 'utf8', cwd: __dirname }
    );
    
    const solverResult = JSON.parse(result.trim());
    if (solverResult.status === 'solved' && solverResult.steps > 0) {
      // Add 2-3 extra moves to make it more beatable
      const aiMoves = solverResult.steps + Math.floor(Math.random() * 2) + 2;
      return `The AI got it in ${aiMoves} moves,<br>can you do better?`;
    }
  } catch (error) {
    console.warn(`Heuristic solver failed for ${startWord} → ${targetWord}: ${error}, using fallback`);
  }
  
  // Fallback to adding 2-4 moves to optimal
  const aiMoves = optimalLength + Math.floor(Math.random() * 3) + 2;
  return `The AI got it in ${aiMoves} moves,<br>can you do better?`;
}

// Generate HTML for printable cards with API-based QR codes
function generatePrintableCardsHTML(challengeData: ChallengeData): string {
    const allChallenges = challengeData.themes.flatMap(t => t.challenges);
    
    // Deduplicate challenges to ensure no word appears twice
    function deduplicateChallenges(challenges: ThemedChallenge[]): ThemedChallenge[] {
        const usedWords = new Set<string>();
        const dedupedChallenges: ThemedChallenge[] = [];
        
        for (const challenge of challenges) {
            const startWord = challenge.startWord.toLowerCase();
            const targetWord = challenge.targetWord.toLowerCase();
            
            if (!usedWords.has(startWord) && !usedWords.has(targetWord)) {
                usedWords.add(startWord);
                usedWords.add(targetWord);
                dedupedChallenges.push(challenge);
            }
        }
        
        return dedupedChallenges;
    }
    
    const uniqueChallenges = deduplicateChallenges(allChallenges);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synapse Summer Vibes Cards - Print Ready</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Inter', sans-serif;
            background: #f8f9fa;
        }
        
        .print-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .instructions {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .card {
            width: 350px;
            height: 200px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: #e8e8e8;
            border-radius: 0;
            padding: 20px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            page-break-inside: avoid;
            margin: 0 auto;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .challenge-title {
            flex: 1;
        }
        
        .word-pair {
            font-size: 24px;
            font-weight: 800;
            margin: 0 0 6px 0;
            line-height: 1.2;
            letter-spacing: 0.5px;
        }
        
        .word-pair .arrow-line {
            display: block;
        }
        
        .start-word {
            color: #90EEBB;
            text-shadow: 0 0 3px rgba(144, 238, 187, 0.4);
        }
        
        .target-word {
            color: #FF8787;
            text-shadow: 0 0 3px rgba(255, 135, 135, 0.4);
        }
        
        .arrow {
            color: #888;
            margin: 0 8px;
        }
        
        .puzzle-number {
            font-size: 11px;
            font-weight: 500;
            color: #bbb;
            margin: 0 0 2px 0;
            letter-spacing: 0.3px;
        }
        
        .theme-name {
            font-size: 12px;
            font-weight: 600;
            background: linear-gradient(135deg, #C16C55 0%, #D4834A 50%, #C16C55 100%);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0 0 4px 0;
            letter-spacing: 1px;
        }
        
        .game-description {
            font-size: 11px;
            color: #aaa;
            margin: 0 0 4px 0;
            line-height: 1.4;
            max-width: 180px;
        }
        
        .ai-challenge {
            font-size: 10px;
            font-weight: 500;
            color: #FFD3B6;
            font-style: italic;
            margin: 0;
            line-height: 1.3;
            max-width: 180px;
        }
        
        .qr-container {
            width: 120px;
            margin-left: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        
        .scan-prompt {
            font-size: 9px;
            font-weight: 600;
            color: #bbb;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        
        .qr-image {
            width: 108px;
            height: 108px;
            border-radius: 4px;
            background: white;
            padding: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .qr-text {
            font-size: 10px;
            font-weight: 600;
            color: #aaa;
            text-align: center;
            line-height: 1.2;
        }
        
        .qr-logo {
            width: 20px;
            height: 20px;
        }
        
        .brand-section {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .card-footer {
            position: absolute;
            bottom: 16px;
            left: 16px;
            right: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .footer-left {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .difficulty {
            font-size: 11px;
            font-weight: 600;
            color: #aaa;
        }
        
        .ai-taunt {
            font-size: 10px;
            font-weight: 500;
            color: #FFD3B6;
            font-style: italic;
        }
        
        .branding {
            font-size: 11px;
            font-weight: 600;
            color: #aaa;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .logo {
            width: 28px;
            height: 28px;
            border-radius: 4px;
        }
        
        @media print {
            body { 
                background: white; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .instructions { display: none; }
            .card-grid { 
                grid-template-columns: repeat(2, 1fr);
                page-break-inside: avoid;
            }
            .card { 
                box-shadow: none;
                border: 1px solid #ddd;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        .print-hint {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="print-container">
        <div class="instructions">
            <h1>🌞 Synapse Summer Vibes Cards</h1>
            <p><strong>Generated:</strong> ${challengeData.generatedAt}</p>
            <p><strong>Total Cards:</strong> ${challengeData.totalChallenges}</p>
            <p><strong>Theme:</strong> ${challengeData.description}</p>
            
            <div class="print-hint">
                <strong>📖 Printing Instructions:</strong><br>
                1. Print on cardstock paper (recommended: 110-150gsm)<br>
                2. Use "Actual size" or "100%" scaling (no "fit to page")<br>
                3. Cut along card borders to create individual cards<br>
                4. Each card is 350×200px (business card size)<br>
                5. QR codes link directly to synapse.game challenges
            </div>
        </div>
        
        <div class="card-grid">
            ${uniqueChallenges.map((challenge, index) => {
                const themeData = challengeData.themes.find(t => t.theme === challenge.theme);
                const themeName = themeData?.name || challenge.theme;
                const challengesInTheme = uniqueChallenges.filter(c => c.theme === challenge.theme);
                const themeIndex = challengesInTheme.indexOf(challenge) + 1;
                const themeTotal = challengesInTheme.length;
                
                return `
                <div class="card">
                    <div class="card-header">
                        <div class="challenge-title">
                            <div class="word-pair">
                                <span class="start-word">${challenge.startWord} <span class="arrow">→</span></span>
                                <span class="arrow-line"><span class="target-word">${challenge.targetWord}</span></span>
                            </div>
                            <div class="theme-name">${themeName}</div>
                            <div class="puzzle-number">Puzzle ${themeIndex} of ${themeTotal}</div>
                            <div class="game-description">Build the shortest path using word connections</div>
                            <div class="ai-challenge">${getAIChallenge(challenge.startWord, challenge.targetWord, challenge.optimalPathLength)}</div>
                        </div>
                        <div class="qr-container">
                            <div class="scan-prompt">Scan to Play</div>
                            <img 
                                src="${getQRCodeImageUrl(challenge.url, 108)}" 
                                alt="QR Code for ${challenge.startWord} to ${challenge.targetWord}" 
                                class="qr-image"
                                onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=&quot;font-size:12px;text-align:center;line-height:108px;&quot;>QR</div>'"
                            />
                            <div class="brand-section">
                                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjYiIGN5PSI3IiByPSI0IiBmaWxsPSIjOTBFRUJCIi8+CjxjaXJjbGUgY3g9IjE1IiBjeT0iMTYiIHI9IjQiIGZpbGw9IiM4N0NFRUIiLz4KPGNpcmNsZSBjeD0iMTEiIGN5PSIyNyIgcj0iNCIgZmlsbD0iI0ZGODc4NyIvPgo8Y2lyY2xlIGN4PSI3IiBjeT0iNSIgcj0iNCIgZmlsbD0iI0ZGRUU3NyIvPgo8bGluZSB4MT0iMjIiIHkxPSI5IiB4Mj0iMTgiIHkyPSIxNCIgc3Ryb2tlPSIjRkZEM0I2IiBzdHJva2Utd2lkdGg9IjIuNSIvPgo8bGluZSB4MT0iMTQiIHkxPSIxOSIgeDI9IjEyIiB5Mj0iMjQiIHN0cm9rZT0iI0ZGRDNCNiIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KPGxpbmUgeDE9IjEwIiB5MT0iOCIgeDI9IjEzIiB5Mj0iMTMiIHN0cm9rZT0iI0ZGRDNCNiIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KPC9zdmc+" alt="Synapse logo" class="qr-logo">
                                <div class="qr-text">synapsegame.ai</div>
                            </div>
                        </div>
                    </div>

                </div>
            `}).join('')}
        </div>
        
        <div class="instructions">
            <h2>🎯 Guerrilla Marketing Strategy</h2>
            <p><strong>Target Locations:</strong> Coffee shops, bookstores, coworking spaces, university bulletin boards</p>
            <p><strong>Route:</strong> Oklahoma City → Santa Fe summer road trip</p>
            <p><strong>Placement Tips:</strong> Ask permission, choose high-traffic areas, include a few business cards per location</p>
        </div>
    </div>
</body>
</html>`;
}

// Main execution
async function main() {
  try {
    // Check for input file
    const inputPath = path.join(__dirname, 'themed_challenges', 'summer-vibes-okc-santa-fe.json');
    
    if (!fs.existsSync(inputPath)) {
      console.log('❌ Challenge data file not found. Run the challenge generator first:');
      console.log('   npm run generate-challenges');
      process.exit(1);
    }
    
    // Load challenge data
    const challengeData: ChallengeData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`📚 Loaded ${challengeData.totalChallenges} challenges`);
    
    // Check for duplicates before generating
    const allChallenges = challengeData.themes.flatMap(t => t.challenges);
    const allWords = allChallenges.flatMap(c => [c.startWord.toLowerCase(), c.targetWord.toLowerCase()]);
    const uniqueWords = new Set(allWords);
    const duplicateCount = allWords.length - uniqueWords.size;
    
    if (duplicateCount > 0) {
      console.log(`🔄 Found ${duplicateCount} duplicate word occurrences - deduplicating...`);
    }
    
    // Generate HTML
    const html = generatePrintableCardsHTML(challengeData);
    
    // Save HTML file
    const outputPath = path.join(__dirname, 'printable-cards.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(`\n🎨 Generated printable cards!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🖨️  Open in browser and print:`);
    console.log(`   • Use Chrome/Safari for best results`);
    console.log(`   • Print on cardstock paper`);
    console.log(`   • Select "More settings" → "Graphics" for color printing`);
    console.log(`   • QR codes use qr-server.com API (reliable image generation)`);
    console.log(`📍 Ready for OKC → Santa Fe guerrilla marketing!`);
    
  } catch (error) {
    console.error('❌ Error generating printable cards:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 