import { NextRequest, NextResponse } from "next/server";
import {
  fetchFredSeries,
  processMacroIndicator,
  getMacroDashboardSummary,
  SUPPORTED_FRED_SERIES,
} from "@/utils/fred/macroData";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesIdParam = searchParams.get("series_id");
    const limitParam = searchParams.get("limit");

    // Case 1: Return full macroeconomic dashboard summary
    if (!seriesIdParam || seriesIdParam.toUpperCase() === "ALL") {
      const summary = await getMacroDashboardSummary();
      return NextResponse.json(summary, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Case 2: Return specific FRED series
    const cleanId = seriesIdParam.toUpperCase().trim().replace(/[^A-Z0-9_]/g, "");

    if (!cleanId) {
      return NextResponse.json(
        { error: "Invalid Parameter", message: "A valid 'series_id' is required." },
        { status: 400 }
      );
    }

    const defaultLimit = SUPPORTED_FRED_SERIES[cleanId]?.limit || 30;
    const limit = limitParam ? Math.min(120, Math.max(1, parseInt(limitParam, 10) || defaultLimit)) : defaultLimit;

    const observations = await fetchFredSeries(cleanId, limit);
    const indicator = processMacroIndicator(cleanId, observations);

    return NextResponse.json(
      {
        source: "Federal Reserve Bank of St. Louis (FRED)",
        timestamp: Date.now(),
        indicator,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    const message = error?.message || "Internal server error fetching FRED economic data.";

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
        error: "FRED Gateway Error",
        message,
        source: "Federal Reserve Bank of St. Louis",
        timestamp: Date.now(),
      },
      { status }
    );
  }
}
