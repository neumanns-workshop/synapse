// Netlify Edge Functions context interface
interface Context {
  next: () => Promise<Response>;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Only handle challenge paths with the new structure
  if (!url.pathname.startsWith("/challenge")) {
    return context.next();
  }

  try {
    // Parse challenge parameters - support both old and new URL structures
    const type =
      url.searchParams.get("type") ||
      (url.pathname.startsWith("/dailychallenge")
        ? "dailychallenge"
        : "challenge");
    const startWord = url.searchParams.get("start");
    const targetWord = url.searchParams.get("target");
    const challengeId = url.searchParams.get("id"); // For daily challenges
    const share = url.searchParams.get("share"); // Encoded path data
    const quality = url.searchParams.get("quality");
    const tsne = url.searchParams.get("tsne");
    const theme = url.searchParams.get("theme");
    const date = url.searchParams.get("date");

    // Validate required parameters
    if (!type || !startWord || !targetWord) {
      return context.next();
    }

    // Check if this is a preview request (usually from social media crawlers)
    const userAgent = request.headers.get("user-agent") || "";
    const isBot =
      userAgent.includes("bot") ||
      userAgent.includes("crawl") ||
      userAgent.includes("facebook") ||
      userAgent.includes("twitter") ||
      userAgent.includes("linkedin") ||
      userAgent.includes("telegram") ||
      userAgent.includes("discord") ||
      userAgent.includes("whatsapp") ||
      userAgent.includes("slack") ||
      userAgent.includes("preview") ||
      userAgent.includes("spider");

    if (!isBot) {
      // Not a bot, let the main app handle it
      return context.next();
    }

    // Generate preview image URL for bots
    const previewParams = new URLSearchParams();
    previewParams.set("type", type);
    previewParams.set("start", startWord);
    previewParams.set("target", targetWord);
    if (share) previewParams.set("share", share);
    if (quality) previewParams.set("quality", quality);
    if (tsne) previewParams.set("tsne", tsne);
    if (theme) previewParams.set("theme", theme);
    if (challengeId) previewParams.set("id", challengeId);
    if (date) previewParams.set("date", date);

    const previewImageUrl = `${url.origin}/.netlify/functions/preview?${previewParams}`;

    // Generate dynamic meta tags
    const isDailyChallenge =
      type === "dailychallenge" || url.pathname.startsWith("/dailychallenge");
    const title = isDailyChallenge
      ? `Daily Challenge ${date || challengeId} - ${startWord} → ${targetWord}`
      : `Word Challenge - ${startWord} → ${targetWord}`;

    const description = isDailyChallenge
      ? `Try today's daily challenge! Connect "${startWord}" to "${targetWord}" in the fewest moves.`
      : share
        ? `Someone shared their path! Can you solve this Synapse word challenge?`
        : `Can you connect "${startWord}" to "${targetWord}" in Synapse?`;

    // Return standalone HTML for social media crawlers
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph tags -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${previewImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${title}">
  <meta property="og:url" content="${request.url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Synapse">
  
  <!-- Twitter Card tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${previewImageUrl}">
  
  <!-- Redirect to app after a short delay -->
  <meta http-equiv="refresh" content="3;url=${request.url}">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      padding: 50px;
      background: #6750A4;
      color: white;
    }
  </style>
</head>
<body>
  <h1>🧠 Synapse</h1>
  <p>Loading challenge...</p>
  <p>Redirecting to the game...</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return context.next();
  }
};

export const config = {
  path: ["/challenge"],
};
