// Enhanced Netlify function for generating preview images

// Generate SVG graph visualization from decoded data
function generateGraphVisualization(decodedData, colors, playerPath) {
  const { pathQuality, coordinates } = decodedData;
  
  if (!coordinates || coordinates.length === 0 || !pathQuality || !playerPath) {
    return "";
  }

  // Calculate bounds and scaling
  const minX = Math.min(...coordinates.map(c => c.x));
  const maxX = Math.max(...coordinates.map(c => c.x));
  const minY = Math.min(...coordinates.map(c => c.y));
  const maxY = Math.max(...coordinates.map(c => c.y));
  
  const graphWidth = 500; // Available width for graph
  const graphHeight = 300; // Available height for graph
  const padding = 60; // More padding for labels
  
  const scaleX = (graphWidth - 2 * padding) / (maxX - minX);
  const scaleY = (graphHeight - 2 * padding) / (maxY - minY);
  const scale = Math.min(scaleX, scaleY); // Use uniform scaling
  
  // Transform coordinates to SVG space
  const transformedCoords = coordinates.map(coord => ({
    x: padding + (coord.x - minX) * scale,
    y: padding + (coord.y - minY) * scale
  }));

  let svg = "";
  
  // Draw path links first (so they appear behind nodes)
  for (let i = 0; i < transformedCoords.length - 1; i++) {
    const curr = transformedCoords[i];
    const next = transformedCoords[i + 1];
    
    svg += `<line x1="${curr.x}" y1="${curr.y}" x2="${next.x}" y2="${next.y}" 
                  stroke="${colors.pathLink}" stroke-width="3" stroke-opacity="0.8"/>`;
  }
  
  // Draw nodes with labels
  for (let i = 0; i < transformedCoords.length; i++) {
    const coord = transformedCoords[i];
    const qualityChar = pathQuality[i];
    const word = playerPath[i];
    
    let nodeColor = colors.normalNode;
    let nodeRadius = 6;
    
    // Determine node color based on quality
    switch (qualityChar) {
      case 'S': // Start
        nodeColor = colors.startNode;
        nodeRadius = 8;
        break;
      case 'T': // Target
        nodeColor = colors.endNode;
        nodeRadius = 8;
        break;
      case 'C': // Current
        nodeColor = colors.currentNode;
        nodeRadius = 8;
        break;
      case 'G': // Global optimal
        nodeColor = colors.globalOptimalNode;
        break;
      case 'L': // Local optimal
        nodeColor = colors.localOptimalNode;
        break;
      case 'R': // Remaining path
        nodeColor = colors.pathNode;
        break;
      default: // Normal
        nodeColor = colors.pathNode;
        break;
    }
    
    // Draw node
    svg += `<circle cx="${coord.x}" cy="${coord.y}" r="${nodeRadius}" 
                    fill="${nodeColor}" stroke="#333" stroke-width="0.5"/>`;
    
    // Draw word label
    const fontSize = 12;
    svg += `<text x="${coord.x}" y="${coord.y + nodeRadius + fontSize + 4}" 
                  font-family="Arial, sans-serif" font-size="${fontSize}" 
                  fill="${colors.text}" text-anchor="middle" font-weight="bold">${word}</text>`;
  }
  
  return svg;
}

// Generate the challenge URL for QR code
function generateChallengeUrl(params) {
  const { startWord, targetWord, type, date, share, theme } = params;
  
  // Build URL parameters for the new structure
  const urlParams = new URLSearchParams();
  urlParams.set("type", type);
  urlParams.set("start", startWord);
  urlParams.set("target", targetWord);
  
  if (share) urlParams.set("share", share);
  if (theme) urlParams.set("theme", theme);
  if (date && type === "dailychallenge") urlParams.set("date", date);
  
  return `https://synapsegame.ai/challenge?${urlParams.toString()}`;
}

// Simple hash function (matching SharingService.ts)
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

