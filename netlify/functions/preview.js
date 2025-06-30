// Enhanced Netlify function for generating preview images with Puppeteer
// This function takes screenshots of the actual React components for perfect fidelity

const puppeteer = require("puppeteer");

// Server-side canvas rendering (more reliable than Puppeteer)
let Canvas;
try {
  Canvas = require("canvas");
} catch (e) {
  console.log("Canvas not available, will use SVG fallback");
}

// Fallback SVG generation for when Puppeteer fails
function generateFallbackPreview(params) {
  const { startWord, targetWord, type, date } = params;

  // Match the actual app colors and styling
  const colors = {
    background: "#6750A4", // Synapse brand purple
    surface: "#fff",
    text: "#fff",
    accent: "#ffd3b6",
    startNode: "#4CAF50",
    endNode: "#F44336",
    pathNode: "#9C27B0",
  };

  const title =
    type === "dailychallenge" ? `Daily Challenge - ${date}` : "Word Challenge";
  const subtitle = "Can you solve this?";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <!-- Background matching app theme -->
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.background};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.background};stop-opacity:0.9" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bgGradient)"/>
    
    <!-- Brand header matching app -->
    <text x="60" y="80" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${colors.text}">🧠 Synapse</text>
    <text x="60" y="120" font-family="Arial, sans-serif" font-size="24" fill="${colors.accent}">${title}</text>
    
    <!-- Challenge words with proper styling -->
    <text x="60" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${colors.text}">${startWord}</text>
    <text x="60" y="260" font-family="Arial, sans-serif" font-size="36" fill="${colors.accent}">→</text>
    <text x="60" y="320" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${colors.text}">${targetWord}</text>
    <text x="60" y="380" font-family="Arial, sans-serif" font-size="28" fill="${colors.accent}">${subtitle}</text>
    
    <!-- Graph visualization placeholder matching app style -->
    <g transform="translate(400, 150)">
      <!-- Start node -->
      <circle cx="50" cy="100" r="12" fill="${colors.startNode}" stroke="#333" stroke-width="1"/>
      <text x="50" y="130" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${colors.text}">${startWord}</text>
      
      <!-- Path line -->
      <line x1="62" y1="100" x2="288" y2="100" stroke="${colors.pathNode}" stroke-width="3" stroke-opacity="0.8"/>
      
      <!-- End node -->
      <circle cx="300" cy="100" r="12" fill="${colors.endNode}" stroke="#333" stroke-width="1"/>
      <text x="300" y="130" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="${colors.text}">${targetWord}</text>
    </g>
    
    <!-- QR code placeholder matching app -->
    <g transform="translate(1000, 400)">
      <rect width="120" height="120" fill="${colors.surface}" opacity="0.9" rx="8"/>
      <text x="60" y="70" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">QR</text>
    </g>
    
    <!-- Footer matching app -->
    <text x="60" y="520" font-family="Arial, sans-serif" font-size="20" fill="${colors.accent}">synapsegame.ai</text>
    <text x="60" y="550" font-family="Arial, sans-serif" font-size="16" fill="${colors.accent}">Build semantic pathways between words</text>
  </svg>`;
}

// Server-side canvas rendering - matches GraphVisualization component
function generateCanvasPreview(params) {
  const { startWord, targetWord, type, quality: _quality, tsne } = params;

  if (!Canvas) {
    throw new Error("Canvas not available");
  }

  // Create canvas matching preview dimensions
  const canvas = Canvas.createCanvas(1200, 630);
  const ctx = canvas.getContext("2d");

  // App colors matching theme
  const colors = {
    background: "#6750A4",
    surface: "#fff",
    text: "#fff",
    accent: "#FFD3B6",
    startNode: "#4CAF50",
    endNode: "#F44336",
    pathNode: "#9C27B0",
    connectionLine: "#666",
  };

  // Background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, 1200, 630);

  // Brand header
  ctx.fillStyle = colors.text;
  ctx.font = "bold 36px Arial";
  ctx.fillText("🧠 Synapse", 60, 80);

  ctx.fillStyle = colors.accent;
  ctx.font = "24px Arial";
  const title =
    type === "dailychallenge" ? "Daily Challenge" : "Word Challenge";
  ctx.fillText(title, 60, 120);

  // Challenge words
  ctx.fillStyle = colors.text;
  ctx.font = "bold 48px Arial";
  ctx.fillText(startWord, 60, 200);

  ctx.fillStyle = colors.accent;
  ctx.font = "36px Arial";
  ctx.fillText("→", 60, 260);

  ctx.fillStyle = colors.text;
  ctx.font = "bold 48px Arial";
  ctx.fillText(targetWord, 60, 320);

  // Graph visualization area (matching GraphVisualization layout)
  const graphX = 400;
  const graphY = 150;
  const graphWidth = 400;
  const graphHeight = 300;

  // Parse coordinates if available
  const coordinates = [];
  if (tsne) {
    const points = tsne.split(";");
    points.forEach((point) => {
      const [xStr, yStr] = point.split(",");
      if (xStr && yStr) {
        const x = parseInt(xStr, 36) / 10;
        const y = parseInt(yStr, 36) / 10;
        coordinates.push({ x, y });
      }
    });
  }

  if (coordinates.length > 1) {
    // Render actual path from coordinates
    ctx.save();
    ctx.translate(graphX, graphY);

    // Scale coordinates to fit graph area
    const padding = 40;
    const scaleX = (graphWidth - padding * 2) / 200; // Approximate coordinate range
    const scaleY = (graphHeight - padding * 2) / 200;

    // Draw connections
    ctx.strokeStyle = colors.connectionLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < coordinates.length - 1; i++) {
      const current = coordinates[i];
      const next = coordinates[i + 1];

      ctx.beginPath();
      ctx.moveTo(
        current.x * scaleX + padding,
        current.y * scaleY + padding + 100,
      );
      ctx.lineTo(next.x * scaleX + padding, next.y * scaleY + padding + 100);
      ctx.stroke();
    }

    // Draw path nodes
    ctx.setLineDash([]);
    coordinates.forEach((coord, i) => {
      const x = coord.x * scaleX + padding;
      const y = coord.y * scaleY + padding + 100;

      // Node color based on position
      if (i === 0) {
        ctx.fillStyle = colors.startNode;
      } else if (i === coordinates.length - 1) {
        ctx.fillStyle = colors.endNode;
      } else {
        ctx.fillStyle = colors.pathNode;
      }

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Node border
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.restore();
  } else {
    // Simple fallback visualization
    ctx.save();
    ctx.translate(graphX, graphY);

    // Start node
    ctx.fillStyle = colors.startNode;
    ctx.beginPath();
    ctx.arc(50, 150, 12, 0, 2 * Math.PI);
    ctx.fill();

    // Connection line
    ctx.strokeStyle = colors.pathNode;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(62, 150);
    ctx.lineTo(338, 150);
    ctx.stroke();

    // End node
    ctx.fillStyle = colors.endNode;
    ctx.beginPath();
    ctx.arc(350, 150, 12, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
  }

  // QR code placeholder (top right)
  const qrX = 1000;
  const qrY = 50;
  const qrSize = 120;

  ctx.fillStyle = colors.surface;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  ctx.globalAlpha = 1.0;

  ctx.fillStyle = "#333";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2 + 6);
  ctx.textAlign = "left";

  // Footer
  ctx.fillStyle = colors.accent;
  ctx.font = "20px Arial";
  ctx.fillText("synapsegame.ai", 60, 520);

  ctx.font = "16px Arial";
  ctx.fillText("Build semantic pathways between words", 60, 550);

  return canvas.toBuffer("image/png");
}

// Convert SVG to PNG buffer
async function svgToPngBuffer(svgContent) {
  try {
    const sharp = require("sharp");
    return await sharp(Buffer.from(svgContent)).png().toBuffer();
  } catch (error) {
    console.error("Sharp not available, using fallback");
    // If Sharp is not available, return the SVG as text
    return Buffer.from(svgContent);
  }
}

exports.handler = async (event) => {
  const startTime = Date.now();

  try {
    console.log("🎯 Preview function called:", event.rawUrl);

    const url = new URL(event.rawUrl);
    const params = new URLSearchParams(url.search);

    // Parse parameters
    const type = params.get("type");
    const startWord = params.get("start");
    const targetWord = params.get("target");
    const _date = params.get("date");
    const _quality = params.get("quality");
    const _tsne = params.get("tsne");
    const _share = params.get("share");
    const _theme = params.get("theme");

    // Validate required parameters
    if (!type || !startWord || !targetWord) {
      console.log("❌ Missing required parameters");
      return {
        statusCode: 400,
        body: "Missing required parameters: type, start, target",
      };
    }

    console.log(
      `🎯 Generating preview for: ${startWord} -> ${targetWord} (${type})`,
    );

    // Try canvas rendering first (most reliable)
    try {
      console.log("🎯 Attempting canvas rendering...");

      const canvasBuffer = generateCanvasPreview({
        startWord,
        targetWord,
        type,
        quality: _quality,
        tsne: _tsne,
        share: _share,
      });

      console.log("✅ Canvas rendering successful");

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
        body: canvasBuffer.toString("base64"),
        isBase64Encoded: true,
      };
    } catch (canvasError) {
      console.log(
        "❌ Canvas rendering failed, trying SVG fallback:",
        canvasError.message,
      );
    }

    // Fallback to React route
    const baseUrl = process.env.URL || "http://localhost:3000";
    const previewPageUrl = `${baseUrl}/preview-image?${params.toString()}`;

    console.log(`🎯 Preview page URL: ${previewPageUrl}`);

    // Launch Puppeteer with optimizations
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
      timeout: 30000,
    });

    console.log("🎯 Browser launched");

    const page = await browser.newPage();

    // Set viewport to match our preview container size
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2, // High DPI for better quality
    });

    // Set timeout for page load
    page.setDefaultTimeout(15000);

    console.log("🎯 Navigating to preview page...");

    // Add console logging from the page
    page.on("console", (msg) => {
      console.log(`🎯 Browser console [${msg.type()}]:`, msg.text());
    });

    page.on("pageerror", (error) => {
      console.error("🎯 Browser page error:", error.message);
    });

    // Navigate to preview page and wait for React to render
    await page.goto(previewPageUrl, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });

    console.log("🎯 Page loaded, waiting for React components...");

    // Wait for the specific preview container to render
    try {
      await page.waitForSelector('[data-testid="preview-container"]', {
        timeout: 10000,
      });
      console.log("🎯 Preview container found");
    } catch (e) {
      console.log("🎯 Preview container not found, waiting for any content...");
      await page.waitForSelector("body", { timeout: 5000 });
    }

    // Wait for SVG graph to render
    try {
      await page.waitForSelector("svg", { timeout: 8000 });
      console.log("🎯 SVG graph found");
    } catch (e) {
      console.log("🎯 SVG not found, continuing anyway...");
    }

    // Additional wait for full component rendering
    await page.waitForTimeout(3000);

    console.log("🎯 Taking screenshot...");

    // Take full page screenshot - let the preview page handle sizing
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      quality: 100,
    });

    await browser.close();

    console.log(
      `✅ Preview generated successfully in ${Date.now() - startTime}ms`,
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
      },
      body: screenshot.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("❌ Preview generation error:", error);

    // Fallback to SVG generation
    try {
      const url = new URL(event.rawUrl);
      const params = new URLSearchParams(url.search);

      const fallbackParams = {
        startWord: params.get("start") || "word",
        targetWord: params.get("target") || "word",
        type: params.get("type") || "challenge",
        date: params.get("date"),
      };

      console.log("🎯 Using fallback SVG generation");
      const fallbackSvg = generateFallbackPreview(fallbackParams);
      const fallbackBuffer = await svgToPngBuffer(fallbackSvg);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300", // Shorter cache for fallback
          "Access-Control-Allow-Origin": "*",
        },
        body: fallbackBuffer.toString("base64"),
        isBase64Encoded: true,
      };
    } catch (fallbackError) {
      console.error("❌ Fallback generation failed:", fallbackError);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Preview generation failed",
          message: error.message,
          fallbackError: fallbackError.message,
        }),
      };
    }
  }
};
