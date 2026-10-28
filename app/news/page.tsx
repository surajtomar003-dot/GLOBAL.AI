"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  NewsArticle,
  NewsApiResponse,
  ALLOWED_CATEGORIES,
  ALLOWED_COUNTRIES,
} from "@/utils/news/newsData";

export default function NewsIntelligencePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [delayedNotice, setDelayedNotice] = useState<string>("Delayed by up to 12 hours on the current free plan");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("business");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);

  const fetchNews = useCallback(
    async (isManual: boolean = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedCategory) params.set("category", selectedCategory);
        if (selectedCountry) params.set("country", selectedCountry);

        const res = await fetch(`/api/news?${params.toString()}`);
        const data: NewsApiResponse = await res.json();

        if (!res.ok || data.status === "error") {
          throw new Error((data as any).message || `HTTP ${res.status}: Failed to fetch news`);
        }

        setArticles(data.results || []);
        setTotalResults(data.totalResults || 0);
        setLastUpdated(data.timestamp);
        if (data.delayedNotice) {
          setDelayedNotice(data.delayedNotice);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load news feed. Verify network or API limits.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        if (isManual) {
          setCooldown(15); // 15-second cooldown on manual refresh to protect free plan quota
        }
      }
    },
    [searchQuery, selectedCategory, selectedCountry]
  );

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNews(true);
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    let bg = "rgba(139, 152, 167, 0.15)";
    let color = "#8B98A7";
    if (sentiment === "positive") {
      bg = "rgba(52, 211, 153, 0.15)";
      color = "#34D399";
    } else if (sentiment === "negative") {
      bg = "rgba(240, 97, 107, 0.15)";
      color = "#F0616B";
    }
    return (
      <span style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "0.15rem 0.45rem",
        borderRadius: "4px",
        backgroundColor: bg,
        color,
        textTransform: "uppercase"
      }}>
        {sentiment}
      </span>
    );
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
              Global Intelligence — Financial & Macro News Wire
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
              NEWSDATA.IO WIRE
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0 0", color: "#8B98A7", fontSize: "0.85rem" }}>
            Curated financial news, corporate catalysts, monetary policy statements, and geopolitical intelligence
          </p>
        </div>

        {/* Navigation & Controls */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => fetchNews(true)}
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
            href="/coingecko"
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
            🌐 CoinGecko ↗
          </Link>

          <Link
            href="/market-analysis"
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
            ⚡ Binance ↗
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

      {/* Mandatory Free Plan Notice */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(232, 181, 99, 0.08)",
        border: "1px solid rgba(232, 181, 99, 0.3)",
        borderRadius: "8px",
        padding: "0.75rem 1.25rem",
        marginBottom: "1.75rem",
        fontSize: "0.82rem",
        color: "#E8B563",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>⏱️</span>
          <span>
            <strong>NewsData.io Free Tier Notice:</strong> {delayedNotice}.
          </span>
        </div>
        {lastUpdated && (
          <div style={{ color: "#8B98A7", fontSize: "0.75rem" }}>
            Synced: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.5rem"
      }}>
        {/* Category Tabs */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#8B98A7", marginRight: "0.2rem" }}>Category:</span>
          {ALLOWED_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "5px",
                border: `1px solid ${selectedCategory === cat ? "#4FD1E5" : "#1C2530"}`,
                backgroundColor: selectedCategory === cat ? "rgba(79, 209, 229, 0.15)" : "#10151C",
                color: selectedCategory === cat ? "#4FD1E5" : "#8B98A7",
                fontSize: "0.78rem",
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer"
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input & Country Select */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Country Dropdown */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "#10151C",
              border: "1px solid #1C2530",
              color: "#F2F5F7",
              fontSize: "0.8rem",
              outline: "none"
            }}
          >
            <option value="">Global (All)</option>
            {ALLOWED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.4rem" }}>
            <input
              type="text"
              placeholder="Search keyword (e.g. Fed, Inflation, Tech)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                backgroundColor: "#10151C",
                border: "1px solid #1C2530",
                color: "#F2F5F7",
                fontSize: "0.82rem",
                minWidth: "220px",
                outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                backgroundColor: "#141B24",
                border: "1px solid #1C2530",
                color: "#4FD1E5",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Search
            </button>
          </form>
        </div>
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
            onClick={() => fetchNews(true)}
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
      {loading && articles.length === 0 && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3.5rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4FD1E5" }}>
            ⟳ Ingesting NewsData.io Financial Feeds...
          </div>
          <p style={{ fontSize: "0.85rem", color: "#5C6773" }}>
            Aggregating news dispatches across global financial publications
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && articles.length === 0 && !error && (
        <div style={{
          backgroundColor: "#10151C",
          border: "1px solid #1C2530",
          borderRadius: "8px",
          padding: "3rem",
          textAlign: "center",
          color: "#8B98A7"
        }}>
          <p>No articles found matching the current search & filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("business");
              setSelectedCountry("");
            }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              backgroundColor: "#141B24",
              border: "1px solid #1C2530",
              color: "#4FD1E5",
              cursor: "pointer",
              marginTop: "0.5rem"
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Articles Feed */}
      {articles.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "1.25rem"
        }}>
          {articles.map((art) => (
            <article
              key={art.article_id}
              style={{
                backgroundColor: "#10151C",
                border: "1px solid #1C2530",
                borderRadius: "10px",
                padding: "1.4rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "border-color 0.15s ease"
              }}
            >
              <div>
                {/* Meta bar: Source & Timestamp & Sentiment */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                  fontSize: "0.75rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {art.source_icon && (
                      <img
                        src={art.source_icon}
                        alt=""
                        width={16}
                        height={16}
                        style={{ borderRadius: "50%" }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 700, color: "#4FD1E5" }}>
                      {art.source_name}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {getSentimentBadge(art.sentiment)}
                    <span style={{ color: "#5C6773", fontFamily: "monospace" }}>
                      {art.pubDate ? art.pubDate.split(" ")[0] : ""}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 style={{
                  margin: "0 0 0.6rem 0",
                  fontSize: "1.02rem",
                  fontWeight: 700,
                  lineHeight: "1.35",
                  color: "#F2F5F7"
                }}>
                  <a
                    href={art.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {art.title}
                  </a>
                </h3>

                {/* Description Snippet */}
                {art.description && (
                  <p style={{
                    margin: "0 0 0.9rem 0",
                    fontSize: "0.82rem",
                    color: "#8B98A7",
                    lineHeight: "1.45",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {art.description}
                  </p>
                )}
              </div>

              {/* Card Footer: Category Badges & Read Link */}
              <div style={{
                borderTop: "1px solid #161D26",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {art.category.slice(0, 2).map((c, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "0.68rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "3px",
                        backgroundColor: "#141B24",
                        color: "#8B98A7",
                        textTransform: "capitalize"
                      }}
                    >
                      {c}
                    </span>
                  ))}
                  {art.country.slice(0, 1).map((cnt, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "0.68rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "3px",
                        backgroundColor: "#141B24",
                        color: "#5C6773",
                        textTransform: "uppercase"
                      }}
                    >
                      {cnt}
                    </span>
                  ))}
                </div>

                <a
                  href={art.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#4FD1E5",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  Read Source ↗
                </a>
              </div>
            </article>
          ))}
        </div>
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
        <span>NewsData.io Gateway: <code>/api/news</code> (Total Tracked: {totalResults.toLocaleString()})</span>
        <span>GLOBAL.AI Financial Intelligence Terminal</span>
      </footer>
    </div>
  );
}
