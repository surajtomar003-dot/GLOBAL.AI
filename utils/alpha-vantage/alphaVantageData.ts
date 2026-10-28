/**
 * Alpha Vantage Service Layer & Data Models
 *
 * Implements official Alpha Vantage API integration:
 * - TIME_SERIES_DAILY (Daily OHLCV historical time series)
 * - GLOBAL_QUOTE (End-of-day summary & trading day volume)
 * - Technical Indicators: SMA, EMA, RSI (Official API endpoints + deterministic math calculation engine)
 * - Aggressive in-memory caching to protect the 25 req/day or 5 req/min free-tier quota.
 */

export interface AlphaVantageDailyPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AlphaVantageDailySeries {
  symbol: string;
  lastRefreshed: string;
  timeZone: string;
  data: AlphaVantageDailyPoint[];
}

export interface AlphaVantageTechnicalPoint {
  date: string;
  value: number;
}

export interface AlphaVantageTechnicalSeries {
  symbol: string;
  indicator: "SMA" | "EMA" | "RSI";
  lastRefreshed: string;
  interval: string;
  timePeriod: number;
  seriesType: string;
  data: AlphaVantageTechnicalPoint[];
  latestValue: number | null;
  source: "Alpha Vantage Official Indicator" | "Derived Deterministic Math";
}

export interface AlphaVantageGlobalQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface AlphaVantageStockBundle {
  symbol: string;
  daily: AlphaVantageDailySeries | null;
  quote: AlphaVantageGlobalQuote | null;
  sma20: AlphaVantageTechnicalSeries | null;
  ema20: AlphaVantageTechnicalSeries | null;
  rsi14: AlphaVantageTechnicalSeries | null;
  timestamp: number;
  cached: boolean;
  stale?: boolean;
  notice: string;
  warning?: string | null;
}

// In-Memory Cache Store (15-Minute TTL to protect 25 req/day free limit)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const inMemoryCache = new Map<string, CacheEntry<any>>();

/**
 * Sanitizes ticker symbols to uppercase alphanumeric strings.
 */
export function sanitizeSymbol(raw: string | null | undefined): string {
  if (!raw) return "AAPL";
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 10);
  return cleaned || "AAPL";
}

/**
 * Fetches with timeout and handles rate limits or errors from Alpha Vantage.
 */
async function fetchAlphaVantageRaw(url: string, timeoutMs: number = 8000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "GLOBAL.AI-Terminal/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Alpha Vantage HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();

    // Check for Alpha Vantage rate limit or error notices
    if (json["Note"]) {
      throw new Error(`Alpha Vantage Quota Notice: ${json["Note"]}`);
    }
    if (json["Information"]) {
      throw new Error(`Alpha Vantage Notice: ${json["Information"]}`);
    }
    if (json["Error Message"]) {
      throw new Error(`Alpha Vantage API Error: ${json["Error Message"]}`);
    }

    return json;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Alpha Vantage upstream request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Parses daily OHLCV from TIME_SERIES_DAILY response.
 */
export function parseDailyTimeSeries(json: any, symbol: string): AlphaVantageDailySeries {
  const meta = json["Meta Data"] || {};
  const rawSeries = json["Time Series (Daily)"] || {};

  const lastRefreshed = meta["3. Last Refreshed"] || meta["2. Last Refreshed"] || new Date().toISOString().split("T")[0];
  const timeZone = meta["5. Time Zone"] || "US/Eastern";

  const dates = Object.keys(rawSeries).sort(); // chronological order
  const data: AlphaVantageDailyPoint[] = [];

  for (const date of dates) {
    const item = rawSeries[date];
    const open = parseFloat(item["1. open"]);
    const high = parseFloat(item["2. high"]);
    const low = parseFloat(item["3. low"]);
    const close = parseFloat(item["4. close"]);
    const volume = parseInt(item["5. volume"], 10);

    if (!isNaN(close) && !isNaN(volume)) {
      data.push({
        date,
        open: isNaN(open) ? close : open,
        high: isNaN(high) ? close : high,
        low: isNaN(low) ? close : low,
        close,
        volume,
      });
    }
  }

  return {
    symbol,
    lastRefreshed,
    timeZone,
    data,
  };
}

/**
 * Parses Global Quote from GLOBAL_QUOTE response.
 */
export function parseGlobalQuote(json: any, symbol: string): AlphaVantageGlobalQuote | null {
  const quote = json["Global Quote"];
  if (!quote || !quote["05. price"]) return null;

  return {
    symbol: quote["01. symbol"] || symbol,
    open: parseFloat(quote["02. open"]) || 0,
    high: parseFloat(quote["03. high"]) || 0,
    low: parseFloat(quote["04. low"]) || 0,
    price: parseFloat(quote["05. price"]) || 0,
    volume: parseInt(quote["06. volume"], 10) || 0,
    latestTradingDay: quote["07. latest trading day"] || new Date().toISOString().split("T")[0],
    previousClose: parseFloat(quote["08. previous close"]) || 0,
    change: parseFloat(quote["09. change"]) || 0,
    changePercent: parseFloat((quote["10. change percent"] || "0").replace("%", "")) || 0,
  };
}

/**
 * Computes deterministic 20-period SMA from chronological daily points.
 */
export function computeSMA(points: AlphaVantageDailyPoint[], period: number = 20, symbol: string): AlphaVantageTechnicalSeries {
  const series: AlphaVantageTechnicalPoint[] = [];
  if (points.length >= period) {
    for (let i = period - 1; i < points.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += points[i - j].close;
      }
      const sma = parseFloat((sum / period).toFixed(4));
      series.push({ date: points[i].date, value: sma });
    }
  }

  const latest = series.length > 0 ? series[series.length - 1].value : null;
  const lastRefreshed = points.length > 0 ? points[points.length - 1].date : "";

  return {
    symbol,
    indicator: "SMA",
    lastRefreshed,
    interval: "daily",
    timePeriod: period,
    seriesType: "close",
    data: series,
    latestValue: latest,
    source: "Derived Deterministic Math",
  };
}

