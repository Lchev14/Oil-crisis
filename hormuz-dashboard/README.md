# Geopolitical Energy Intelligence Dashboard
## Strait of Hormuz Crisis — Operation Epic Fury · March 2026

A real-time energy intelligence dashboard tracking the geopolitical impact of a Strait of Hormuz closure scenario.

### Features
- **Live TradingView charts** — Brent, WTI, Henry Hub, Gold, EUR/USD (iframe embeds)
- **SVG sparkline cards** — TTF, RBOB, Baltic Dry, EU EEX Power (custom-drawn)
- **Live news feed** — Google News RSS via serverless proxy, auto-refreshes every 5 min
- **Global dependency analysis** — Oil/Gas/Electricity breakdowns for USA, EU, APAC
- **D3.js Sankey diagram** — ME producers → Hormuz → global destinations
- **MarineTraffic AIS embed** — Live vessel tracking in Strait of Hormuz
- **12 real-time KPI tiles** — Brent, WTI, TTF, HH, RBOB, BDI, BDTI, VLCC, EEX, PJM, Gold, Hormuz Traffic

### Architecture
```
hormuz-dashboard/
├── public/
│   └── index.html          # Single-file dashboard (HTML + CSS + JS + D3)
├── api/
│   └── news.js             # Vercel serverless function — Google News RSS proxy
├── vercel.json             # Vercel routing config
├── package.json
└── README.md
```

### Deploy to Vercel

**Option 1: CLI**
```bash
npm i -g vercel
cd hormuz-dashboard
vercel          # preview
vercel --prod   # production
```

**Option 2: GitHub Integration**
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import repo
3. Deploy — zero config needed

### News Feed
The dashboard fetches live energy/oil/geopolitical news via:
1. **Primary**: `/api/news` serverless function (proxies Google News RSS, cached 5 min)
2. **Fallback**: allorigins.win CORS proxy (for standalone/local use)
3. **Static fallback**: Hardcoded scenario data if both fail

News auto-refreshes every 5 minutes. Articles are auto-classified as CRITICAL/HIGH/INFO based on keyword matching.

### Chart Symbols
| Chart | Symbol | Method |
|-------|--------|--------|
| Brent Crude | TVC:UKOIL | TradingView iframe |
| WTI Crude | TVC:USOIL | TradingView iframe |
| Henry Hub NG | PEPPERSTONE:NATGAS | TradingView iframe |
| Gold | TVC:GOLD | TradingView iframe |
| EUR/USD | FX_IDC:EURUSD | TradingView iframe |
| TTF Dutch Gas | — | SVG sparkline (static data) |
| RBOB Gasoline | — | SVG sparkline (static data) |
| Baltic Dry | — | SVG sparkline (static data) |
| EU EEX Power | — | SVG sparkline (static data) |

> TTF, RBOB, BDI, EEX are exchange-restricted futures that TradingView won't allow in free embeds. The sparkline cards show the crisis-period price trajectory.

### License
Internal use. Data sources: TradingView, EIA, IEA, Kpler, IEEFA, Eurostat, Windward, MarineTraffic.
