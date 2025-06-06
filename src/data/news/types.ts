export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  date: string; // ISO date string
  priority: "low" | "medium" | "high";
}

export interface NewsCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  articles: NewsArticle[];
}

export interface NewsFolder {
  id: string;
  name: string;
  description: string;
  categories: NewsCategory[];
}
