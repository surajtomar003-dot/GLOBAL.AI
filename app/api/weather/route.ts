import { NextRequest, NextResponse } from "next/server";
import {
  fetchHubWeather,
  FINANCIAL_HUBS,
} from "@/utils/weather/weatherData";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const hubId = searchParams.get("hub")?.toLowerCase().trim();
    const latParam = searchParams.get("latitude") || searchParams.get("lat");
    const lonParam = searchParams.get("longitude") || searchParams.get("lon");

    let latitude: number;
    let longitude: number;
    let locationMeta: { name?: string; id?: string; category?: string; significance?: string } | undefined;

    // Option 1: Resolved via known financial hub preset
    if (hubId) {
      const foundHub = FINANCIAL_HUBS.find((h) => h.id === hubId);
      if (!foundHub) {
        return NextResponse.json(
          {
            error: "Unknown Hub Identifier",
            message: `Hub '${hubId}' is not in the recognized financial hubs registry. Supported hubs: ${FINANCIAL_HUBS.map((h) => h.id).join(", ")}. Or supply custom 'latitude' and 'longitude'.`,
          },
          { status: 400 }
        );
      }
      latitude = foundHub.latitude;
      longitude = foundHub.longitude;
      locationMeta = {
        id: foundHub.id,
        name: foundHub.name,
        category: foundHub.category,
        significance: foundHub.significance,
      };
    }
    // Option 2: Resolved via custom latitude and longitude
    else if (latParam && lonParam) {
      latitude = parseFloat(latParam);
      longitude = parseFloat(lonParam);

      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return NextResponse.json(
          {
            error: "Invalid Latitude",
            message: "Latitude must be a valid number between -90 and +90 degrees.",
          },
          { status: 400 }
        );
      }

      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          {
            error: "Invalid Longitude",
            message: "Longitude must be a valid number between -180 and +180 degrees.",
          },
          { status: 400 }
        );
      }

      // Check if coordinates match an existing known hub
      const matchingHub = FINANCIAL_HUBS.find(
        (h) => Math.abs(h.latitude - latitude) < 0.15 && Math.abs(h.longitude - longitude) < 0.15
      );
      if (matchingHub) {
        locationMeta = {
          id: matchingHub.id,
          name: matchingHub.name,
          category: matchingHub.category,
          significance: matchingHub.significance,
        };
      }
    }
    // Default fallback: New York (NYSE / COMEX)
    else {
      const defaultHub = FINANCIAL_HUBS[0]; // NYC
      latitude = defaultHub.latitude;
      longitude = defaultHub.longitude;
      locationMeta = {
        id: defaultHub.id,
        name: defaultHub.name,
        category: defaultHub.category,
        significance: defaultHub.significance,
      };
    }

    const weather = await fetchHubWeather(latitude, longitude, locationMeta);

    return NextResponse.json(weather, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error: any) {
    const message = error?.message || "Internal server error fetching atmospheric telemetry.";

    let status = 502;
    if (message.includes("timed out")) {
      status = 504;
    } else if (message.includes("rate limit")) {
      status = 429;
    } else if (message.includes("Invalid")) {
      status = 400;
    }

    return NextResponse.json(
      {
        status: "error",
        error: "Weather Gateway Error",
        message,
        source: "Open-Meteo",
        timestamp: Date.now(),
        attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
      },
      { status }
    );
  }
}
