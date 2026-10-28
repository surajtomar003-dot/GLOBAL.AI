# Global Intelligence — Institutional Financial Terminal

Global Intelligence is an institutional-grade financial intelligence terminal designed for global macro monitoring, cross-asset telemetry, sovereign risk analysis, and spatial capital flow visualization.

Built with a high-density Bloomberg/FactSet-inspired interface, it combines client-side WebGL 3D Earth rendering with deterministic cross-product intelligence models.

---

## Key Features

- **3D Spatial Intelligence**: Interactive Three.js WebGL Earth with financial hub arcs, cross-border capital flows, and sovereign heatmap layers.
- **Global Macro & Regime Monitor**: Liquidity pulse, sovereign curve spreads, policy bias, and cross-asset correlation matrices.
- **Multi-Asset Telemetry**: Institutional screener, SVG technical charts with crosshairs, fundamental quality scorecards, and transmission networks across equities, commodities, forex, and rates.
- **AI Causal Thesis & Transmission Radar**: Deterministic causal reasoning nodes identifying transmission channels (e.g. Hyperscaler Capex, Monetary Easing, Maritime Energy Transit).
- **Economic Calendar & Systemic Catalysts**: Scheduled macro events with deterministic AI shock ratings and Hawkish/Dovish scenario matrices.
- **Personal Workspace**: Multi-collection watchlist management, asset filtering, and simulated portfolio risk analytics (Sharpe, Beta, VaR).
- **Universal Search**: Fast spotlight search (`Cmd+K` / `Ctrl+K`) indexing assets, sovereign nations, secular themes, and economic releases.
- **Atmospheric & Logistics Telemetry (Open-Meteo)**: Physical meteorological conditions, 2-meter temperature curves, relative humidity, surface wind velocity, and 7-day numerical weather predictions across global maritime straits and commodity hubs (Free non-commercial endpoint under CC BY 4.0).
- **Financial & Macro News Wire (NewsData.io)**: Real-time global financial news, corporate earnings catalysts, monetary policy headlines, sentiment tags, and country/category filtering (Free plan: delayed by up to 12h).
- **Federal Reserve Macroeconomic Telemetry (FRED)**: Official St. Louis Fed sovereign data integration (US GDP, CPI inflation index & calculated YoY rate, Federal Funds policy rate, 10Y/2Y Treasury yield curve spread inversion monitor, unemployment rate, and initial jobless claims).
- **Binance Market Analysis & Live Telemetry**: Real-time quantitative depth skew (L20 bid/ask walls), trailing 24h VWAP, and USD-M futures derivatives positioning (Funding rate & Open Interest).
- **CoinGecko Global Macro Telemetry**: Institutional multi-currency aggregated rankings, global market capitalization, 24h turnover, and multi-exchange price discovery.
- **Supabase Cloud Backend**: SSR session management, cookies, and database connectivity.

---

## Architecture & Tech Stack

- **Single-File Zero-Dependency Architecture**: Entire core client lives in `index.html`.
- **Three.js (WebGL)**: Persistent single-canvas, single-scene rendering pipeline with optimized RAF animation loop.
- **Deterministic Intelligence Architecture**: 100% deterministic arithmetic models with zero arbitrary fluctuations or fake randomized claims.
- **Modular Routing**: Client-side hash router supporting deep-linking (`#world`, `#markets`, `#asset/:sym`, `#country/:code`, `#news`, `#events`, `#ideas`, `#watchlist`, `#portfolio`).

---

## Getting Started

### Quick Start (Dev Server):
The project includes a zero-dependency local development server:

```bash
# Start server (default: port 3000)
npm start
# OR
npm run dev
```
Then open `http://localhost:3000` in your web browser.

### Direct Browser Opening:
Or open `index.html` directly:
```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

---

## Roadmap & Development Phases

For detailed architectural phases and the roadmap to transform this terminal into an active paper-trading platform, see [PROJECT_PHASES_ROADMAP.md](PROJECT_PHASES_ROADMAP.md).

---

## Project Structure

```text
├── app/                        # Next.js App Router
│   ├── api/                    # Server-side API Gateway routes
│   │   ├── binance/route.ts    # Real-time Binance market analysis API endpoint
│   │   ├── coingecko/route.ts  # CoinGecko server-side secure market data gateway
│   │   ├── fred/route.ts       # Federal Reserve Economic Data (FRED) API gateway
│   │   ├── news/route.ts       # NewsData.io financial & macroeconomic news gateway
│   │   └── weather/route.ts    # Open-Meteo physical atmospheric & logistics gateway
│   ├── coingecko/              # Live CoinGecko aggregated global market cap dashboard
│   ├── macro/                  # Official FRED macroeconomic indicators & yield curve monitor
│   ├── market-analysis/        # Live Binance order book & derivatives telemetry dashboard
│   ├── news/                   # Financial & macroeconomic news intelligence dashboard
│   ├── weather/                # Open-Meteo atmospheric & maritime trade hub dashboard
│   ├── page.tsx                # Terminal home & launchpad
│   └── layout.tsx              # Root HTML & body layout
├── docs/                       # Institutional documentation
│   └── BINANCE_MARKET_ANALYSIS.md # Complete Binance API & telemetry specifications
├── utils/                      # Modular utilities & service layer
│   ├── binance/marketAnalysis.ts # Quantitative depth skew, VWAP & signal engine
│   ├── coingecko/marketData.ts   # CoinGecko multi-currency aggregator & cache manager
│   ├── fred/macroData.ts         # FRED sovereign indicators, yield spread & calculations
│   ├── news/newsData.ts          # NewsData.io query sanitizer, cache & category manager
│   ├── weather/weatherData.ts    # Open-Meteo hub coordinates, NWP models & WMO codes
│   └── supabase/               # Supabase SSR client, server, and middleware helpers
├── index.html                  # Main application terminal (Three.js WebGL, SVG charts, state)
├── server.js                   # Lightweight zero-dependency dev server
├── package.json                # Project manifest and runner scripts
├── PROJECT_PHASES_ROADMAP.md   # Architectural phased development roadmap
├── TRADING_READINESS_AUDIT.md  # Architectural & trading readiness audit report
├── backups/                    # Safely archived iterations & backups
└── .gitignore                  # Git ignore rules
```

---

## License

MIT License. Designed for institutional research, financial intelligence visualization, and macro analytics prototyping.
