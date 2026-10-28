"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { CoinGeckoMarketItem, CoinGeckoResponse } from "@/utils/coingecko/marketData";

const CURRENCIES = [
  { code: "usd", symbol: "$", label: "USD ($)" },
  { code: "eur", symbol: "€", label: "EUR (€)" },
  { code: "gbp", symbol: "£", label: "GBP (£)" },
  { code: "inr", symbol: "₹", label: "INR (₹)" },
  { code: "jpy", symbol: "¥", label: "JPY (¥)" },
  { code: "btc", symbol: "₿", label: "BTC (₿)" },
];

export default function CoinGeckoDashboardPage() {
  const [currency, setCurrency] = useState("usd");
  const [data, setData] = useState<CoinGeckoMarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const activeCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0],
    [currency]
  );

  const fetchMarkets = useCallback(async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/coingecko?vs_currency=${currency}&per_page=50&order=market_cap_desc`);
      const json: CoinGeckoResponse | { error?: string; message?: string } = await res.json();

      if (!res.ok) {
        throw new Error((json as any).message || `HTTP ${res.status}: Failed to fetch CoinGecko data`);
      }

      if ("data" in json && Array.isArray(json.data)) {
        setData(json.data);
        setLastUpdated(json.timestamp || Date.now());
      } else {
        throw new Error("Invalid response format received from CoinGecko API");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load market data. Please verify network or API rate limits.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (isManual) {
        setCooldown(15); // 15-second cooldown on manual refresh to protect API limits
      }
    }
  }, [currency]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-refresh every 60 seconds (respecting CoinGecko rate limits)
  useEffect(() => {
    const autoTimer = setInterval(() => {
      fetchMarkets(false);
    }, 60000);
    return () => clearInterval(autoTimer);
  }, [fetchMarkets]);

  // Filtered coins based on search query
  const filteredCoins = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter(
      (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Macro Summary Statistics
  const macroStats = useMemo(() => {
    if (data.length === 0) return null;
    const totalCap = data.reduce((acc, c) => acc + (c.market_cap || 0), 0);
    const totalVol = data.reduce((acc, c) => acc + (c.total_volume || 0), 0);
    const topGainer = [...data].sort(
      (a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    )[0];
    const btc = data.find((c) => c.symbol.toUpperCase() === "BTC");
    return { totalCap, totalVol, topGainer, btcPrice: btc?.current_price };
  }, [data]);

  const formatNumber = (num: number | null | undefined, maxDecimals: number = 2) => {
    if (num === null || num === undefined) return "—";
    return num.toLocaleString("en-US", {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: maxDecimals > 0 ? 2 : 0,
    });
  };

  const formatLargeUsd = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "—";
    if (num >= 1e12) return `${activeCurrency.symbol}${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${activeCurrency.symbol}${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${activeCurrency.symbol}${(num / 1e6).toFixed(2)}M`;
    return `${activeCurrency.symbol}${formatNumber(num, 0)}`;
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
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Global Intelligence — CoinGecko Aggregated Markets
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
              GLOBAL MACRO INDEX
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Multi-currency global market capitalizations, 24h trading volume, and institutional rankings across 1,000+ exchanges
          </p>
        </div>

        {/* Navigation & Controls */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => fetchMarkets(true)}
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
            href="/market-analysis"
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
            ⚡ Binance Telemetry ↗
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

      {/* Disclaimers & Distinction Notice */}
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
        <div>
          <strong style={{ color: "#4FD1E5" }}>🌐 CoinGecko Aggregated Feed:</strong> Data is volume-weighted across global spot exchanges.
          For order book depth, L20 bid/ask walls, and futures funding rates, switch to{" "}
          <Link href="/market-analysis" style={{ color: "#34D399", textDecoration: "underline" }}>
            Binance Telemetry
          </Link>.
        </div>
        {lastUpdated && (
          <div style={{ color: "#5C6773", fontSize: "0.75rem" }}>
            Last Synced: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Macro Statistics Summary Cards */}
      {macroStats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem"
        }}>
          <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>Total Tracked Cap</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.3rem 0", color: "#F2F5F7" }}>
              {formatLargeUsd(macroStats.totalCap)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>Top 50 global crypto assets</div>
          </div>

          <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>24h Global Volume</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.3rem 0", color: "#F2F5F7" }}>
              {formatLargeUsd(macroStats.totalVol)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>Cumulative exchange turnover</div>
          </div>

          <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>BTC Benchmark</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.3rem 0", color: "#4FD1E5", fontFamily: "monospace" }}>
              {activeCurrency.symbol}{formatNumber(macroStats.btcPrice)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>Macro market benchmark</div>
          </div>

          {macroStats.topGainer && (
            <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.2rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>Top Gainer (24h)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.3rem 0", color: "#34D399" }}>
                +{macroStats.topGainer.price_change_percentage_24h}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8B98A7" }}>
                {macroStats.topGainer.name} ({macroStats.topGainer.symbol})
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Bar: Currency Selector & Search */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.25rem"
      }}>
        {/* Currency Switcher */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#8B98A7", marginRight: "0.4rem" }}>Denominate:</span>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCurrency(c.code)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "5px",
                border: `1px solid ${currency === c.code ? "#4FD1E5" : "#1C2530"}`,
                backgroundColor: currency === c.code ? "rgba(79, 209, 229, 0.15)" : "#10151C",
                color: currency === c.code ? "#4FD1E5" : "#8B98A7",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Search coin or symbol (e.g. BTC, Solana)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.85rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#F2F5F7",
              fontSize: "0.85rem",
              outline: "none"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#8B98A7",
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          )}
        </div>
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
            onClick={() => fetchMarkets(true)}
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
      {loading && data.length === 0 && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "#4FD1E5" }}>
            ⟳ Loading CoinGecko Market Data...
          </div>
          <p style={{ fontSize: "0.85rem", color: "#5C6773" }}>
            Fetching verified cryptocurrency prices, market caps, and rankings
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCoins.length === 0 && !error && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <p>No cryptocurrency found matching &quot;{searchQuery}&quot;</p>
          <button
            onClick={() => setSearchQuery("")}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              backgroundColor: "#141B24",
              border: "1px solid #1C2530",
              color: "#4FD1E5",
              cursor: "pointer",
              marginTop: "0.5rem"
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Data Table */}
      {filteredCoins.length > 0 && (
        <div style={{
          overflowX: "auto",
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px"
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "0.85rem"
          }}>
            <thead>
              <tr style={{
                borderBottom: "1px solid #1C2530",
                backgroundColor: "#0B0F14",
                color: "#8B98A7",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                <th style={{ padding: "0.85rem 1rem", width: "60px" }}>Rank</th>
                <th style={{ padding: "0.85rem 1rem" }}>Asset</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Current Price</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>24h Change</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>24h High / Low</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>24h Trading Volume</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Market Cap</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Telemetry</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoins.map((coin) => {
                const isPos = (coin.price_change_percentage_24h || 0) >= 0;
                const binanceSymbol = `${coin.symbol}USDT`;

                return (
                  <tr
                    key={coin.id}
                    style={{
                      borderBottom: "1px solid #161D26",
                      transition: "background-color 0.1s ease"
                    }}
                  >
                    {/* Rank */}
                    <td style={{ padding: "0.85rem 1rem", color: "#5C6773", fontWeight: 600 }}>
                      #{coin.market_cap_rank ?? "—"}
                    </td>

                    {/* Asset Name & Icon */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        {coin.image && (
                          <img
                            src={coin.image}
                            alt={coin.name}
                            width={22}
                            height={22}
                            style={{ borderRadius: "50%" }}
                            loading="lazy"
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: "#F2F5F7" }}>{coin.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "#8B98A7", fontFamily: "monospace" }}>
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {activeCurrency.symbol}{formatNumber(coin.current_price, coin.current_price && coin.current_price < 1 ? 4 : 2)}
                    </td>

                    {/* 24h Change */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        backgroundColor: isPos ? "rgba(52, 211, 153, 0.15)" : "rgba(240, 97, 107, 0.15)",
                        color: isPos ? "#34D399" : "#F0616B"
                      }}>
                        {isPos ? "+" : ""}{coin.price_change_percentage_24h !== null ? `${coin.price_change_percentage_24h.toFixed(2)}%` : "—"}
                      </span>
                    </td>

                    {/* 24h High / Low */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontSize: "0.78rem", fontFamily: "monospace" }}>
                      <div style={{ color: "#34D399" }}>H: {activeCurrency.symbol}{formatNumber(coin.high_24h, coin.high_24h && coin.high_24h < 1 ? 4 : 2)}</div>
                      <div style={{ color: "#F0616B" }}>L: {activeCurrency.symbol}{formatNumber(coin.low_24h, coin.low_24h && coin.low_24h < 1 ? 4 : 2)}</div>
                    </td>

                    {/* 24h Volume */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatLargeUsd(coin.total_volume)}
                    </td>

                    {/* Market Cap */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {formatLargeUsd(coin.market_cap)}
                    </td>

                    {/* Telemetry Quick Link */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <Link
                        href={`/market-analysis?symbol=${binanceSymbol}`}
                        title={`Analyze ${binanceSymbol} Order Book Depth on Binance`}
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "4px",
                          backgroundColor: "#141B24",
                          border: "1px solid #1C2530",
                          color: "#4FD1E5",
                          textDecoration: "none",
                          fontSize: "0.72rem",
                          fontWeight: 600
                        }}
                      >
                        Binance Depth ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        <span>CoinGecko API Gateway: <code>/api/coingecko?vs_currency={currency}</code></span>
        <span>GLOBAL.AI Institutional Macro Telemetry</span>
      </footer>
    </div>
  );
}
