#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface GraphNode {
  edges: { [word: string]: number };
  tsne?: [number, number];
  definition?: string;
}

interface GraphData {
  [word: string]: GraphNode;
}

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

interface Theme {
  theme: string;
  name: string;
  description: string;
  challenges: ThemedChallenge[];
}

interface ChallengeOutput {
  generatedAt: string;
  description: string;
  totalChallenges: number;
  themes: Theme[];
}

// Summer Vibes themed word clusters for OKC → Santa Fe road trip
const SUMMER_VIBES_CLUSTERS = {
  journey: {
    starters: ['road', 'path', 'route', 'way', 'journey', 'travel', 'drive', 'wander'],
    targets: ['freedom', 'adventure', 'discovery', 'wonder', 'horizon', 'endless', 'open'],
    descriptions: [
      'Highway to anywhere',
      'Road trip revelations', 
      'Miles become memories',
      'Following the open road',
      'Adventure calls from the horizon'
    ]
  },
  desert: {
    starters: ['desert', 'sand', 'heat', 'sun', 'mesa', 'adobe', 'cactus', 'dry'],
    targets: ['gold', 'treasure', 'ancient', 'mystery', 'silence', 'vast', 'eternal'],
    descriptions: [
      'Southwestern treasures under blazing sun',
      'Ancient secrets in the sand',
      'Heat mirages and hidden wonders',
      'Mesa top perspectives',
      'Desert wisdom waiting'
    ]
  },
  music: {
    starters: ['guitar', 'song', 'music', 'rhythm', 'melody', 'tune', 'voice'],
    targets: ['soul', 'heart', 'spirit', 'emotion', 'memory', 'story', 'magic'],
    descriptions: [
      'Music under starlit skies',
      'Guitar stories by the campfire',
      'Melodies that touch the heart',
      'Southwest sounds and spirits',
      'Songs that carry memories'
    ]
  },
  nature: {
    starters: ['star', 'sky', 'cloud', 'wind', 'tree', 'bird', 'mountain'],
    targets: ['navigation', 'guide', 'peace', 'calm', 'wisdom', 'perspective', 'infinite'],
    descriptions: [
      'Desert nights reveal celestial maps',
      'Stars guiding the journey',
      'Wind whispers ancient stories',
      'Mountain views show perspective',
      'Nature\'s eternal wisdom'
    ]
  },
  comfort: {
    starters: ['warm', 'cool', 'shade', 'rest', 'home', 'safe', 'shelter'],
    targets: ['comfort', 'peace', 'relief', 'sanctuary', 'oasis', 'haven', 'blessing'],
    descriptions: [
      'Relief found under desert trees',
      'Cool shade in blazing heat',
      'Finding comfort on the road',
      'Oasis moments in vast spaces',
      'Shelter from the summer sun'
    ]
  },
  joy: {
    starters: ['smile', 'laugh', 'joy', 'happy', 'bright', 'light', 'warm'],
    targets: ['sunshine', 'energy', 'life', 'medicine', 'healing', 'radiant', 'glowing'],
    descriptions: [
      'Inner light that rivals the sun',
      'Laughter echoing across canyons',
      'Joy radiating like desert sunshine',
      'Smiles warmer than summer heat',
      'Happiness flowing like light'
    ]
  }
};

// Path finding using Dijkstra's algorithm (matches game logic)
function findShortestPath(graphData: GraphData, start: string, end: string): string[] {
  if (!graphData[start] || !graphData[end]) {
    return [];
  }

  const distances: { [key: string]: number } = {};
  const previousNodes: { [key: string]: string | null } = {};
  const visited = new Set<string>();
  const unvisited = new Set<string>();

  // Initialize
  for (const word in graphData) {
    distances[word] = Infinity;
    previousNodes[word] = null;
    unvisited.add(word);
  }
  distances[start] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current: string | null = null;
    let minDistance = Infinity;
    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    }

    if (!current || distances[current] === Infinity || current === end) {
      break;
    }

    unvisited.delete(current);
    visited.add(current);

    // Update distances for neighbors
    const edges = graphData[current].edges || {};
    for (const [neighbor, similarity] of Object.entries(edges)) {
      if (visited.has(neighbor)) continue;

      const cost = 1 - similarity;
      const distanceThroughCurrent = distances[current] + cost;

      if (distanceThroughCurrent < distances[neighbor]) {
        distances[neighbor] = distanceThroughCurrent;
        previousNodes[neighbor] = current;
      }
    }
  }

  // Reconstruct path
  if (distances[end] === Infinity) {
    return [];
  }

  const path: string[] = [];
  let current: string | null = end;
  while (current !== null) {
    path.unshift(current);
    current = previousNodes[current];
  }

  return path;
}

