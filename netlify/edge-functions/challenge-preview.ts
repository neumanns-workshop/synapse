// Netlify Edge Functions context interface
interface Context {
  next: () => Promise<Response>;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Only handle challenge URLs
  if (!url.pathname.includes("/challenge")) {
    return context.next();
  }

  // Get user agent to detect social media crawlers
  const userAgent = request.headers.get("user-agent") || "";
  const isBot =
    /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|discord|slack/i.test(
      userAgent,
    );
  const isPreflightRequest = request.headers.get("purpose") === "prefetch";

  console.log("🔥 EDGE DEBUG: Request details:", {
    userAgent,
    isBot,
    isPreflightRequest,
    url: url.toString(),
  });

  // Get challenge parameters
  const startWord = url.searchParams.get("start") || "word";
  const targetWord = url.searchParams.get("target") || "challenge";
  const type = url.searchParams.get("type") || "challenge";
  const date = url.searchParams.get("date");
  const challengeId = url.searchParams.get("id");
  const hash = url.searchParams.get("hash");
  const userId = url.searchParams.get("uid") || "anonymous";

  console.log("🔥 EDGE DEBUG: Challenge parameters:", {
    startWord,
    targetWord,
    type,
    hash,
    challengeId,
    userId,
  });

  // For real users (not bots), redirect to the main app with challenge data
  if (!isBot && !isPreflightRequest) {
    console.log("🔥 EDGE DEBUG: Real user detected, redirecting to app");

    // Build the redirect URL to the main app
    const redirectUrl = new URL("https://synapsegame.ai");

    // Preserve all challenge parameters for the app to handle
    if (startWord) redirectUrl.searchParams.set("start", startWord);
    if (targetWord) redirectUrl.searchParams.set("target", targetWord);
    if (type) redirectUrl.searchParams.set("type", type);
    if (hash) redirectUrl.searchParams.set("hash", hash);
    if (challengeId) redirectUrl.searchParams.set("id", challengeId);
    if (userId) redirectUrl.searchParams.set("uid", userId);
    if (date) redirectUrl.searchParams.set("date", date);

    console.log("🔥 EDGE DEBUG: Redirecting to:", redirectUrl.toString());

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        "Cache-Control": "no-cache",
      },
    });
  }

  // For social media crawlers and bots, generate preview meta tags
  console.log("🔥 EDGE DEBUG: Bot/crawler detected, generating meta tags");

  // Generate challenge hash for preview image lookup (must match SharingService.ts)
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

  // Generate hash that includes userId (matches upload logic)
  const userSpecificData = `${userId}:${challengeData}`;
  const expectedHash = generateUrlHash(userSpecificData);
  console.log(
    "🔥 EDGE DEBUG: Hash comparison - expected:",
    expectedHash,
    "provided:",
    hash,
  );

  // Try to find preview image using hash-based lookup
  let validPreviewUrl: string | null = null;
  if (hash === expectedHash) {
    const baseStorageUrl =
      "https://dvihvgdmmqdixmuuttve.supabase.co/storage/v1/object/public/preview-images";

    // Try common paths where images might be stored
    console.log("🔥 EDGE DEBUG: Trying to find preview image for hash:", hash);

    const possibleUrls = [
      // Images are stored in user-specific paths
      `${baseStorageUrl}/${userId}/${hash}/${hash}.jpg`,
      `${baseStorageUrl}/${userId}/${hash}/${hash}.png`,
    ];

    for (const testUrl of possibleUrls) {
      console.log("🔥 EDGE DEBUG: Trying URL:", testUrl);
      try {
        const response = await fetch(testUrl, {
          method: "HEAD",
          headers: {
            "User-Agent": "Netlify-Edge-Function",
          },
        });
        if (response.ok) {
          validPreviewUrl = testUrl;
          console.log("🔥 EDGE DEBUG: Found image at:", testUrl);
          break;
        } else {
          console.log(
            "🔥 EDGE DEBUG: URL failed with status:",
            response.status,
            testUrl,
          );
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

  // Build the app URL for meta tags (what should be shared)
  const appUrl = new URL("https://synapsegame.ai");
  if (startWord) appUrl.searchParams.set("start", startWord);
  if (targetWord) appUrl.searchParams.set("target", targetWord);
  if (type) appUrl.searchParams.set("type", type);
  if (hash) appUrl.searchParams.set("hash", hash);
  if (challengeId) appUrl.searchParams.set("id", challengeId);
  if (userId) appUrl.searchParams.set("uid", userId);
  if (date) appUrl.searchParams.set("date", date);

  // Generate HTML with Open Graph meta tags (NO REDIRECT for bots)
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
  <meta property="og:description" content="Can you solve this word challenge? Build semantic pathways in Synapse!" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${appUrl.toString()}" />
  <meta property="og:site_name" content="Synapse" />
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="Can you solve this word challenge? Build semantic pathways in Synapse!" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  
  <!-- Standard meta tags -->
  <title>${title}</title>
  <meta name="description" content="Can you solve this word challenge? Build semantic pathways in Synapse!" />
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h1>${title}</h1>
    <p>Play this challenge on Synapse!</p>
    <a href="${appUrl.toString()}" style="color: #6750A4; text-decoration: none; font-weight: bold; padding: 10px 20px; border: 2px solid #6750A4; border-radius: 8px; display: inline-block; margin-top: 20px;">
      🧠 Play Challenge
    </a>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Build semantic pathways between words in this neural network word game.
    </p>
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
