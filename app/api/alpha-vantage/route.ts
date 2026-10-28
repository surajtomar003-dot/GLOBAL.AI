import { NextRequest, NextResponse } from "next/server";
import {
  sanitizeSymbol,
  getAlphaVantageBundle,
  getOfficialIndicator,
} from "@/utils/alpha-vantage/alphaVantageData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get("symbol") || "AAPL";
    const symbol = sanitizeSymbol(rawSymbol);
    const type = (searchParams.get("type") || searchParams.get("function") || "bundle").toLowerCase();

    // Check if API key is present
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Alpha Vantage Configuration Error",
          message: "ALPHA_VANTAGE_API_KEY is not defined in server environment (.env.local).",
          source: "Alpha Vantage Gateway",
          timestamp: Date.now(),
        },
        { status: 500 }
      );
    }

    // Handle intraday requests (Explain plan restrictions)
    if (type.includes("intraday")) {
      return NextResponse.json(
        {
          symbol,
          type: "TIME_SERIES_INTRADAY",
          status: "plan_restricted",
          message:
            "Intraday telemetry is reserved for Alpha Vantage Premium subscribers. Historical daily OHLCV and technical indicators (SMA, EMA, RSI) are actively supported on this free plan.",
          source: "Alpha Vantage",
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // Standalone Official Technical Indicator Requests
    if (type === "sma" || type === "ema" || type === "rsi") {
      const periodParam = parseInt(searchParams.get("time_period") || (type === "rsi" ? "14" : "20"), 10);
      const indicator = type.toUpperCase() as "SMA" | "EMA" | "RSI";
      const indicatorData = await getOfficialIndicator(symbol, indicator, isNaN(periodParam) ? 20 : periodParam);

      return NextResponse.json(
        {
          ...indicatorData,
          timestamp: Date.now(),
        },
        { status: 200 }
      );
    }

    // Default: Composite Bundle (Daily OHLCV + Quote + SMA-20 + EMA-20 + RSI-14)
    const bundle = await getAlphaVantageBundle(symbol);

    return NextResponse.json(bundle, { status: 200 });
  } catch (err: any) {
    const errorMessage = err?.message || "Internal server error querying Alpha Vantage.";
    const isNotFound = errorMessage.toLowerCase().includes("not found");
    const isRateLimit = errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("limit");

    return NextResponse.json(
      {
        error: "Alpha Vantage Gateway Error",
        message: errorMessage,
        source: "Alpha Vantage",
        timestamp: Date.now(),
      },
      { status: isNotFound ? 404 : isRateLimit ? 429 : 502 }
    );
  }
}
