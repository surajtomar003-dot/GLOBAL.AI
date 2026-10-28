/**
 * ExchangeRate-API Service Layer & Data Models
 *
 * Implements official v6 ExchangeRate-API integration:
 * - Latest exchange rates per base currency (/latest/{BASE})
 * - Pairwise currency conversion (/pair/{BASE}/{TARGET} or local computation)
 * - Metadata tracking: time_last_update_utc, time_next_update_utc
 * - 30-minute in-memory cache to conserve the 1,500 requests/month free tier quota.
 */

export interface CurrencyMetadata {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  country: string;
}

export const COMMON_CURRENCIES: CurrencyMetadata[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", country: "United States" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", country: "Eurozone" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", country: "United Kingdom" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", country: "India" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", country: "Japan" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", country: "China" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", country: "Canada" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", country: "Australia" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", country: "Switzerland" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", country: "Singapore" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪", country: "United Arab Emirates" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", flag: "🇸🇦", country: "Saudi Arabia" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷", country: "South Korea" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", country: "Brazil" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", country: "South Africa" },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", flag: "🇲🇽", country: "Mexico" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰", country: "Hong Kong" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿", country: "New Zealand" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪", country: "Sweden" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴", country: "Norway" },
];

export interface ExchangeRateApiResponse {
  result: "success" | "error";
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  target_code?: string;
  conversion_rate?: number;
  conversion_result?: number;
  "error-type"?: string;
}

export interface ForexBundle {
  base: string;
  target?: string;
  rate?: number;
  conversionResult?: number;
  amount?: number;
  inverseRate?: number;
  rates: Record<string, number>;
  supportedCurrencies: CurrencyMetadata[];
  lastUpdateUtc: string;
  nextUpdateUtc: string;
  timestamp: number;
  cached: boolean;
  stale?: boolean;
  notice: string;
  warning?: string | null;
}

// In-Memory Cache with 30-Minute TTL (1,800,000 ms)
interface CacheEntry {
  data: ForexBundle;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const inMemoryCache = new Map<string, CacheEntry>();

/**
 * Validates and normalizes 3-letter currency codes.
 */
export function validateCurrencyCode(raw: string | null | undefined, defaultCode: string = "USD"): string {
  if (!raw) return defaultCode;
  const cleaned = raw.toUpperCase().trim().replace(/[^A-Z]/g, "").slice(0, 3);
  return cleaned.length === 3 ? cleaned : defaultCode;
}

/**
 * Fetches latest exchange rates from ExchangeRate-API with timeout and caching.
 */
export async function getExchangeRates(
  baseCurrency: string = "USD",
  targetCurrency?: string,
  amount: number = 1
): Promise<ForexBundle> {
  const base = validateCurrencyCode(baseCurrency, "USD");
  const target = targetCurrency ? validateCurrencyCode(targetCurrency, "INR") : undefined;
  const cacheKey = `rates:${base}`;
  const now = Date.now();

  const cached = inMemoryCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    const data = cached.data;
    return enrichConversion(data, base, target, amount, true);
  }

  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) {
    throw new Error("EXCHANGERATE_API_KEY is not configured in server environment.");
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "GLOBAL.AI-Forex/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`ExchangeRate-API HTTP ${res.status}: ${res.statusText}`);
    }

    const json: ExchangeRateApiResponse = await res.json();

    if (json.result === "error") {
      const errType = json["error-type"] || "unknown-error";
      throw new Error(`ExchangeRate-API Error: ${errType}`);
    }

    const bundle: ForexBundle = {
      base: json.base_code,
      rates: json.conversion_rates || {},
      supportedCurrencies: COMMON_CURRENCIES,
      lastUpdateUtc: json.time_last_update_utc,
      nextUpdateUtc: json.time_next_update_utc,
      timestamp: now,
      cached: false,
      notice: "ExchangeRate-API Standard Daily Feeds. Rates refresh daily at 00:00 UTC (not tick-by-tick FX).",
    };

    inMemoryCache.set(cacheKey, { data: bundle, timestamp: now });
    return enrichConversion(bundle, base, target, amount, false);
  } catch (err: any) {
    clearTimeout(timeoutId);

    // If cache exists (even expired), serve stale cache with warning
    if (cached) {
      return enrichConversion(cached.data, base, target, amount, true, `Upstream notice: ${err.message}. Serving cached observation.`);
    }

    if (err.name === "AbortError") {
      throw new Error("ExchangeRate-API upstream request timed out after 8000ms.");
    }
    throw err;
  }
}

/**
 * Computes pair conversion and inverse rate from base bundle.
 */
function enrichConversion(
  bundle: ForexBundle,
  base: string,
  target?: string,
  amount: number = 1,
  isCached: boolean = false,
  warning?: string
): ForexBundle {
  const result: ForexBundle = {
    ...bundle,
    cached: isCached,
    warning: warning || bundle.warning || null,
  };

  if (target && bundle.rates[target]) {
    const rate = bundle.rates[target];
    const convertedAmount = parseFloat((amount * rate).toFixed(4));
    const inverseRate = rate > 0 ? parseFloat((1 / rate).toFixed(6)) : 0;

    result.target = target;
    result.rate = rate;
    result.amount = amount;
    result.conversionResult = convertedAmount;
    result.inverseRate = inverseRate;
  }

  return result;
}
