/**
 * Open-Meteo Physical Atmospheric Telemetry Engine
 * Global Intelligence Terminal (Global.ai)
 *
 * Provides physical environment, shipping transit, and energy logistics
 * meteorological observations across key global financial and commodity centers.
 * Attribution: Weather data by Open-Meteo.com (CC BY 4.0).
 */

export interface WeatherCurrent {
  time: string;
  temperature: number;
  relative_humidity: number;
  wind_speed: number;
  weather_code: number;
  condition: string;
}

export interface WeatherDaily {
  date: string;
  temperature_max: number;
  temperature_min: number;
  precipitation_probability_max: number;
  wind_speed_max: number;
  weather_code: number;
  condition: string;
}

export interface WeatherHourly {
  time: string;
  temperature: number;
  relative_humidity: number;
  wind_speed: number;
}

export interface GlobalFinancialHub {
  id: string;
  name: string;
  category: "Equities / Banking" | "Commodities / Energy" | "Maritime / Shipping" | "Agri Futures";
  latitude: number;
  longitude: number;
  timezone: string;
  significance: string;
}

export interface WeatherResponse {
  location: {
    id?: string;
    name: string;
    category?: string;
    latitude: number;
    longitude: number;
    elevation?: number;
    timezone: string;
    significance?: string;
  };
  current: WeatherCurrent;
  units: {
    temperature: string;
    relative_humidity: string;
    wind_speed: string;
  };
  daily: WeatherDaily[];
  hourly: WeatherHourly[];
  timestamp: number;
  cached: boolean;
  attribution: string;
}

export const FINANCIAL_HUBS: GlobalFinancialHub[] = [
  {
    id: "nyc",
    name: "New York (Wall St / COMEX)",
    category: "Equities / Banking",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    significance: "Global financial liquidity center and precious metals exchange (COMEX)",
  },
  {
    id: "london",
    name: "London (LSE / LME / ICE)",
    category: "Commodities / Energy",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
    significance: "London Metal Exchange (LME) and European energy trading clearinghouse",
  },
  {
    id: "tokyo",
    name: "Tokyo (TSE / OSE)",
    category: "Equities / Banking",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
    significance: "Primary Asia-Pacific sovereign debt and equity hub (TSE)",
  },
  {
    id: "chicago",
    name: "Chicago (CME / CBOT)",
    category: "Agri Futures",
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: "America/Chicago",
    significance: "Global agricultural commodities, grains, and interest-rate derivatives benchmark",
  },
  {
    id: "houston",
    name: "Houston (Gulf Energy / LNG)",
    category: "Commodities / Energy",
    latitude: 29.7604,
    longitude: -95.3698,
    timezone: "America/Chicago",
    significance: "U.S. Gulf Coast hydrocarbon refining, crude transit, and LNG export corridor",
  },
  {
    id: "singapore",
    name: "Singapore (SGX / Strait of Malacca)",
    category: "Maritime / Shipping",
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: "Asia/Singapore",
    significance: "Major global maritime transit strait, bunkering hub, and FX trading center",
  },
  {
    id: "rotterdam",
    name: "Rotterdam (Port of Rotterdam)",
    category: "Maritime / Shipping",
    latitude: 51.9244,
    longitude: 4.4777,
    timezone: "Europe/Amsterdam",
    significance: "Largest seaport in Europe, critical gateway for raw materials, oil, and LNG",
  },
  {
    id: "frankfurt",
    name: "Frankfurt (ECB / Deutsche Börse)",
    category: "Equities / Banking",
    latitude: 50.1109,
    longitude: 8.6821,
    timezone: "Europe/Berlin",
    significance: "European Central Bank headquarters and Eurozone monetary hub",
  },
  {
    id: "dubai",
    name: "Dubai (DIFC / Middle East Energy)",
    category: "Commodities / Energy",
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
    significance: "Middle East financial logistics gateway and crude oil trade hub",
  },
  {
    id: "mumbai",
    name: "Mumbai (NSE / BSE / JNPT)",
    category: "Equities / Banking",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    significance: "India sovereign equity center and major Arabian Sea container port",
  },
  {
    id: "saopaulo",
    name: "São Paulo (B3 / LatAm Agro)",
    category: "Agri Futures",
    latitude: -23.5505,
    longitude: -46.6333,
    timezone: "America/Sao_Paulo",
    significance: "Latin America agricultural commodity export and equity capital center",
  },
];

/**
 * WMO Weather Interpretation Codes (WW)
 */