// Generate QR code as SVG using proper QR code algorithm
function generateQRCodeSVG(text, size = 100) {
  // For now, use a more sophisticated pattern that resembles a real QR code
  // In production, you'd want to use a proper QR code library like 'qrcode' npm package
  
  const moduleSize = size / 25; // 25x25 grid for better appearance
  let svg = "";
  
  // Create a deterministic pattern based on the URL
  const hash = generateUrlHash(text);
  let seed = parseInt(hash, 36);
  
  // Simple Linear Congruential Generator for deterministic randomness
  function nextRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      let shouldFill = false;
      
      // Add finder patterns (3 corners)
      const isTopLeftFinder = i < 7 && j < 7;
      const isTopRightFinder = i < 7 && j > 17;
      const isBottomLeftFinder = i > 17 && j < 7;
      
      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        // Finder pattern structure
        const fi = isTopLeftFinder ? i : isTopRightFinder ? i : (i - 18);
        const fj = isTopLeftFinder ? j : isTopRightFinder ? (j - 18) : j;
        
        shouldFill = (fi === 0 || fi === 6 || fj === 0 || fj === 6) ||
                     (fi >= 2 && fi <= 4 && fj >= 2 && fj <= 4);
      } else {
        // Data area - use deterministic pattern
        shouldFill = nextRandom() > 0.5;
      }
      
      if (shouldFill) {
        svg += `<rect x="${j * moduleSize}" y="${i * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  return svg;
}

// Simple canvas-like implementation for generating SVG
function generateSVGPreview(params) {
  const { startWord, targetWord, type, date, isDaily, theme, share } = params;

  // Theme colors
  const colors = {
    background: theme === "dark" ? "#1a1a1a" : "#6750A4",
    text: theme === "dark" ? "#ffffff" : "#ffffff",
    accent: theme === "dark" ? "#bb86fc" : "#ffd3b6",
    secondary: theme === "dark" ? "#03dac6" : "#ffaaa5",
    
    // Node colors (matching the app's dark theme)
    startNode: "#4CAF50",
    endNode: "#F44336", 
    currentNode: "#2196F3",
    pathNode: "#9C27B0",
    globalOptimalNode: "#FF9800",
    localOptimalNode: "#9C27B0",
    normalNode: "#9E9E9E",
    pathLink: "#9C27B0"
  };

  const title = isDaily ? `Daily Challenge - ${date}` : "Word Challenge";
  const subtitle = "Can you solve this?";

  // Decode enhanced share data if available
  let decodedData = null;
  let playerPath = null;
  if (share) {
    try {
      decodedData = decodeEnhancedShareData(share);
      
      // Extract words from decoded data if available
      if (decodedData.words && decodedData.words.length > 0) {
        playerPath = decodedData.words;
      } else {
        // Fallback: create path based on coordinate count
        if (decodedData.coordinates.length > 2) {
          const pathLength = decodedData.coordinates.length;
          playerPath = [startWord];
          
          // Add placeholder intermediate words
          for (let i = 1; i < pathLength - 1; i++) {
            playerPath.push(`step${i}`);
          }
          
          playerPath.push(targetWord);
        } else {
          // Simple 2-word path
          playerPath = [startWord, targetWord];
        }
      }
    } catch (error) {
      console.log("Could not decode share data:", error);
    }
  }

  // Generate graph visualization if we have decoded data
  let graphSVG = "";
  if (decodedData && decodedData.coordinates.length > 0 && playerPath) {
    graphSVG = generateGraphVisualization(decodedData, colors, playerPath);
  }

  // Generate the challenge URL for QR code
  const challengeUrl = generateChallengeUrl(params);
  const qrCodeSVG = generateQRCodeSVG(challengeUrl, 100);

  return `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.background}cc;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  
  <!-- Brand header -->
  <text x="60" y="80" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${colors.text}">🧠 Synapse</text>
  <text x="60" y="120" font-family="Arial, sans-serif" font-size="24" fill="${colors.accent}">${title}</text>
  
  ${graphSVG ? `
  <!-- Graph visualization -->
  <g transform="translate(60, 150)">
    ${graphSVG}
  </g>
  ` : `
  <!-- Challenge words (fallback when no graph data) -->
  <text x="60" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${colors.text}">${startWord}</text>
  <text x="60" y="260" font-family="Arial, sans-serif" font-size="36" fill="${colors.accent}">↓</text>
  <text x="60" y="320" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${colors.text}">${targetWord}</text>
  <text x="60" y="380" font-family="Arial, sans-serif" font-size="28" fill="${colors.secondary}">${subtitle}</text>
  `}
  
  <!-- QR Code -->
  <g transform="translate(1000, 350)">
    <rect width="120" height="120" fill="${colors.text}" opacity="0.9" rx="8"/>
    <g transform="translate(10, 10)">
      ${qrCodeSVG}
    </g>
  </g>
  
  <!-- Footer -->
  <text x="60" y="520" font-family="Arial, sans-serif" font-size="20" fill="${colors.accent}">synapsegame.ai</text>
  <text x="60" y="550" font-family="Arial, sans-serif" font-size="16" fill="${colors.secondary}">Build semantic pathways between words</text>