/**
 * Computes deterministic 20-period EMA from chronological daily points.
 */
export function computeEMA(points: AlphaVantageDailyPoint[], period: number = 20, symbol: string): AlphaVantageTechnicalSeries {
  const series: AlphaVantageTechnicalPoint[] = [];
  if (points.length >= period) {
    const k = 2 / (period + 1);
    // Initial EMA is SMA of first 'period' points
    let initialSum = 0;
    for (let j = 0; j < period; j++) {
      initialSum += points[j].close;
    }
    let prevEMA = initialSum / period;
    series.push({ date: points[period - 1].date, value: parseFloat(prevEMA.toFixed(4)) });

    for (let i = period; i < points.length; i++) {
      const currentClose = points[i].close;
      const currentEMA = currentClose * k + prevEMA * (1 - k);
      prevEMA = currentEMA;
      series.push({ date: points[i].date, value: parseFloat(currentEMA.toFixed(4)) });
    }
  }

  const latest = series.length > 0 ? series[series.length - 1].value : null;
  const lastRefreshed = points.length > 0 ? points[points.length - 1].date : "";

  return {
    symbol,
    indicator: "EMA",
    lastRefreshed,
    interval: "daily",
    timePeriod: period,
    seriesType: "close",
    data: series,
    latestValue: latest,
    source: "Derived Deterministic Math",
  };
}

/**
 * Computes standard Wilder's 14-period RSI from chronological daily points.
 */
