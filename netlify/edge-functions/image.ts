// Netlify Edge Function for generating challenge preview images
// Uses Canvas API to create graph visualization + QR code

interface Context {
  site?: {
    id: string;
    name: string;
    url: string;
  };
}

// Simple graph layout algorithm
interface Node {
  word: string;
  x: number;
  y: number;
  isPath?: boolean;
  isStart?: boolean;
  isTarget?: boolean;
}

interface Edge {
  from: string;
  to: string;
  isPath?: boolean;
}

// Generate a simple word path for visualization
const generateWordPath = (startWord: string, targetWord: string): { nodes: Node[], edges: Edge[] } => {
  // For now, create a simple 3-step path
  // In a real implementation, this would use your word embedding logic
  const intermediateWords = [
    "step1", // Placeholder - in real app this would be semantic
    "step2"
  ];
  
  const allWords = [startWord, ...intermediateWords, targetWord];
  const nodes: Node[] = allWords.map((word, index) => ({
    word,
    x: 50 + (index * 150), // Horizontal layout
    y: 150 + Math.sin(index * 0.5) * 50, // Slight curve
    isPath: true,
    isStart: index === 0,
    isTarget: index === allWords.length - 1
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < allWords.length - 1; i++) {
    edges.push({
      from: allWords[i],
      to: allWords[i + 1],
      isPath: true
    });
  }

  return { nodes, edges };
};

// Generate QR code as data URL
const generateQRCode = async (url: string): Promise<string> => {
  // Simple QR code generation - in production you'd use a proper QR library
  // For now, return a placeholder or use external service
  const size = 100;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=0`;
  
  try {
    const response = await fetch(qrApiUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('QR generation failed:', error);
    return '';
  }
};

// Generate SVG visualization
const generateChallengeSVG = async (
  startWord: string,
  targetWord: string,
  challengeUrl: string,
  width: number = 600,
  height: number = 400
): Promise<string> => {
  const { nodes, edges } = generateWordPath(startWord, targetWord);

  // Generate edges SVG
  const edgesSvg = edges.map(edge => {
    const fromNode = nodes.find(n => n.word === edge.from);
    const toNode = nodes.find(n => n.word === edge.to);
    if (fromNode && toNode) {
      return `<line x1="${fromNode.x}" y1="${fromNode.y}" x2="${toNode.x}" y2="${toNode.y}" stroke="#FFD3B6" stroke-width="3"/>`;
    }
    return '';
  }).join('');

  // Generate nodes SVG
  const nodesSvg = nodes.map(node => {
    const color = node.isStart ? '#90EEBB' : node.isTarget ? '#FF8787' : '#87CEEB';
    return `
      <circle cx="${node.x}" cy="${node.y}" r="25" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
      <text x="${node.x}" y="${node.y}" text-anchor="middle" dominant-baseline="central" fill="#000000" font-family="Arial" font-size="12" font-weight="bold">${node.word}</text>
    `;
  }).join('');

  // QR code placeholder (we'll embed it as an external image)
  const qrSize = 80;
  const qrX = width - qrSize - 20;
  const qrY = height - qrSize - 20;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(challengeUrl)}&format=png&margin=1`;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#1a1a1a"/>
      
      <!-- Title -->
      <text x="${width/2}" y="40" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="24" font-weight="bold">"${startWord}" → "${targetWord}"</text>
      
      <!-- Subtitle -->
      <text x="${width/2}" y="70" text-anchor="middle" fill="#CCCCCC" font-family="Arial" font-size="16">Synapse - Semantic Pathways</text>
      
      <!-- Edges -->
      ${edgesSvg}
      
      <!-- Nodes -->
      ${nodesSvg}
      
      <!-- QR Code Background -->
      <rect x="${qrX - 5}" y="${qrY - 5}" width="${qrSize + 10}" height="${qrSize + 10}" fill="#FFFFFF" rx="5"/>
      
      <!-- QR Code -->
      <image x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" href="${qrImageUrl}"/>
      
      <!-- QR Code Label -->
      <text x="${qrX + qrSize/2}" y="${qrY - 10}" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="12">Scan to Play</text>
    </svg>
  `;

  return svg;
};

// Main image generation function
export default async (request: Request, context: Context) => {
  try {
    const url = new URL(request.url);
    const startWord = url.searchParams.get('start') || 'start';
    const targetWord = url.searchParams.get('target') || 'end';
    const challengeUrl = url.searchParams.get('url') || `${url.origin}/challenge?start=${startWord}&target=${targetWord}`;

    // Generate SVG visualization
    const svg = await generateChallengeSVG(startWord, targetWord, challengeUrl);

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
    // Fallback: Return a simple text-based SVG
    const requestUrl = new URL(request.url);
    const fallbackSvg = `
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="400" fill="#1a1a1a"/>
        <text x="300" y="150" text-anchor="middle" fill="white" font-size="24" font-family="Arial">
          Synapse Challenge
        </text>
        <text x="300" y="200" text-anchor="middle" fill="#cccccc" font-size="18" font-family="Arial">
          ${requestUrl.searchParams.get('start') || 'start'} → ${requestUrl.searchParams.get('target') || 'end'}
        </text>
        <text x="300" y="250" text-anchor="middle" fill="#87CEEB" font-size="16" font-family="Arial">
          Semantic Pathways
        </text>
      </svg>
    `;

    return new Response(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}; 