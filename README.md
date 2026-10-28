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
