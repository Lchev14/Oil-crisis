# Daily Refresh Playbook — Hormuz Crisis Dashboard

This is the method for the recurring content refresh. It is written for an **unattended session** that starts with no memory of earlier cycles. Follow it literally. When a step can't be done with verified data, leave that item unchanged and record it in the PR. **Never guess a number.**

Audience: procurement colleagues and senior management. A wrong figure on this page does more damage than a stale one.

---

## 0. Ground rules

| Rule | Why |
|---|---|
| Edit **only** `public/index.html`. Never touch `api/news.js`, `vercel.json`, or `scripts/`. | The live news proxy and the gate are not refresh scope. |
| Never change **structural** content: the Sankey (`SK_E`, `SK_I`, `SK_FL`), the bar-chart data in Levels 1–5, the colour encoding, the timeframe control, or the withdrawn SPR section. | These were designed and reviewed. `validate.js` hard-fails if `SK_FL` changes. |
| The KPI baseline is **fixed at the Fri Feb 27, 2026 close** and never moves. Only the current value (`v`), the change (`c`) and the direction (`d`) update. | Every change % on the page is measured against the pre-war close. |
| Every number needs a **dated source for that specific session**. "Around $X this week" is not a close. Prefix approximations with `~`. | The Aug 2026 cycle caught a research summary that had the Baltic Dry wrong (3,063 vs the true 2,936). |
| Only use URLs that appeared in a search result. **Never construct or guess a URL.** | A dead link on an executive page destroys credibility. |
| Page fetching (WebFetch) is blocked for most sources in this environment. Work from search-result snippets and say so in the PR. | Known constraint; not a failure. |

## 1. Day count and dates

- **Day 1 = Sat Feb 28, 2026** (the day the US–Israel strikes began). Day N = days since Feb 27. Examples: Aug 6 = Day 160, Sep 28 = Day 213.
- Stamp format, used in **both** "Last verified" stamps: `Last verified: Mon D, YYYY HH:MM CET`, set to the run time in Prague.
- Header: `Strait of Hormuz Crisis · <Framing> · Day N · <Month> 2026`. Update the day count and month every run.

## 2. Phase 0 — Conflict-state check (decides the framing)

Search for the latest on: Strait of Hormuz status, US–Iran talks/proposals, the US blockade, attacks on shipping, Houthi/Red Sea activity, and Qatar LNG (Ras Laffan). Good queries: `Strait of Hormuz <today's date>`, `Iran US Hormuz talks <month year>`, `Lloyd's List Strait of Hormuz brief`, `straits.live brief <date>`.

Then decide: **has the state materially changed since the current header?** The states used so far:

| State (header framing) | Badge | Level 3 colour |
|---|---|---|
| Crisis / closure | red | red |
| Post-deal recovery, fragile | amber | amber |
| Deal collapsed, conflict resumed | red | red |
| Route deal in principle — strait still closed | red | amber |
| Tanker war — strait closed | red | red |

- **No material change** → keep the framing and badge; update the day count and month only.
- **Material change** (a deal signed or collapsed, reopening, a major escalation or de-escalation) → you may rewrite the header framing, badge, oil Level 3 status card and gas Level 3 commentary, **but** the gate will flag it and the PR will not auto-merge. That is intended: framing is a judgment call for a person.

## 3. Phase 1 — Gather (use the most recent completed trading session)

| KPI (`l`) | Source to search | Notes |
|---|---|---|
| Brent Crude, WTI Crude | "oil prices settle <date>" — EnergyNow, CNBC, Reuters, Fortune | Settlement, not intraday. Spread = Brent − WTI. |
| TTF Gas (EU) | "European gas prices <date>" — Trading Economics, Bloomberg | Often only "~€X" is available; use `~`. |
| Henry Hub (US) | "natural gas futures settled <date>" — BOE Report/Reuters | Front-month settlement. |
| RBOB Gasoline | "RBOB <date>" | $/gal. |
| EU Power (DE) | Leave as is | Fetched live from Energy-Charts on page load. |
| US Diesel | "EIA diesel price <Monday date>" | Weekly, Mondays. Update only when a new week is out. |
| IT Diesel | "Italy diesel EU Weekly Oil Bulletin <date>" | Weekly; €/L. Baseline row says "Fri 23" by design. |
| VLCC Rate | "VLCC TD3C <month>" | Descriptive text value (e.g. `Record >$1M/d`), no %. |
| Baltic Dry | "Baltic Dry Index <date>" — Hellenic Shipping News, balticdryindex.com | |
| Gold | "gold settle <date>" | Spot or settlement; say which in the PR. |
| DXY (Dollar) | "dollar index <date>" | Often only "~X"; use `~`. |
| Hormuz Transits | IMF PortWatch / Lloyd's List / straits.live via search | Baseline stays **73/day (PortWatch)**. Don't mix in other baselines (85, 88, ~100, ~130). |

