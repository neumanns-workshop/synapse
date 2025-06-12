// Netlify Edge Function for generating social media previews
interface Context {
  site?: {
    id: string;
    name: string;
    url: string;
  };
  deploy?: {
    id: string;
    url: string;
  };
}

// Interface for daily challenge taunt generation
interface DailyChallengeTauntOptions {
  startWord: string;
  targetWord: string;
  aiSteps: number;
  userSteps?: number;
  userCompleted?: boolean;
  userGaveUp?: boolean;
  challengeDate: string;
}

// Generate taunting message for daily challenges
const generateDailyChallengeTaunt = (
  options: DailyChallengeTauntOptions,
): string => {
  const {
    startWord,
    targetWord,
    aiSteps,
    userSteps,
    userCompleted,
    userGaveUp,
    challengeDate,
  } = options;

  // If user hasn't attempted yet, show AI challenge
  if (!userSteps) {
    return `🤖 AI solved "${startWord}" → "${targetWord}" in just ${aiSteps} steps on ${challengeDate}. Think you can beat that? 🧠⚡`;
  }

  // If user completed it
  if (userCompleted) {
    if (userSteps <= aiSteps) {
      return `🏆 Incredible! You beat the AI by solving "${startWord}" → "${targetWord}" in ${userSteps} steps vs AI's ${aiSteps} on ${challengeDate}! 🎯`;
    } else {
      return `✅ Well done! You solved "${startWord}" → "${targetWord}" in ${userSteps} steps on ${challengeDate}. AI did it in ${aiSteps} - can you improve? 🎯`;
    }
  }

  // If user gave up
  if (userGaveUp) {
    return `😅 Gave up on "${startWord}" → "${targetWord}"? The AI cracked it in ${aiSteps} steps on ${challengeDate}. Ready for redemption? 💪`;
  }

  // If user attempted but didn't finish
  return `🔥 You're ${userSteps} steps into "${startWord}" → "${targetWord}" from ${challengeDate}. AI finished in ${aiSteps} - keep going! 🚀`;
};

// Simple hash function for URL validation
const generateUrlHash = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Validate challenge hash to prevent URL manipulation
const validateChallengeHash = (
  startWord: string,
  targetWord: string,
  providedHash: string,
): boolean => {
  const expectedHash = generateUrlHash(`${startWord}-${targetWord}-challenge`);
  return expectedHash === providedHash;
};

// Validate daily challenge hash
const validateDailyChallengeHash = (
  challengeId: string,
  startWord: string,
  targetWord: string,
  providedHash: string,
): boolean => {
  const expectedHash = generateUrlHash(
    `${challengeId}-${startWord}-${targetWord}-daily`,
  );
  return expectedHash === providedHash;
};

// Parse challenge URLs
const parseGameChallenge = (url: string) => {
  const secureRegex =
    /\/challenge\?start=([^&]+)&target=([^&]+)&(?:hash=([^&]+)&theme=([^&]+)|theme=([^&]+)&hash=([^&]+)|hash=([^&]+))/;
  const match = url.match(secureRegex);

  if (match && match.length >= 4) {
    const startWord = decodeURIComponent(match[1]);
    const targetWord = decodeURIComponent(match[2]);

    let providedHash: string;
    let theme: string | undefined;

    if (match[3] && match[4]) {
      providedHash = match[3];
      theme = decodeURIComponent(match[4]);
    } else if (match[5] && match[6]) {
      theme = decodeURIComponent(match[5]);
      providedHash = match[6];
    } else if (match[7]) {
      providedHash = match[7];
    } else {
      return null;
    }

    const isValid = validateChallengeHash(startWord, targetWord, providedHash);
    return { startWord, targetWord, theme, isValid };
  }
  return null;
};

const parseDailyChallenge = (url: string) => {
  const secureRegex =
    /\/dailychallenge\?id=([^&]+)&start=([^&]+)&target=([^&]+)&hash=([^&]+)/;
  const match = url.match(secureRegex);

  if (match && match.length >= 5) {
    const challengeId = decodeURIComponent(match[1]);
    const startWord = decodeURIComponent(match[2]);
    const targetWord = decodeURIComponent(match[3]);
    const providedHash = match[4];

    const isValid = validateDailyChallengeHash(
      challengeId,
      startWord,
      targetWord,
      providedHash,
    );
    return { challengeId, startWord, targetWord, isValid };
  }
  return null;
};

