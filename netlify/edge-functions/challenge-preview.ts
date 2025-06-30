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
    // Parse the new URL structure parameters
    const type = url.searchParams.get("type");
    const startWord = url.searchParams.get("start");
    const targetWord = url.searchParams.get("target");
    const share = url.searchParams.get("share");
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
    const isBot = userAgent.includes("bot") || 
                  userAgent.includes("crawl") || 
                  userAgent.includes("facebook") ||
                  userAgent.includes("twitter") ||
                  userAgent.includes("linkedin") ||
                  userAgent.includes("telegram");

    if (!isBot) {
      // Not a bot, let the main app handle it
      return context.next();
    }

    // Generate preview for social media bots
    const previewParams = new URLSearchParams();
    previewParams.set("type", type);
    previewParams.set("start", startWord);
    previewParams.set("target", targetWord);
    if (share) previewParams.set("share", share);
    if (quality) previewParams.set("quality", quality);
    if (tsne) previewParams.set("tsne", tsne);
    if (theme) previewParams.set("theme", theme);
    if (date) previewParams.set("date", date);

    // Call the preview function
    const previewUrl = `/.netlify/functions/preview?${previewParams.toString()}`;
    const previewResponse = await fetch(`${url.origin}${previewUrl}`);
    
    if (!previewResponse.ok) {
      return context.next();
    }

    const previewSvg = await previewResponse.text();
    
    // Generate meta tags for social sharing
    const title = type === "dailychallenge" 
      ? `Daily Challenge ${date} - ${startWord} → ${targetWord}`
      : `Word Challenge - ${startWord} → ${targetWord}`;
    
    const description = type === "dailychallenge"
      ? `Try today's daily challenge! Connect "${startWord}" to "${targetWord}" in the fewest moves.`
      : `Can you connect "${startWord}" to "${targetWord}"? Play this word association challenge!`;

    const ogImageUrl = `${url.origin}${previewUrl}`;

    // Return HTML with meta tags and preview
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph tags -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:url" content="${request.url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Synapse">
  
  <!-- Twitter Card tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">
  
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
    .preview { 
      max-width: 600px; 
      margin: 20px auto; 
      border-radius: 12px; 
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <h1>🧠 Synapse</h1>
  <p>Loading challenge...</p>
  <div class="preview">
    ${previewSvg}
  </div>
  <p>Redirecting to the game...</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return context.next();
  }
};

export const config = {
  path: ["/challenge"],
};
