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

No build step or npm installation is required.

### Quick Start:
Simply open `index.html` in any modern web browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

### Or serve via any static HTTP server:
```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve .
```
Then navigate to `http://localhost:8080` in your browser.

---

## Project Structure

```text
├── index.html                  # Main application terminal (CSS, HTML, Three.js spatial engine, routing & state)
├── README.md                   # Project overview & documentation
├── TRADING_READINESS_AUDIT.md  # Architectural & trading readiness audit report
└── .gitignore                  # Git ignore rules
```

---

## License

MIT License. Designed for institutional research, financial intelligence visualization, and macro analytics prototyping.
