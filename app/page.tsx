import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let todos: { id: string | number; name: string }[] | null = null;
  let supabaseError: string | null = null;

  try {
    const { data, error } = await supabase.from("todos").select();
    if (error) {
      supabaseError = error.message;
    } else {
      todos = data;
    }
  } catch (err: any) {
    supabaseError = err?.message || "Failed to query Supabase";
  }

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#05070A",
      color: "#F2F5F7",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: "2.5rem"
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid #1C2530",
        paddingBottom: "1.5rem",
        marginBottom: "2rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            GLOBAL.AI — Financial Intelligence Terminal
          </h1>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            backgroundColor: "rgba(79, 209, 229, 0.15)",
            color: "#4FD1E5",
            border: "1px solid rgba(79, 209, 229, 0.3)"
          }}>
            INSTITUTIONAL
          </span>
        </div>
        <p style={{ margin: "0.4rem 0 0 0", color: "#8B98A7", fontSize: "0.9rem" }}>
          Global macro monitoring, multi-exchange telemetry, and persistent cloud ledger
        </p>
      </header>

      {/* Quick Launchpad Navigation */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2.5rem"
      }}>
        {/* FRED Macro Card */}
        <Link
          href="/macro"
          style={{
            display: "block",
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem",
            textDecoration: "none",
            color: "inherit",
            transition: "border-color 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              backgroundColor: "rgba(232, 181, 99, 0.15)",
              color: "#E8B563"
            }}>
              FRED MACRO TELEMETRY
            </span>
            <span style={{ color: "#E8B563", fontSize: "1rem" }}>→</span>
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 700 }}>
            Federal Reserve Economic Data
          </h2>
          <p style={{ margin: 0, color: "#8B98A7", fontSize: "0.85rem", lineHeight: "1.4" }}>
            Official United States GDP, CPI inflation index & YoY calculations, Fed Funds target rate, 10Y-2Y yield curve spread, unemployment, and initial claims.
          </p>
        </Link>

        {/* CoinGecko Card */}
        <Link
          href="/coingecko"
          style={{
            display: "block",
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem",
            textDecoration: "none",
            color: "inherit",
            transition: "border-color 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              backgroundColor: "rgba(79, 209, 229, 0.15)",
              color: "#4FD1E5"
            }}>
              COINGECKO API
            </span>
            <span style={{ color: "#4FD1E5", fontSize: "1rem" }}>→</span>
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 700 }}>
            Global Macro & Market Caps
          </h2>
          <p style={{ margin: 0, color: "#8B98A7", fontSize: "0.85rem", lineHeight: "1.4" }}>
            Aggregated cryptocurrency rankings, global volume turnover, multi-currency pricing (USD, EUR, GBP, INR), and 24h high/low spreads across 1,000+ exchanges.
          </p>
        </Link>

        {/* Binance Telemetry Card */}
        <Link
          href="/market-analysis"
          style={{
            display: "block",
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem",
            textDecoration: "none",
            color: "inherit",
            transition: "border-color 0.15s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              backgroundColor: "rgba(52, 211, 153, 0.15)",
              color: "#34D399"
            }}>
              BINANCE TELEMETRY
            </span>
            <span style={{ color: "#34D399", fontSize: "1rem" }}>→</span>
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 700 }}>
            Order Book & Derivatives Telemetry
          </h2>
          <p style={{ margin: 0, color: "#8B98A7", fontSize: "0.85rem", lineHeight: "1.4" }}>
            Real-time Level-20 order book depth skew, bid/ask wall absorption, trailing 24h VWAP spreads, and USD-M futures funding rates & open interest.
          </p>
        </Link>
      </div>

      {/* Supabase Integration Section */}
      <section style={{
        backgroundColor: "#10151C",
        border: "1px solid #1C2530",
        borderRadius: "10px",
        padding: "1.5rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
            Supabase Cloud Database & Auth Status
          </h3>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            backgroundColor: supabaseError ? "rgba(240, 97, 107, 0.15)" : "rgba(52, 211, 153, 0.15)",
            color: supabaseError ? "#F0616B" : "#34D399"
          }}>
            {supabaseError ? "DISCONNECTED" : "CONNECTED"}
          </span>
        </div>

        <p style={{ color: "#8B98A7", fontSize: "0.85rem", marginTop: 0 }}>
          Connected via SSR Server Client with cookie session management:
        </p>

        {supabaseError ? (
          <div style={{
            padding: "0.85rem",
            borderRadius: "6px",
            backgroundColor: "rgba(240, 97, 107, 0.1)",
            border: "1px solid rgba(240, 97, 107, 0.25)",
            color: "#F0616B",
            fontSize: "0.85rem"
          }}>
            Note: {supabaseError} (Create a &apos;todos&apos; table in Supabase dashboard to enable table persistence).
          </div>
        ) : (!todos || todos.length === 0) ? (
          <p style={{ color: "#5C6773", fontSize: "0.85rem", margin: 0 }}>
            No rows found in &apos;todos&apos; table. Database connection is active.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#34D399" }}>
            {todos.map((todo) => (
              <li key={todo.id}>{todo.name}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
