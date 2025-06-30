# Deep Link Preview Implementation Plan

## Objective

Enable rich previews for Synapse challenge deep links by dynamically generating Open Graph images that show:
- Challenge details (start word → target word)
- Player path visualization 
- QR code for easy access
- Game statistics and branding

## Current Challenge

When users share challenge links, social platforms display only generic Synapse app previews instead of challenge-specific content. This reduces engagement and doesn't showcase the actual challenge being shared.

## Proposed Solution: Dynamic Open Graph Generation

### Phase 1: Server-Side Image Generation

Create a Supabase Edge Function that generates preview images on-demand based on challenge URLs.

#### Implementation Steps:

1. **Create Edge Function**: `generate-challenge-preview`
   - Receives challenge parameters from URL
   - Validates challenge data
   - Generates branded preview image
   - Returns image URL for Open Graph meta tags

2. **Dynamic Meta Tag Injection**
   - Intercept challenge URLs at the server level
   - Parse challenge parameters
   - Generate dynamic `og:image` meta tags
   - Serve customized HTML with challenge-specific previews

3. **Client Integration**
   - Update sharing service to use new preview URLs
   - Maintain backward compatibility
   - Add fallback to generic previews

### Phase 2: Preview Image Design

#### Card Layout:
```
┌─────────────────────────────────────┐
│  🧠 Synapse Challenge               │
│                                     │
│  START → TARGET                     │
│  "I solved it in X moves!"          │
│                                     │
│  [Player Path Visualization]        │
│                                     │
│  [QR Code] | Game Stats             │
│            | • Optimal: Y moves    │
│            | • Player: X moves     │
│            | synapsegame.ai        │
└─────────────────────────────────────┘
```

### Phase 3: URL Structure Enhancement

#### Challenge URLs with Preview Support:
```
https://synapsegame.ai/challenge?start=dog&target=space&hash=abc123&preview=true
```

#### Daily Challenge URLs:
```
https://synapsegame.ai/dailychallenge?id=2025-01-10&preview=true
```

## Technical Implementation

### 1. Edge Function: `generate-challenge-preview`

```typescript
// supabase/functions/generate-challenge-preview/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateChallengePreviewImage } from "./preview-generator.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const startWord = url.searchParams.get('start');
    const targetWord = url.searchParams.get('target');
    const playerPath = url.searchParams.get('path');
    const moves = url.searchParams.get('moves');
    
    // Validate and generate image
    const imageBuffer = await generateChallengePreviewImage({
      startWord,
      targetWord,
      playerPath,
      moves
    });
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    // Return fallback image
    return new Response(await getFallbackImage(), {
      headers: { 'Content-Type': 'image/png' }
    });
  }
});
```

### 2. Preview Generator

```typescript
// preview-generator.ts
import { createCanvas } from "https://deno.land/x/canvas@v1.4.1/mod.ts";

export async function generateChallengePreviewImage(params: {
  startWord: string;
  targetWord: string;
  playerPath?: string;
  moves?: string;
}) {
  const canvas = createCanvas(1200, 630); // Standard OG image size
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#6750A4'; // Synapse purple
  ctx.fillRect(0, 0, 1200, 630);
  
  // Title
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('🧠 Synapse Challenge', 60, 100);
  
  // Challenge
  ctx.font = 'bold 64px Arial';
  ctx.fillText(`${params.startWord} → ${params.targetWord}`, 60, 200);
  
  // Player stats
  if (params.moves) {
    ctx.font = '32px Arial';
    ctx.fillText(`Solved in ${params.moves} moves!`, 60, 260);
  }
  
  // Add QR code and path visualization here
  // ...
  
  return canvas.toBuffer('image/png');
}
```

### 3. Dynamic Meta Tag Injection

#### Option A: Netlify Edge Functions
```typescript
// netlify/edge-functions/challenge-preview.ts
export default async (request: Request) => {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/challenge')) {
    const startWord = url.searchParams.get('start');
    const targetWord = url.searchParams.get('target');
    
    // Generate preview image URL
    const previewUrl = `${url.origin}/api/preview?${url.searchParams}`;
    
    // Inject dynamic meta tags
    const html = await getBaseHTML();
    const dynamicHTML = html.replace(
      '<meta property="og:image" content="/og-image.png"/>',
      `<meta property="og:image" content="${previewUrl}"/>
       <meta property="og:title" content="Challenge: ${startWord} → ${targetWord}"/>
       <meta property="og:description" content="Can you solve this Synapse word challenge?"/>`
    );
    
    return new Response(dynamicHTML, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  return fetch(request);
};
```

#### Option B: Netlify Redirects with Functions
```toml
# netlify.toml
[[redirects]]
  from = "/challenge*"
  to = "/.netlify/functions/challenge-preview"
  status = 200
  query = {start = ":start", target = ":target"}
```

### 4. Updated Sharing Service

```typescript
// Updated shareChallenge function
export const shareChallenge = async (options) => {
  // Generate preview-enabled deep link
  const deepLink = generateSecureGameDeepLink(
    startWord,
    targetWord,
    theme,
    encodedPath,
    true // Enable preview
  );
  
  // The preview will be generated server-side when the URL is accessed
  // No need to generate images client-side
  
  return Share.share({
    title: "Synapse Word Challenge",
    text: challengeMessage,
    url: deepLink
  });
};
```

## Implementation Priority

### Phase 1 (High Priority)
1. Create basic preview generation edge function
2. Implement simple text-based preview cards
3. Add dynamic meta tag injection for challenge URLs

### Phase 2 (Medium Priority)
1. Add QR code generation to preview images
2. Implement player path visualization
3. Add theme support for different card styles

### Phase 3 (Low Priority)
1. Add caching and performance optimizations
2. Implement analytics for preview engagement
3. Add A/B testing for different preview designs

## Success Metrics

- Increased click-through rates on shared challenge links
- Higher conversion from shared links to game plays
- Improved social media engagement
- Reduced support questions about "how to play shared challenges"

## Fallback Strategy

- Always include text-based challenge information in share message
- Maintain current QR code overlay functionality
- Ensure generic Open Graph images work if preview generation fails
- Provide clear error handling and logging

## Testing Strategy

1. **Unit Tests**: Preview generation functions
2. **Integration Tests**: End-to-end sharing flow
3. **Manual Tests**: Various social platforms (iMessage, WhatsApp, Twitter, Discord)
4. **Performance Tests**: Image generation speed and caching
5. **Fallback Tests**: Behavior when preview generation fails 