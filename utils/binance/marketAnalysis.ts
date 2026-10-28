/**
 * Binance Market Analysis & Quantitative Telemetry Engine
 * Global Intelligence Terminal (Global.ai)
 */

export interface Ticker24h {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
}

export interface OrderBookLevel {
  price: number;
  qty: number;
}

export interface OrderBookDepth {
  lastUpdateId: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  totalBidQty: number;
  totalAskQty: number;
  depthSkew: number; // -1.0 (pure asks) to +1.0 (pure bids)
}

export interface CandleStick {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  tradesCount: number;
}

export interface FuturesTelemetry {
  symbol: string;
  openInterest: number;
  fundingRate: number;
  fundingTime: number;
  takerBuySellRatio?: number;
}

export type MarketRegime =
  | "STRONG_ACCUMULATION"
  | "BULLISH_EXPANSION"
  | "COMPRESSION_SQUEEZE"
  | "DISTRIBUTION_RISK"
  | "LIQUIDATION_DUMP"
  | "NEUTRAL_BALANCED";

export interface MarketAnalysisSummary {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24hUsd: number;
  vwap24h: number;
  priceToVwapDeltaPercent: number;
  orderBookSkew: number; // Depth Imbalance Ratio
  orderBookStatus: "HEAVY_BID_WALL" | "HEAVY_ASK_WALL" | "BALANCED";
  futures: FuturesTelemetry | null;
  regime: MarketRegime;
  signal: "BUY" | "ACCUMULATE" | "NEUTRAL" | "TRIM" | "SELL";
  convictionScore: number; // 0 to 100
  keyFactors: string[];
}

const SPOT_API_BASE = "https://api.binance.com";
const FUTURES_API_BASE = "https://fapi.binance.com";

/**
 * Fetch 24-hour ticker statistics from Binance Spot
 */
export async function fetch24hTicker(symbol: string = "BTCUSDT"): Promise<Ticker24h> {
  const url = `${SPOT_API_BASE}/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`;
  const res = await fetch(url, { next: { revalidate: 3 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch 24h ticker for ${symbol}: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    symbol: data.symbol,
    priceChange: parseFloat(data.priceChange),
    priceChangePercent: parseFloat(data.priceChangePercent),
    weightedAvgPrice: parseFloat(data.weightedAvgPrice),
    lastPrice: parseFloat(data.lastPrice),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
    quoteVolume: parseFloat(data.quoteVolume),
    openTime: data.openTime,
    closeTime: data.closeTime,
  };
}

/**
 * Fetch top L20 order book depth and compute depth skew
 */
export async function fetchOrderBookDepth(
  symbol: string = "BTCUSDT",
  limit: number = 20
): Promise<OrderBookDepth> {
  const url = `${SPOT_API_BASE}/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 2 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch order book for ${symbol}: ${res.statusText}`);
  }
  const data = await res.json();

  const bids: OrderBookLevel[] = (data.bids || []).map((b: [string, string]) => ({
    price: parseFloat(b[0]),
    qty: parseFloat(b[1]),
  }));

  const asks: OrderBookLevel[] = (data.asks || []).map((a: [string, string]) => ({
    price: parseFloat(a[0]),
    qty: parseFloat(a[1]),
  }));

  const totalBidQty = bids.reduce((acc, curr) => acc + curr.qty, 0);
  const totalAskQty = asks.reduce((acc, curr) => acc + curr.qty, 0);

  const denom = totalBidQty + totalAskQty;
  const depthSkew = denom > 0 ? (totalBidQty - totalAskQty) / denom : 0;

  return {
    lastUpdateId: data.lastUpdateId,
    bids,
    asks,
    totalBidQty,
    totalAskQty,
    depthSkew: parseFloat(depthSkew.toFixed(4)),
  };
}

/**
 * Fetch historical OHLCV kline bars
 */
export async function fetchKlines(
  symbol: string = "BTCUSDT",
  interval: string = "1h",
  limit: number = 50
): Promise<CandleStick[]> {
  const url = `${SPOT_API_BASE}/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 15 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch klines for ${symbol}: ${res.statusText}`);
  }
  const data = await res.json();

  return data.map((bar: any[]) => ({
    openTime: bar[0],
    open: parseFloat(bar[1]),
    high: parseFloat(bar[2]),
    low: parseFloat(bar[3]),
    close: parseFloat(bar[4]),
    volume: parseFloat(bar[5]),
    closeTime: bar[6],
    quoteVolume: parseFloat(bar[7]),
    tradesCount: bar[8],
  }));
}

/**
 * Fetch USD-M Futures Telemetry (Open Interest & Funding Rate)
 */
