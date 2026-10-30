// Ek hi endpoint, server-side cache: 100 users aaye tab bhi upstream ko sirf 30s mein 1 hit.
export const dynamic = "force-dynamic";
type Coin = { sym: string; price: number; chg: number };
type Snap = { ts: number; crypto: Coin[]; fx: Record<string, number>; cryptoSrc: string; stale?: boolean };
let cache: Snap | null = null;
const TTL = 30_000;

const FALLBACK_CRYPTO: Coin[] = [
  { sym: "BTC", price: 68420, chg: 2.14 },
  { sym: "ETH", price: 2540, chg: 1.85 },
  { sym: "SOL", price: 178.5, chg: 4.62 },
  { sym: "BNB", price: 592.1, chg: -0.45 },
];

const FALLBACK_FX: Record<string, number> = {
  INR: 83.95,
  EUR: 0.925,
  GBP: 0.772,
  JPY: 153.2,
  CNY: 7.12,
  AED: 3.67,
};

const j = async (u: string) => {
  const r = await fetch(u, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

async function crypto(): Promise<{ list: Coin[]; src: string }> {
  try {
    const s = encodeURIComponent('["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"]');
    const d = await j(`https://api.binance.com/api/v3/ticker/24hr?symbols=${s}`);
    return { src: "Binance", list: d.map((x: any) => ({ sym: x.symbol.replace("USDT", ""), price: +x.lastPrice, chg: +x.priceChangePercent })) };
  } catch {
    const d = await j("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true");
    const m: [string, string][] = [["bitcoin", "BTC"], ["ethereum", "ETH"], ["solana", "SOL"], ["binancecoin", "BNB"]];
    return { src: "CoinGecko", list: m.map(([id, sym]) => ({ sym, price: d[id].usd, chg: d[id].usd_24h_change })) };
  }
}

async function fx() {
  const d = await j("https://open.er-api.com/v6/latest/USD");
  const out: Record<string, number> = {};
  for (const k of ["INR", "EUR", "GBP", "JPY", "CNY", "AED"]) out[k] = d.rates[k];
  return out;
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) return Response.json({ ...cache, stale: false });
  const [c, f] = await Promise.allSettled([crypto(), fx()]);
  const ok = c.status === "fulfilled" || f.status === "fulfilled";
  const next: Snap = {
    ts: Date.now(),
    crypto: c.status === "fulfilled" ? c.value.list : cache?.crypto ?? FALLBACK_CRYPTO,
    cryptoSrc: c.status === "fulfilled" ? c.value.src : cache?.cryptoSrc ?? (ok ? "-" : "Reference"),
    fx: f.status === "fulfilled" ? f.value : cache?.fx ?? FALLBACK_FX,
  };
  if (ok) cache = next;
  return Response.json({ ...(cache ?? next), stale: !ok });
}
