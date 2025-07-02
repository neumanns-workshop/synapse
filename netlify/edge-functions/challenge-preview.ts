// Netlify Edge Functions context interface
interface Context {
  next: () => Promise<Response>;
}

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);

  // Only handle challenge URLs
  if (!url.pathname.includes("/challenge")) {
    return;
  }

  // Get challenge parameters
  const startWord = url.searchParams.get("start") || "word";
  const targetWord = url.searchParams.get("target") || "challenge";
  const type = url.searchParams.get("type") || "challenge";
  const date = url.searchParams.get("date");
  const challengeId = url.searchParams.get("id");
  const hash = url.searchParams.get("hash");

  console.log("🔥 EDGE DEBUG: Preview request parameters:", {
    startWord,
    targetWord,
    type,
    hash,
    challengeId
  });

  // Generate challenge hash for preview image lookup
  const challengeData = challengeId
    ? `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`
    : `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;

  // Simple hash function matching SharingService.ts
  function generateUrlHash(data: string): string {
    let hashValue = 0;
    const secret = "synapse_challenge_2025";
    const combined = data + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hashValue = hashValue * 5 - hashValue + char;
      hashValue = hashValue % 2147483647; // Keep it positive 32-bit
    }
    return Math.abs(hashValue).toString(36).substring(0, 8);
  }

  const expectedHash = generateUrlHash(challengeData);
  console.log("🔥 EDGE DEBUG: Hash comparison - expected:", expectedHash, "provided:", hash);

  // Try to find preview image using hash-based lookup
  let validPreviewUrl: string | null = null;
  if (hash === expectedHash) {
    const baseStorageUrl =
      "https://dvihvgdmmqdixmuuttve.supabase.co/storage/v1/object/public/preview-images";

    // Try common paths where images might be stored
    console.log("🔥 EDGE DEBUG: Trying to find preview image for hash:", hash);
    
    const possibleUrls = [
      // All preview images are now stored in anonymous path
      `${baseStorageUrl}/anonymous/${hash}/${hash}.jpg`,
      `${baseStorageUrl}/anonymous/${hash}/${hash}.png`,
    ];

    for (const testUrl of possibleUrls) {
      console.log("🔥 EDGE DEBUG: Trying URL:", testUrl);
      try {
        const response = await fetch(testUrl, { 
          method: "HEAD",
          // Add headers to handle potential CORS issues
          headers: {
            'User-Agent': 'Netlify-Edge-Function'
          }
        });
        if (response.ok) {
          validPreviewUrl = testUrl;
          console.log("🔥 EDGE DEBUG: Found image at:", testUrl);
          break;
        } else {
          console.log("🔥 EDGE DEBUG: URL failed with status:", response.status, testUrl);
        }
      } catch (error) {
        console.log("🔥 EDGE DEBUG: URL failed with error:", testUrl, error);
      }
    }
  } else {
    console.log("🔥 EDGE DEBUG: Hash mismatch - skipping image lookup");
  }

  // Create title
  const title =
    type === "dailychallenge" && date
      ? `Synapse Daily Challenge (${date}): ${startWord} → ${targetWord}`
      : `Synapse Challenge: ${startWord} → ${targetWord}`;

  // Use valid preview image or fallback to default
  const ogImageUrl = validPreviewUrl || "https://synapsegame.ai/og-image.png";
  
  console.log("🔥 EDGE DEBUG: Final preview image URL:", ogImageUrl);

  // Generate HTML with Open Graph meta tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Favicon links for proper branding -->
  <link rel="icon" type="image/x-icon" href="https://synapsegame.ai/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="https://synapsegame.ai/favicon.png" />
  <link rel="icon" type="image/svg+xml" href="https://synapsegame.ai/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="https://synapsegame.ai/favicon.png" />
  
  <!-- Open Graph meta tags for social media -->
  <meta property="og:title" content="${title}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url.toString()}" />
  <meta property="og:site_name" content="Synapse" />
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  
  <!-- Standard meta tags -->
  <title>${title}</title>
  
  <!-- Redirect to app -->
  <script>
    // Immediate redirect to prevent showing this page
    window.location.href = "${url.toString()}";
  </script>
  
  <!-- Fallback meta refresh -->
  <meta http-equiv="refresh" content="0;url=${url.toString()}" />
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h1>${title}</h1>
    <p>Redirecting to Synapse...</p>
    <a href="${url.toString()}" style="color: #6750A4; text-decoration: none; font-weight: bold;">
      Click here if you're not redirected automatically
    </a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
};

export const config = {
  path: ["/challenge"],
};