export async function fetchFuturesTelemetry(
  symbol: string = "BTCUSDT"
): Promise<FuturesTelemetry | null> {
  try {
    const sym = symbol.toUpperCase();
    const [oiRes, fundingRes] = await Promise.all([
      fetch(`${FUTURES_API_BASE}/fapi/v1/openInterest?symbol=${sym}`, { next: { revalidate: 10 } }),
      fetch(`${FUTURES_API_BASE}/fapi/v1/fundingRate?symbol=${sym}&limit=1`, { next: { revalidate: 30 } }),
    ]);

    if (!oiRes.ok || !fundingRes.ok) {
      return null;
    }

    const oiData = await oiRes.json();
    const fundingData = await fundingRes.json();

    const latestFunding = Array.isArray(fundingData) && fundingData.length > 0 ? fundingData[0] : null;

    return {
      symbol: sym,
      openInterest: parseFloat(oiData.openInterest || "0"),
      fundingRate: latestFunding ? parseFloat(latestFunding.fundingRate || "0") : 0,
      fundingTime: latestFunding ? latestFunding.fundingTime : Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Generate full quantitative Market Analysis Summary
 */
export async function computeMarketAnalysis(
  symbol: string = "BTCUSDT"
): Promise<MarketAnalysisSummary> {
  const [ticker, depth, futures] = await Promise.all([
    fetch24hTicker(symbol),
    fetchOrderBookDepth(symbol, 20),
    fetchFuturesTelemetry(symbol),
  ]);

  const currentPrice = ticker.lastPrice;
  const vwap24h = ticker.weightedAvgPrice;
  const priceToVwapDeltaPercent = vwap24h > 0
    ? parseFloat((((currentPrice - vwap24h) / vwap24h) * 100).toFixed(2))
    : 0;

  let orderBookStatus: "HEAVY_BID_WALL" | "HEAVY_ASK_WALL" | "BALANCED" = "BALANCED";
  if (depth.depthSkew > 0.2) orderBookStatus = "HEAVY_BID_WALL";
  else if (depth.depthSkew < -0.2) orderBookStatus = "HEAVY_ASK_WALL";

  // Regime classification & signal engine
  const factors: string[] = [];
  let score = 50; // base neutral

  if (priceToVwapDeltaPercent > 0.5) {
    score += 15;
    factors.push(`Trading above 24h VWAP (+${priceToVwapDeltaPercent}%)`);
  } else if (priceToVwapDeltaPercent < -0.5) {
    score -= 15;
    factors.push(`Trading below 24h VWAP (${priceToVwapDeltaPercent}%)`);
  }

  if (depth.depthSkew > 0.25) {
    score += 15;
    factors.push(`Significant Bid Wall cushion (+${(depth.depthSkew * 100).toFixed(1)}% skew)`);
  } else if (depth.depthSkew < -0.25) {
    score -= 15;
    factors.push(`Significant Ask Wall resistance (${(depth.depthSkew * 100).toFixed(1)}% skew)`);
  }

  if (futures) {
    const fundingBps = futures.fundingRate * 10000;
    if (fundingBps > 3) {
      factors.push(`High perpetual funding rate (+${fundingBps.toFixed(2)} bps) — longs crowded`);
      score -= 5;
    } else if (fundingBps < -1) {
      factors.push(`Negative funding rate (${fundingBps.toFixed(2)} bps) — short squeeze potential`);
      score += 10;
    }
  }

  score = Math.max(5, Math.min(95, score));

  let regime: MarketRegime = "NEUTRAL_BALANCED";
  let signal: "BUY" | "ACCUMULATE" | "NEUTRAL" | "TRIM" | "SELL" = "NEUTRAL";

  if (score >= 75) {
    regime = "STRONG_ACCUMULATION";
    signal = "BUY";
  } else if (score >= 60) {
    regime = "BULLISH_EXPANSION";
    signal = "ACCUMULATE";
  } else if (score <= 30) {
    regime = "LIQUIDATION_DUMP";
    signal = "SELL";
  } else if (score <= 42) {
    regime = "DISTRIBUTION_RISK";
    signal = "TRIM";
  }

  return {
    symbol: symbol.toUpperCase(),
    timestamp: Date.now(),
    currentPrice,
    change24hPercent: ticker.priceChangePercent,
    high24h: ticker.highPrice,
    low24h: ticker.lowPrice,
    volume24hUsd: ticker.quoteVolume,
    vwap24h,
    priceToVwapDeltaPercent,
    orderBookSkew: depth.depthSkew,
    orderBookStatus,
    futures,
    regime,
    signal,
    convictionScore: score,
    keyFactors: factors,
  };
}

/**
 * Returns Binance WebSocket endpoint stream URL for multi-streams
 */
export function getBinanceWebSocketUrl(streams: string[]): string {
  return `wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`;
}
