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
  const previewImageUrl = url.searchParams.get("preview"); // Get uploaded preview image URL

  // Check if preview image is still available
  let validPreviewUrl: string | null = null;
  if (previewImageUrl) {
    try {
      const response = await fetch(previewImageUrl, { method: "HEAD" });
      if (response.ok) {
        validPreviewUrl = previewImageUrl;
      }
    } catch (error) {
      // Image no longer exists or network error, use fallback
      console.log("Preview image not available:", previewImageUrl);
    }
  }

  // Create title and description
  const title =
    type === "dailychallenge" && date
      ? `Daily Challenge - ${date}`
      : "Synapse Word Challenge";

  const description = `Can you connect "${startWord}" to "${targetWord}"? Test your word association skills in Synapse!`;

  // Use valid preview image or fallback to default
  const ogImageUrl = validPreviewUrl || "https://synapsegame.ai/og-image.png";

  // Generate HTML with Open Graph meta tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Open Graph meta tags for social media -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url.toString()}" />
  <meta property="og:site_name" content="Synapse" />
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  
  <!-- Standard meta tags -->
  <meta name="description" content="${description}" />
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
    <p>${description}</p>
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
