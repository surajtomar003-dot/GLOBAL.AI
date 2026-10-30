"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Globe from "@/components/Globe";

type Snap = { ts: number; crypto: { sym: string; price: number; chg: number }[]; fx: Record<string, number>; cryptoSrc: string; stale?: boolean };
const usd = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n > 100 ? 0 : 2 });

export default function Home() {
  const [s, setS] = useState<Snap | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let on = true;
    const load = () => fetch("/api/snapshot").then((r) => r.json()).then((d) => on && (setS(d), setErr(false))).catch(() => on && setErr(true));
    load(); const t = setInterval(load, 30000);
    return () => { on = false; clearInterval(t); };
  }, []);
  const status = err ? "OFFLINE" : !s ? "CONNECTING" : s.stale ? "CACHED" : "LIVE";
  return (
    <main className="shell">
      <header className="bar">
        <div className="brand"><span className="dot" />GLOBAL<b>.AI</b></div>
        <nav>{[["stocks","Stocks"],["forex","Forex"],["macro","Macro"],["news","News"],["weather","Weather"]].map(([h, l]) => <Link key={h} href={`/${h}`}>{l}</Link>)}</nav>
        <div className={`chip ${status.toLowerCase()}`}>{status}{s && <em>{new Date(s.ts).toLocaleTimeString()}</em>}</div>
      </header>
      <section className="hero">
        <div className="copy">
          <p className="eyebrow">GLOBAL MACRO TELEMETRY</p>
          <h1>Poori duniya ka market,<br />ek globe par.</h1>
          <p className="sub">10 financial hubs, live capital-flow arcs. Drag karke ghumao.</p>
        </div>
        <Globe />
        <aside className="panel">
          <h3>CRYPTO <small>{s?.cryptoSrc}</small></h3>
          {(s?.crypto ?? []).map((c) => (
            <div className="row" key={c.sym}><span>{c.sym}</span><span>${usd(c.price)}</span><span className={c.chg >= 0 ? "up" : "dn"}>{c.chg >= 0 ? "▲" : "▼"} {Math.abs(c.chg).toFixed(2)}%</span></div>
          ))}
          <h3>FX · 1 USD</h3>
          {Object.entries(s?.fx ?? {}).map(([k, v]) => <div className="row" key={k}><span>{k}</span><span>{v.toFixed(k === "JPY" ? 2 : 3)}</span><span /></div>)}
          {!s && !err && <p className="mute">Loading…</p>}
          {err && <p className="mute">Server se connect nahi hua.</p>}
        </aside>
      </section>
    </main>
  );
}
