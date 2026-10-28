"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  WeatherResponse,
  FINANCIAL_HUBS,
  GlobalFinancialHub,
} from "@/utils/weather/weatherData";

export default function WeatherIntelligencePage() {
  const [selectedHub, setSelectedHub] = useState<string>("nyc");
  const [customLat, setCustomLat] = useState<string>("");
  const [customLon, setCustomLon] = useState<string>("");
  const [isCustomCoord, setIsCustomCoord] = useState<boolean>(false);

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");

  const currentHubMeta: GlobalFinancialHub | undefined = useMemo(() => {
    return FINANCIAL_HUBS.find((h) => h.id === selectedHub);
  }, [selectedHub]);

  const fetchWeather = useCallback(
    async (isManual: boolean = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        let url = `/api/weather`;
        if (isCustomCoord && customLat && customLon) {
          url += `?latitude=${encodeURIComponent(customLat)}&longitude=${encodeURIComponent(customLon)}`;
        } else {
          url += `?hub=${encodeURIComponent(selectedHub)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || data.status === "error") {
          throw new Error(data.message || `HTTP ${res.status}: Failed to fetch weather data`);
        }

        setWeather(data);
      } catch (err: any) {
        setError(err?.message || "Failed to retrieve atmospheric telemetry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        if (isManual) {
          setCooldown(10); // 10-second cooldown
        }
      }
    },
    [isCustomCoord, customLat, customLon, selectedHub]
  );

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTemp = (celsius: number) => {
    if (tempUnit === "F") {
      const fahrenheit = (celsius * 9) / 5 + 32;
      return `${fahrenheit.toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLat || !customLon) return;
    setIsCustomCoord(true);
    fetchWeather(true);
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#05070A",
      color: "#F2F5F7",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: "2rem"
    }}>
      {/* Top Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #1C2530",
        paddingBottom: "1.25rem",
        marginBottom: "1.75rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Global Intelligence — Atmospheric & Logistics Telemetry
            </h1>
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.2rem 0.55rem",
              borderRadius: "4px",
              backgroundColor: "rgba(79, 209, 229, 0.15)",
              color: "#4FD1E5",
              border: "1px solid rgba(79, 209, 229, 0.3)"
            }}>
              OPEN-METEO NWP
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Physical atmospheric conditions, temperature curves, humidity, and wind telemetry across major global trade corridors
          </p>
        </div>

        {/* Navigation & Controls */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Unit Toggle */}
          <div style={{ display: "flex", backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "6px", overflow: "hidden" }}>
            <button
              onClick={() => setTempUnit("C")}
              style={{
                padding: "0.45rem 0.75rem",
                border: "none",
                backgroundColor: tempUnit === "C" ? "#4FD1E5" : "transparent",
                color: tempUnit === "C" ? "#05070A" : "#8B98A7",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              °C
            </button>
            <button
              onClick={() => setTempUnit("F")}
              style={{
                padding: "0.45rem 0.75rem",
                border: "none",
                backgroundColor: tempUnit === "F" ? "#4FD1E5" : "transparent",
                color: tempUnit === "F" ? "#05070A" : "#8B98A7",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              °F
            </button>
          </div>

          <button
            onClick={() => fetchWeather(true)}
            disabled={refreshing || cooldown > 0}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: cooldown > 0 ? "#141B24" : "rgba(52, 211, 153, 0.12)",
              border: `1px solid ${cooldown > 0 ? "#1C2530" : "rgba(52, 211, 153, 0.3)"}`,
              color: cooldown > 0 ? "#5C6773" : "#34D399",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: cooldown > 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>{refreshing ? "⟳ Refreshing..." : cooldown > 0 ? `Wait ${cooldown}s` : "⟳ Refresh"}</span>
          </button>

          <Link
            href="/forex"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "rgba(52, 211, 153, 0.12)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              color: "#34D399",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            💱 Forex ↗
          </Link>

          <Link
            href="/stocks"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "rgba(79, 209, 229, 0.12)",
              border: "1px solid rgba(79, 209, 229, 0.3)",
              color: "#4FD1E5",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            📈 Stocks ↗
          </Link>

          <Link
            href="/news"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#8B98A7",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            📰 News Wire ↗
          </Link>

          <Link
            href="/macro"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "rgba(232, 181, 99, 0.12)",
              border: "1px solid rgba(232, 181, 99, 0.3)",
              color: "#E8B563",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            🏛️ FRED Macro ↗
          </Link>

          <Link
            href="/"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#8B98A7",
              textDecoration: "none",
              fontSize: "0.82rem"
            }}
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* Mandatory Attribution & Disclaimer Notice */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(16, 21, 28, 0.8)",
        border: "1px solid #1C2530",
        borderRadius: "8px",
        padding: "0.75rem 1.25rem",
        marginBottom: "1.75rem",
        fontSize: "0.8rem",
        color: "#8B98A7",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <div style={{ maxWidth: "800px" }}>
          <strong style={{ color: "#4FD1E5" }}>Attribution & Analytical Notice:</strong> Weather data provided by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4FD1E5", textDecoration: "underline" }}
          >
            Open-Meteo.com
          </a>{" "}
          under CC BY 4.0 (Free non-commercial endpoint). Atmospheric data is presented solely for physical logistics, port transit, and agricultural context. Weather forecasts are not confirmed natural disasters, and meteorological conditions alone do not predict financial-market movements or asset prices.
        </div>
        {weather?.timestamp && (
          <div style={{ color: "#5C6773", fontSize: "0.75rem" }}>
            Model Synced: {new Date(weather.timestamp).toLocaleTimeString()} {weather.cached ? "(Cached)" : "(Live)"}
          </div>
        )}
      </div>

      {/* Hub Selection Ribbon */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: "0.78rem", color: "#8B98A7", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Select Global Financial & Commodity Hub:
        </div>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
          {FINANCIAL_HUBS.map((hub) => {
            const isSelected = !isCustomCoord && selectedHub === hub.id;
            return (
              <button
                key={hub.id}
                onClick={() => {
                  setIsCustomCoord(false);
                  setSelectedHub(hub.id);
                }}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "5px",
                  border: `1px solid ${isSelected ? "#4FD1E5" : "#1C2530"}`,
                  backgroundColor: isSelected ? "rgba(79, 209, 229, 0.15)" : "#10151C",
                  color: isSelected ? "#4FD1E5" : "#8B98A7",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {hub.name.split(" ")[0]} ({hub.id.toUpperCase()})
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Coordinates Bar */}
      <div style={{
        backgroundColor: "#10151C",
        border: "1px solid #1C2530",
        borderRadius: "8px",
        padding: "0.75rem 1.25rem",
        marginBottom: "1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <span style={{ fontSize: "0.8rem", color: "#8B98A7" }}>
          Or query custom global coordinates (NWP Grid):
        </span>
        <form onSubmit={handleCustomSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="number"
            step="0.0001"
            placeholder="Latitude (-90 to +90)"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "5px",
              backgroundColor: "#141B24",
              border: "1px solid #1C2530",
              color: "#F2F5F7",
              fontSize: "0.8rem",
              width: "180px",
              outline: "none"
            }}
          />
          <input
            type="number"
            step="0.0001"
            placeholder="Longitude (-180 to +180)"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "5px",
              backgroundColor: "#141B24",
              border: "1px solid #1C2530",
              color: "#F2F5F7",
              fontSize: "0.8rem",
              width: "180px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "5px",
              backgroundColor: "#141B24",
              border: "1px solid #4FD1E5",
              color: "#4FD1E5",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Query Coordinates
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: "rgba(240, 97, 107, 0.12)",
          border: "1px solid rgba(240, 97, 107, 0.3)",
          color: "#F0616B",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => fetchWeather(true)}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: "4px",
              backgroundColor: "rgba(240, 97, 107, 0.2)",
              border: "1px solid #F0616B",
              color: "#F2F5F7",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !weather && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3.5rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4FD1E5" }}>
            ⟳ Ingesting Open-Meteo Atmospheric Models...
          </div>
          <p style={{ fontSize: "0.85rem", color: "#5C6773" }}>
            Extracting temperature, humidity, wind velocity, and precipitation probabilities
          </p>
        </div>
      )}

      {/* Main Telemetry Display */}
      {weather && (
        <>
          {/* Active Hub Summary Hero */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem",
            marginBottom: "1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#4FD1E5", fontWeight: 700 }}>
                  HUB: {weather.location.name}
                </span>
                {weather.location.category && (
                  <span style={{
                    fontSize: "0.68rem",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    backgroundColor: "#141B24",
                    color: "#8B98A7",
                    border: "1px solid #1C2530"
                  }}>
                    {weather.location.category}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0.4rem 0", fontFamily: "'JetBrains Mono', monospace", color: "#F2F5F7" }}>
                {formatTemp(weather.current.temperature)}
              </div>
              <div style={{ fontSize: "0.95rem", color: "#4FD1E5", fontWeight: 600 }}>
                {weather.current.condition}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#5C6773", marginTop: "0.35rem" }}>
                Coordinates: {weather.location.latitude.toFixed(4)}°, {weather.location.longitude.toFixed(4)}° | Timezone: {weather.location.timezone} | Obs: {weather.current.time}
              </div>
            </div>

            {/* Hub Significance Context */}
            {currentHubMeta && (
              <div style={{
                maxWidth: "420px",
                backgroundColor: "#0B0F14",
                border: "1px solid #1C2530",
                borderRadius: "8px",
                padding: "1rem"
              }}>
                <div style={{ fontSize: "0.72rem", color: "#5C6773", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Trade Corridor Context
                </div>
                <div style={{ fontSize: "0.82rem", color: "#8B98A7", lineHeight: "1.4" }}>
                  {currentHubMeta.significance}
                </div>
              </div>
            )}
          </div>

          {/* Environmental Gauges Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.75rem"
          }}>
            {/* Relative Humidity */}
            <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>Relative Humidity</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.3rem 0", color: "#F2F5F7", fontFamily: "monospace" }}>
                {weather.current.relative_humidity}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>2-meter atmospheric saturation</div>
            </div>

            {/* Wind Velocity */}
            <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>Wind Velocity (10m)</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.3rem 0", color: "#F2F5F7", fontFamily: "monospace" }}>
                {weather.current.wind_speed} <span style={{ fontSize: "0.9rem", color: "#8B98A7" }}>{weather.units.wind_speed}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>Surface boundary layer wind speed</div>
            </div>

            {/* 7-Day Precipitation Outlook */}
            <div style={{ backgroundColor: "#10151C", border: "1px solid #1C2530", borderRadius: "8px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8B98A7", textTransform: "uppercase" }}>Peak Rain Probability (Today)</div>
              <div style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                margin: "0.3rem 0",
                color: (weather.daily[0]?.precipitation_probability_max || 0) > 50 ? "#4FD1E5" : "#34D399",
                fontFamily: "monospace"
              }}>
                {weather.daily[0]?.precipitation_probability_max ?? 0}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "#5C6773" }}>Max precipitation likelihood in 24h</div>
            </div>
          </div>

          {/* 7-Day Atmospheric Forecast Table */}
          <div style={{
            backgroundColor: "#10151C",
            border: "1px solid #1C2530",
            borderRadius: "10px",
            padding: "1.5rem",
            marginBottom: "1.75rem"
          }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", fontWeight: 700 }}>
              7-Day Atmospheric Outlook
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid #1C2530",
                    color: "#8B98A7",
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em"
                  }}>
                    <th style={{ padding: "0.6rem 0.8rem" }}>Date</th>
                    <th style={{ padding: "0.6rem 0.8rem" }}>Condition</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Max Temp</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Min Temp</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Rain Prob (%)</th>
                    <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Max Wind</th>
                  </tr>
                </thead>
                <tbody>
                  {weather.daily.map((d, i) => (
                    <tr key={d.date} style={{ borderBottom: "1px solid #161D26" }}>
                      <td style={{ padding: "0.75rem 0.8rem", fontWeight: 600, color: i === 0 ? "#4FD1E5" : "#F2F5F7" }}>
                        {d.date} {i === 0 ? "(Today)" : ""}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", color: "#8B98A7" }}>
                        {d.condition}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", fontFamily: "monospace", color: "#F0616B", fontWeight: 600 }}>
                        {formatTemp(d.temperature_max)}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", fontFamily: "monospace", color: "#4FD1E5" }}>
                        {formatTemp(d.temperature_min)}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", fontFamily: "monospace" }}>
                        <span style={{
                          color: d.precipitation_probability_max > 50 ? "#4FD1E5" : "#8B98A7"
                        }}>
                          {d.precipitation_probability_max}%
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", fontFamily: "monospace", color: "#8B98A7" }}>
                        {d.wind_speed_max} km/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: "3rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid #1C2530",
        color: "#5C6773",
        fontSize: "0.8rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <span>Open-Meteo Gateway: <code>/api/weather?hub={selectedHub}</code></span>
        <span>GLOBAL.AI Atmospheric & Environmental Intelligence</span>
      </footer>
    </div>
  );
}
