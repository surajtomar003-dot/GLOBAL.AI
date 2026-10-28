"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MacroDashboardSummary,
  MacroIndicator,
  YieldCurveSpread,
} from "@/utils/fred/macroData";

// Lightweight, crisp SVG Historical Trend Sparkline/Chart
function MacroTrendChart({
  data,
  color = "#4FD1E5",
  unit = "",
}: {
  data: { date: string; value: number }[];
  color?: string;
  unit?: string;
}) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height: "64px", display: "flex", alignItems: "center", justifyContent: "center", color: "#5C6773", fontSize: "0.75rem" }}>
        Insufficient historical data
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 340;
  const height = 70;
  const paddingY = 8;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - paddingY - ((d.value - minVal) / range) * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const gradientId = `grad-${color.replace(/[^a-zA-Z0-9]/g, "")}-${data.length}`;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#5C6773", marginBottom: "0.25rem", fontFamily: "monospace" }}>
        <span>Start: {data[0].date} ({data[0].value.toLocaleString()}{unit})</span>
        <span>Latest: {data[data.length - 1].date}</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "70px", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#${gradientId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest point highlight */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="3.5"
            fill={color}
            stroke="#05070A"
            strokeWidth="1.5"
          />
        )}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#5C6773", marginTop: "0.2rem", fontFamily: "monospace" }}>
        <span>Low: {minVal.toLocaleString()}{unit}</span>
        <span>High: {maxVal.toLocaleString()}{unit}</span>
      </div>
    </div>
  );
}