Weekends and holidays: markets are closed, so prices don't change. Only add timeline and news items, and update the day count and stamps.

Also check weekly, not daily: **EU gas storage** (AGSI+ % full, via search) and **Ras Laffan / Qatar LNG** force majeure status.

## 4. Phase 2 — Edit `public/index.html`

1. **KPI array** (`const KPI=[`): update `v`, `c`, `d` for each KPI you verified. `c` = (v ÷ baseline − 1) × 100, one decimal, signed. `d` = `up` if c ≥ 0, else `dn`. The spread uses `up` when it widens.
2. **Timeline** (`var TL=[`): append events that happened after the last entry, in chronological order. Format `{date:"Mon D, HH:MM",desc:"…",sev:"cr|hi|ne"}`. `cr` = attack, casualty or closure; `hi` = market-moving; `ne` = diplomatic or neutral. Aim for 1–4 per day and never remove an entry.
3. **Static news** (`const STATIC_NEWS=[`): **prepend** 2–6 new items, newest first. Format `{t:"Mon D",h:"headline",s:"Outlet",sv:"cr|hi|ne",url:"https://…"}`. Use reputable outlets only (Reuters, Bloomberg, AP, CNBC, CNN, BBC, FT, WSJ, Washington Post, NYT, NPR, Al Jazeera, Axios, Lloyd's List, S&P Global, Argus, USNI, EIA, IEA, Hellenic Shipping News). Never remove items.
4. **Brent history chart** (search `["2026-`): when a month ends, add `["YYYY-MM",avg,balance]`. When EIA publishes that month's average, correct it. The balance field is the estimated supply balance in M bbl/d; carry the previous value unless there is evidence of a change.
5. **Level 3 / storage commentary**: rewrite only on a material change (§2) or when storage data is refreshed.
6. **Both stamps** → the run time.

## 5. Phase 3 — Gate

```
git fetch origin main && node scripts/validate.js
```

| Exit | Verdict | Action |
|---|---|---|
| 0 | PASS | Auto-merge allowed |
| 2 | FLAGGED | Open the PR, **do not merge**, list each flag at the top of the PR body |
| 1 | HARD FAIL | Fix the cause and re-run. If it can't be fixed, open the PR as a **draft** titled `[BLOCKED]` and explain. |

What the gate checks: JS syntax; script-tag balance; data arrays evaluate; Sankey unchanged and balanced at 18.3; every KPI % matches value vs baseline (±0.6pp); two identical stamps; header day count matches stamp date; news URLs well-formed; **any KPI moving >15% vs `main` is flagged** (transits, VLCC and EU Power excluded as noisy); **any change to the header framing or badge is flagged**; any removed timeline or news items are flagged.

A >15% daily move can be real, e.g. a strike on Ras Laffan. The flag doesn't mean the number is wrong. It means a person should look before management does.

## 6. Phase 4 — Ship

- Commit on the session's designated branch with a message that lists every KPI old → new with its source.
- Open a PR to `main`. Title: `Daily refresh <Mon D> — Day N`. The body gives: the verdict, the flags, the KPI table (old → new, source, session date), timeline/news counts, and what could **not** be verified.
- **Auto-merge only on exit 0** (merge method: `merge`). Otherwise leave it open.
- If nothing verifiable changed (e.g. a quiet weekend day with no news), update only the day count and stamps if you are otherwise confident nothing moved. If in doubt, make no PR and say so in the session summary.

## 7. Known pitfalls

- **Framing drift**: in six months the state flipped five times. Read Phase 0 news before assuming yesterday's framing still holds.
- **Weekly vs daily series**: US Diesel (EIA, Monday) and IT Diesel (EU Oil Bulletin) do not update daily. Don't re-stamp them as fresh.
- **Intraday vs settle**: search snippets mix them. Prefer "settled at", and state the time basis in the PR.
- **Asian-session moves** (e.g. "Brent +2.9% in Asia on Monday") are not closes. They can go in the timeline, not in a KPI.
- **MarineTraffic embed** (Level 3) uses a legacy path unsupported since April 2024. If users report a blank panel, flag it in the PR; don't try to fix it in a refresh.