</svg>`;
}

// Decode enhanced share data (matching SharingService.ts)
function decodeEnhancedShareData(encodedData) {
  if (!encodedData || encodedData.length === 0) {
    return { pathQuality: "", coordinates: [] };
  }

  try {
    // Split the encoded data into quality and coordinates parts
    const parts = encodedData.split('&');
    let qualityPart = "";
    let coordinatesPart = "";

    for (const part of parts) {
      if (part.startsWith('quality=')) {
        qualityPart = part.substring(8); // Remove 'quality='
      } else if (part.startsWith('tsne=')) {
        coordinatesPart = part.substring(5); // Remove 'tsne='
      }
    }

    // Decode quality (simple string)
    const pathQuality = qualityPart;

         // Decode coordinates
     const coordinates = [];
     if (coordinatesPart) {
       const coordPairs = coordinatesPart.split(';');
       
       for (const pair of coordPairs) {
         if (pair.trim()) {
           const [xStr, yStr] = pair.split(',');
           
           // Decode the base-36 coordinates and scale back
           const x = parseInt(xStr, 36) / 10.0; // Scale back from integer
           const y = parseInt(yStr, 36) / 10.0;
           
           coordinates.push({ x, y });
         }
       }
     }

     // Decode word list
     let words = null;
     for (const part of parts) {
       if (part.startsWith('words=')) {
         try {
           const wordsData = decodeURIComponent(part.substring(6));
           words = wordsData.split(',').filter(word => word.trim().length > 0);
         } catch (error) {
           console.error("Error decoding words:", error);
         }
         break;
       }
     }

     return { pathQuality, coordinates, words };
  } catch (error) {
    console.error("Error decoding enhanced share data:", error);
    return { pathQuality: "", coordinates: [] };
  }
}

exports.handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    
    // Parse the new URL structure parameters
    const type = url.searchParams.get("type"); // "challenge" or "dailychallenge"
    const startWord = url.searchParams.get("start");
    const targetWord = url.searchParams.get("target");
    const share = url.searchParams.get("share"); // security hash
    const quality = url.searchParams.get("quality"); // path quality encoding
    const tsne = url.searchParams.get("tsne"); // coordinate encoding
    const theme = url.searchParams.get("theme");
    const date = url.searchParams.get("date"); // for daily challenges

    // Validate required parameters
    if (!type || !startWord || !targetWord) {
      return {
        statusCode: 400,
        body: "Missing required parameters: type, start, target"
      };
    }

    // Determine if it's a daily challenge
    const isDaily = type === "dailychallenge";
    
    // For daily challenges, we need the date
    if (isDaily && !date) {
      return {
        statusCode: 400,
        body: "Missing required parameter for daily challenge: date"
      };
    }

    // Build enhanced share data for graph generation
    let enhancedShare = "";
    if (quality && tsne) {
      enhancedShare = `quality=${quality}&tsne=${tsne}`;
    }

    // Generate the preview image
    const svgContent = generateSVGPreview({
      startWord,
      targetWord,
      type,
      date,
      theme: theme || "dark",
      share: enhancedShare,
      isDaily,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600"
      },
      body: svgContent
    };
  } catch (error) {
    console.error("Preview generation error:", error);
    return {
      statusCode: 500,
      body: "Error generating preview"
    };
  }
};