// Validate word pair against game constraints
function isValidPair(graphData: GraphData, start: string, target: string): boolean {
  const MIN_PATH_LENGTH = 4;
  const MAX_PATH_LENGTH = 9;
  const MIN_NODE_DEGREE = 2;
  const MIN_TSNE_DISTANCE_SQUARED = 30 * 30;

  // Check if words exist
  if (!graphData[start] || !graphData[target]) {
    return false;
  }

  // Check node degrees
  const startDegree = Object.keys(graphData[start].edges || {}).length;
  const targetDegree = Object.keys(graphData[target].edges || {}).length;
  if (startDegree < MIN_NODE_DEGREE || targetDegree < MIN_NODE_DEGREE) {
    return false;
  }

  // Check t-SNE distance
  const startTsne = graphData[start].tsne;
  const targetTsne = graphData[target].tsne;
  if (startTsne && targetTsne) {
    const dx = startTsne[0] - targetTsne[0];
    const dy = startTsne[1] - targetTsne[1];
    const distSquared = dx * dx + dy * dy;
    if (distSquared < MIN_TSNE_DISTANCE_SQUARED) {
      return false;
    }
  }

  // Check path length
  const path = findShortestPath(graphData, start, target);
  if (path.length < MIN_PATH_LENGTH || path.length > MAX_PATH_LENGTH) {
    return false;
  }

  return true;
}

// Generate secure challenge URL with hash (matches SharingService.ts)
function generateChallengeUrl(start: string, target: string, theme: string): { url: string; hash: string } {
  const data = `${start.toLowerCase()}:${target.toLowerCase()}`;
  const hash = generateUrlHash(data);
  const url = `https://synapse.game/challenge?start=${start}&target=${target}&theme=${theme}&hash=${hash}`;
  return { url, hash };
}

// Hash function matching SharingService.ts
function generateUrlHash(data: string): string {
  let hash = 0;
  const secret = "synapse_challenge_2025"; // Simple secret salt
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 8); // 8-character hash
}

// Generate themed challenges
function generateThemedChallenges(
  graphData: GraphData, 
  themeName: string = 'summer-vibes',
  targetCount: number = 50
): ChallengeOutput {
  const challenges: ThemedChallenge[] = [];
  const clusters = SUMMER_VIBES_CLUSTERS;
  
  let attempts = 0;
  const maxAttempts = targetCount * 10;

  while (challenges.length < targetCount && attempts < maxAttempts) {
    attempts++;
    
    // Pick random cluster
    const clusterNames = Object.keys(clusters);
    const randomCluster = clusters[clusterNames[Math.floor(Math.random() * clusterNames.length)]];
    
    // Pick random start and target words
    const startWord = randomCluster.starters[Math.floor(Math.random() * randomCluster.starters.length)];
    const targetWord = randomCluster.targets[Math.floor(Math.random() * randomCluster.targets.length)];
    
    // Skip if same word
    if (startWord === targetWord) continue;
    
    // Skip if already generated this pair
    if (challenges.some(c => c.startWord === startWord && c.targetWord === targetWord)) {
      continue;
    }
    
    // Validate pair
    if (!isValidPair(graphData, startWord, targetWord)) {
      continue;
    }
    
    // Calculate optimal path length
    const path = findShortestPath(graphData, startWord, targetWord);
    const optimalPathLength = path.length - 1; // moves = nodes - 1
    
    // Generate URL and hash
    const { url, hash } = generateChallengeUrl(startWord, targetWord, themeName);
    
    // Pick random description
    const description = randomCluster.descriptions[Math.floor(Math.random() * randomCluster.descriptions.length)];
    
    // Create challenge
    const challenge: ThemedChallenge = {
      id: `${themeName}_${startWord}_${targetWord}_${Date.now()}`,
      startWord,
      targetWord,
      optimalPathLength,
      theme: themeName,
      description,
      url,
      hash
    };
    
    challenges.push(challenge);
    console.log(`✓ Generated: ${startWord} → ${targetWord} (${optimalPathLength} moves)`);
  }
  
  return {
    generatedAt: new Date().toISOString(),
    description: "Themed challenges for guerrilla marketing QR codes - OKC to Santa Fe summer road trip",
    totalChallenges: challenges.length,
    themes: [{
      theme: themeName,
      name: "Summer Vibes",
      description: "Chase the sun on endless summer adventures from OKC to Santa Fe",
      challenges
    }]
  };
}

// Main execution
async function main() {
  try {
    // Load graph data
    const graphPath = path.join(__dirname, '..', 'src', 'data', 'graph.json');
    console.log('Loading graph data from:', graphPath);
    
    if (!fs.existsSync(graphPath)) {
      throw new Error(`Graph file not found at ${graphPath}`);
    }
    
    const rawGraphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    
    // Handle nested structure (extract nodes if present)
    const graphData: GraphData = rawGraphData.nodes || rawGraphData;
    console.log(`Loaded graph with ${Object.keys(graphData).length} words`);
    
    // Generate challenges
    console.log('\nGenerating summer vibes challenges...');
    const output = generateThemedChallenges(graphData, 'summer-vibes', 50);
    
    // Save output
    const outputPath = path.join(__dirname, 'themed_challenges', 'summer-vibes-okc-santa-fe.json');
    
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\n🎉 Generated ${output.totalChallenges} challenges!`);
    console.log(`💾 Saved to: ${outputPath}`);
    console.log(`🎯 Success rate: ${((output.totalChallenges / 500) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error generating challenges:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 