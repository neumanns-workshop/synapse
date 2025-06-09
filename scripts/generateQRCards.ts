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

// Generate HTML for printable QR cards
function generateCardsHTML(challengeData: ChallengeData): string {
  const allChallenges = challengeData.themes.flatMap(t => t.challenges);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synapse Summer Vibes QR Cards - Print Ready</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
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
        
        .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .card {
            width: 350px;
            height: 200px;
            background: 
                radial-gradient(circle at 20% 80%, rgba(255, 246, 163, 0.45) 0%, transparent 60%),
                radial-gradient(circle at 80% 20%, rgba(255, 238, 119, 0.35) 0%, transparent 60%),
                linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            color: #2a2a1a;
            border: 2px solid rgba(255, 246, 163, 0.5);
            border-radius: 12px;
            padding: 16px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            page-break-inside: avoid;
            margin: 0 auto;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .challenge-title {
            flex: 1;
        }
        
        .word-pair {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 4px 0;
            line-height: 1.1;
            letter-spacing: 0.5px;
        }
        
        .theme-subtitle {
            font-size: 12px;
            font-weight: 500;
            opacity: 0.9;
            margin: 0;
        }
        
        .qr-container {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 8px;
            padding: 4px;
            margin-left: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .qr-code {
            width: 72px;
            height: 72px;
        }
        
        .challenge-description {
            font-size: 11px;
            opacity: 0.9;
            margin: 6px 0 0 0;
            line-height: 1.3;
        }
        
        .card-footer {
            position: absolute;
            bottom: 16px;
            left: 16px;
            right: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .difficulty {
            font-size: 11px;
            font-weight: 600;
            opacity: 0.9;
        }
        
        .branding {
            font-size: 12px;
            font-weight: 700;
            opacity: 0.9;
        }
        
        .instructions {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        @media print {
            body { background: white; }
            .instructions { display: none; }
            .card-grid { 
                grid-template-columns: repeat(2, 1fr);
                page-break-inside: avoid;
            }
            .card { 
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="print-container">
        <div class="instructions">
            <h1>🌞 Synapse Summer Vibes QR Cards</h1>
            <p><strong>Generated:</strong> ${challengeData.generatedAt}</p>
            <p><strong>Total Cards:</strong> ${challengeData.totalChallenges}</p>
            <p><strong>Theme:</strong> ${challengeData.description}</p>
            <p><strong>Instructions:</strong> Print on cardstock, cut along margins, and place in coffee shops, bookstores, and coworking spaces across OKC and Santa Fe!</p>
        </div>
        
        <div class="card-grid">
            ${allChallenges.map((challenge, index) => `
                <div class="card" data-url="${challenge.url}">
                    <div class="card-header">
                        <div class="challenge-title">
                            <div class="word-pair">${challenge.startWord} → ${challenge.targetWord}</div>
                            <div class="theme-subtitle">Summer Vibes Challenge</div>
                        </div>
                        <div class="qr-container">
                            <canvas class="qr-code" id="qr-${index}"></canvas>
                        </div>
                    </div>
                    
                    <div class="challenge-description">
                        ${challenge.description}
                    </div>
                    
                    <div class="card-footer">
                        <div class="difficulty">${challenge.optimalPathLength} moves optimal</div>
                        <div class="branding">synapse.game</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        // Generate QR codes for each card
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card');
            cards.forEach((card, index) => {
                const url = card.dataset.url;
                const canvas = document.getElementById('qr-' + index);
                QRCode.toCanvas(canvas, url, {
                    width: 72,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });
            });
        });
    </script>
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
    
    // Generate HTML
    const html = generateCardsHTML(challengeData);
    
    // Save HTML file
    const outputPath = path.join(__dirname, 'summer-vibes-qr-cards.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(`\n🎨 Generated QR cards HTML!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🖨️  Open in browser and print to create physical cards`);
    console.log(`📍 Ready for guerrilla marketing in OKC → Santa Fe!`);
    
  } catch (error) {
    console.error('❌ Error generating QR cards:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 