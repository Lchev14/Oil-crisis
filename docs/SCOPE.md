# Oil-Crisis Dashboard — Scope Inventory

> Companion doc for cross-project comparison. Last refreshed: **2026-07-30**.
> Repo: `lchev14/Oil-crisis` · Deploy: Vercel (from `main`) · Doc version: **v1**

---

## 0. TL;DR for a comparing LLM/agent

- **Type:** Single-page HTML dashboard (~104 KB, 820 lines, no build step, no framework) + one Vercel serverless function (`api/news.js`, ~283 lines) for news aggregation.
- **Tabs:** 4 — Live Prices & Freight · Global Oil & Hormuz · Global Gas & Hormuz · Live News.
- **Live vs static balance:** ~95% of visible data is **hardcoded** in `public/index.html`. Only 5 elements are truly live-updating (§5). Do not assume any KPI value or table entry is fetched from an API — with one exception (EU Power via Fraunhofer).
- **Refresh model:** Human-in-the-loop manual edit + `git push` every ~30 days. 8 refresh cycles run (Mar 9 → Jul 30, 2026). No scheduled auto-refresh.
- **Narrative spine:** Level 1→6 funnel — Global market → International trade → Hormuz chokepoint → Historical context → Sankey flows / dependency → Reserves & infrastructure. Applied identically to both Oil and Gas tabs.
- **Scenario framing:** Header + badge state + Level 3 status cards reframe with each refresh (5 distinct tone states used so far: Active Conflict → Ceasefire Strained → Post-Deal Recovery → Deal Collapsed → Conflict Resumed).

---

## 1. What this app is

