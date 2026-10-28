/**
 * CoinGecko Macro Market Data & Aggregated Intelligence Engine
 * Global Intelligence Terminal (Global.ai)
 *
 * Provides institutional multi-currency market capitalization,
 * global trading volume, 24h performance metrics, and market rankings.
 */

export interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  last_updated: string | null;
}

export interface CoinGeckoQueryParams {
  vs_currency?: string;
  ids?: string;
  per_page?: number;
  page?: number;
  order?: string;
  price_change_percentage?: string;
}

export interface CoinGeckoResponse {
  data: CoinGeckoMarketItem[];
  source: "coingecko-aggregated";
  vs_currency: string;
  timestamp: number;
  count: number;
  cached?: boolean;
}

// In-memory cache to prevent rate-limit exhaustion (CoinGecko Demo: ~30 calls/min)
interface CacheEntry {
  data: CoinGeckoMarketItem[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

/**
 * Determine API Base URL and Authentication Headers based on the provided API key
 */
function getApiConfig(): { baseUrl: string; headers: HeadersInit } {
  const apiKey = (process.env.COINGECKO_API_KEY || "").trim();

  // CoinGecko Demo keys start with "CG-"
  if (apiKey.startsWith("CG-")) {
    return {
      baseUrl: "https://api.coingecko.com/api/v3",
      headers: {
        Accept: "application/json",
        "x-cg-demo-api-key": apiKey,
      },
    };
  }

  // CoinGecko Pro keys
  if (apiKey.length > 0) {
    return {
      baseUrl: "https://pro-api.coingecko.com/api/v3",
      headers: {
        Accept: "application/json",
        "x-cg-pro-api-key": apiKey,
      },
    };
  }

  // Fallback to public tier if no key configured
  return {
    baseUrl: "https://api.coingecko.com/api/v3",
    headers: {
      Accept: "application/json",
    },
  };
}

/**
 * Sanitize and validate request parameters
 */
export function sanitizeParams(params: CoinGeckoQueryParams) {
  const vs_currency = (params.vs_currency || "usd")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const allowedCurrencies = ["usd", "eur", "gbp", "jpy", "inr", "cad", "aud", "chf", "cny", "btc", "eth"];
  const safeCurrency = allowedCurrencies.includes(vs_currency) ? vs_currency : "usd";

  const per_page = Math.min(100, Math.max(1, Number(params.per_page) || 25));
  const page = Math.max(1, Number(params.page) || 1);

  const safeOrder = params.order === "market_cap_asc" || params.order === "volume_desc"
    ? params.order
    : "market_cap_desc";

  let safeIds: string | undefined = undefined;
  if (params.ids && typeof params.ids === "string") {
    // Only allow alphanumeric, hyphens, and commas
    const cleaned = params.ids
      .toLowerCase()
      .split(",")
      .map((id) => id.trim().replace(/[^a-z0-9-_]/g, ""))
      .filter((id) => id.length > 0)
      .slice(0, 50); // limit to 50 coins per query

    if (cleaned.length > 0) {
      safeIds = cleaned.join(",");
    }
  }

  return {
    vs_currency: safeCurrency,
    per_page,
    page,
    order: safeOrder,
    ids: safeIds,
  };
}

/**
 * Fetch CoinGecko market data with timeout, caching, and error safety
 */
export async function fetchCoinGeckoMarkets(
  params: CoinGeckoQueryParams = {}
): Promise<CoinGeckoResponse> {
  const clean = sanitizeParams(params);
  const cacheKey = `${clean.vs_currency}:${clean.ids || "all"}:${clean.per_page}:${clean.page}:${clean.order}`;

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      data: cached.data,
      source: "coingecko-aggregated",
      vs_currency: clean.vs_currency,
      timestamp: cached.timestamp,
      count: cached.data.length,
      cached: true,
    };
  }

  const { baseUrl, headers } = getApiConfig();

  const searchParams = new URLSearchParams({
    vs_currency: clean.vs_currency,
    order: clean.order,
    per_page: clean.per_page.toString(),
    page: clean.page.toString(),
    sparkline: "false",
    price_change_percentage: "24h",
  });

  if (clean.ids) {
    searchParams.set("ids", clean.ids);
  }

  const endpointUrl = `${baseUrl}/coins/markets?${searchParams.toString()}`;

  // 8-second timeout handler
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpointUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
      next: { revalidate: 30 },
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      // If rate-limited and we have stale cached data, return stale data
      if (cached) {
        return {
          data: cached.data,
          source: "coingecko-aggregated",
          vs_currency: clean.vs_currency,
          timestamp: cached.timestamp,
          count: cached.data.length,
          cached: true,
        };
      }
      throw new Error("CoinGecko API rate limit reached. Please wait a moment before refreshing.");
    }

    if (!res.ok) {
      throw new Error(`CoinGecko upstream responded with status ${res.status}`);
    }

    const rawData = await res.json();

    if (!Array.isArray(rawData)) {
      throw new Error("Unexpected response structure from CoinGecko API.");
    }

    // Sanitize and normalize items
    const normalized: CoinGeckoMarketItem[] = rawData.map((item: any) => ({
      id: String(item.id || ""),
      symbol: String(item.symbol || "").toUpperCase(),
      name: String(item.name || ""),
      image: String(item.image || ""),
      current_price: typeof item.current_price === "number" ? item.current_price : null,
      market_cap: typeof item.market_cap === "number" ? item.market_cap : null,
      market_cap_rank: typeof item.market_cap_rank === "number" ? item.market_cap_rank : null,
      total_volume: typeof item.total_volume === "number" ? item.total_volume : null,
      high_24h: typeof item.high_24h === "number" ? item.high_24h : null,
      low_24h: typeof item.low_24h === "number" ? item.low_24h : null,
      price_change_24h: typeof item.price_change_24h === "number" ? item.price_change_24h : null,
      price_change_percentage_24h:
        typeof item.price_change_percentage_24h === "number"
          ? parseFloat(item.price_change_percentage_24h.toFixed(2))
          : null,
      circulating_supply: typeof item.circulating_supply === "number" ? item.circulating_supply : null,
      total_supply: typeof item.total_supply === "number" ? item.total_supply : null,
      max_supply: typeof item.max_supply === "number" ? item.max_supply : null,
      ath: typeof item.ath === "number" ? item.ath : null,
      ath_change_percentage:
        typeof item.ath_change_percentage === "number"
          ? parseFloat(item.ath_change_percentage.toFixed(2))
          : null,
      last_updated: typeof item.last_updated === "string" ? item.last_updated : null,
    }));

    // Save to cache
    cache.set(cacheKey, {
      data: normalized,
      timestamp: now,
    });

    return {
      data: normalized,
      source: "coingecko-aggregated",
      vs_currency: clean.vs_currency,
      timestamp: now,
      count: normalized.length,
      cached: false,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    // If request aborted due to timeout
    if (err.name === "AbortError") {
      if (cached) {
        return {
          data: cached.data,
          source: "coingecko-aggregated",
          vs_currency: clean.vs_currency,
          timestamp: cached.timestamp,
          count: cached.data.length,
          cached: true,
        };
      }
      throw new Error("CoinGecko API request timed out after 8 seconds.");
    }

    throw err;
  }
}
