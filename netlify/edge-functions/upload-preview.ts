// Edge function to upload rich preview data to Netlify Blob

interface PreviewData {
  shareId: string;
  challengeUrl: string;
  title: string;
  description: string;
  graphImageBase64?: string;
  qrCodeData: string;
}

export default async (request: Request, context: any) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { key, data }: { key: string; data: PreviewData } =
      await request.json();

    // Store using Netlify Blob API
    const blobUrl = `${context.site.url}/.netlify/blobs/${key}`;

    const blobResponse = await fetch(blobUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${context.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        uploadedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }),
    });

    if (!blobResponse.ok) {
      throw new Error(`Blob upload failed: ${blobResponse.statusText}`);
    }

    return new Response(JSON.stringify({ success: true, key }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upload preview error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
