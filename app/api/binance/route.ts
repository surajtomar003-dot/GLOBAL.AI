import { NextRequest, NextResponse } from "next/server";
import { computeMarketAnalysis } from "@/utils/binance/marketAnalysis";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";

  try {
    const analysis = await computeMarketAnalysis(symbol);
    return NextResponse.json(analysis, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3, stale-while-revalidate=5",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to generate Binance market analysis",
        message: error?.message || "Unknown error",
        symbol,
      },
      { status: 502 }
    );
  }
}