export function computeRSI(points: AlphaVantageDailyPoint[], period: number = 14, symbol: string): AlphaVantageTechnicalSeries {
  const series: AlphaVantageTechnicalPoint[] = [];
  if (points.length > period) {
    let gains = 0;
    let losses = 0;

    // First period changes
    for (let i = 1; i <= period; i++) {
      const diff = points[i].close - points[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    series.push({ date: points[period].date, value: parseFloat(rsi.toFixed(2)) });

    // Subsequent smoothed periods
    for (let i = period + 1; i < points.length; i++) {
      const diff = points[i].close - points[i - 1].close;
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      series.push({ date: points[i].date, value: parseFloat(rsi.toFixed(2)) });
    }
  }

  const latest = series.length > 0 ? series[series.length - 1].value : null;
  const lastRefreshed = points.length > 0 ? points[points.length - 1].date : "";

  return {
    symbol,
    indicator: "RSI",
    lastRefreshed,
    interval: "daily",
    timePeriod: period,
    seriesType: "close",
    data: series,
    latestValue: latest,
    source: "Derived Deterministic Math",
  };
}

/**
 * Fetches the composite Alpha Vantage Stock Bundle for a ticker.
 */
export async function getAlphaVantageBundle(symbol: string): Promise<AlphaVantageStockBundle> {
  const cleanSymbol = sanitizeSymbol(symbol);
  const cacheKey = `bundle:${cleanSymbol}`;
  const now = Date.now();

  const cached = inMemoryCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return {
      ...cached.data,
      cached: true,
      timestamp: cached.timestamp,
    };
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured in server environment.");
  }

  const baseUrl = "https://www.alphavantage.co/query";

  try {
    // 1. Fetch Daily Time Series (Compact: last 100 days)
    const dailyUrl = `${baseUrl}?function=TIME_SERIES_DAILY&symbol=${cleanSymbol}&outputsize=compact&apikey=${apiKey}`;
    const dailyRaw = await fetchAlphaVantageRaw(dailyUrl);
    const dailySeries = parseDailyTimeSeries(dailyRaw, cleanSymbol);

    if (dailySeries.data.length === 0) {
      throw new Error(`No daily historical time-series data found for symbol '${cleanSymbol}'.`);
    }

    // 2. Fetch Global Quote for latest trading day snapshot
    let globalQuote: AlphaVantageGlobalQuote | null = null;
    try {
      const quoteUrl = `${baseUrl}?function=GLOBAL_QUOTE&symbol=${cleanSymbol}&apikey=${apiKey}`;
      const quoteRaw = await fetchAlphaVantageRaw(quoteUrl);
      globalQuote = parseGlobalQuote(quoteRaw, cleanSymbol);
    } catch {
      // If quote fails or rate limits, derive from last daily bar
      const lastBar = dailySeries.data[dailySeries.data.length - 1];
      const prevBar = dailySeries.data.length > 1 ? dailySeries.data[dailySeries.data.length - 2] : lastBar;
      const change = lastBar.close - prevBar.close;
      const changePct = prevBar.close > 0 ? (change / prevBar.close) * 100 : 0;
      globalQuote = {
        symbol: cleanSymbol,
        open: lastBar.open,
        high: lastBar.high,
        low: lastBar.low,
        price: lastBar.close,
        volume: lastBar.volume,
        latestTradingDay: lastBar.date,
        previousClose: prevBar.close,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePct.toFixed(2)),
      };
    }

    // 3. Compute Technical Indicators (SMA-20, EMA-20, RSI-14) from the daily series
    const sma20 = computeSMA(dailySeries.data, 20, cleanSymbol);
    const ema20 = computeEMA(dailySeries.data, 20, cleanSymbol);
    const rsi14 = computeRSI(dailySeries.data, 14, cleanSymbol);

    const bundle: AlphaVantageStockBundle = {
      symbol: cleanSymbol,
      daily: dailySeries,
      quote: globalQuote,
      sma20,
      ema20,
      rsi14,
      timestamp: now,
      cached: false,
      notice: "Alpha Vantage EOD Historical Telemetry. End-of-day prices delayed by up to 24h on Free Tier.",
    };

    inMemoryCache.set(cacheKey, { data: bundle, timestamp: now });
    return bundle;
  } catch (err: any) {
    // If rate limited or error occurs, serve stale cache if available
    if (cached) {
      return {
        ...cached.data,
        cached: true,
        stale: true,
        warning: `Upstream warning: ${err.message}. Serving cached observation.`,
      };
    }
    throw err;
  }
}

/**
 * Fetches standalone official technical indicator from Alpha Vantage.
 */
export async function getOfficialIndicator(
  symbol: string,
  indicator: "SMA" | "EMA" | "RSI",
  timePeriod: number = 20
): Promise<AlphaVantageTechnicalSeries> {
  const cleanSymbol = sanitizeSymbol(symbol);
  const cacheKey = `ind:${indicator}:${cleanSymbol}:${timePeriod}`;
  const now = Date.now();

  const cached = inMemoryCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured.");
  }

  const url = `https://www.alphavantage.co/query?function=${indicator}&symbol=${cleanSymbol}&interval=daily&time_period=${timePeriod}&series_type=close&apikey=${apiKey}`;
  const json = await fetchAlphaVantageRaw(url);

  const seriesKey = `Technical Analysis: ${indicator}`;
  const rawData = json[seriesKey] || {};
  const dates = Object.keys(rawData).sort();

  const series: AlphaVantageTechnicalPoint[] = [];
  for (const date of dates) {
    const val = parseFloat(rawData[date][indicator]);
    if (!isNaN(val)) {
      series.push({ date, value: val });
    }
  }

  const latest = series.length > 0 ? series[series.length - 1].value : null;
  const lastRefreshed = json["Meta Data"]?.["3: Last Refreshed"] || (series.length > 0 ? series[series.length - 1].date : "");

  const result: AlphaVantageTechnicalSeries = {
    symbol: cleanSymbol,
    indicator,
    lastRefreshed,
    interval: "daily",
    timePeriod,
    seriesType: "close",
    data: series,
    latestValue: latest,
    source: "Alpha Vantage Official Indicator",
  };

  inMemoryCache.set(cacheKey, { data: result, timestamp: now });
  return result;
}
