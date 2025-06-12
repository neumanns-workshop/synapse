// Netlify Edge Function for social media previews
// Simple logic: Bots get HTML with meta tags, humans get redirected

interface Context {
  site?: {
    id: string;
    name: string;
    url: string;
  };
}

// Hash generation (matches client-side)
const generateUrlHash = (data: string): string => {
  let hash = 0;
  const secret = "synapse_challenge_2025";
  const combined = data + secret;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36).substring(0, 8);
};

// Parse challenge URL
const parseChallenge = (url: string) => {
  // Regular challenge with share ID: /challenge?start=X&target=Y&hash=Z&share=W
  const challengeMatchWithShare = url.match(
    /\/challenge\?start=([^&]+)&target=([^&]+)&hash=([^&]+)&share=([^&]+)/,
  );
  if (challengeMatchWithShare) {
    const startWord = decodeURIComponent(challengeMatchWithShare[1]);
    const targetWord = decodeURIComponent(challengeMatchWithShare[2]);
    const providedHash = challengeMatchWithShare[3];
    const shareId = challengeMatchWithShare[4];

    const expectedHash = generateUrlHash(
      `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`,
    );
    const isValid = expectedHash === providedHash;

    return {
      type: "challenge",
      startWord,
      targetWord,
      shareId,
      isValid,
    };
  }

  // Regular challenge without share ID: /challenge?start=X&target=Y&hash=Z
  const challengeMatch = url.match(
    /\/challenge\?start=([^&]+)&target=([^&]+)&hash=([^&]+)/,
  );
  if (challengeMatch) {
    const startWord = decodeURIComponent(challengeMatch[1]);
    const targetWord = decodeURIComponent(challengeMatch[2]);
    const providedHash = challengeMatch[3];

    const expectedHash = generateUrlHash(
      `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`,
    );
    const isValid = expectedHash === providedHash;

    return {
      type: "challenge",
      startWord,
      targetWord,
      isValid,
    };
  }

  // Daily challenge: /dailychallenge?id=X&start=Y&target=Z&hash=W
  const dailyMatch = url.match(
    /\/dailychallenge\?id=([^&]+)&start=([^&]+)&target=([^&]+)&hash=([^&]+)/,
  );
  if (dailyMatch) {
    const challengeId = decodeURIComponent(dailyMatch[1]);
    const startWord = decodeURIComponent(dailyMatch[2]);
    const targetWord = decodeURIComponent(dailyMatch[3]);
    const providedHash = dailyMatch[4];

    const expectedHash = generateUrlHash(
      `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`,
    );
    const isValid = expectedHash === providedHash;

    return {
      type: "daily",
      challengeId,
      startWord,
      targetWord,
      isValid,
    };
  }

  return null;
};

// Generate preview HTML for bots using rich data if available
const generatePreviewHTML = async (
  challenge: any,
  fullUrl: string,
  origin: string,
): Promise<string> => {
  // Try to get rich preview data from blob storage using share ID
  let richData = null;

  if (challenge.shareId) {
    try {
      const blobKey = `preview-${challenge.shareId}`;
      const blobUrl = `${origin}/.netlify/blobs/${blobKey}`;
      const blobResponse = await fetch(blobUrl);
      if (blobResponse.ok) {
        richData = await blobResponse.json();

        // Check if data is expired
        if (richData.expiresAt && Date.now() > richData.expiresAt) {
          richData = null;
        }
      }
    } catch (error) {
      console.warn("Failed to fetch rich preview data:", error);
    }
  }

  // Use rich data if available, otherwise fallback to basic data
  let title: string;
  let description: string;
  let imageUrl: string;

  if (richData) {
    title = richData.title;
    description = richData.description;

    // Use actual game graph image if available
    if (richData.graphImageBase64) {
      imageUrl = `data:image/png;base64,${richData.graphImageBase64}`;
    } else {
      // Fallback to dynamic image generation
      imageUrl = `${origin}/api/image?start=${encodeURIComponent(challenge.startWord)}&target=${encodeURIComponent(challenge.targetWord)}&url=${encodeURIComponent(fullUrl)}`;
    }
  } else {
    // Fallback for URLs without rich preview data
    if (challenge.type === "daily") {
      title = `Daily Synapse Challenge`;
      description = `🤖 Can you connect "${challenge.startWord}" to "${challenge.targetWord}" in today's daily challenge? Test your word navigation skills!`;
    } else {
      title = `Synapse Challenge: "${challenge.startWord}" → "${challenge.targetWord}"`;
      description = `Can you connect "${challenge.startWord}" to "${challenge.targetWord}" using semantic pathways? Join this word navigation puzzle!`;
    }
    imageUrl = `${origin}/api/image?start=${encodeURIComponent(challenge.startWord)}&target=${encodeURIComponent(challenge.targetWord)}&url=${encodeURIComponent(fullUrl)}`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Synapse Game">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${origin}">Play on Synapse Game</a></p>
</body>
</html>`;
};

// Main edge function
export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const fullUrl = request.url;
  const userAgent = request.headers.get("user-agent") || "";

  // Detect bots/crawlers
  const isBot =
    /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|discord|facebookexternalhit/i.test(
      userAgent,
    );

  // Parse the challenge from URL
  const challenge = parseChallenge(url.pathname + url.search);

  if (!challenge || !challenge.isValid) {
    // Invalid/unrecognized URL - redirect to home
    return Response.redirect(url.origin + "/#/", 302);
  }

  // For bots: serve preview HTML
  if (isBot) {
    const html = await generatePreviewHTML(challenge, fullUrl, url.origin);
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // For humans: redirect to app
  if (challenge.type === "daily") {
    return Response.redirect(
      `${url.origin}/#/dailychallenge?id=${encodeURIComponent(challenge.challengeId!)}&start=${encodeURIComponent(challenge.startWord)}&target=${encodeURIComponent(challenge.targetWord)}&hash=${generateUrlHash(`${challenge.challengeId!}:${challenge.startWord.toLowerCase()}:${challenge.targetWord.toLowerCase()}`)}`,
      302,
    );
  } else {
    return Response.redirect(
      `${url.origin}/#/challenge?start=${encodeURIComponent(challenge.startWord)}&target=${encodeURIComponent(challenge.targetWord)}&hash=${generateUrlHash(`${challenge.startWord.toLowerCase()}:${challenge.targetWord.toLowerCase()}`)}`,
      302,
    );
  }
};
