# Implementation Plan: Server-Side Social Sharing Card Generation

## 1. Objective

To create a consistent, reliable, and visually appealing sharing experience for "Challenge a Friend" across all platforms (iOS, Android, Web) and all third-party applications (iMessage, WhatsApp, Twitter, etc.). This will replace the current system that relies on a text-based emoji path and inconsistent local screenshot sharing. The new system will generate a single, branded image card that contains the game graph, a QR code, and challenge stats.

## 2. Proposed Solution: "The Wordle Approach"

We will implement a serverless function that dynamically generates a social media-ready image card on demand. When a user shares a challenge, the client-side app will send the game data to this function. The function will render an HTML/CSS template into a PNG image, store it, and return its public URL. The app then shares this URL, which social media platforms will automatically "unfurl" into a rich image preview.

This approach centralizes the image generation logic, ensures a consistent look, and bypasses the limitations and inconsistencies of client-side sharing APIs.

## 3. Architecture Diagram

```mermaid
graph TD;
    subgraph User Device;
        A[Synapse App];
    end

    subgraph Cloud Infrastructure (Supabase);
        B["Edge Function<br/>(generate-share-card)"];
        D[Supabase Storage];
    end

    subgraph Social Platform;
        E[iMessage, Twitter, etc.];
        F[Rich Preview Card];
    end

    A -- "1. POST /generate-share-card with GameReport" --> B;
    B -- "2. Renders an HTML/CSS template into an image" --> C(Generated PNG);
    C -- "3. Uploads image" --> D;
    D -- "4. Returns public image URL" --> B;
    B -- "5. Returns { imageUrl: '...' }" --> A;
    A -- "6. Shares the image URL" --> E;
    E -- "7. Fetches URL & displays rich preview" --> F;
    F -- "8. User clicks card -> opens deep link" --> A;
```

## 4. Detailed Implementation Steps

### Step 1: Create the Serverless Function

-   **Technology**: Supabase Edge Function (Deno environment).
-   **Path**: `supabase/functions/generate-share-card/index.ts`
-   **Method**: `POST`
-   **Logic**:
    -   It will receive a JSON body containing the `gameReport` data.
    -   It will validate the incoming data.
    -   It will orchestrate the steps of rendering, storing, and returning the image URL.

### Step 2: Design the Social Card (HTML & CSS)

-   A new file inside the function directory, e.g., `supabase/functions/generate-share-card/template.tsx`, will define the card's structure using JSX-like syntax compatible with the rendering library.
-   **Card Components**:
    -   **Graph Visualization**: We will need to pass the path data to an SVG generator within the function or pre-generate the SVG on the client.
    -   **QR Code**: A QR code for the deep link will be generated and embedded.
    -   **Text Content**: "I solved `START` to `TARGET` in X steps!", "Can you beat my score?", etc.
    -   **Branding**: Synapse logo and colors.

### Step 3: Render HTML/CSS to an Image

-   **Library**: We will use **Vercel's Satori** (`@vercel/satori`). It's an industry-standard library that takes HTML and CSS and converts it into an SVG.
-   **SVG to PNG Conversion**: Satori outputs an SVG. We will need another library like **`@resvg/resvg-js`** to convert this SVG into a PNG, which has better compatibility for social sharing.
-   **Process**:
    1.  The function reads the `gameReport` data.
    2.  It imports the JSX template and passes the data as props.
    3.  `Satori` renders the JSX to an SVG string.
    4.  `resvg-js` converts the SVG string to a PNG buffer.

### Step 4: Store Image and Return URL

-   The generated PNG buffer will be uploaded to a dedicated bucket in **Supabase Storage** (e.g., `social-cards`).
-   The filename should be unique, perhaps based on a hash of the game parameters, to allow for potential caching.
-   The function will get the public URL for the newly uploaded file and return it in the JSON response.

### Step 5: Client-Side Integration

-   **File to Modify**: `src/services/SharingService.ts`
-   **Logic Change**:
    -   The `shareChallenge` and `shareDailyChallenge` functions will be updated.
    -   Instead of calling `captureRef` or constructing a text message with emojis, they will now make a `POST` request to our new `/generate-share-card` endpoint, sending the `gameReport`.
    -   On success, they will receive a response like `{ imageUrl: 'https://...' }`.
    -   This `imageUrl` is what will be passed to the `Share.share({ url: imageUrl })` function. The `message` part of the share can be simplified or omitted, as the image contains all the necessary context.

## 5. API Contract

**Request:**

`POST /functions/v1/generate-share-card`

**Headers:**

-   `Content-Type: application/json`
-   `Authorization: Bearer <SUPABASE_ANON_KEY>`

**Body:**

```json
{
  "gameReport": {
    "startWord": "string",
    "targetWord": "string",
    "playerPath": ["string"],
    "optimalPath": ["string"],
    "status": "won" | "given_up",
    // ... any other data needed for the card
  },
  "isDailyChallenge": false
}
```

**Success Response (200 OK):**

```json
{
  "imageUrl": "https://<project>.supabase.co/storage/v1/object/public/social-cards/image-hash.png"
}
```

**Error Response (400/500):**

```json
{
  "error": "A descriptive error message."
}
```

## 6. Future Enhancements

-   **Caching**: If two users have the exact same game result, we could re-use the same generated image instead of creating a new one. The image filename could be a hash of the `gameReport` to facilitate this.
-   **Dynamic Themes**: The client could pass a `theme` parameter, and the server could use a different CSS template to render the card in different styles (e.g., light/dark mode, seasonal themes). 