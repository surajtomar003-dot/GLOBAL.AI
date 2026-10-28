import { computeMarketAnalysis } from "@/utils/binance/marketAnalysis";
import Link from "next/link";

export const revalidate = 5; // Revalidate every 5 seconds

interface PageProps {
  searchParams: Promise<{ symbol?: string }>;
}

export default async function MarketAnalysisPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const symbol = resolvedParams.symbol?.toUpperCase() || "BTCUSDT";

  let analysis = null;
  let errorMsg = null;

  try {
    analysis = await computeMarketAnalysis(symbol);
  } catch (err: any) {
    errorMsg = err.message || "Failed to retrieve market data from Binance.";
  }

  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"];

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
        marginBottom: "2rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Global Intelligence — Binance Market Telemetry
            </h1>
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              backgroundColor: "rgba(52, 211, 153, 0.15)",
              color: "#34D399",
              border: "1px solid rgba(52, 211, 153, 0.3)"
            }}>
              LIVE FEED
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Real-time quantitative order book skew, VWAP delta, and derivatives positioning
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#8B98A7",
              textDecoration: "none",
              fontSize: "0.85rem"
            }}
          >
            ← Home
          </Link>
          <a
            href="/docs/BINANCE_MARKET_ANALYSIS.md"
            target="_blank"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              backgroundColor: "rgba(79, 209, 229, 0.12)",
              border: "1px solid rgba(79, 209, 229, 0.3)",
              color: "#4FD1E5",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            View Architecture Docs ↗
          </a>
        </div>
      </header>

      {/* Symbol Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", overflowX: "auto" }}>
        {symbols.map((s) => (
          <Link
            key={s}
            href={`/market-analysis?symbol=${s}`}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              backgroundColor: s === symbol ? "#4FD1E5" : "#10151C",
              color: s === symbol ? "#05070A" : "#8B98A7",
              border: `1px solid ${s === symbol ? "#4FD1E5" : "#1C2530"}`
            }}
          >
            {s}
          </Link>
        ))}
      </div>

      {errorMsg && (
        <div style={{
          padding: "1rem",
          borderRadius: "8px",
          backgroundColor: "rgba(240, 97, 107, 0.12)",
          border: "1px solid rgba(240, 97, 107, 0.3)",
          color: "#F0616B",
          marginBottom: "1.5rem"
        }}>
          {errorMsg}
        </div>
      )}

      {analysis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {/* Main Price Card */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem"
          }}>
            <div style={{ color: "#8B98A7", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {analysis.symbol} Spot Price
            </div>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0.5rem 0", fontFamily: "'JetBrains Mono', monospace" }}>
              ${analysis.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div style={{
              display: "inline-block",
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontWeight: 700,
              backgroundColor: analysis.change24hPercent >= 0 ? "rgba(52, 211, 153, 0.15)" : "rgba(240, 97, 107, 0.15)",
              color: analysis.change24hPercent >= 0 ? "#34D399" : "#F0616B"
            }}>
              {analysis.change24hPercent >= 0 ? "+" : ""}{analysis.change24hPercent.toFixed(2)}% (24h)
            </div>

            <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem" }}>
              <div>
                <span style={{ color: "#5C6773" }}>24h High: </span>
                <span style={{ fontFamily: "monospace" }}>${analysis.high24h.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>24h Low: </span>
                <span style={{ fontFamily: "monospace" }}>${analysis.low24h.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>24h Volume (USD): </span>
                <span style={{ fontFamily: "monospace" }}>${(analysis.volume24hUsd / 1e6).toFixed(1)}M</span>
              </div>
              <div>
                <span style={{ color: "#5C6773" }}>VWAP 24h: </span>
                <span style={{ fontFamily: "monospace" }}>${analysis.vwap24h.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Microstructure & Order Book Skew */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem"
          }}>
            <div style={{ color: "#8B98A7", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Order Book Depth Skew (L20)
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0.5rem 0", color: analysis.orderBookSkew >= 0 ? "#34D399" : "#F0616B" }}>
              {analysis.orderBookSkew > 0 ? "+" : ""}{(analysis.orderBookSkew * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: "0.85rem", color: "#8B98A7", marginBottom: "1rem" }}>
              Status: <strong style={{ color: "#F2F5F7" }}>{analysis.orderBookStatus}</strong>
            </div>

            {/* Skew Visual Bar */}
            <div style={{
              height: "8px",
              backgroundColor: "#1C2530",
              borderRadius: "4px",
              overflow: "hidden",
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                width: `${Math.abs(analysis.orderBookSkew) * 50}%`,
                transform: analysis.orderBookSkew < 0 ? "translateX(-100%)" : "none",
                backgroundColor: analysis.orderBookSkew >= 0 ? "#34D399" : "#F0616B"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#5C6773", marginTop: "0.35rem" }}>
              <span>-100% Ask Wall</span>
              <span>0 (Balanced)</span>
              <span>+100% Bid Wall</span>
            </div>

            <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#8B98A7" }}>
              Price to VWAP: <strong style={{ color: analysis.priceToVwapDeltaPercent >= 0 ? "#34D399" : "#F0616B" }}>
                {analysis.priceToVwapDeltaPercent >= 0 ? "+" : ""}{analysis.priceToVwapDeltaPercent}%
              </strong>
            </div>
          </div>

          {/* Quantitative Regime & Conviction */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem"
          }}>
            <div style={{ color: "#8B98A7", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Quantitative Signal & Conviction
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", margin: "0.5rem 0" }}>
              <div style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: analysis.signal === "BUY" || analysis.signal === "ACCUMULATE" ? "#34D399" : analysis.signal === "SELL" || analysis.signal === "TRIM" ? "#F0616B" : "#E8B563"
              }}>
                {analysis.signal}
              </div>
              <span style={{ fontSize: "0.85rem", color: "#8B98A7" }}>
                ({analysis.convictionScore}/100 Conviction)
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#4FD1E5", fontWeight: 600, marginBottom: "0.75rem" }}>
              Regime: {analysis.regime}
            </div>

            <div style={{ borderTop: "1px solid #1C2530", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#5C6773", marginBottom: "0.35rem" }}>Key Transmission Factors:</div>
              {analysis.keyFactors.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "#8B98A7" }}>Balanced price action within normal parameters.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.78rem", color: "#8B98A7" }}>
                  {analysis.keyFactors.map((f, i) => (
                    <li key={i} style={{ marginBottom: "0.25rem" }}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct API Documentation Reference footer */}
      <footer style={{
        marginTop: "3rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid #1C2530",
        color: "#5C6773",
        fontSize: "0.8rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>Endpoint: <code>/api/binance?symbol={symbol}</code></span>
        <span>Global Intelligence Architecture v1.0.0</span>
      </footer>
    </div>
  );
}
