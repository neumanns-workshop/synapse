// Export types
export type { NewsArticle } from "./types";

// Import types
import { welcome2025 } from "./posts";
import type { NewsArticle } from "./types";

// Export all articles as a flat array
export const newsArticles: NewsArticle[] = [welcome2025];

// Helper function to get unread articles
export const getUnreadArticles = (readArticleIds: string[]): NewsArticle[] => {
  return newsArticles.filter((article) => !readArticleIds.includes(article.id));
};

// Helper function to get articles sorted by date (newest first)
export const getSortedArticles = (): NewsArticle[] => {
  return [...newsArticles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

// Helper function to format date for display
export const formatNewsDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};