export default function MacroDashboardPage() {
  const [summary, setSummary] = useState<MacroDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const fetchMacroData = useCallback(async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fred?series_id=ALL");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}: Failed to fetch FRED data`);
      }

      setSummary(json);
    } catch (err: any) {
      setError(err?.message || "Failed to load FRED macroeconomic data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (isManual) {
        setCooldown(20); // 20-second cooldown on manual refresh to respect rate limits
      }
    }
  }, []);

  useEffect(() => {
    fetchMacroData();
  }, [fetchMacroData]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const indicators = summary?.indicators || {};
  const yieldCurve = summary?.yieldCurve || null;

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
              Global Intelligence — Federal Reserve Macro Telemetry (FRED)
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
              ST. LOUIS FED OFFICIAL
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Official United States sovereign macroeconomic indicators: GDP, CPI inflation, policy rates, yield curves, and labor telemetry
          </p>
        </div>

        {/* Navigation & Controls */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => fetchMacroData(true)}
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
            href="/coingecko"
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
            🌐 CoinGecko Markets ↗
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

      {/* Institutional Disclosure Notice */}
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
          <strong style={{ color: "#E8B563" }}>ℹ️ Macroeconomic Data Notice:</strong> Observations represent official delayed statistical releases published on quarterly, monthly, weekly, or daily cycles by the Federal Reserve and Bureau of Economic Analysis. These are economic benchmark prints, not real-time sub-second market orders.
        </div>
        {summary?.timestamp && (
          <div style={{ color: "#5C6773", fontSize: "0.75rem" }}>
            Last Synced: {new Date(summary.timestamp).toLocaleTimeString()} {summary.cached ? "(Cached)" : "(Live)"}
          </div>
        )}
      </div>

      {/* Yield Curve & Key Macro Gauges Overview */}
      {yieldCurve && (
        <div style={{
          backgroundColor: "#10151C",
          border: `1px solid ${yieldCurve.isInverted ? "rgba(240, 97, 107, 0.4)" : "#1C2530"}`,
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem"
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              U.S. Sovereign Yield Curve Monitor (10Y - 2Y Spread)
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", margin: "0.35rem 0" }}>
              <span style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: yieldCurve.spreadBps < 0 ? "#F0616B" : "#34D399"
              }}>
                {yieldCurve.spreadBps > 0 ? "+" : ""}{yieldCurve.spreadBps} bps
              </span>
              <span style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: yieldCurve.isInverted ? "rgba(240, 97, 107, 0.15)" : "rgba(52, 211, 153, 0.15)",
                color: yieldCurve.isInverted ? "#F0616B" : "#34D399"
              }}>
                {yieldCurve.isInverted ? "CURVE INVERTED (RECESSION RISK)" : "NORMAL EXPANSION CURVE"}
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#5C6773" }}>
              10-Year Yield: <strong style={{ color: "#F2F5F7" }}>{yieldCurve.dgs10}%</strong> | 2-Year Yield: <strong style={{ color: "#F2F5F7" }}>{yieldCurve.dgs2}%</strong> (Date: {yieldCurve.date})
            </div>
          </div>

          <div style={{ fontSize: "0.8rem", color: "#8B98A7", maxWidth: "420px" }}>
            The 10Y-2Y Treasury spread measures sovereign yield term premium. Yield curve inversion historically precedes systemic economic deceleration and credit contractions.
          </div>
        </div>
      )}

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
            onClick={() => fetchMacroData(true)}
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
      {loading && !summary && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3.5rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4FD1E5" }}>
            ⟳ Loading Federal Reserve Economic Indicators...
          </div>
          <p style={{ fontSize: "0.85rem", color: "#5C6773" }}>
            Querying official GDP, CPI, Fed Funds, Treasury yields, and labor market telemetry from the St. Louis Fed
          </p>
        </div>
      )}

      {/* Indicators Grid */}
      {summary && Object.keys(indicators).length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "1.25rem"
        }}>
          {Object.entries(indicators).map(([id, ind]: [string, MacroIndicator]) => {
            const isPos = (ind.absoluteChange || 0) >= 0;

            // Pick chart line color
            let chartColor = "#4FD1E5";
            if (id === "CPIAUCSL" || id === "UNRATE") chartColor = "#E8B563";
            if (id === "DGS10" || id === "DGS2") chartColor = "#34D399";
            if (id === "ICSA") chartColor = "#F0616B";

            return (
              <div
                key={id}
                style={{
                  backgroundColor: "#10151C",
                  border: "1px solid #1C2530",
                  borderRadius: "10px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#4FD1E5", fontWeight: 700 }}>
                          FRED:{ind.seriesId}
                        </span>
                        <span style={{
                          fontSize: "0.68rem",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          backgroundColor: "#141B24",
                          color: "#8B98A7",
                          border: "1px solid #1C2530"
                        }}>
                          {ind.frequency}
                        </span>
                      </div>
                      <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.05rem", fontWeight: 700 }}>
                        {ind.title}
                      </h3>
                    </div>
                  </div>

                  {/* Latest Observation Value Display */}
                  <div style={{ margin: "0.75rem 0" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
                      <span style={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "#F2F5F7"
                      }}>
                        {id === "GDP" ? `$${(ind.latestValue / 1000).toFixed(2)}T` : ind.latestValue.toLocaleString()}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#8B98A7" }}>
                        {ind.units}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "#5C6773", marginTop: "0.25rem" }}>
                      Observation Date: <strong style={{ color: "#8B98A7" }}>{ind.latestDate}</strong> ({ind.seasonalAdjustment})
                    </div>
                  </div>

                  {/* Domain-specific calculated metric banner (e.g. GDP growth, CPI YoY inflation) */}
                  {ind.calculatedMetricLabel && typeof ind.calculatedMetricValue === "number" && (
                    <div style={{
                      backgroundColor: "rgba(11, 15, 20, 0.8)",
                      border: "1px solid #1C2530",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      margin: "0.75rem 0",
                      fontSize: "0.8rem"
                    }}>
                      <span style={{ color: "#8B98A7" }}>{ind.calculatedMetricLabel}:</span>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: ind.calculatedMetricValue >= 0 ? "#34D399" : "#F0616B"
                      }}>
                        {ind.calculatedMetricValue >= 0 ? "+" : ""}{ind.calculatedMetricValue}{ind.calculatedMetricUnit || ""}
                      </span>
                    </div>
                  )}

                  {/* Previous Observation & Delta */}
                  {ind.previousValue !== null && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem",
                      color: "#8B98A7",
                      marginTop: "0.4rem"
                    }}>
                      <span>Prev: {ind.previousValue.toLocaleString()} ({ind.previousDate})</span>
                      <span style={{
                        fontWeight: 600,
                        fontFamily: "monospace",
                        color: isPos ? "#34D399" : "#F0616B"
                      }}>
                        Δ {isPos ? "+" : ""}{ind.absoluteChange} ({isPos ? "+" : ""}{ind.percentageChange}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Historical Trend Chart */}
                <MacroTrendChart
                  data={ind.history}
                  color={chartColor}
                  unit={ind.units.includes("%") ? "%" : ""}
                />
              </div>
            );
          })}
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
        <span>FRED API Gateway: <code>/api/fred?series_id=ALL</code></span>
        <span>GLOBAL.AI Federal Reserve Macroeconomic Telemetry</span>
      </footer>
    </div>
  );
}
