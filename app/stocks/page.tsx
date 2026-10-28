"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  StockIntelligenceBundle,
  POPULAR_SYMBOLS,
} from "@/utils/finnhub/stockData";
import {
  AlphaVantageStockBundle,
} from "@/utils/alpha-vantage/alphaVantageData";

export default function StockIntelligencePage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Finnhub Data State
  const [data, setData] = useState<StockIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Alpha Vantage Data State
  const [avData, setAvData] = useState<AlphaVantageStockBundle | null>(null);
  const [avLoading, setAvLoading] = useState<boolean>(true);
  const [avError, setAvError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"30D" | "60D" | "ALL">("ALL");
  const [showHistoryTable, setShowHistoryTable] = useState<boolean>(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Global Controls
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const fetchStockData = useCallback(
    async (symbolToFetch: string, isManual: boolean = false) => {
      if (isManual) setRefreshing(true);
      else {
        setLoading(true);
        setAvLoading(true);
      }
      setError(null);
      setAvError(null);

      const clean = encodeURIComponent(symbolToFetch);

      // Concurrent Finnhub query
      const finnhubPromise = fetch(`/api/finnhub?symbol=${clean}`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json.message || `HTTP ${res.status}: Failed to fetch Finnhub equity intelligence.`);
          }
          setData(json);
        })
        .catch((err: any) => {
          setError(err?.message || "Finnhub quote error.");
        })
        .finally(() => setLoading(false));

      // Concurrent Alpha Vantage query
      const avPromise = fetch(`/api/alpha-vantage?symbol=${clean}`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json.message || `HTTP ${res.status}: Failed to fetch Alpha Vantage historical telemetry.`);
          }
          setAvData(json);
        })
        .catch((err: any) => {
          setAvError(err?.message || "Alpha Vantage telemetry notice or rate limit.");
        })
        .finally(() => setAvLoading(false));

      await Promise.allSettled([finnhubPromise, avPromise]);
      setRefreshing(false);
      if (isManual) {
        setCooldown(10);
      }
    },
    []
  );

  useEffect(() => {
    fetchStockData(selectedSymbol);
  }, [fetchStockData, selectedSymbol]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.trim().toUpperCase();
    setSelectedSymbol(clean);
    setSearchQuery("");
  };

  const quote = data?.quote;
  const profile = data?.profile;
  const metrics = data?.metrics;
  const news = data?.news || [];
  const marketStatus = data?.marketStatus;

  const isPositive = quote ? quote.change >= 0 : true;

  const formatLargeMarketCap = (capMillions: number | undefined | null) => {
    if (!capMillions || capMillions === 0) return "—";
    if (capMillions >= 1e6) {
      return `$${(capMillions / 1e6).toFixed(2)}T`;
    }
    if (capMillions >= 1e3) {
      return `$${(capMillions / 1e3).toFixed(2)}B`;
    }
    return `$${capMillions.toFixed(1)}M`;
  };

  const getSessionBadge = () => {
    if (!marketStatus) return null;
    let bg = "rgba(139, 152, 167, 0.15)";
    let color = "#8B98A7";
    const session = marketStatus.session.toLowerCase();

    if (session === "regular" || marketStatus.isOpen) {
      bg = "rgba(52, 211, 153, 0.15)";
      color = "#34D399";
    } else if (session === "pre-market") {
      bg = "rgba(79, 209, 229, 0.15)";
      color = "#4FD1E5";
    } else if (session === "post-market") {
      bg = "rgba(232, 181, 99, 0.15)";
      color = "#E8B563";
    }

    return (
      <span style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        backgroundColor: bg,
        color,
        border: `1px solid ${color}`,
        textTransform: "uppercase"
      }}>
        {marketStatus.session}
      </span>
    );
  };

  // Filtered Alpha Vantage daily points
  const visiblePoints = useMemo(() => {
    if (!avData?.daily?.data) return [];
    const all = avData.daily.data;
    if (timeframe === "30D") return all.slice(-30);
    if (timeframe === "60D") return all.slice(-60);
    return all;
  }, [avData, timeframe]);

  // Lookup maps for SMA, EMA, RSI
  const smaMap = useMemo(() => {
    const map = new Map<string, number>();
    avData?.sma20?.data.forEach((p) => map.set(p.date, p.value));
    return map;
  }, [avData]);

  const emaMap = useMemo(() => {
    const map = new Map<string, number>();
    avData?.ema20?.data.forEach((p) => map.set(p.date, p.value));
    return map;
  }, [avData]);

  const rsiMap = useMemo(() => {
    const map = new Map<string, number>();
    avData?.rsi14?.data.forEach((p) => map.set(p.date, p.value));
    return map;
  }, [avData]);

  // Chart min/max scaling
  const chartScales = useMemo(() => {
    if (visiblePoints.length < 2) return null;
    const prices = visiblePoints.map((p) => p.close);
    
    // Include SMA and EMA in price range calculation to prevent clipping
    visiblePoints.forEach((p) => {
      const sma = smaMap.get(p.date);
      if (sma) prices.push(sma);
      const ema = emaMap.get(p.date);
      if (ema) prices.push(ema);
    });

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const volumes = visiblePoints.map((p) => p.volume);
    const maxVolume = Math.max(...volumes) || 1;

    return { minPrice, maxPrice, priceRange, maxVolume };
  }, [visiblePoints, smaMap, emaMap]);

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#05070A",
      color: "#F2F5F7",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: "2rem"
    }}>
      {/* Top Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #1C2530",
        paddingBottom: "1.25rem",
        marginBottom: "1.75rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Global Intelligence — Equity Markets & Technical Telemetry
            </h1>
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.2rem 0.55rem",
              borderRadius: "4px",
              backgroundColor: "rgba(79, 209, 229, 0.15)",
              color: "#4FD1E5",
              border: "1px solid rgba(79, 209, 229, 0.3)"
            }}>
              FINNHUB + ALPHA VANTAGE
            </span>
            {getSessionBadge()}
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Institutional equity quotes, historical OHLCV charts, moving averages (SMA/EMA), RSI momentum, valuation ratios, and corporate catalysts
          </p>
        </div>

        {/* Navigation & Controls */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => fetchStockData(selectedSymbol, true)}
            disabled={refreshing || cooldown > 0}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: cooldown > 0 ? "#141B24" : "rgba(52, 211, 153, 0.12)",
              border: `1px solid ${cooldown > 0 ? "#1C2530" : "rgba(52, 211, 153, 0.3)"}`,
              color: cooldown > 0 ? "#5C6773" : "#34D399",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: cooldown > 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>{refreshing ? "⟳ Refreshing..." : cooldown > 0 ? `Wait ${cooldown}s` : "⟳ Refresh"}</span>
          </button>

          <Link
            href="/weather"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#8B98A7",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            🌤️ Weather ↗
          </Link>

          <Link
            href="/news"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#8B98A7",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            📰 News Wire ↗
          </Link>

          <Link
            href="/macro"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "rgba(232, 181, 99, 0.12)",
              border: "1px solid rgba(232, 181, 99, 0.3)",
              color: "#E8B563",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            🏛️ FRED Macro ↗
          </Link>

          <Link
            href="/"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#8B98A7",
              textDecoration: "none",
              fontSize: "0.82rem"
            }}
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* Disclaimers & Delayed Data Notice */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(16, 21, 28, 0.8)",
        border: "1px solid #1C2530",
        borderRadius: "8px",
        padding: "0.75rem 1.25rem",
        marginBottom: "1.75rem",
        fontSize: "0.8rem",
        color: "#8B98A7",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <div style={{ maxWidth: "880px" }}>
          <strong style={{ color: "#E8B563" }}>Data Integrity & Delay Notice:</strong> Real-time/consolidated intraday quotes and news are powered by Finnhub Free Tier specifications. Historical OHLCV series, moving averages (SMA/EMA), and RSI are computed from Alpha Vantage End-of-Day feeds (delayed by up to 24h on free tier, 25 requests/day standard limit). This dashboard is strictly for macroeconomic and algorithmic research; no brokerage trades are executed.
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.75rem", color: "#5C6773" }}>
          {data?.timestamp && (
            <span>Finnhub: {new Date(data.timestamp).toLocaleTimeString()} {data.cached ? "(Cached)" : "(Live)"}</span>
          )}
          {avData?.timestamp && (
            <span>Alpha Vantage: {new Date(avData.timestamp).toLocaleTimeString()} {avData.cached ? "(Cached)" : "(Live)"}</span>
          )}
        </div>
      </div>

      {/* Watchlist Quick Ribbon & Symbol Search */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.75rem"
      }}>
        {/* Watchlist Pills */}
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "#8B98A7", marginRight: "0.3rem", textTransform: "uppercase" }}>Watchlist:</span>
          {POPULAR_SYMBOLS.map((item) => (
            <button
              key={item.symbol}
              onClick={() => setSelectedSymbol(item.symbol)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "5px",
                border: `1px solid ${selectedSymbol === item.symbol ? "#4FD1E5" : "#1C2530"}`,
                backgroundColor: selectedSymbol === item.symbol ? "rgba(79, 209, 229, 0.15)" : "#10151C",
                color: selectedSymbol === item.symbol ? "#4FD1E5" : "#8B98A7",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {item.symbol}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.4rem" }}>
          <input
            type="text"
            placeholder="Search ticker (e.g. NVDA, IBM, MSFT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#F2F5F7",
              fontSize: "0.82rem",
              minWidth: "240px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              backgroundColor: "#141B24",
              border: "1px solid #4FD1E5",
              color: "#4FD1E5",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Lookup
          </button>
        </form>
      </div>

      {/* Finnhub Error Banner */}
      {error && (
        <div style={{
          backgroundColor: "rgba(240, 97, 107, 0.12)",
          border: "1px solid rgba(240, 97, 107, 0.3)",
          color: "#F0616B",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Finnhub Notice:</strong> {error}
          </div>
          <button
            onClick={() => fetchStockData(selectedSymbol, true)}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: "4px",
              backgroundColor: "rgba(240, 97, 107, 0.2)",
              border: "1px solid #F0616B",
              color: "#F2F5F7",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Alpha Vantage Notice Banner */}
      {avError && (
        <div style={{
          backgroundColor: "rgba(232, 181, 99, 0.12)",
          border: "1px solid rgba(232, 181, 99, 0.3)",
          color: "#E8B563",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Alpha Vantage Rate Limit or Quota Notice:</strong> {avError}
          </div>
          <button
            onClick={() => fetchStockData(selectedSymbol, true)}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: "4px",
              backgroundColor: "rgba(232, 181, 99, 0.2)",
              border: "1px solid #E8B563",
              color: "#F2F5F7",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3.5rem",
          textAlign: "center",
          color: "#8B98A7",
          marginBottom: "1.5rem"
        }}>
          <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4FD1E5" }}>
            ⟳ Ingesting Institutional Telemetry for {selectedSymbol}...
          </div>
          <p style={{ fontSize: "0.85rem", color: "#5C6773" }}>
            Querying Finnhub quotes, valuation ratios, and Alpha Vantage historical OHLCV curves
          </p>
        </div>
      )}

      {/* Main Stock Content Grid */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {/* Primary Quote Card */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {profile?.logo && (
                  <img
                    src={profile.logo}
                    alt={profile.name}
                    width={32}
                    height={32}
                    style={{ borderRadius: "6px", backgroundColor: "#fff", padding: "2px" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "monospace", color: "#4FD1E5" }}>
                      {data.symbol}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#8B98A7" }}>
                      {profile?.exchange || "US"}
                    </span>
                  </div>
                  <h2 style={{ margin: "0.2rem 0 0 0", fontSize: "1rem", color: "#F2F5F7" }}>
                    {profile?.name || data.symbol}
                  </h2>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "#8B98A7", textAlign: "right" }}>
                <div>Sector: <strong style={{ color: "#F2F5F7" }}>{profile?.finnhubIndustry || "—"}</strong></div>
                <div>Currency: <strong style={{ color: "#F2F5F7" }}>{profile?.currency || "USD"}</strong></div>
              </div>
            </div>

            {/* Current Price */}
            <div style={{ margin: "1rem 0" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#F2F5F7" }}>
                ${quote ? quote.current.toFixed(2) : "—"}
              </div>

              {quote && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.25rem" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    backgroundColor: isPositive ? "rgba(52, 211, 153, 0.15)" : "rgba(240, 97, 107, 0.15)",
                    color: isPositive ? "#34D399" : "#F0616B"
                  }}>
                    {isPositive ? "+" : ""}${quote.change.toFixed(2)} ({isPositive ? "+" : ""}{quote.percentChange.toFixed(2)}%)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#5C6773" }}>Intraday Live / Delayed Session</span>
                </div>
              )}
            </div>

            {/* Intraday Levels Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid #161D26",
              fontSize: "0.82rem"
            }}>
              <div>
                <span style={{ color: "#5C6773" }}>Open: </span>
                <span style={{ fontFamily: "monospace", color: "#F2F5F7" }}>${quote?.open.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>Prev Close: </span>
                <span style={{ fontFamily: "monospace", color: "#F2F5F7" }}>${quote?.previousClose.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>Day High: </span>
                <span style={{ fontFamily: "monospace", color: "#34D399" }}>${quote?.high.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>Day Low: </span>
                <span style={{ fontFamily: "monospace", color: "#F0616B" }}>${quote?.low.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>Market Cap: </span>
                <span style={{ fontFamily: "monospace", color: "#F2F5F7" }}>{formatLargeMarketCap(profile?.marketCapitalization)}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>Web: </span>
                {profile?.weburl ? (
                  <a href={profile.weburl} target="_blank" rel="noopener noreferrer" style={{ color: "#4FD1E5", textDecoration: "none" }}>
                    Visit Company ↗
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>

          {/* Valuation & Fundamental Ratios */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem"
          }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", fontWeight: 700 }}>
              Fundamental & Valuation Ratios
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#8B98A7", textTransform: "uppercase" }}>P/E Ratio (TTM)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#F2F5F7", fontFamily: "monospace", margin: "0.25rem 0" }}>
                  {metrics?.peTTM ? metrics.peTTM.toFixed(2) : "—"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#5C6773" }}>Trailing twelve months</div>
              </div>

              <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#8B98A7", textTransform: "uppercase" }}>Diluted EPS (TTM)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#F2F5F7", fontFamily: "monospace", margin: "0.25rem 0" }}>
                  {metrics?.epsTTM ? `$${metrics.epsTTM.toFixed(2)}` : "—"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#5C6773" }}>Earnings per share</div>
              </div>

              <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#8B98A7", textTransform: "uppercase" }}>52-Week Range</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F2F5F7", fontFamily: "monospace", margin: "0.35rem 0" }}>
                  <span style={{ color: "#F0616B" }}>${metrics?.low52 ?? "—"}</span> — <span style={{ color: "#34D399" }}>${metrics?.high52 ?? "—"}</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#5C6773" }}>Trailing annual spread</div>
              </div>

              <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#8B98A7", textTransform: "uppercase" }}>Beta (5Y)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#4FD1E5", fontFamily: "monospace", margin: "0.25rem 0" }}>
                  {metrics?.beta ? metrics.beta.toFixed(2) : "—"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#5C6773" }}>Market sensitivity vs S&P 500</div>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem", padding: "0.75rem", borderRadius: "6px", backgroundColor: "#0B0F14", border: "1px solid #1C2530", fontSize: "0.78rem", color: "#8B98A7" }}>
              Trading Session: <strong style={{ color: "#F2F5F7" }}>{marketStatus ? marketStatus.session.toUpperCase() : "US REGULAR"}</strong> ({marketStatus?.timezone || "America/New_York"})
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALPHA VANTAGE TECHNICAL TELEMETRY & HISTORICAL OHLCV CHART                */}
      {/* ========================================================================= */}
      <section style={{
        marginTop: "2rem",
        backgroundColor: "#10151C",
        border: "1px solid #1C2530",
        borderRadius: "10px",
        padding: "1.5rem"
      }}>
        {/* Section Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Alpha Vantage Historical Telemetry & Technical Analysis ({selectedSymbol})
              </h3>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                backgroundColor: "rgba(232, 181, 99, 0.15)",
                color: "#E8B563",
                border: "1px solid rgba(232, 181, 99, 0.3)"
              }}>
                ALPHA VANTAGE EOD
              </span>
            </div>
            <p style={{ margin: "0.25rem 0 0 0", color: "#8B98A7", fontSize: "0.8rem" }}>
              End-of-day daily OHLCV bars, 20-Day SMA, 20-Day EMA, and 14-Day RSI momentum oscillators
            </p>
          </div>

          {/* Timeframe & Action Controls */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {(["30D", "60D", "ALL"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "5px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: timeframe === tf ? "#4FD1E5" : "#0B0F14",
                  color: timeframe === tf ? "#05070A" : "#8B98A7",
                  border: `1px solid ${timeframe === tf ? "#4FD1E5" : "#1C2530"}`
                }}
              >
                {tf === "ALL" ? "100D (Full)" : tf}
              </button>
            ))}

            <button
              onClick={() => setShowHistoryTable(!showHistoryTable)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: "#0B0F14",
                color: showHistoryTable ? "#4FD1E5" : "#8B98A7",
                border: "1px solid #1C2530"
              }}
            >
              {showHistoryTable ? "Hide OHLCV Table" : "View OHLCV Table"}
            </button>
          </div>
        </div>

        {/* Technical Scorecards Ribbon */}
        {avData && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem"
          }}>
            {/* Latest Observation Date */}
            <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "0.85rem" }}>
              <div style={{ fontSize: "0.7rem", color: "#8B98A7", textTransform: "uppercase" }}>EOD Refreshed Date</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#F2F5F7", fontFamily: "monospace", marginTop: "0.2rem" }}>
                {avData.daily?.lastRefreshed || avData.quote?.latestTradingDay || "—"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#5C6773" }}>{avData.daily?.timeZone || "US/Eastern"}</div>
            </div>

            {/* Trading Volume */}
            <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "0.85rem" }}>
              <div style={{ fontSize: "0.7rem", color: "#8B98A7", textTransform: "uppercase" }}>EOD Volume</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4FD1E5", fontFamily: "monospace", marginTop: "0.2rem" }}>
                {avData.quote?.volume ? avData.quote.volume.toLocaleString() : visiblePoints.length > 0 ? visiblePoints[visiblePoints.length - 1].volume.toLocaleString() : "—"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#5C6773" }}>Shares traded on latest session</div>
            </div>

            {/* 20-Day SMA */}
            <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#8B98A7", textTransform: "uppercase" }}>SMA (20-Day)</span>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#E8B563" }}></span>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#E8B563", fontFamily: "monospace", marginTop: "0.2rem" }}>
                {avData.sma20?.latestValue ? `$${avData.sma20.latestValue.toFixed(2)}` : "—"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#5C6773" }}>
                {avData.quote?.price && avData.sma20?.latestValue
                  ? `${((avData.quote.price - avData.sma20.latestValue) / avData.sma20.latestValue * 100).toFixed(2)}% vs Price`
                  : "Simple Moving Average"}
              </div>
            </div>

            {/* 20-Day EMA */}
            <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#8B98A7", textTransform: "uppercase" }}>EMA (20-Day)</span>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#34D399" }}></span>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34D399", fontFamily: "monospace", marginTop: "0.2rem" }}>
                {avData.ema20?.latestValue ? `$${avData.ema20.latestValue.toFixed(2)}` : "—"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#5C6773" }}>
                {avData.quote?.price && avData.ema20?.latestValue
                  ? `${((avData.quote.price - avData.ema20.latestValue) / avData.ema20.latestValue * 100).toFixed(2)}% vs Price`
                  : "Exponential Moving Average"}
              </div>
            </div>

            {/* 14-Day RSI */}
            <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderRadius: "8px", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#8B98A7", textTransform: "uppercase" }}>RSI (14-Day)</span>
                {avData.rsi14?.latestValue && (
                  <span style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.35rem",
                    borderRadius: "3px",
                    backgroundColor: avData.rsi14.latestValue >= 70 ? "rgba(240, 97, 107, 0.2)" : avData.rsi14.latestValue <= 30 ? "rgba(52, 211, 153, 0.2)" : "rgba(139, 152, 167, 0.2)",
                    color: avData.rsi14.latestValue >= 70 ? "#F0616B" : avData.rsi14.latestValue <= 30 ? "#34D399" : "#8B98A7"
                  }}>
                    {avData.rsi14.latestValue >= 70 ? "OVERBOUGHT" : avData.rsi14.latestValue <= 30 ? "OVERSOLD" : "NEUTRAL"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#A78BFA", fontFamily: "monospace", marginTop: "0.2rem" }}>
                {avData.rsi14?.latestValue ? avData.rsi14.latestValue.toFixed(2) : "—"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#5C6773" }}>Relative Strength Oscillator</div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {avLoading && !avData && (
          <div style={{
            height: "220px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0B0F14",
            border: "1px solid #1C2530",
            borderRadius: "8px",
            color: "#8B98A7"
          }}>
            <div>
              <div style={{ fontSize: "1rem", color: "#4FD1E5", marginBottom: "0.4rem" }}>
                ⟳ Parsing Daily OHLCV & Technical Signals for {selectedSymbol}...
              </div>
              <div style={{ fontSize: "0.78rem", color: "#5C6773" }}>
                Fetching historical daily series from Alpha Vantage
              </div>
            </div>
          </div>
        )}

        {/* Interactive SVG Chart */}
        {!avLoading && visiblePoints.length >= 2 && chartScales && (
          <div>
            {/* Chart Legends & Hover Readout */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "#0B0F14",
              border: "1px solid #1C2530",
              borderRadius: "6px 6px 0 0",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              {/* Legends */}
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#4FD1E5" }}>
                  <span style={{ width: "12px", height: "3px", backgroundColor: "#4FD1E5", display: "inline-block" }}></span>
                  Close Price
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#E8B563" }}>
                  <span style={{ width: "12px", height: "2px", backgroundColor: "#E8B563", display: "inline-block" }}></span>
                  SMA (20)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#34D399" }}>
                  <span style={{ width: "12px", height: "2px", backgroundColor: "#34D399", display: "inline-block" }}></span>
                  EMA (20)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#5C6773" }}>
                  <span style={{ width: "8px", height: "8px", backgroundColor: "rgba(79, 209, 229, 0.3)", display: "inline-block" }}></span>
                  Volume
                </span>
              </div>

              {/* Point Readout */}
              <div style={{ fontFamily: "monospace", color: "#F2F5F7" }}>
                {hoveredPointIndex !== null && visiblePoints[hoveredPointIndex] ? (
                  <span>
                    <strong style={{ color: "#8B98A7" }}>{visiblePoints[hoveredPointIndex].date}</strong> | Close: <strong style={{ color: "#4FD1E5" }}>${visiblePoints[hoveredPointIndex].close.toFixed(2)}</strong> | Vol: <strong>{visiblePoints[hoveredPointIndex].volume.toLocaleString()}</strong>
                    {smaMap.get(visiblePoints[hoveredPointIndex].date) && (
                      <span style={{ color: "#E8B563", marginLeft: "0.5rem" }}>SMA: ${smaMap.get(visiblePoints[hoveredPointIndex].date)?.toFixed(2)}</span>
                    )}
                    {emaMap.get(visiblePoints[hoveredPointIndex].date) && (
                      <span style={{ color: "#34D399", marginLeft: "0.5rem" }}>EMA: ${emaMap.get(visiblePoints[hoveredPointIndex].date)?.toFixed(2)}</span>
                    )}
                  </span>
                ) : (
                  <span style={{ color: "#5C6773" }}>
                    Hover chart for date inspection | Showing {visiblePoints.length} Daily Bars
                  </span>
                )}
              </div>
            </div>

            {/* SVG Main Price & Moving Averages Chart */}
            {(() => {
              const svgWidth = 800;
              const svgHeight = 220;
              const paddingY = 15;
              const chartH = svgHeight - paddingY * 2;
              const N = visiblePoints.length;

              const getX = (idx: number) => (idx / (N - 1)) * svgWidth;
              const getY = (val: number) =>
                svgHeight - paddingY - ((val - chartScales.minPrice) / chartScales.priceRange) * chartH;

              // Price line points
              const pricePoints = visiblePoints.map((p, i) => `${getX(i).toFixed(1)},${getY(p.close).toFixed(1)}`);
              const pricePath = `M ${pricePoints.join(" L ")}`;
              const areaPath = `${pricePath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

              // SMA line points
              const smaPoints: string[] = [];
              visiblePoints.forEach((p, i) => {
                const sma = smaMap.get(p.date);
                if (sma !== undefined) {
                  smaPoints.push(`${getX(i).toFixed(1)},${getY(sma).toFixed(1)}`);
                }
              });
              const smaPath = smaPoints.length > 1 ? `M ${smaPoints.join(" L ")}` : "";

              // EMA line points
              const emaPoints: string[] = [];
              visiblePoints.forEach((p, i) => {
                const ema = emaMap.get(p.date);
                if (ema !== undefined) {
                  emaPoints.push(`${getX(i).toFixed(1)},${getY(ema).toFixed(1)}`);
                }
              });
              const emaPath = emaPoints.length > 1 ? `M ${emaPoints.join(" L ")}` : "";

              return (
                <div
                  style={{
                    backgroundColor: "#0B0F14",
                    border: "1px solid #1C2530",
                    borderTop: "none",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const idx = Math.round(ratio * (N - 1));
                    setHoveredPointIndex(idx);
                  }}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{ width: "100%", height: "220px", display: "block" }}
                  >
                    <defs>
                      <linearGradient id="price-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4FD1E5" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4FD1E5" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Price Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                      const y = paddingY + pct * chartH;
                      const val = chartScales.maxPrice - pct * chartScales.priceRange;
                      return (
                        <g key={pct}>
                          <line
                            x1="0"
                            y1={y}
                            x2={svgWidth}
                            y2={y}
                            stroke="#161D26"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={svgWidth - 6}
                            y={y - 3}
                            fill="#5C6773"
                            fontSize="10"
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            ${val.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Volume Bars */}
                    {visiblePoints.map((p, i) => {
                      const barH = (p.volume / chartScales.maxVolume) * 45;
                      const x = getX(i) - (svgWidth / N / 2.5);
                      const y = svgHeight - barH;
                      const barW = Math.max(2, svgWidth / N * 0.7);
                      return (
                        <rect
                          key={`vol-${p.date}`}
                          x={x}
                          y={y}
                          width={barW}
                          height={barH}
                          fill={p.close >= p.open ? "rgba(52, 211, 153, 0.15)" : "rgba(240, 97, 107, 0.15)"}
                        />
                      );
                    })}

                    {/* Price Area & Line */}
                    <path d={areaPath} fill="url(#price-grad)" />
                    <path
                      d={pricePath}
                      fill="none"
                      stroke="#4FD1E5"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* SMA Line */}
                    {smaPath && (
                      <path
                        d={smaPath}
                        fill="none"
                        stroke="#E8B563"
                        strokeWidth="1.8"
                        strokeDasharray="3 2"
                      />
                    )}

                    {/* EMA Line */}
                    {emaPath && (
                      <path
                        d={emaPath}
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="1.8"
                      />
                    )}

                    {/* Hover vertical crosshair */}
                    {hoveredPointIndex !== null && (
                      <line
                        x1={getX(hoveredPointIndex)}
                        y1="0"
                        x2={getX(hoveredPointIndex)}
                        y2={svgHeight}
                        stroke="#8B98A7"
                        strokeDasharray="2 2"
                      />
                    )}
                  </svg>
                </div>
              );
            })()}

            {/* RSI (14) Oscillator Sub-Chart */}
            <div style={{ marginTop: "1rem" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.35rem 0.75rem",
                backgroundColor: "#0B0F14",
                border: "1px solid #1C2530",
                fontSize: "0.72rem"
              }}>
                <span style={{ color: "#A78BFA", fontWeight: 700 }}>
                  RSI (14) Momentum Oscillator
                </span>
                <span style={{ color: "#5C6773" }}>
                  Overbought: &gt;70 | Neutral: 30-70 | Oversold: &lt;30
                </span>
              </div>

              {(() => {
                const rsiWidth = 800;
                const rsiHeight = 85;
                const padY = 8;
                const rsiChartH = rsiHeight - padY * 2;
                const N = visiblePoints.length;

                const getRsiY = (val: number) => rsiHeight - padY - (val / 100) * rsiChartH;
                const getX = (idx: number) => (idx / (N - 1)) * rsiWidth;

                const rsiPoints: string[] = [];
                visiblePoints.forEach((p, i) => {
                  const rsi = rsiMap.get(p.date);
                  if (rsi !== undefined) {
                    rsiPoints.push(`${getX(i).toFixed(1)},${getRsiY(rsi).toFixed(1)}`);
                  }
                });
                const rsiPath = rsiPoints.length > 1 ? `M ${rsiPoints.join(" L ")}` : "";

                return (
                  <div style={{ backgroundColor: "#0B0F14", border: "1px solid #1C2530", borderTop: "none" }}>
                    <svg
                      viewBox={`0 0 ${rsiWidth} ${rsiHeight}`}
                      style={{ width: "100%", height: "85px", display: "block" }}
                    >
                      {/* 70 Level (Overbought) */}
                      <line
                        x1="0"
                        y1={getRsiY(70)}
                        x2={rsiWidth}
                        y2={getRsiY(70)}
                        stroke="#F0616B"
                        strokeDasharray="4 4"
                        strokeOpacity="0.5"
                      />
                      <text x="6" y={getRsiY(70) - 2} fill="#F0616B" fontSize="9" fontFamily="monospace">70 OB</text>

                      {/* 50 Level (Midline) */}
                      <line
                        x1="0"
                        y1={getRsiY(50)}
                        x2={rsiWidth}
                        y2={getRsiY(50)}
                        stroke="#5C6773"
                        strokeDasharray="2 2"
                        strokeOpacity="0.3"
                      />

                      {/* 30 Level (Oversold) */}
                      <line
                        x1="0"
                        y1={getRsiY(30)}
                        x2={rsiWidth}
                        y2={getRsiY(30)}
                        stroke="#34D399"
                        strokeDasharray="4 4"
                        strokeOpacity="0.5"
                      />
                      <text x="6" y={getRsiY(30) + 9} fill="#34D399" fontSize="9" fontFamily="monospace">30 OS</text>

                      {/* RSI Curve */}
                      {rsiPath && (
                        <path
                          d={rsiPath}
                          fill="none"
                          stroke="#A78BFA"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* Historical OHLCV Collapsible Table */}
            {showHistoryTable && (
              <div style={{
                marginTop: "1.25rem",
                overflowX: "auto",
                border: "1px solid #1C2530",
                borderRadius: "8px"
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.78rem",
                  textAlign: "right"
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0B0F14", borderBottom: "1px solid #1C2530", color: "#8B98A7" }}>
                      <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Open</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>High</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Low</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Close</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Volume</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>SMA (20)</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>EMA (20)</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>RSI (14)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePoints.slice(-15).reverse().map((bar) => {
                      const isUp = bar.close >= bar.open;
                      const sma = smaMap.get(bar.date);
                      const ema = emaMap.get(bar.date);
                      const rsi = rsiMap.get(bar.date);

                      return (
                        <tr key={bar.date} style={{ borderBottom: "1px solid #161D26", fontFamily: "monospace" }}>
                          <td style={{ padding: "0.5rem 0.8rem", textAlign: "left", color: "#F2F5F7" }}>{bar.date}</td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#8B98A7" }}>${bar.open.toFixed(2)}</td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#34D399" }}>${bar.high.toFixed(2)}</td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#F0616B" }}>${bar.low.toFixed(2)}</td>
                          <td style={{ padding: "0.5rem 0.8rem", fontWeight: 700, color: isUp ? "#34D399" : "#F0616B" }}>
                            ${bar.close.toFixed(2)}
                          </td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#8B98A7" }}>{bar.volume.toLocaleString()}</td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#E8B563" }}>{sma ? `$${sma.toFixed(2)}` : "—"}</td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#34D399" }}>{ema ? `$${ema.toFixed(2)}` : "—"}</td>
                          <td style={{ padding: "0.5rem 0.8rem", color: "#A78BFA" }}>{rsi ? rsi.toFixed(2) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Company News Catalysts */}
      {data && (
        <div style={{
          marginTop: "1.75rem",
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "10px",
          padding: "1.5rem"
        }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", fontWeight: 700 }}>
            Recent Corporate Catalysts & Company News ({data.symbol})
          </h3>

          {news.length === 0 ? (
            <div style={{ color: "#8B98A7", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>
              No recent news articles reported for {data.symbol} in the past 7 days.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
              {news.map((item) => (
                <article
                  key={item.id}
                  style={{
                    backgroundColor: "#0B0F14",
                    border: "1px solid #1C2530",
                    borderRadius: "8px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#5C6773", marginBottom: "0.4rem" }}>
                      <span style={{ color: "#4FD1E5", fontWeight: 700 }}>{item.source}</span>
                      <span style={{ fontFamily: "monospace" }}>{new Date(item.datetime).toLocaleDateString()}</span>
                    </div>

                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.92rem", fontWeight: 600, color: "#F2F5F7", lineHeight: "1.35" }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                        {item.headline}
                      </a>
                    </h4>

                    {item.summary && (
                      <p style={{
                        margin: "0 0 0.75rem 0",
                        fontSize: "0.78rem",
                        color: "#8B98A7",
                        lineHeight: "1.4",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {item.summary}
                      </p>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.75rem",
                      color: "#4FD1E5",
                      textDecoration: "none",
                      fontWeight: 600
                    }}
                  >
                    Read Article ↗
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: "3rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid #1C2530",
        color: "#5C6773",
        fontSize: "0.8rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <span>Gateways: <code>/api/finnhub?symbol={selectedSymbol}</code> | <code>/api/alpha-vantage?symbol={selectedSymbol}</code></span>
        <span>GLOBAL.AI Institutional Financial Terminal</span>
      </footer>
    </div>
  );
}
