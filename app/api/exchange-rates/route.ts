import { NextRequest, NextResponse } from "next/server";
import {
  validateCurrencyCode,
  getExchangeRates,
} from "@/utils/forex/exchangeRateData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawBase = searchParams.get("base") || "USD";
    const rawTarget = searchParams.get("target");
    const rawAmount = searchParams.get("amount");

    const base = validateCurrencyCode(rawBase, "USD");
    const target = rawTarget ? validateCurrencyCode(rawTarget, "INR") : undefined;
    const amount = rawAmount ? parseFloat(rawAmount) : 1;

    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        {
          error: "Invalid Request Parameter",
          message: "Conversion amount must be a positive number.",
          source: "ExchangeRate-API Gateway",
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // Verify server configuration
    const apiKey = process.env.EXCHANGERATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Configuration Error",
          message: "EXCHANGERATE_API_KEY is not defined in server environment (.env.local).",
          source: "ExchangeRate-API Gateway",
          timestamp: Date.now(),
        },
        { status: 500 }
      );
    }

    const bundle = await getExchangeRates(base, target, amount);

    // If target was specified but not found in returned rates
    if (target && !bundle.rates[target]) {
      return NextResponse.json(
        {
          error: "Unsupported Target Currency",
          message: `Target currency '${target}' is not supported or rates are unavailable.`,
          base,
          supportedCurrencies: Object.keys(bundle.rates).slice(0, 30),
          source: "ExchangeRate-API Gateway",
          timestamp: Date.now(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(bundle, { status: 200 });
  } catch (err: any) {
    const errorMessage = err?.message || "Internal server error querying ExchangeRate-API.";
    const isUnsupported = errorMessage.includes("unsupported-code");
    const isQuota = errorMessage.includes("quota");

    return NextResponse.json(
      {
        error: "ExchangeRate-API Gateway Error",
        message: errorMessage,
        source: "ExchangeRate-API",
        timestamp: Date.now(),
      },
      { status: isUnsupported ? 404 : isQuota ? 429 : 502 }
    );
  }
}
