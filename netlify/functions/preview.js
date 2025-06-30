// Simple canvas-like implementation for generating SVG
function generateSVGPreview(params) {
  const { startWord, targetWord, moves, isDaily, theme } = params;

  // Theme colors
  const colors = {
    background: theme === "dark" ? "#1a1a1a" : "#6750A4",
    text: theme === "dark" ? "#ffffff" : "#ffffff",
    accent: theme === "dark" ? "#bb86fc" : "#ffd3b6",
    secondary: theme === "dark" ? "#03dac6" : "#ffaaa5",
  };

  const title = isDaily ? "Daily Challenge" : "Word Challenge";
  const subtitle = moves ? `Solved in ${moves} moves!` : "Can you solve this?";

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
  
  <!-- Challenge words -->
  <text x="60" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${colors.text}">${startWord}</text>
  <text x="60" y="260" font-family="Arial, sans-serif" font-size="36" fill="${colors.accent}">↓</text>
  <text x="60" y="320" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${colors.text}">${targetWord}</text>
  
  <!-- Subtitle -->
  <text x="60" y="380" font-family="Arial, sans-serif" font-size="28" fill="${colors.secondary}">${subtitle}</text>
  
  <!-- QR Code placeholder -->
  <rect x="850" y="350" width="120" height="120" fill="${colors.text}" opacity="0.9" rx="8"/>
  <text x="910" y="420" font-family="Arial, sans-serif" font-size="16" fill="${colors.background}" text-anchor="middle">QR</text>
  
  <!-- Footer -->
  <text x="60" y="520" font-family="Arial, sans-serif" font-size="20" fill="${colors.accent}">synapsegame.ai</text>
  <text x="60" y="550" font-family="Arial, sans-serif" font-size="16" fill="${colors.secondary}">Build semantic pathways between words</text>
</svg>`;
}

exports.handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { start, target, share, id, theme } = params;

    // Validate required parameters
    if (!start || !target) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Missing required parameters: start, target",
        }),
      };
    }

    // Parse moves from encoded share data if available
    let moves;
    if (share) {
      try {
        // Simple extraction - in a real implementation, you'd properly decode the game report
        const decodedLength = share.length; // Approximate moves based on encoding
        moves = Math.max(1, Math.floor(decodedLength / 2)).toString();
      } catch (e) {
        // Ignore decoding errors
      }
    }

    // Generate SVG
    const svg = generateSVGPreview({
      startWord: start,
      targetWord: target,
      moves,
      isDaily: !!id,
      theme,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
      body: svg,
    };
  } catch (error) {
    console.error("Error generating preview:", error);

    // Return a basic fallback SVG
    const fallbackSVG = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#6750A4"/>
  <text x="60" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">🧠 Synapse</text>
  <text x="60" y="300" font-family="Arial, sans-serif" font-size="32" fill="#ffd3b6">Word Challenge</text>
  <text x="60" y="400" font-family="Arial, sans-serif" font-size="24" fill="white">synapsegame.ai</text>
</svg>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
      body: fallbackSVG,
    };
  }
};
