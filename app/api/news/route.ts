import { NextRequest, NextResponse } from "next/server";
import { fetchNewsArticles } from "@/utils/news/newsData";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const country = searchParams.get("country") || undefined;
    const language = searchParams.get("language") || "en";
    const page = searchParams.get("page") || undefined;

    const data = await fetchNewsArticles({
      q,
      category,
      country,
      language,
      page,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch (error: any) {
    const message = error?.message || "Internal server error fetching news data.";

    let status = 502;
    if (message.includes("timed out")) {
      status = 504;
    } else if (message.includes("rate limit")) {
      status = 429;
    } else if (message.includes("not configured")) {
      status = 500;
    }

    return NextResponse.json(
      {
        status: "error",
        error: "NewsData Gateway Error",
        message,
        source: "NewsData.io",
        timestamp: Date.now(),
        delayedNotice: "Delayed by up to 12 hours on the current free plan",
      },
      { status }
    );
  }
}
