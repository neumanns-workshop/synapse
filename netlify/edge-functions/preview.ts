// Netlify Edge Function types
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

// Copied taunt generation logic from SharingService.ts
interface DailyChallengeTauntOptions {
  startWord: string;
  targetWord: string;
  aiSteps: number;
  userSteps?: number;
  userCompleted?: boolean;
  userGaveUp?: boolean;
  challengeDate: string;
}

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

  const dateObj = new Date(challengeDate);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  if (userCompleted && userSteps) {
    const userMoveText = userSteps === 1 ? "move" : "moves";
    const aiMoveText = aiSteps === 1 ? "move" : "moves";

    if (userSteps < aiSteps) {
      return `I crushed the AI on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText} (AI took ${aiSteps} ${aiMoveText}). Think you can beat me?`;
    } else if (userSteps === aiSteps) {
      return `I matched the AI on ${formattedDate}'s challenge! Got "${startWord}" → "${targetWord}" in ${userSteps} ${userMoveText}. Can you do better?`;
    } else {
      return `I got ${formattedDate}'s challenge in ${userSteps} ${userMoveText} ("${startWord}" → "${targetWord}"). The AI did it in ${aiSteps} ${aiMoveText}... can you beat us both?`;
    }
  }

  if (userGaveUp) {
    const aiMoveText = aiSteps === 1 ? "move" : "moves";

    if (userSteps && userSteps > 0) {
      const moveText = userSteps === 1 ? "move" : "moves";
      return `I couldn't get ${formattedDate}'s challenge ("${startWord}" → "${targetWord}") and gave up after ${userSteps} ${moveText}, but the AI got it in ${aiSteps} ${aiMoveText}. Can you beat the AI in less than ${aiSteps} moves?`;
    } else {
      return `I couldn't get ${formattedDate}'s challenge ("${startWord}" → "${targetWord}") and had to give up, but the AI got it in ${aiSteps} ${aiMoveText}. Can you beat the AI in less than ${aiSteps} moves?`;
    }
  }

  const aiMoveText = aiSteps === 1 ? "move" : "moves";
  return `I beat the AI in ${aiSteps} ${aiMoveText} on ${formattedDate}'s challenge ("${startWord}" → "${targetWord}"). Can you do better?`;
};

// Hash validation logic copied from SharingService.ts
const generateUrlHash = (data: string): string => {
  let hash = 0;
  const secret = "synapse_challenge_2025";
  const combined = data + secret;

  /* eslint-disable no-bitwise */
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  /* eslint-enable no-bitwise */

  return Math.abs(hash).toString(36).substring(0, 8);
};

const validateChallengeHash = (
  startWord: string,
  targetWord: string,
  providedHash: string,
): boolean => {
  const data = `${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const expectedHash = generateUrlHash(data);
  return expectedHash === providedHash;
};

const validateDailyChallengeHash = (
  challengeId: string,
  startWord: string,
  targetWord: string,
  providedHash: string,
): boolean => {
  const data = `${challengeId}:${startWord.toLowerCase()}:${targetWord.toLowerCase()}`;
  const expectedHash = generateUrlHash(data);
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
    const challengeUrl = url.toString().replace(/^https?:\/\/[^\/]+\//, "/#/");
    return Response.redirect(url.origin + challengeUrl, 302);
  }

  // Try to parse as game challenge
  const gameChallenge = parseGameChallenge(pathname + url.search);
  if (gameChallenge && gameChallenge.isValid) {
    const { startWord, targetWord } = gameChallenge;

    const title = `Synapse Challenge: "${startWord}" → "${targetWord}"`;
    const description = `Can you connect "${startWord}" to "${targetWord}" in this word transformation challenge? Join the fun!`;
    const imageUrl = `${url.origin}/assets/icon.png`;

    const metaTags = generateMetaTags(title, description, imageUrl, fullUrl);

    // Convert back to hash-based routing for the redirect
    const challengeUrl = url.toString().replace(/^https?:\/\/[^\/]+\//, "/#/");
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
    const imageUrl = `${url.origin}/assets/icon.png`;

    const metaTags = generateMetaTags(title, description, imageUrl, fullUrl);

    // Convert back to hash-based routing for the redirect
    const challengeUrl = url.toString().replace(/^https?:\/\/[^\/]+\//, "/#/");
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
  const challengeUrl = url.toString().replace(/^https?:\/\/[^\/]+\//, "/#/");
  return Response.redirect(url.origin + challengeUrl, 302);
};
