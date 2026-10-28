"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  StockIntelligenceBundle,
  POPULAR_SYMBOLS,
} from "@/utils/finnhub/stockData";

export default function StockIntelligencePage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [data, setData] = useState<StockIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  const fetchStockData = useCallback(
    async (symbolToFetch: string, isManual: boolean = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/finnhub?symbol=${encodeURIComponent(symbolToFetch)}`);
        const json = await res.json();

        if (!res.ok || json.error) {
          throw new Error(json.message || `HTTP ${res.status}: Failed to fetch equity intelligence.`);
        }

        setData(json);
      } catch (err: any) {
        setError(err?.message || "Failed to load stock data. Verify network or API limits.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        if (isManual) {
          setCooldown(10); // 10-second cooldown on manual refresh
        }
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
        fontSize: "0.7rem",
        fontWeight: 700,
        padding: "0.2rem 0.55rem",
        borderRadius: "4px",
        backgroundColor: bg,
        color,
        border: `1px solid ${color}40`,
        textTransform: "uppercase"
      }}>
        {marketStatus.session}
      </span>
    );
  };

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
              Global Intelligence — Equity Markets Telemetry
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
              FINNHUB INTELLIGENCE
            </span>
            {getSessionBadge()}
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Institutional equity quotes, company valuation metrics, exchange trading sessions, and corporate catalysts
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
        <div style={{ maxWidth: "850px" }}>
          <strong style={{ color: "#E8B563" }}>Data Integrity & Delay Notice:</strong> Stock quotes and corporate metrics are provided under Finnhub Free Tier specifications (subject to consolidated exchange feed delays where applicable). All data is presented strictly for financial intelligence research. Metrics and news sentiment do not constitute guaranteed trading signals, and this terminal does not execute brokerage trade orders.
        </div>
        {data?.timestamp && (
          <div style={{ color: "#5C6773", fontSize: "0.75rem" }}>
            Quote Synced: {new Date(data.timestamp).toLocaleTimeString()} {data.cached ? "(Cached)" : "(Live)"}
          </div>
        )}
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
            placeholder="Search ticker (e.g. NVDA, AMD, JPM)..."
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

      {/* Error Banner */}
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
            <strong>Error:</strong> {error}
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

      {/* Loading Skeleton */}
      {loading && !data && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3.5rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4FD1E5" }}>
            ⟳ Ingesting Finnhub Equity Telemetry for {selectedSymbol}...
          </div>
          <p style={{ fontSize: "0.85rem", color: "#5C6773" }}>
            Querying quotes, company profiles, fundamental ratios, and corporate news
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
                  <span style={{ fontSize: "0.75rem", color: "#5C6773" }}>Today</span>
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
        <span>Finnhub Gateway: <code>/api/finnhub?symbol={selectedSymbol}</code></span>
        <span>GLOBAL.AI Institutional Financial Terminal</span>
      </footer>
    </div>
  );
}
