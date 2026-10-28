import { NextRequest, NextResponse } from "next/server";
import { fetchCoinGeckoMarkets } from "@/utils/coingecko/marketData";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const vs_currency = searchParams.get("vs_currency") || "usd";
    const ids = searchParams.get("ids") || undefined;
    const per_page = searchParams.get("per_page")
      ? parseInt(searchParams.get("per_page")!, 10)
      : 25;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : 1;
    const order = searchParams.get("order") || "market_cap_desc";

    const response = await fetchCoinGeckoMarkets({
      vs_currency,
      ids,
      per_page,
      page,
      order,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    const message = error?.message || "Internal server error fetching CoinGecko data";

    let status = 502;
    if (message.includes("timed out")) {
      status = 504;
    } else if (message.includes("rate limit")) {
      status = 429;
    }

    return NextResponse.json(
      {
        error: "CoinGecko API Gateway Error",
        message,
        source: "coingecko-aggregated",
        timestamp: Date.now(),
      },
      { status }
    );
  }
}
