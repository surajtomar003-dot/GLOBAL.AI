/**
 * Federal Reserve Economic Data (FRED) Macro Intelligence Engine
 * Global Intelligence Terminal (Global.ai)
 *
 * Provides institutional macroeconomic telemetry from the St. Louis Fed:
 * - Gross Domestic Product (GDP)
 * - Consumer Price Index & YoY Inflation (CPIAUCSL)
 * - Federal Funds Effective Rate (FEDFUNDS)
 * - Civilian Unemployment Rate (UNRATE)
 * - 10-Year & 2-Year Treasury Yields & Yield Curve Spread (DGS10, DGS2)
 * - Initial Jobless Claims (ICSA)
 */

export interface FredObservation {
  date: string;
  value: number;
}

export interface MacroIndicator {
  seriesId: string;
  title: string;
  frequency: "Quarterly" | "Monthly" | "Weekly" | "Daily";
  units: string;
  seasonalAdjustment: string;
  latestDate: string;
  latestValue: number;
  previousDate: string | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  calculatedMetricLabel?: string;
  calculatedMetricValue?: number | null;
  calculatedMetricUnit?: string;
  history: FredObservation[]; // sorted ascending (oldest to newest) for charting
}

export interface YieldCurveSpread {
  date: string;
  dgs10: number;
  dgs2: number;
  spreadBps: number; // (10Y - 2Y) * 100
  isInverted: boolean;
}

export interface MacroDashboardSummary {
  timestamp: number;
  source: string;
  indicators: Record<string, MacroIndicator>;
  yieldCurve: YieldCurveSpread | null;
  cached: boolean;
}

export const SUPPORTED_FRED_SERIES: Record<string, {
  title: string;
  frequency: "Quarterly" | "Monthly" | "Weekly" | "Daily";
  units: string;
  seasonalAdjustment: string;
  limit: number;
}> = {
  GDP: {
    title: "Gross Domestic Product (GDP)",
    frequency: "Quarterly",
    units: "Billions of USD (SAAR)",
    seasonalAdjustment: "Seasonally Adjusted Annual Rate",
    limit: 20, // 5 years of quarters
  },
  CPIAUCSL: {
    title: "Consumer Price Index (Headline CPI)",
    frequency: "Monthly",
    units: "Index 1982-1984=100",
    seasonalAdjustment: "Seasonally Adjusted",
    limit: 36, // 3 years of monthly data for YoY and historical trend
  },
  FEDFUNDS: {
    title: "Federal Funds Effective Rate",
    frequency: "Monthly",
    units: "Percent (%)",
    seasonalAdjustment: "Not Seasonally Adjusted",
    limit: 36, // 3 years of monthly rates
  },
  UNRATE: {
    title: "Civilian Unemployment Rate",
    frequency: "Monthly",
    units: "Percent (%)",
    seasonalAdjustment: "Seasonally Adjusted",
    limit: 36,
  },
  DGS10: {
    title: "10-Year Treasury Constant Maturity",
    frequency: "Daily",
    units: "Percent (%)",
    seasonalAdjustment: "Not Seasonally Adjusted",
    limit: 60, // 60 trading days for trend
  },
  DGS2: {
    title: "2-Year Treasury Constant Maturity",
    frequency: "Daily",
    units: "Percent (%)",
    seasonalAdjustment: "Not Seasonally Adjusted",
    limit: 60,
  },
  ICSA: {
    title: "Initial Jobless Claims",
    frequency: "Weekly",
    units: "Number of Persons",
    seasonalAdjustment: "Seasonally Adjusted",
    limit: 30, // ~7 months of weekly prints
  },
};

// In-memory cache for FRED data (5-minute TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and clean raw observations from FRED API
 */