| Field | Value |
|---|---|
| **Purpose** | Executive-facing intelligence dashboard for the 2026 Iran-Israel-US conflict and its impact on the Strait of Hormuz + global energy markets |
| **Audience** | LC + procurement peers + senior management at Kenvue; also shared externally |
| **Deployment** | Vercel (auto-deploy on `main` push) |
| **Tech stack** | Vanilla HTML/CSS/JS · D3.js v7.8.5 (via CDN) · No build step · No framework · One Node.js Vercel serverless function |
| **File count** | 5 in root: `README.md`, `package.json`, `vercel.json`, `public/index.html`, `api/news.js` |
| **Repo size** | ~110 KB source (excluding node_modules — there aren't any) |
| **Last deployed commit** | `29fefc71` (Jul 30, 2026 refresh merge) |

---

## 2. Tab architecture

| # | Tab ID | Label | Live elements | Static elements |
|---|---|---|---|---|
| 1 | `t-prices` | Live Prices & Freight | 8 TradingView iframe charts | (KPI tiles removed — chart-only) |
| 2 | `t-oil` | Global Oil & Hormuz | MarineTraffic AIS iframe | Levels 1–6 funnel (all data hardcoded) |
| 3 | `t-gas` | Global Gas & Hormuz | (none live) | Levels 1–6 funnel (all data hardcoded) |
| 4 | `t-news` | Live News 📰 | `/api/news` fetch (5-min interval) + Google News RSS CORS fallback | Static fallback of ~75 curated news items with source URLs |

**Persistent chrome:** header with title, "Day N" counter, badge (red/amber, animated pulse), live clock (Europe/Prague).

---

## 3. Full KPI inventory (14 items)

All values as of Jul 30, 2026 refresh. **Baseline = Fri Feb 27, 2026 close** (unchanged reference across all refreshes).

| Tier | KPI | Current | Baseline | % change | Live/Hardcoded |
|---|---|---|---|---|---|
| 1 · Crude | Brent Crude | $90.04 | $73.00 | +23.3% | HARDCODED value; live via TradingView chart TVC:UKOIL |
| 1 · Crude | WTI Crude | $85.00 | $67.02 | +26.8% | HARDCODED value; live via TVC:USOIL |
| 1 · Crude | Brent-WTI Spread | $5.00 | $5.98 | −16.4% | HARDCODED (calculated at refresh time) |
| 2 · Gas | TTF Gas (EU) | €56.75 | €31.96 | +77.6% | HARDCODED value; no live chart |
| 2 · Gas | Henry Hub (US) | $3.20 | $2.864 | +11.7% | HARDCODED value; live via PEPPERSTONE:NATGAS |
| 3 · Downstream | RBOB Gasoline | $2.80 | $2.287 | +22.4% | HARDCODED value; live via AMEX:UGA ETF proxy |
| 3 · Downstream | EU Power (DE) | €95 | ~€78 | +21.8% | **LIVE** via Fraunhofer Energy Charts API (see §5) — 15-min refresh. But see the label-mismatch bug note below |
| 3 · Downstream | US Diesel | $5.31 | $3.548 | +49.7% | HARDCODED (weekly EIA release) |
| 3 · Downstream | IT Diesel | €2.038 | €1.655 | +23.1% | HARDCODED (weekly EU Oil Bulletin) |
| 4 · Shipping | VLCC Rate | "Elevated" | ~$45k/d | (label only) | HARDCODED — currently a text label, not a number |
| 4 · Shipping | Baltic Dry | 2,632 | 2,112 | +24.6% | HARDCODED value; live via AMEX:BDRY ETF proxy |
| 5 · Sentiment | Gold | $4,081 | $5,226 | −21.9% | HARDCODED value; live via TVC:GOLD |
| 5 · Sentiment | DXY (Dollar) | 105.00 | 97.57 | +7.6% | HARDCODED value; live via CAPITALCOM:DXY |
| 6 · Strait | Hormuz Transits | ~10/day | ~88/day | −89% | HARDCODED (Windward / Lloyd's List / IMF PortWatch, weekly) |

**Note on the KPI tiles:** The 14 KPIs above live in the `KPI` array (line ~232 of `public/index.html`) but the tile-render function is currently a no-op (`renderKPIs()` early-returns because the KPI grid `#kg` was removed from the DOM in v18). The Prices tab shows only the 8 TradingView charts. The `KPI` array still exists because the (currently dead) `updateExecSummary()` function reads from it, and because the array is the source of truth we edit each refresh.

---

## 4. Hardcoded data inventory ⚠️ CRITICAL FOR COMPARISON

**Every dataset below lives as a literal JavaScript array or HTML string in `public/index.html`. None is fetched at runtime.** Comparing systems should assume no live data source for anything in this list unless explicitly marked LIVE in §5.

| # | Dataset | Location | Size | Refresh trigger |
|---|---|---|---|---|
| 1 | `TL` — conflict timeline | lines 128–207 | ~78 events | Manual, each cycle |
| 2 | `KPI` — 14 KPIs (§3) | lines 232–254 | 14 objects | Manual, each cycle |
| 3 | `STATIC_NEWS` — news fallback | lines 303–392 | ~85 items with source URLs | Manual, each cycle |
| 4 | `prodData` — top 10 oil producers | line 483 | 10 countries, M bbl/d | Yearly (structural) |
| 5 | `consData` — top 10 oil consumers | line 484 | 10 countries, M bbl/d | Yearly |
| 6 | `expData` — top 10 oil exporters | line 485 | 10 countries, hz-flag | Yearly |
| 7 | `impData` — top 10 oil importers | line 486 | 10 countries, hzPct | Yearly |
| 8 | `depB` — Hormuz oil dependency % | line 534 | 9 countries | Yearly |
| 9 | Regional oil import mix (APAC/EU/US) | lines 541–543 | 3 regions × 6 sources | Yearly |
| 10 | `sprData` — Strategic Petroleum Reserves | lines 548–557 | 8 countries + USA row | Yearly |
| 11 | Oil infrastructure table | lines 573–582 | 10 facilities × 5 columns | Each cycle (status column) |
| 12 | Historical Brent + supply balance chart | lines 595–614 | ~35 monthly datapoints | Each cycle (latest month) |
| 13 | Oil Sankey `E`/`I`/`FL` (Hormuz exporters/importers/flows) | lines 663–672 | 6 exporters, 9 importers, 22 flows | Yearly |
| 14 | `gasProd` — top 10 gas producers | line 706 | 10 countries, Bcm/yr | Yearly |
| 15 | `gasCons` — top 10 gas consumers | line 707 | 10 countries, Bcm/yr | Yearly |
| 16 | `lngExp` — top 10 LNG exporters | line 708 | 10 countries, Mtpa | Yearly |
| 17 | `lngImp` — top 10 LNG importers | line 709 | 10 countries, hzPct | Yearly |
| 18 | Regional gas supply mix (APAC/EU/US) | lines 736–738 | 3 regions × 6 sources | Yearly |
| 19 | LNG infrastructure table | lines 744–751 | 8 facilities × 5 columns | Each cycle |
| 20 | `euGas` — EU storage % by country | line 756 | 7 rows (6 country + EU avg) | Each cycle |
| 21 | Level 3 stat cards + commentary (Oil + Gas) | lines 510–511, 728–731 | 4 cards + 1 paragraph | Each cycle (major rewrite when framing shifts) |
| 22 | Header text ("Day N · Month YYYY") | line 111 | 1 string | Each cycle |
| 23 | Badge label + CSS colour | lines 113, 15, 19–21 | 1 label + 4 CSS rules | Each cycle when framing shifts |
| 24 | Sankey banner text | line 696 | 1 SVG text | Each cycle when framing shifts |
| 25 | "Last verified" stamps | lines 584, 753 | 2 timestamps | Each cycle |
| 26 | World totals (102 M bbl/d, 4100 Bcm/yr, etc.) | lines 497, 715 | Static numbers | Yearly |

**Approximate hardcoded-to-live ratio by data volume:** ~95% hardcoded, 5% live.

---

## 5. Live data sources

| # | Source | Endpoint / Symbol | What it drives | Refresh cadence | Fallback |
|---|---|---|---|---|---|
| 1 | TradingView (advanced-chart iframe) | 8 symbols: `TVC:UKOIL`, `TVC:USOIL`, `PEPPERSTONE:NATGAS`, `AMEX:UGA`, `AMEX:BDRY`, `TVC:GOLD`, `CAPITALCOM:DXY`, `FX_IDC:EURUSD` | 8 chart tiles in Prices tab | Streaming (TradingView server-driven) | None; broken iframes just don't render |
| 2 | MarineTraffic AIS embed | `marinetraffic.com/en/ais/embed/zoom:6/cenx:56.3/ceny:26.3/…/vtypes:4` | Live vessel map in Oil tab Level 3 | Streaming | None |
| 3 | Fraunhofer Energy Charts API | `api.energy-charts.info/price?bzn=DE-LU&start=…&end=…` | EU Power (DE) KPI value (§3) | **15-min interval** (`setInterval` 900000ms) + 2-sec initial delay | Falls through to hardcoded €95 on error |
| 4 | `/api/news` (Vercel serverless function) | See §5a | News feed in Live News tab | **5-min interval** (`setInterval` 300000ms) | 3-tier fallback: allorigins/corsproxy CORS proxy → static `STATIC_NEWS` array |
| 5 | Browser clock | `Date()` | Header clock display | Every 1000 ms | N/A |

### 5a. `/api/news` internals (Vercel serverless function, `api/news.js`)

- **Fires 12 Google News RSS search queries** (Iran/Hormuz/oil/tanker/OPEC/etc. combinations) + **17 direct publisher RSS feeds** in parallel server-side.
- **Whitelist:** ~60 trusted outlets (Reuters, AP, Bloomberg, CNN, CNBC, NPR, NYT, WaPo, WSJ, FT, Economist, Guardian, Fortune, Al Jazeera, BBC, Times of Israel, OilPrice, Rigzone, gCaptain, Hellenic Shipping, Lloyd's List, S&P Global, Argus, IEA, OPEC, EIA, Nikkei, SCMP, etc.). Non-whitelisted Google News results are dropped.
- **Relevance scoring:** 6 keyword groups (Iran/conflict actors, energy commodities, shipping/maritime, key infrastructure, crisis diplomacy, specific crisis terms). Weighted score; article must score ≥ 2 to pass.
- **Output:** JSON with `{success, count, scanned, filtered, sourceBlocked, sources, articles[]}`. Up to 120 articles per response.
- **Caching:** Vercel CDN `s-maxage=300` (5 min).
- **CORS:** `Access-Control-Allow-Origin: *`.

### 5b. EEX label-mismatch bug ⚠️

Historical note: through most of the app's life the EEX fetch call was matching label `'EU Power (EEX)'` but the KPI array had `'EU Power (DE)'` — silent no-op. **Fixed in the May 26 refresh commit.** EEX live feed now works.

---

## 6. Narrative architecture — the Level 1→6 funnel

LC's own construction, mirrored on Oil and Gas tabs. Each level narrows the focus:

| Level | Focus | Oil tab content | Gas tab content |
|---|---|---|---|
| **1** | Global market (production + consumption) | Top 10 oil producers + consumers · 102 M bbl/d world total | Top 10 gas producers + consumers · 4,100 Bcm/yr world total |
| **2** | International trade | Top 10 oil exporters + importers · ~50 M bbl/d traded (49% of production) | Top 10 LNG exporters + importers · ~400 Mtpa shipped by sea |
| **3** | The Hormuz chokepoint | 20 M bbl/d normally through Hormuz (~20% of world oil) · Current status stat card · Live MarineTraffic AIS map | 112 Mtpa LNG through Hormuz (~28% of global) · Status stat card |
| **4** | Historical context | Brent monthly avg + supply balance chart 2018–2026 with COVID/Ukraine/Hormuz annotations | (removed — Level 4 gas was static price data, dropped Mar 9) |
| **5** | Flows / who's exposed | Oil Sankey (Hormuz exporters → importers) · Regional destination stats · Country dependency chart · Regional import mix (APAC/EU/US) | Regional gas supply mix (APAC/EU/US) with critical/moderate/insulated framing |
| **6** | Reserves + infrastructure | SPR days-of-cover chart + table · Top 10 oil infra status table | LNG infrastructure table · EU gas storage bars |

**Origin:** Emerged from LC pushing back on early bubble-map iterations. Deliberately mirrors the Goldman Sachs commodities-research and IEA emergency-briefing structure: "market → trade → chokepoint → crisis → who's exposed → reserves."

---

## 7. Refresh operations

**Manual loop, 8 cycles executed so far:**

| Cycle | Date | Delta since prior | Framing state ("badge") | Notable events added |
|---|---|---|---|---|
| 1 (initial) | Mar 3, 2026 | — | Active Conflict (red) | Feb 28 strikes, IRGC blocks Hormuz, initial infra hits |
| Refresh 1 | Mar 9 | 6 days | Active Conflict | Qatar force majeure, Ras Tanura shut, Iraq force majeure |
| Refresh 2 | Mar 19 | 10 days | Active Conflict | Ras Laffan hit, South Pars struck, Habshan, Mina Abdullah |
| Refresh 3 | Mar 25 | 6 days | Active Conflict | Trump ultimatum, oil drops 10%, IEA 40+ assets damaged |
| Refresh 4 | Mar 27 | 2 days | Active Conflict | Brent $108, Trump extends deadline, Yuan transit fees, IRGC commander killed |
| Refresh 5 | May 26 | 60 days | **Conditional Ceasefire, Strained (red)** — first tone shift | Ceasefire Apr 8, Islamabad talks, dual blockade, Project Freedom |
| Refresh 6 | Jun 25 | 30 days | **Post-Deal Recovery, Fragile (amber)** — badge colour flipped | Versailles MoU Jun 17, 14-point plan, Hormuz reopening surge |
| Refresh 7 (this) | Jul 30 | 35 days | **Deal Collapsed, Conflict Resumed (red)** — badge back to red | MoU collapse Jul 6-7, US 140-target strikes, Ras Laffan hit 3rd time |

**What a refresh mechanically touches** (in one commit):
- Header day counter + framing label (line 111)
- Badge label + optionally badge CSS colour (lines 113, 15, 19–21)
- `KPI` array — 12–14 values (lines 234–253)
- `TL` timeline — append 4–25 new events (lines 128–206)
- `STATIC_NEWS` — prepend 4–23 items with URLs (lines 303–392)
- Oil Level 3 stat cards + commentary (lines 508–517)
- Oil infrastructure table — row status columns (lines 573–582)
- Gas Level 3 stat cards + commentary (lines 726–731)
- LNG infrastructure table — row status columns (lines 744–751)
- `euGas` storage array + commentary (lines 756–758)
- Historical Brent chart — append 1 monthly data point (line 613)
- Sankey banner text (line 696) when framing shifts
- "Last verified" stamps × 2 (lines 584, 753)

**Time per refresh:** ~30 min agent time (Phase 0 conflict-state check → Phase 1 8 parallel web searches → Phase 2 mechanical edits → Phase 3 sanity check → Phase 4 push + PR + merge).

**Not automated.** No cron, no scheduled job. Discussed but not built (see §11).

---

## 8. Sources — the `api/news.js` whitelist

Full ~60-outlet list. Non-whitelisted sources are silently dropped from Google News aggregation:

- **Wire / TV:** Reuters, AP, Bloomberg, AFP, CNN, CNBC, NBC, CBS, ABC, NPR, PBS
- **US print:** NY Times, Washington Post, WSJ, Fortune, Forbes, Axios, Politico, The Hill
- **UK/EU:** BBC, The Guardian, The Telegraph, FT, The Economist, Euronews, France 24, DW, Sky News, ITV, Channel 4
- **Middle East:** Al Jazeera, Al Arabiya, Al-Monitor, The National, Arab News, Middle East Eye, Times of Israel, Haaretz
- **Energy specialist:** OilPrice.com, Rigzone, World Oil, Offshore Technology, gCaptain, Hellenic Shipping, Lloyd's List, Tradewinds, S&P Global / Platts, Argus Media, Energy Intelligence
- **Institutions:** IEA, OPEC, EIA
- **Finance:** Investing.com, MarketWatch, Barron's
- **Asia:** SCMP, Nikkei, Yonhap
- **Policy:** Foreign Affairs, Foreign Policy
- **Aggregator:** Google News (trusted because it aggregates from trusted sources)

**Sources referenced in the app text/URLs but not necessarily in the whitelist:** Windward, IMF PortWatch, Breakwave Advisors, Rystad, Kpler, ACER, GIE AGSI, KUNA, Iran International, HSToday, Insurance Journal, Britannica, Wikipedia.

---

## 9. Known gaps and limits

| # | Gap | Impact | Reason |
|---|---|---|---|
| 1 | AGSI country-level storage not fetched | 5 EU countries stuck at Mar 26 values marked "(Mar)" | AGSI + all scraper mirrors return 403; would need browser + manual paste |
| 2 | KPI grid dead code | 14 KPI values still edited each refresh but not rendered in UI (only appear when computed into Level 3 commentary or if `updateExecSummary` were re-enabled) | KPI grid removed in v18 by LC; `KPI` array kept as canonical source of truth |
| 3 | `updateExecSummary()` dead | Executive summary section removed; the function still exists (guarded early-return) | Removed as it went stale between refreshes; would need auto-generation to reactivate |
| 4 | VLCC rate as label not number | No numeric % change tracked | No free live source for VLCC day rates; last real number known was Mar 27 |
| 5 | Structural data frozen | Top-10s, dependency %, world totals last touched Mar 2026 | Yearly cadence appropriate; sourced from BP Statistical Review 2025 / EIA / IEA / Kpler 2024-25 |
| 6 | US/IT diesel weekly, not daily | KPI shows the most recent weekly release, not real-time | Sources (DOE/EIA and EU Oil Bulletin) publish weekly only |
| 7 | Hormuz transits point-in-time | Number reflects the most-cited daily figure at refresh time (Windward or IMF PortWatch) | Data providers don't offer a free API; would need paid Windward/Kpler license |
| 8 | Ras Laffan / Kharg / infra status | Static text updated each cycle from open sources | No aggregated real-time status feed exists publicly |
| 9 | `TL` timeline defined but not visually rendered | 78-event array is source-of-truth but the visual timeline component was removed | Was in early versions; removed to simplify layout |
| 10 | Iframes: `allow-scripts allow-same-origin` = no real sandbox | Minor security caveat | Required for TradingView + MarineTraffic to function |
| 11 | XSS surface in news headlines rendered via `innerHTML` | Low-probability (whitelist protects); not yet hardened | Fix identified but not shipped |
| 12 | No CSP / SRI / rate-limiting on `/api/news` | Minor security caveats | Not prioritised for this audience |

---

## 10. Rationale layer — why these choices

### Architecture

- **Single static HTML file, no build step, no framework.** Because it is a snapshot dashboard maintained by direct edits, not a growing application. Any developer (or LLM) can hand-edit it. Vercel serves it from `public/`. No `npm install`, no bundler, no toolchain drift.
- **One Vercel serverless function only, for news.** Everything else that needs to be live is either an iframe (TradingView, MarineTraffic) or a CORS-friendly public API (Fraunhofer). Serverless was only necessary where CORS blocked direct browser fetch (Google News, publisher RSS).
- **D3 via CDN (full bundle).** Two Sankey diagrams + one line chart. Subsetting `d3-path`+`d3-scale`+`d3-shape` was considered; the ~230 KB CDN cost wasn't worth the maintenance complexity.
- **All embedded data as literal JS arrays, not JSON files.** Because edits are always co-located with the surrounding narrative text; separating them into JSON would double the friction of a refresh cycle. This is the trade-off that keeps the manual-refresh loop tractable at ~30 min.

### Product

- **Tab architecture, not single-scroll.** An earlier expert-panel discussion converged on "single-scroll narrative briefing, no tabs, Z-scan." LC evaluated and chose tabs anyway: procurement / senior-management readers want to jump to Oil or Gas directly, not scroll past a full narrative each time.
- **The Level 1→6 narrative funnel (LC's own construction).** Mirrors Goldman Sachs commodities-research and IEA emergency-briefing structure: market → trade → chokepoint → crisis → who's exposed → reserves. Deliberately identical on Oil and Gas tabs so a reader learns the pattern once.
- **"Fri Feb 27, 2026" as the fixed KPI baseline.** Last pre-conflict close. Every % change is calibrated against it, so the full arc of the crisis stays measurable in one dashboard view. Baselines never change; only current values do.
- **"Last verified" stamps.** Explicit provenance floor. Signals to the reader which parts are point-in-time snapshots — the honest inverse of the "Live" chip.
- **Static news fallback of ~75 items with real URLs.** So the news tab always renders something useful even when CORS proxies fail (which happens often on the client-side path). Every fallback item is clickable to its original source.
- **Source whitelist + weighted relevance scoring.** Because early iterations of the news pipeline surfaced AI-generated content farms and generic "oil market" articles with no crisis relevance. Score ≥ 2 required; whitelist of ~60 outlets required for Google News (direct RSS feeds already trusted).
- **Reframing every cycle rather than a fixed template.** The badge, header, Level 3 status cards, and Sankey banner all get rewritten when the geopolitical state shifts (5 distinct tone states used through the crisis). Prevents the dashboard from looking obviously stale.

### Refresh discipline

- **Manual refresh loop, not scheduled cron.** Considered and offered multiple times; not built. Reason: each refresh requires a *judgement pass* (which events matter, how to reframe the badge, which commentary to rewrite) that LC prefers to review before commit rather than automate blindly.
- **All refresh edits in one commit, one PR, one merge.** Reviewable diff. No incremental edits or partial pushes.
- **8 refresh cycles in 5 months of crisis.** Cadence has varied 2 days → 60 days depending on how fast the underlying story moves. No fixed schedule.

### What's deliberately *not* here

- **No Kenvue-specific impact layer.** Discussed extensively; deemed out of scope for this public dashboard (the Kenvue-branded briefing is a separate deliverable). No β-coefficient impact calculator.
- **No forward-looking scenarios / price projections.** Discussed with the expert panel; not implemented. The dashboard is descriptive, not predictive.
- **No AI-generated commentary.** All Level 3 text is human-written and edited each cycle. Deliberate — LC prefers full control over the framing rather than a generated brief.
- **No user accounts / personalisation / saved views.** It's a single public URL. Everyone sees the same thing.

---

## 11. Considered but not shipped (for scope comparison)

Features evaluated during the build history and rejected or deferred:

| Feature | Status | Reason |
|---|---|---|
| Interactive world bubble map (production + consumption bubbles + trade flow lines) | Built as prototype, rejected | Overlapping bubbles; hard to read. Sankey chosen instead. |
| Single-scroll narrative briefing (no tabs) | Discussed via multi-expert panel, rejected | Tabs preferred for direct navigation to Oil / Gas |
| Kenvue branding / colours | Built early, removed | Repositioned as public dashboard, not Kenvue-branded |
| KPI grid on Prices tab | Built through v13, removed in v18 | Values stale between refreshes; the "Live" chip on hardcoded values was misleading |
| Executive summary in header | Built and removed | Went stale between refreshes; needs AI-generation to work |
| Wholesale Electricity chart tile | Built, removed | No free live TradingView embed for EEX futures |
| Dedicated Dependencies & Reserves tab | Built (v14), folded into Oil/Gas Level 5-6 | Duplication with narrative levels |
| Dedicated Infrastructure & Vessel Traffic tab | Built (v14), folded into Level 6 + Level 3 | Same |
| Sticky conflict-timeline strip below header | Built (v14), removed | Visual clutter; timeline still lives in `TL` array as source-of-truth |
| Anthropic Claude API integration for auto-generated exec brief | Discussed as recommendation, not built | Would replace manual commentary work; standing option for future |
| Vercel Cron + GitHub Actions for scheduled auto-refresh | Discussed as recommendation, not built | Would replace the manual refresh loop; standing option for future |
| Company Impact Calculator (β-coefficient pass-through) | Discussed as recommendation, not built | Kenvue-specific; out of public scope |
| PDF board-pack export | Discussed as recommendation, not built | — |
| Threshold-triggered alerts (Slack/Teams/email) | Discussed as recommendation, not built | — |
| Daily JSON snapshot archive | Discussed as recommendation, not built | — |
| Natural-language query bar (Claude-powered) | Discussed as recommendation, not built | — |
| Time-scrubber / historical replay | Discussed as recommendation, not built | Requires snapshot archive first |
| TTF Gas futures chart | Multiple embed attempts, all failed | TradingView blocks NYMEX:TTF1! in free embeds; no reliable free alternative |
| Baltic Dry Index chart (direct index) | Substituted with AMEX:BDRY ETF | Same reason |
| VLCC rate live chart | Not attempted after research | No free live source |
| Country-level EU gas storage refresh | Blocked | AGSI + all mirrors return 403 to automated fetch |

---

## 12. Comparison-check quick reference

If comparing another oil/energy dashboard against this one, the shortest useful mental checklist:

1. **Does the other project distinguish live vs hardcoded data as explicitly?** (Almost none do.)
2. **Does it have the Level 1→6 narrative funnel** or an equivalent structural spine, vs. just KPIs + charts?
3. **Does it cover both Oil AND Gas** with symmetric depth?
4. **Does it show Hormuz chokepoint dependencies** at the country level (Japan 90%, Korea 73%, India 60%, etc.)?
5. **Does it embed live sources** for prices, vessel AIS, EU power, and news, or is it fully static?
6. **What's the refresh model** — manual, scheduled cron, or true live?
7. **How does it handle scenario framing** when the geopolitical state shifts?
8. **What baselines does it use** for % change computations?
9. **What news pipeline does it use** — is there a source whitelist and relevance filter?
10. **What's the size / maintenance footprint** — single HTML file? React app? Server-side rendered?

---

*End of scope inventory. To update this doc, edit `docs/SCOPE.md` on the branch and open a PR.*
