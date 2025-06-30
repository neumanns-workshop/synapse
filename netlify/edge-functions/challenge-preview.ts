// Netlify Edge Functions context interface
interface Context {
  next: () => Promise<Response>;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Only handle challenge and daily challenge paths
  if (
    !url.pathname.startsWith("/challenge") &&
    !url.pathname.startsWith("/dailychallenge")
  ) {
    return context.next();
  }

  try {
    // Parse challenge parameters
    const startWord = url.searchParams.get("start");
    const targetWord = url.searchParams.get("target");
    const challengeId = url.searchParams.get("id"); // For daily challenges
    const share = url.searchParams.get("share"); // Encoded path data
    const theme = url.searchParams.get("theme");

    // Validate required parameters
    if (!startWord || !targetWord) {
      return context.next();
    }

    // Generate preview image URL
    const previewParams = new URLSearchParams({
      start: startWord,
      target: targetWord,
      ...(share && { share }),
      ...(theme && { theme }),
      ...(challengeId && { id: challengeId }),
    });

    const previewImageUrl = `${url.origin}/api/preview?${previewParams}`;

    // Generate dynamic meta tags
    const isDailyChallenge = url.pathname.startsWith("/dailychallenge");
    const title = isDailyChallenge
      ? `Daily Challenge: ${startWord} → ${targetWord}`
      : `Challenge: ${startWord} → ${targetWord}`;

    const description = share
      ? `Someone shared their path! Can you solve this Synapse word challenge?`
      : `Can you connect "${startWord}" to "${targetWord}" in Synapse?`;

    // Get the base HTML
    const response = await context.next();
    let html = await response.text();

    // Replace generic Open Graph tags with dynamic ones
    html = html.replace(
      /<meta property="og:title" content="[^"]*"\/>/g,
      `<meta property="og:title" content="${title}"/>`,
    );

    html = html.replace(
      /<meta property="og:description" content="[^"]*"\/>/g,
      `<meta property="og:description" content="${description}"/>`,
    );

    html = html.replace(
      /<meta property="og:image" content="[^"]*"\/>/g,
      `<meta property="og:image" content="${previewImageUrl}"/>`,
    );

    html = html.replace(
      /<meta property="og:url" content="[^"]*"\/>/g,
      `<meta property="og:url" content="${url.href}"/>`,
    );

    // Update Twitter cards too
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*"\/>/g,
      `<meta name="twitter:title" content="${title}"/>`,
    );

    html = html.replace(
      /<meta name="twitter:description" content="[^"]*"\/>/g,
      `<meta name="twitter:description" content="${description}"/>`,
    );

    html = html.replace(
      /<meta name="twitter:image" content="[^"]*"\/>/g,
      `<meta name="twitter:image" content="${previewImageUrl}"/>`,
    );

    return new Response(html, {
      headers: {
        ...Object.fromEntries(response.headers),
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error in challenge-preview edge function:", error);
    return context.next();
  }
};

export const config = {
  path: ["/challenge", "/dailychallenge"],
};