export async function fetchFredSeries(
  seriesId: string,
  limit: number = 30
): Promise<FredObservation[]> {
  const apiKey = (process.env.FRED_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("FRED_API_KEY environment variable is not configured in .env.local.");
  }

  const cleanId = seriesId.toUpperCase().trim();
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${cleanId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 }, // 5 min Next.js revalidation
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      throw new Error("FRED API rate limit reached (120 requests/minute). Please wait.");
    }

    if (!res.ok) {
      throw new Error(`FRED API error for series '${cleanId}': HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.observations || !Array.isArray(data.observations)) {
      throw new Error(`Invalid FRED response payload for series '${cleanId}'.`);
    }

    // FRED uses "." for non-available / holiday days.
    // Parse valid numeric observations and reverse to chronological order (oldest -> newest).
    const validObs: FredObservation[] = data.observations
      .filter((item: any) => item.value && item.value !== "." && !isNaN(Number(item.value)))
      .map((item: any) => ({
        date: item.date,
        value: Number(item.value),
      }))
      .reverse();

    if (validObs.length === 0) {
      throw new Error(`No valid numeric observations returned for FRED series '${cleanId}'.`);
    }

    return validObs;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`FRED API request timed out after 8 seconds for '${cleanId}'.`);
    }
    throw err;
  }
}

/**
 * Process a series into an enriched MacroIndicator with rigorous economic calculations
 */
export function processMacroIndicator(
  seriesId: string,
  observations: FredObservation[]
): MacroIndicator {
  const meta = SUPPORTED_FRED_SERIES[seriesId] || {
    title: seriesId,
    frequency: "Monthly",
    units: "Units",
    seasonalAdjustment: "Seasonally Adjusted",
  };

  const count = observations.length;
  const latest = observations[count - 1];
  const previous = count > 1 ? observations[count - 2] : null;

  const latestVal = latest.value;
  const prevVal = previous ? previous.value : null;

  let absoluteChange: number | null = null;
  let percentageChange: number | null = null;

  if (prevVal !== null) {
    absoluteChange = parseFloat((latestVal - prevVal).toFixed(4));
    if (prevVal !== 0) {
      percentageChange = parseFloat((((latestVal - prevVal) / prevVal) * 100).toFixed(2));
    }
  }

  let calculatedMetricLabel: string | undefined = undefined;
  let calculatedMetricValue: number | null = null;
  let calculatedMetricUnit: string | undefined = undefined;

  // Domain-specific metric calculations
  if (seriesId === "GDP") {
    // GDP QoQ Annualized Growth: ((GDP_t / GDP_{t-1})^4 - 1) * 100
    if (prevVal && prevVal > 0) {
      const annualizedQoQ = (Math.pow(latestVal / prevVal, 4) - 1) * 100;
      calculatedMetricLabel = "QoQ Annualized Growth";
      calculatedMetricValue = parseFloat(annualizedQoQ.toFixed(2));
      calculatedMetricUnit = "%";
    }
  } else if (seriesId === "CPIAUCSL") {
    // CPI Index to YoY Inflation: ((CPI_t - CPI_{t-12}) / CPI_{t-12}) * 100
    if (count >= 13) {
      const cpiYearAgo = observations[count - 13].value;
      if (cpiYearAgo > 0) {
        const yoyInflation = ((latestVal - cpiYearAgo) / cpiYearAgo) * 100;
        calculatedMetricLabel = "YoY Headline Inflation";
        calculatedMetricValue = parseFloat(yoyInflation.toFixed(2));
        calculatedMetricUnit = "%";
      }
    }
  } else if (seriesId === "FEDFUNDS" || seriesId === "UNRATE") {
    // Rate changes are expressed in basis points or percentage points
    if (prevVal !== null) {
      calculatedMetricLabel = "Monthly Rate Delta";
      calculatedMetricValue = parseFloat((latestVal - prevVal).toFixed(2));
      calculatedMetricUnit = "% pts";
    }
  } else if (seriesId === "DGS10" || seriesId === "DGS2") {
    // Daily yield delta in basis points
    if (prevVal !== null) {
      calculatedMetricLabel = "Daily Yield Delta";
      calculatedMetricValue = parseFloat(((latestVal - prevVal) * 100).toFixed(1));
      calculatedMetricUnit = "bps";
    }
  } else if (seriesId === "ICSA") {
    if (prevVal !== null) {
      calculatedMetricLabel = "Weekly Claims Delta";
      calculatedMetricValue = latestVal - prevVal;
      calculatedMetricUnit = "claims";
    }
  }

  return {
    seriesId,
    title: meta.title,
    frequency: meta.frequency,
    units: meta.units,
    seasonalAdjustment: meta.seasonalAdjustment,
    latestDate: latest.date,
    latestValue: latestVal,
    previousDate: previous ? previous.date : null,
    previousValue: prevVal,
    absoluteChange,
    percentageChange,
    calculatedMetricLabel,
    calculatedMetricValue,
    calculatedMetricUnit,
    history: observations,
  };
}

/**
 * Retrieve all macroeconomic indicators in a unified institutional dashboard summary
 */
export async function getMacroDashboardSummary(): Promise<MacroDashboardSummary> {
  const cacheKey = "FRED_MACRO_DASHBOARD_ALL";
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
    };
  }

  const seriesIds = Object.keys(SUPPORTED_FRED_SERIES);

  // Fetch all series in parallel with individual error resilience
  const results = await Promise.allSettled(
    seriesIds.map(async (id) => {
      const config = SUPPORTED_FRED_SERIES[id];
      const observations = await fetchFredSeries(id, config.limit);
      return processMacroIndicator(id, observations);
    })
  );

  const indicators: Record<string, MacroIndicator> = {};

  results.forEach((res, index) => {
    const id = seriesIds[index];
    if (res.status === "fulfilled") {
      indicators[id] = res.value;
    } else {
      console.error(`Failed to load FRED series '${id}':`, res.reason?.message);
    }
  });

  // Calculate 10Y - 2Y Yield Curve Spread if both exist
  let yieldCurve: YieldCurveSpread | null = null;
  const dgs10 = indicators["DGS10"];
  const dgs2 = indicators["DGS2"];

  if (dgs10 && dgs2) {
    const spreadVal = dgs10.latestValue - dgs2.latestValue;
    const spreadBps = parseFloat((spreadVal * 100).toFixed(1));
    yieldCurve = {
      date: dgs10.latestDate,
      dgs10: dgs10.latestValue,
      dgs2: dgs2.latestValue,
      spreadBps,
      isInverted: spreadBps < 0,
    };
  }

  const summary: MacroDashboardSummary = {
    timestamp: now,
    source: "Federal Reserve Bank of St. Louis (FRED)",
    indicators,
    yieldCurve,
    cached: false,
  };

  memoryCache.set(cacheKey, {
    data: summary,
    timestamp: now,
  });

  return summary;
}