export function getWmoCondition(code: number): string {
  switch (code) {
    case 0:
      return "Clear Sky";
    case 1:
      return "Mainly Clear";
    case 2:
      return "Partly Cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog / Depositing Rime Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle (Light to Dense)";
    case 61:
    case 63:
    case 65:
      return "Rain (Slight to Heavy)";
    case 71:
    case 73:
    case 75:
      return "Snow Fall (Slight to Heavy)";
    case 77:
      return "Snow Grains";
    case 80:
    case 81:
    case 82:
      return "Rain Showers";
    case 85:
    case 86:
      return "Snow Showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with Hail";
    default:
      return "Atmospheric Variation";
  }
}

// In-memory cache (15-minute TTL to comply with non-commercial rate considerations)
interface CacheEntry {
  data: WeatherResponse;
  timestamp: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch Open-Meteo forecast data with coordinate validation and caching
 */
export async function fetchHubWeather(
  latitude: number,
  longitude: number,
  locationMeta?: { name?: string; id?: string; category?: string; significance?: string }
): Promise<WeatherResponse> {
  // Validate coordinates
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Invalid latitude. Must be a decimal number between -90 and +90.");
  }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid longitude. Must be a decimal number between -180 and +180.");
  }

  // Normalize lat/lon to 2 decimal places for cache key
  const normLat = parseFloat(latitude.toFixed(2));
  const normLon = parseFloat(longitude.toFixed(2));
  const cacheKey = `${normLat},${normLon}`;

  const now = Date.now();
  const cached = weatherCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      cached: true,
      timestamp: cached.timestamp,
    };
  }

  const searchParams = new URLSearchParams({
    latitude: normLat.toString(),
    longitude: normLon.toString(),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code",
    hourly: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    forecast_days: "7",
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${searchParams.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 900 }, // 15 minutes Next.js revalidation
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      if (cached) {
        return {
          ...cached.data,
          cached: true,
        };
      }
      throw new Error("Open-Meteo API rate limit reached. Please wait a moment.");
    }

    if (!res.ok) {
      throw new Error(`Open-Meteo API responded with HTTP ${res.status}`);
    }

    const data = await res.json();

    const current: WeatherCurrent = {
      time: data.current?.time || new Date().toISOString(),
      temperature: data.current?.temperature_2m ?? 0,
      relative_humidity: data.current?.relative_humidity_2m ?? 0,
      wind_speed: data.current?.wind_speed_10m ?? 0,
      weather_code: data.current?.weather_code ?? 0,
      condition: getWmoCondition(data.current?.weather_code ?? 0),
    };

    const units = {
      temperature: data.current_units?.temperature_2m || "°C",
      relative_humidity: data.current_units?.relative_humidity_2m || "%",
      wind_speed: data.current_units?.wind_speed_10m || "km/h",
    };

    // Parse daily 7-day forecast
    const daily: WeatherDaily[] = [];
    if (data.daily?.time && Array.isArray(data.daily.time)) {
      for (let i = 0; i < data.daily.time.length; i++) {
        const code = data.daily.weather_code?.[i] ?? 0;
        daily.push({
          date: data.daily.time[i],
          temperature_max: data.daily.temperature_2m_max?.[i] ?? 0,
          temperature_min: data.daily.temperature_2m_min?.[i] ?? 0,
          precipitation_probability_max: data.daily.precipitation_probability_max?.[i] ?? 0,
          wind_speed_max: data.daily.wind_speed_10m_max?.[i] ?? 0,
          weather_code: code,
          condition: getWmoCondition(code),
        });
      }
    }

    // Parse hourly forecast (next 24 hours)
    const hourly: WeatherHourly[] = [];
    if (data.hourly?.time && Array.isArray(data.hourly.time)) {
      const maxHours = Math.min(24, data.hourly.time.length);
      for (let i = 0; i < maxHours; i++) {
        hourly.push({
          time: data.hourly.time[i],
          temperature: data.hourly.temperature_2m?.[i] ?? 0,
          relative_humidity: data.hourly.relative_humidity_2m?.[i] ?? 0,
          wind_speed: data.hourly.wind_speed_10m?.[i] ?? 0,
        });
      }
    }

    const responsePayload: WeatherResponse = {
      location: {
        id: locationMeta?.id,
        name: locationMeta?.name || `Location (${normLat}, ${normLon})`,
        category: locationMeta?.category,
        latitude: data.latitude ?? normLat,
        longitude: data.longitude ?? normLon,
        elevation: data.elevation,
        timezone: data.timezone || "UTC",
        significance: locationMeta?.significance,
      },
      current,
      units,
      daily,
      hourly,
      timestamp: now,
      cached: false,
      attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
    };

    weatherCache.set(cacheKey, {
      data: responsePayload,
      timestamp: now,
    });

    return responsePayload;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      if (cached) {
        return {
          ...cached.data,
          cached: true,
        };
      }
      throw new Error("Open-Meteo API request timed out after 8 seconds.");
    }
    throw err;
  }
}
