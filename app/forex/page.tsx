"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ForexBundle,
  COMMON_CURRENCIES,
  CurrencyMetadata,
} from "@/utils/forex/exchangeRateData";

export default function ForexIntelligencePage() {
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [targetCurrency, setTargetCurrency] = useState<string>("INR");
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [data, setData] = useState<ForexBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const fetchRates = useCallback(
    async (baseToFetch: string, targetToFetch: string, amountToConvert: number, isManual: boolean = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          base: baseToFetch,
          target: targetToFetch,
          amount: amountToConvert.toString(),
        });

        const res = await fetch(`/api/exchange-rates?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || json.error) {
          throw new Error(json.message || `HTTP ${res.status}: Failed to fetch exchange rates.`);
        }

        setData(json);
      } catch (err: any) {
        setError(err?.message || "Failed to load exchange rates. Please check network connectivity.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        if (isManual) {
          setCooldown(10);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchRates(baseCurrency, targetCurrency, calcAmount);
  }, [fetchRates, baseCurrency, targetCurrency, calcAmount]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSwapCurrencies = () => {
    const prevBase = baseCurrency;
    const prevTarget = targetCurrency;
    setBaseCurrency(prevTarget);
    setTargetCurrency(prevBase);
  };

  const getCurrencyMeta = useCallback((code: string): CurrencyMetadata | undefined => {
    return COMMON_CURRENCIES.find((c) => c.code === code);
  }, []);

  const baseMeta = getCurrencyMeta(baseCurrency);
  const targetMeta = getCurrencyMeta(targetCurrency);

  // Filtered currency rates list
  const filteredRates = useMemo(() => {
    if (!data?.rates) return [];
    const entries = Object.entries(data.rates);
    if (!searchFilter.trim()) {
      return entries;
    }
    const q = searchFilter.trim().toUpperCase();
    return entries.filter(([code]) => {
      const meta = getCurrencyMeta(code);
      return code.includes(q) || (meta && meta.name.toUpperCase().includes(q));
    });
  }, [data, searchFilter, getCurrencyMeta]);

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
              Global Intelligence — Foreign Exchange & Currency Parity
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
              EXCHANGERATE-API V6
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Official mid-market reference exchange rates, currency conversion calculator, and multi-lateral cross parity
          </p>
        </div>

        {/* Navigation & Controls */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => fetchRates(baseCurrency, targetCurrency, calcAmount, true)}
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
            href="/stocks"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "rgba(52, 211, 153, 0.12)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              color: "#34D399",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            📈 Stocks ↗
          </Link>

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
          <strong style={{ color: "#E8B563" }}>Data Integrity & Update Cycle Notice:</strong> Rates are provided under ExchangeRate-API Free Tier specifications (1,500 requests/month). Reference rates are updated daily at 00:00 UTC and represent mid-market multilateral exchange parity. Do not interpret daily reference rates as real-time tick-by-tick FX broker quotes. This module is strictly for institutional macro research and trade settlement parity analytics.
        </div>
        <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>
          {data?.lastUpdateUtc && (
            <div>Updated: <strong style={{ color: "#8B98A7" }}>{data.lastUpdateUtc}</strong> {data.cached ? "(Cached)" : "(Synced)"}</div>
          )}
          {data?.nextUpdateUtc && (
            <div>Next Update: <strong style={{ color: "#8B98A7" }}>{data.nextUpdateUtc}</strong></div>
          )}
        </div>
      </div>

      {/* Base Currency Ribbon */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
        marginBottom: "1.75rem",
        backgroundColor: "#10151C",
        padding: "0.75rem 1.25rem",
        borderRadius: "8px",
        border: "1px solid #1C2530"
      }}>
        <span style={{ fontSize: "0.78rem", color: "#8B98A7", textTransform: "uppercase", marginRight: "0.25rem", fontWeight: 700 }}>
          Base Currency:
        </span>
        {COMMON_CURRENCIES.slice(0, 10).map((curr) => (
          <button
            key={curr.code}
            onClick={() => setBaseCurrency(curr.code)}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "5px",
              border: `1px solid ${baseCurrency === curr.code ? "#4FD1E5" : "#1C2530"}`,
              backgroundColor: baseCurrency === curr.code ? "rgba(79, 209, 229, 0.15)" : "#0B0F14",
              color: baseCurrency === curr.code ? "#4FD1E5" : "#8B98A7",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <span>{curr.flag}</span>
            <span>{curr.code}</span>
          </button>
        ))}
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
            <strong>Forex Error:</strong> {error}
          </div>
          <button
            onClick={() => fetchRates(baseCurrency, targetCurrency, calcAmount, true)}
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

      {/* Main Grid: Currency Calculator + Rate Highlight */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Currency Conversion Calculator */}
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "10px",
          padding: "1.5rem"
        }}>
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>💱</span>
            <span>Currency Conversion Calculator</span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Amount Input */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                Amount to Convert
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={calcAmount}
                onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  backgroundColor: "#0B0F14",
                  border: "1px solid #1C2530",
                  color: "#F2F5F7",
                  fontSize: "1.2rem",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  outline: "none"
                }}
              />
            </div>

            {/* Currency Selectors & Swap Button */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center" }}>
              {/* From (Base) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  From
                </label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    backgroundColor: "#0B0F14",
                    border: "1px solid #1C2530",
                    color: "#F2F5F7",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  {COMMON_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div style={{ paddingTop: "1.2rem" }}>
                <button
                  onClick={handleSwapCurrencies}
                  title="Swap Currencies"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#141B24",
                    border: "1px solid #4FD1E5",
                    color: "#4FD1E5",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  ⇄
                </button>
              </div>

              {/* To (Target) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  To
                </label>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    backgroundColor: "#0B0F14",
                    border: "1px solid #1C2530",
                    color: "#F2F5F7",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  {COMMON_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculated Conversion Result Box */}
            <div style={{
              backgroundColor: "#0B0F14",
              border: "1px solid #1C2530",
              borderRadius: "8px",
              padding: "1.25rem",
              marginTop: "0.5rem"
            }}>
              <div style={{ fontSize: "0.8rem", color: "#8B98A7", marginBottom: "0.3rem" }}>
                {calcAmount.toLocaleString()} {baseCurrency} equals
              </div>

              <div style={{
                fontSize: "2.2rem",
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: "#4FD1E5",
                lineHeight: "1.2"
              }}>
                {data?.conversionResult !== undefined
                  ? `${targetMeta?.symbol || ""} ${data.conversionResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                  : "—"}
                <span style={{ fontSize: "1.1rem", color: "#F2F5F7", marginLeft: "0.5rem", fontWeight: 600 }}>
                  {targetCurrency}
                </span>
              </div>

              {/* Rate Parity Details */}
              <div style={{
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #161D26",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                color: "#8B98A7",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}>
                <span>
                  1 {baseCurrency} = <strong style={{ color: "#34D399" }}>{data?.rate ?? "—"}</strong> {targetCurrency}
                </span>
                <span>
                  1 {targetCurrency} = <strong style={{ color: "#E8B563" }}>{data?.inverseRate ?? "—"}</strong> {baseCurrency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Major FX Cross Rates Grid */}
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "10px",
          padding: "1.5rem"
        }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700 }}>
            Major Forex Reference Crosses ({baseCurrency} Parity)
          </h3>

          {loading && !data && (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "#8B98A7" }}>
              ⟳ Ingesting foreign exchange rates from ExchangeRate-API...
            </div>
          )}

          {data?.rates && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {["INR", "EUR", "GBP", "JPY", "CNY", "CAD", "AUD", "CHF", "AED", "SGD"].map((cCode) => {
                if (cCode === baseCurrency) return null;
                const rate = data.rates[cCode];
                const meta = getCurrencyMeta(cCode);
                const isSelected = targetCurrency === cCode;

                return (
                  <div
                    key={cCode}
                    onClick={() => setTargetCurrency(cCode)}
                    style={{
                      backgroundColor: isSelected ? "rgba(79, 209, 229, 0.1)" : "#0B0F14",
                      border: `1px solid ${isSelected ? "#4FD1E5" : "#1C2530"}`,
                      borderRadius: "6px",
                      padding: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F2F5F7" }}>
                        {meta?.flag || ""} {baseCurrency}/{cCode}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "#5C6773" }}>{meta?.country || ""}</span>
                    </div>

                    <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "monospace", color: "#4FD1E5" }}>
                      {rate !== undefined ? rate.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                    </div>

                    <div style={{ fontSize: "0.7rem", color: "#5C6773", marginTop: "0.2rem" }}>
                      1 {cCode} = {rate ? (1 / rate).toFixed(4) : "—"} {baseCurrency}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive 160+ Currencies Search & Reference Table */}
      <section style={{
        backgroundColor: "#10151C",
        border: "1px solid #1C2530",
        borderRadius: "10px",
        padding: "1.5rem"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
              Global Currency Parity Master Table
            </h3>
            <p style={{ margin: "0.25rem 0 0 0", color: "#8B98A7", fontSize: "0.8rem" }}>
              Showing {filteredRates.length} exchange rates relative to 1 {baseCurrency}
            </p>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: "260px" }}>
            <input
              type="text"
              placeholder="Search currency code or name (e.g. EUR, Rupee, Yen)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                backgroundColor: "#0B0F14",
                border: "1px solid #1C2530",
                color: "#F2F5F7",
                fontSize: "0.82rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ maxHeight: "420px", overflowY: "auto", border: "1px solid #1C2530", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0B0F14", borderBottom: "1px solid #1C2530", color: "#8B98A7" }}>
              <tr>
                <th style={{ padding: "0.6rem 0.85rem" }}>Currency</th>
                <th style={{ padding: "0.6rem 0.85rem" }}>Name / Jurisdiction</th>
                <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Rate (1 {baseCurrency})</th>
                <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Inverse Rate</th>
                <th style={{ padding: "0.6rem 0.85rem", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRates.map(([code, rate]) => {
                const meta = getCurrencyMeta(code);
                const isTarget = targetCurrency === code;

                return (
                  <tr
                    key={code}
                    style={{
                      borderBottom: "1px solid #161D26",
                      backgroundColor: isTarget ? "rgba(79, 209, 229, 0.08)" : "transparent"
                    }}
                  >
                    <td style={{ padding: "0.55rem 0.85rem", fontWeight: 700, fontFamily: "monospace", color: "#4FD1E5" }}>
                      {meta?.flag || "🌐"} {code}
                    </td>
                    <td style={{ padding: "0.55rem 0.85rem", color: "#F2F5F7" }}>
                      {meta?.name || code} {meta?.country ? `(${meta.country})` : ""}
                    </td>
                    <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#34D399" }}>
                      {rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td style={{ padding: "0.55rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: "#8B98A7" }}>
                      {rate > 0 ? (1 / rate).toFixed(6) : "—"} {baseCurrency}
                    </td>
                    <td style={{ padding: "0.55rem 0.85rem", textAlign: "center" }}>
                      <button
                        onClick={() => {
                          setTargetCurrency(code);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "4px",
                          backgroundColor: "#141B24",
                          border: "1px solid #1C2530",
                          color: "#4FD1E5",
                          fontSize: "0.75rem",
                          cursor: "pointer"
                        }}
                      >
                        Convert ↗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
        <span>ExchangeRate-API Gateway: <code>/api/exchange-rates?base={baseCurrency}&target={targetCurrency}&amount={calcAmount}</code></span>
        <span>GLOBAL.AI Institutional Financial Terminal</span>
      </footer>
    </div>
  );
}
