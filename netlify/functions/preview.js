// Netlify function for handling preview requests
// Now redirects to uploaded preview images or returns fallback

exports.handler = async (event, _context) => {
  try {
    const { queryStringParameters: params } = event;

    if (!params) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing parameters" }),
      };
    }

    const { preview } = params;

    // If we have a preview image URL, redirect to it
    if (preview) {
      return {
        statusCode: 302,
        headers: {
          Location: preview,
          "Cache-Control": "public, max-age=604800", // 7 days cache
        },
      };
    }

    // Fallback: return simple text response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600", // 1 hour cache
      },
      body: "Synapse Word Challenge - No preview image available",
    };
  } catch (error) {
    console.error("Preview function error:", error);

    // Error fallback: return simple text response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=300", // 5 minutes cache for errors
      },
      body: "Synapse Word Challenge",
    };
  }
};