// Generate meta tags HTML
const generateMetaTags = (
  title: string,
  description: string,
  imageUrl: string,
  url: string,
): string => {
  return `
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Synapse Game" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <!-- Additional Meta Tags -->
    <meta name="description" content="${description}" />
    <title>${title}</title>
  `;
};

// Main Edge Function
export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const fullUrl = request.url;

  // Check if this is a bot/crawler request
  const userAgent = request.headers.get("user-agent") || "";
  const isBot =
    /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|discord/i.test(
      userAgent,
    );

  // If not a bot and not a preview request, redirect to the actual app
  if (!isBot && !url.searchParams.has("preview")) {
    // For regular users, serve the normal app (convert back to hash-based routing)
    const challengeUrl = url.toString().replace(/^https?:\/\/[^/]+\//, "/#/");
    return Response.redirect(url.origin + challengeUrl, 302);
  }

  // Try to parse as game challenge
  const gameChallenge = parseGameChallenge(pathname + url.search);
  if (gameChallenge && gameChallenge.isValid) {
    const { startWord, targetWord } = gameChallenge;

    const title = `Synapse Challenge: "${startWord}" → "${targetWord}"`;
    const description = `Can you connect "${startWord}" to "${targetWord}" using semantic pathways? Join this word navigation puzzle!`;
    const imageUrl = `${url.origin}/api/image?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&url=${encodeURIComponent(fullUrl)}`;

    const metaTags = generateMetaTags(title, description, imageUrl, fullUrl);

    // Convert back to hash-based routing for the redirect
    const challengeUrl = url.toString().replace(/^https?:\/\/[^/]+\//, "/#/");
    const redirectUrl = url.origin + challengeUrl;

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        ${metaTags}
        <script>
          // Redirect after meta tags are parsed
          setTimeout(() => {
            window.location.href = '${redirectUrl}';
          }, 100);
        </script>
      </head>
      <body>
        <h1>Loading Synapse Challenge...</h1>
        <p>Redirecting to the game...</p>
      </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  // Try to parse as daily challenge
  const dailyChallenge = parseDailyChallenge(pathname + url.search);
  if (dailyChallenge && dailyChallenge.isValid) {
    const { startWord, targetWord } = dailyChallenge;

    // For daily challenges, we need to generate a taunt
    // Since we don't have user data in the edge function, we'll use a generic AI challenge
    const today = new Date().toISOString().split("T")[0];
    const aiSteps = Math.floor(Math.random() * 5) + 3; // Simulate AI steps (3-7)

    const taunt = generateDailyChallengeTaunt({
      startWord,
      targetWord,
      aiSteps,
      challengeDate: today,
    });

    const title = `Daily Synapse Challenge`;
    const description = taunt;
    const imageUrl = `${url.origin}/api/image?start=${encodeURIComponent(startWord)}&target=${encodeURIComponent(targetWord)}&url=${encodeURIComponent(fullUrl)}`;

    const metaTags = generateMetaTags(title, description, imageUrl, fullUrl);

    // Convert back to hash-based routing for the redirect
    const challengeUrl = url.toString().replace(/^https?:\/\/[^/]+\//, "/#/");
    const redirectUrl = url.origin + challengeUrl;

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        ${metaTags}
        <script>
          // Redirect after meta tags are parsed
          setTimeout(() => {
            window.location.href = '${redirectUrl}';
          }, 100);
        </script>
      </head>
      <body>
        <h1>Loading Daily Synapse Challenge...</h1>
        <p>Redirecting to the game...</p>
      </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  // Fallback for unrecognized URLs - convert to hash-based routing
  const challengeUrl = url.toString().replace(/^https?:\/\/[^/]+\//, "/#/");
  return Response.redirect(url.origin + challengeUrl, 302);
};
