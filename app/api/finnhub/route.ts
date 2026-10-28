import { NextRequest, NextResponse } from "next/server";
import {
  getStockIntelligenceBundle,
  getStockQuote,
  getCompanyProfile,
  getStockMetrics,
  getCompanyNews,
  getMarketStatus,
  sanitizeTicker,
} from "@/utils/finnhub/stockData";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawSymbol = searchParams.get("symbol");
    const type = searchParams.get("type")?.toLowerCase().trim() || "bundle";

    // Handle standalone market status
    if (type === "status") {
      const status = await getMarketStatus();
      return NextResponse.json(
        {
          source: "Finnhub Stock API",
          marketStatus: status,
          timestamp: Date.now(),
        },
        { status: 200 }
      );
    }

    const symbol = sanitizeTicker(rawSymbol || "AAPL");
    if (!symbol) {
      return NextResponse.json(
        { error: "Invalid Parameter", message: "A valid equity 'symbol' is required (e.g. AAPL, MSFT, NVDA)." },
        { status: 400 }
      );
    }

    if (type === "quote") {
      const quote = await getStockQuote(symbol);
      return NextResponse.json({ symbol, quote, timestamp: Date.now() }, { status: 200 });
    }

    if (type === "profile") {
      const profile = await getCompanyProfile(symbol);
      return NextResponse.json({ symbol, profile, timestamp: Date.now() }, { status: 200 });
    }

    if (type === "metrics") {
      const metrics = await getStockMetrics(symbol);
      return NextResponse.json({ symbol, metrics, timestamp: Date.now() }, { status: 200 });
    }

    if (type === "news") {
      const news = await getCompanyNews(symbol);
      return NextResponse.json({ symbol, news, timestamp: Date.now() }, { status: 200 });
    }

    // Default: full unified intelligence bundle
    const bundle = await getStockIntelligenceBundle(symbol);

    return NextResponse.json(bundle, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    const message = error?.message || "Internal server error fetching equity intelligence.";

    let status = 502;
    if (message.includes("timed out")) {
      status = 504;
    } else if (message.includes("rate limit")) {
      status = 429;
    } else if (message.includes("not configured")) {
      status = 500;
    } else if (message.includes("not found")) {
      status = 404;
    }

    return NextResponse.json(
      {
        error: "Finnhub Gateway Error",
        message,
        source: "Finnhub",
        timestamp: Date.now(),
      },
      { status }
    );
  }
}
