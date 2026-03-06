# Hormuz Crisis Dashboard v20

Geopolitical Energy Intelligence Dashboard — Strait of Hormuz Crisis

## Tabs
1. **Live Prices & Freight** — KPIs grouped by Oil, Gas, Power, Logistics, FX with executive summaries and TradingView charts
2. **Global Oil & Hormuz** — Level 1-6 narrative: market → trade → chokepoint → crisis → impact → reserves
3. **Global Gas & Hormuz** — Level 1-6 narrative: market → LNG trade → chokepoint → price impact → exposure → infrastructure

## Deploy to Vercel
```bash
npm i -g vercel
vercel
```

## Features
- 14 live KPIs (TradingView + Fraunhofer ISE)
- 11 TradingView live charts
- Auto-generated executive summaries per category
- Live news feed (4 parallel Google News queries, 30 articles)
- D3.js Sankey diagrams, waterfall charts, historical Brent chart
- MarineTraffic AIS live vessel embed
- All data sourced: EIA, IEA, BP, Barchart, Yahoo Finance, Fortune
