/**
 * Finnhub Stock Market Intelligence Engine
 * Global Intelligence Terminal (Global.ai)
 *
 * Provides real-time and consolidated equity quotes, corporate profiles,
 * valuation metrics, company catalysts/news, and US exchange trading sessions.
 */

export interface StockQuote {
  current: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface CompanyProfile {
  ticker: string;
  name: string;
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number; // in Millions USD
  logo: string | null;
  finnhubIndustry: string;
  weburl: string;
}

export interface StockMetrics {
  peTTM: number | null;
  epsTTM: number | null;
  high52: number | null;
  low52: number | null;
  beta: number | null;
  dividendYieldTTM: number | null;
}

export interface CompanyNewsItem {
  id: number;
  datetime: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  category: string;
}

export interface MarketStatus {
  exchange: string;
  isOpen: boolean;
  session: string;
  holiday: string | null;
  timestamp: number;
  timezone: string;
}

export interface StockIntelligenceBundle {
  symbol: string;
  quote: StockQuote | null;
  profile: CompanyProfile | null;
  metrics: StockMetrics | null;
  news: CompanyNewsItem[];
  marketStatus: MarketStatus | null;
  timestamp: number;
  cached: boolean;
  delayNotice: string;
}

export const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms" },
];

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// In-memory cache to conserve Finnhub free plan quota (60 requests/minute)
interface CacheEntry {
  data: StockIntelligenceBundle;
  timestamp: number;
}

const finnhubCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

/**
 * Validate and clean ticker symbol
 */
export function sanitizeTicker(symbol: string): string {
  return symbol
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .slice(0, 10);
}

/**
 * Generic helper to make authenticated server-side calls to Finnhub
 */
async function fetchFinnhub<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const apiKey = (process.env.FINNHUB_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured in .env.local.");
  }

  const searchParams = new URLSearchParams(params);
  searchParams.set("token", apiKey);

  const url = `${FINNHUB_BASE_URL}${endpoint}?${searchParams.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 30 },
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      throw new Error("Finnhub API rate limit reached (60 calls/minute). Please wait.");
    }

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Finnhub request to '${endpoint}' timed out after 8 seconds.`);
    }
    throw err;
  }
}

/**
 * Fetch Stock Quote (/quote)
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const raw: any = await fetchFinnhub("/quote", { symbol });
  if (!raw || typeof raw.c !== "number" || raw.c === 0) {
    return null;
  }
  return {
    current: raw.c,
    change: parseFloat((raw.d ?? 0).toFixed(2)),
    percentChange: parseFloat((raw.dp ?? 0).toFixed(2)),
    high: raw.h ?? 0,
    low: raw.l ?? 0,
    open: raw.o ?? 0,
    previousClose: raw.pc ?? 0,
    timestamp: (raw.t || Math.floor(Date.now() / 1000)) * 1000,
  };
}

/**
 * Fetch Company Profile (/stock/profile2)
 */
export async function getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const raw: any = await fetchFinnhub("/stock/profile2", { symbol });
  if (!raw || !raw.name) {
    return null;
  }
  return {
    ticker: raw.ticker || symbol,
    name: raw.name,
    country: raw.country || "US",
    currency: raw.currency || "USD",
    exchange: raw.exchange || "US Exchange",
    ipo: raw.ipo || "",
    marketCapitalization: typeof raw.marketCapitalization === "number" ? raw.marketCapitalization : 0,
    logo: raw.logo || null,
    finnhubIndustry: raw.finnhubIndustry || "General Equities",
    weburl: raw.weburl || "",
  };
}

/**
 * Fetch Basic Financial Metrics (/stock/metric)
 */
export async function getStockMetrics(symbol: string): Promise<StockMetrics | null> {
  const raw: any = await fetchFinnhub("/stock/metric", { symbol, metric: "all" });
  if (!raw || !raw.metric) {
    return null;
  }
  const m = raw.metric;
  return {
    peTTM: typeof m.peTTM === "number" ? parseFloat(m.peTTM.toFixed(2)) : null,
    epsTTM: typeof m.epsTTM === "number" ? parseFloat(m.epsTTM.toFixed(2)) : null,
    high52: typeof m["52WeekHigh"] === "number" ? parseFloat(m["52WeekHigh"].toFixed(2)) : null,
    low52: typeof m["52WeekLow"] === "number" ? parseFloat(m["52WeekLow"].toFixed(2)) : null,
    beta: typeof m.beta === "number" ? parseFloat(m.beta.toFixed(3)) : null,
    dividendYieldTTM:
      typeof m.dividendYieldIndicatedAnnual === "number"
        ? parseFloat(m.dividendYieldIndicatedAnnual.toFixed(2))
        : null,
  };
}

/**
 * Fetch Recent Company Headlines (/company-news)
 */
export async function getCompanyNews(symbol: string): Promise<CompanyNewsItem[]> {
  const today = new Date();
  const toStr = today.toISOString().split("T")[0];

  const prior = new Date();
  prior.setDate(today.getDate() - 7);
  const fromStr = prior.toISOString().split("T")[0];

  const raw: any = await fetchFinnhub("/company-news", {
    symbol,
    from: fromStr,
    to: toStr,
  });

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.slice(0, 8).map((item: any) => ({
    id: item.id || Math.random(),
    datetime: (item.datetime || Math.floor(Date.now() / 1000)) * 1000,
    headline: item.headline || "Corporate Headline",
    summary: item.summary || "",
    source: item.source || "Market Wire",
    url: item.url || "#",
    image: item.image || null,
    category: item.category || "company",
  }));
}

/**
 * Fetch US Exchange Market Status (/stock/market-status)
 */
export async function getMarketStatus(): Promise<MarketStatus | null> {
  const raw: any = await fetchFinnhub("/stock/market-status", { exchange: "US" });
  if (!raw) {
    return null;
  }
  return {
    exchange: raw.exchange || "US",
    isOpen: Boolean(raw.isOpen),
    session: raw.session || "closed",
    holiday: raw.holiday || null,
    timestamp: (raw.t || Math.floor(Date.now() / 1000)) * 1000,
    timezone: raw.timezone || "America/New_York",
  };
}

/**
 * Composite function to fetch full Stock Intelligence Bundle with caching
 */
export async function getStockIntelligenceBundle(
  rawSymbol: string = "AAPL"
): Promise<StockIntelligenceBundle> {
  const symbol = sanitizeTicker(rawSymbol) || "AAPL";
  const now = Date.now();
  const cached = finnhubCache.get(symbol);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
      timestamp: cached.timestamp,
    };
  }

  // Fetch quote, profile, metrics, news, and market status in parallel
  const [quote, profile, metrics, news, marketStatus] = await Promise.all([
    getStockQuote(symbol),
    getCompanyProfile(symbol),
    getStockMetrics(symbol),
    getCompanyNews(symbol),
    getMarketStatus(),
  ]);

  if (!quote && !profile) {
    throw new Error(`Symbol '${symbol}' not found on Finnhub or exchange coverage is unavailable.`);
  }

  const bundle: StockIntelligenceBundle = {
    symbol,
    quote,
    profile,
    metrics,
    news,
    marketStatus,
    timestamp: now,
    cached: false,
    delayNotice: "Stock quotes and corporate metrics are provided under Finnhub Free Tier specifications (subject to exchange feed delays where applicable).",
  };

  finnhubCache.set(symbol, {
    data: bundle,
    timestamp: now,
  });

  return bundle;
}
