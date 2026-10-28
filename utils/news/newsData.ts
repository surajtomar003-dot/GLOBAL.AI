/**
 * NewsData.io Financial & Geopolitical News Intelligence Engine
 * Global Intelligence Terminal (Global.ai)
 *
 * Provides real-time macro, market, and macroeconomic news telemetry.
 * Notice: Free plan news feed is delayed by up to 12 hours according to NewsData.io.
 */

export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  pubDate: string;
  image_url: string | null;
  source_id: string;
  source_name: string;
  source_icon: string | null;
  source_url: string | null;
  country: string[];
  category: string[];
  language: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentiment_stats?: {
    positive?: number;
    neutral?: number;
    negative?: number;
  } | null;
}

export interface NewsDataQueryParams {
  q?: string;
  category?: string;
  country?: string;
  language?: string;
  page?: string;
}

export interface NewsApiResponse {
  status: "success" | "error";
  totalResults: number;
  results: NewsArticle[];
  nextPage?: string | null;
  timestamp: number;
  cached: boolean;
  delayedNotice: string;
}

// In-memory cache to conserve Free Plan quota (10-minute TTL)
interface CacheEntry {
  data: NewsApiResponse;
  timestamp: number;
}

const newsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const ALLOWED_CATEGORIES = [
  "business",
  "technology",
  "top",
  "politics",
  "world",
  "science",
];

export const ALLOWED_COUNTRIES = [
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "in", name: "India" },
  { code: "ca", name: "Canada" },
  { code: "au", name: "Australia" },
  { code: "jp", name: "Japan" },
  { code: "de", name: "Germany" },
];

/**
 * Sanitize query parameters
 */
export function sanitizeNewsParams(params: NewsDataQueryParams) {
  const language = (params.language || "en").trim().toLowerCase().replace(/[^a-z]/g, "") || "en";

  let q = params.q ? params.q.trim().slice(0, 80).replace(/[^\w\s-]/gi, "") : undefined;
  if (q && q.length === 0) q = undefined;

  let category = params.category ? params.category.trim().toLowerCase().replace(/[^a-z]/g, "") : undefined;
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    category = "business"; // safe default
  }

  let country = params.country ? params.country.trim().toLowerCase().replace(/[^a-z]/g, "") : undefined;
  if (country && !ALLOWED_COUNTRIES.some((c) => c.code === country)) {
    country = undefined;
  }

  const page = params.page ? params.page.trim().slice(0, 100) : undefined;

  return { q, category, country, language, page };
}

/**
 * Fetch news from NewsData.io API with caching and error protection
 */
export async function fetchNewsArticles(
  params: NewsDataQueryParams = {}
): Promise<NewsApiResponse> {
  const apiKey = (process.env.NEWSDATA_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("NEWSDATA_API_KEY is not configured in .env.local.");
  }

  const clean = sanitizeNewsParams(params);
  const cacheKey = `${clean.q || "default"}:${clean.category || "all"}:${clean.country || "all"}:${clean.language}:${clean.page || "first"}`;

  const now = Date.now();
  const cached = newsCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
      timestamp: cached.timestamp,
    };
  }

  const queryParams = new URLSearchParams({
    apikey: apiKey,
    language: clean.language,
  });

  if (clean.q) queryParams.set("q", clean.q);
  if (clean.category) queryParams.set("category", clean.category);
  if (clean.country) queryParams.set("country", clean.country);
  if (clean.page) queryParams.set("page", clean.page);

  const endpointUrl = `https://newsdata.io/api/1/latest?${queryParams.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpointUrl, {
      signal: controller.signal,
      next: { revalidate: 600 }, // 10 minutes cache in Next.js
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      if (cached) {
        return {
          ...cached.data,
          cached: true,
          delayedNotice: "Rate limit reached. Serving cached news (Delayed by up to 12 hours on free plan).",
        };
      }
      throw new Error("NewsData.io rate limit reached. Please wait a moment before refreshing.");
    }

    if (!res.ok) {
      throw new Error(`NewsData.io upstream responded with status ${res.status}`);
    }

    const json = await res.json();

    if (json.status !== "success" || !Array.isArray(json.results)) {
      throw new Error(json.results?.message || json.message || "Failed to parse NewsData.io response.");
    }

    const articles: NewsArticle[] = json.results.map((raw: any) => ({
      article_id: String(raw.article_id || Math.random().toString(36)),
      title: String(raw.title || "Untitled Article"),
      link: String(raw.link || "#"),
      description: typeof raw.description === "string" ? raw.description : null,
      pubDate: String(raw.pubDate || new Date().toISOString()),
      image_url: typeof raw.image_url === "string" ? raw.image_url : null,
      source_id: String(raw.source_id || "news"),
      source_name: String(raw.source_name || raw.source_id || "Global Wire"),
      source_icon: typeof raw.source_icon === "string" ? raw.source_icon : null,
      source_url: typeof raw.source_url === "string" ? raw.source_url : null,
      country: Array.isArray(raw.country) ? raw.country : [],
      category: Array.isArray(raw.category) ? raw.category : [],
      language: String(raw.language || "english"),
      sentiment: ["positive", "neutral", "negative"].includes(raw.sentiment) ? raw.sentiment : null,
      sentiment_stats: raw.sentiment_stats || null,
    }));

    const responsePayload: NewsApiResponse = {
      status: "success",
      totalResults: typeof json.totalResults === "number" ? json.totalResults : articles.length,
      results: articles,
      nextPage: typeof json.nextPage === "string" ? json.nextPage : null,
      timestamp: now,
      cached: false,
      delayedNotice: "Delayed by up to 12 hours on the current free plan",
    };

    newsCache.set(cacheKey, {
      data: responsePayload,
      timestamp: now,
    });

    return responsePayload;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      if (cached) {
        return {
          ...cached.data,
          cached: true,
          delayedNotice: "Request timed out. Serving cached news (Delayed by up to 12 hours on free plan).",
        };
      }
      throw new Error("NewsData.io request timed out after 8 seconds.");
    }
    throw err;
  }
}
