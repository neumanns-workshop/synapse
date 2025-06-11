// Newsletter sending helper script
// Usage: node scripts/send-newsletter.js <article-id> [--dry-run]
// Example: node scripts/send-newsletter.js welcome-2025 --dry-run

const fs = require("fs");
const path = require("path");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log(
    "Make sure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_SERVICE_KEY set",
  );
  process.exit(1);
}

const articleId = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");

if (!articleId) {
  console.error("❌ Please provide an article ID");
  console.log(
    "Usage: node scripts/send-newsletter.js <article-id> [--dry-run]",
  );
  console.log("Available articles:");

  // List available articles
  const articlesPath = path.join(__dirname, "../src/data/news/posts");
  const files = fs
    .readdirSync(articlesPath)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts");
  files.forEach((file) => {
    const articleId = file.replace(".ts", "");
    console.log(`  - ${articleId}`);
  });
  process.exit(1);
}

async function sendNewsletter() {
  try {
    // Load the article
    const articlePath = path.join(
      __dirname,
      `../src/data/news/posts/${articleId}.ts`,
    );

    if (!fs.existsSync(articlePath)) {
      console.error(`❌ Article not found: ${articleId}`);
      process.exit(1);
    }

    console.log(`📰 Loading article: ${articleId}`);

    // Import the article dynamically (you'll need to manually extract the data)
    // For now, let's read the file and extract the data
    const articleContent = fs.readFileSync(articlePath, "utf8");

    // Basic extraction - handle multi-line template literals
    const titleMatch = articleContent.match(/title:\s*['"`]([^'"`]+)['"`]/);
    const contentMatch = articleContent.match(
      /content:\s*['"`]([\s\S]*?)['"`],?\s*\n\s*date:/,
    );
    const dateMatch = articleContent.match(/date:\s*['"`]([^'"`]+)['"`]/);

    if (!titleMatch || !contentMatch || !dateMatch) {
      console.error(
        "❌ Could not parse article data. Check the article format.",
      );
      process.exit(1);
    }

    const articleData = {
      articleId,
      title: titleMatch[1],
      content: contentMatch[1].replace(/\\n/g, "\n"), // Handle escaped newlines
      date: dateMatch[1],
      priority: "medium", // Default
      dryRun: isDryRun,
    };

    console.log(
      `📧 ${isDryRun ? "DRY RUN - " : ""}Sending newsletter: "${articleData.title}"`,
    );
    console.log(`📅 Date: ${articleData.date}`);

    if (isDryRun) {
      console.log("🔍 This is a dry run - no emails will be sent");
    }

    // Send the newsletter
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-newsletter`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(articleData),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to send newsletter");
    }

    if (isDryRun) {
      console.log("✅ Dry run completed successfully!");
      console.log(`📊 Would send to ${result.recipientCount} users`);
      if (result.recipients && result.recipients.length > 0) {
        console.log("📧 Sample recipients:", result.recipients);
      }
    } else {
      console.log("✅ Newsletter sent successfully!");
      console.log(`📊 Sent to ${result.recipientCount} users`);
      console.log(`📧 Email ID: ${result.id}`);
    }
  } catch (error) {
    console.error("❌ Failed to send newsletter:", error.message);
    process.exit(1);
  }
}

sendNewsletter();
