#!/usr/bin/env node
// Refresh gate for public/index.html. Run from repo root:  node scripts/validate.js
// Exit 0 = PASS (safe to auto-merge) · 1 = HARD FAIL (do not merge) · 2 = FLAGGED (open PR, human merges)
// Compares against origin/main for the day-on-day and framing guards; run `git fetch origin main` first.
'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const FILE = 'public/index.html';
const MOVE_LIMIT = 0.15;                          // >15% day-on-day KPI move → flag
const NOISY = new Set(['Hormuz Transits', 'VLCC Rate', 'EU Power (DE)']);
const hard = [], flags = [], info = [];

const html = fs.readFileSync(FILE, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const js = scripts[scripts.length - 1] || '';

// 1. Structure + syntax
const open = (html.match(/<script[^>]*>/g) || []).length, close = (html.match(/<\/script>/g) || []).length;
if (open !== close) hard.push(`script tags unbalanced: ${open} open / ${close} close`);
const tmp = path.join(os.tmpdir(), `validate-${process.pid}.js`);
fs.writeFileSync(tmp, js);
try { execSync(`node --check "${tmp}"`, { stdio: 'pipe' }); } catch (e) { hard.push('JS syntax error: ' + e.stderr.toString().split('\n').slice(0, 4).join(' | ')); }

// 2. Data arrays must evaluate
function arr(src, re, name) {
  const m = re.exec(src);
  if (!m) { hard.push(`${name} array not found`); return []; }
  try { return eval('[' + m[1] + ']'); } catch (e) { hard.push(`${name} does not evaluate: ${e.message}`); return []; }
}
const KPI = arr(js, /const KPI=\[([\s\S]*?)\n\];/, 'KPI');
const TL = arr(js, /var TL=\[([\s\S]*?)\n\];/, 'TL');
const NEWS = arr(js, /const STATIC_NEWS=\[([\s\S]*?)\n\];/, 'STATIC_NEWS');
const FL = arr(js, /var SK_FL=\[([\s\S]*?)\];/, 'SK_FL');

// 3. Sankey must balance (structural data: the daily refresh must never touch it)
const tot = FL.reduce((a, f) => a + f.v, 0);
if (Math.abs(tot - 18.3) > 0.01) hard.push(`Sankey total ${tot.toFixed(2)} ≠ 18.3 — flow matrix was modified`);

// 4. KPI change % must match value vs fixed Fri Feb 27 baseline
const num = s => { const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
for (const k of KPI) {
  const base = num(String(k.r).split(':').slice(1).join(':')), v = num(k.v), stated = num(k.c);
  if (!k.c || isNaN(base) || isNaN(v) || isNaN(stated) || /Baseline/.test(k.r)) continue;
  const calc = (v / base - 1) * 100;
  if (Math.abs(calc - stated) > 0.6) hard.push(`${k.l}: stated ${k.c} but ${k.v} vs ${k.r} = ${calc.toFixed(1)}%`);
  if ((k.d === 'up') !== (calc >= 0) && k.l !== 'Brent-WTI Spread') hard.push(`${k.l}: direction "${k.d}" contradicts ${calc.toFixed(1)}%`);
}
if (/Fri 27/.test(html) === false) hard.push('fixed Fri Feb 27 baseline labels missing');

// 5. Verified stamps: exactly two, identical, parseable
const stamps = [...html.matchAll(/Last verified: ([A-Z][a-z]{2} \d{1,2}, \d{4}) (\d{2}:\d{2}) CET/g)];
if (stamps.length !== 2) hard.push(`expected 2 "Last verified" stamps, found ${stamps.length}`);
else if (stamps[0][1] !== stamps[1][1]) hard.push(`stamps disagree: ${stamps[0][1]} vs ${stamps[1][1]}`);

// 6. Header day count: Day 1 = Sat Feb 28 2026
const dayM = html.match(/class="hdr-s">[^<]*Day (\d+)/);
if (stamps.length && dayM) {
  const d = new Date(stamps[0][1] + ' 12:00 UTC'), expect = Math.round((d - new Date('Feb 27, 2026 12:00 UTC')) / 864e5);
  if (+dayM[1] !== expect) hard.push(`header says Day ${dayM[1]} but stamp date ${stamps[0][1]} is Day ${expect}`);
} else hard.push('header day count not found');

// 7. News hygiene
const urls = NEWS.map(n => n.url);
NEWS.forEach((n, i) => { if (!/^https:\/\/[^\s"]+\.[a-z]{2,}\//.test(n.url || '')) hard.push(`news[${i}] bad url: ${n.url}`); if (!n.s || !n.h || !n.t) hard.push(`news[${i}] missing field`); });

// 8. Guards vs origin/main
let prev = null;
try { prev = execSync(`git show origin/main:${FILE}`, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 2e7 }).toString(); } catch { flags.push('could not read origin/main — day-on-day guard skipped'); }
if (prev) {
  const pjs = [...prev.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
  let PK = []; try { PK = eval('[' + /const KPI=\[([\s\S]*?)\n\];/.exec(pjs)[1] + ']'); } catch { flags.push('origin/main KPI unreadable'); }
  for (const k of KPI) {
    const p = PK.find(x => x.l === k.l); if (!p || NOISY.has(k.l)) continue;
    const a = num(p.v), b = num(k.v); if (isNaN(a) || isNaN(b) || a === 0) continue;
    const mv = b / a - 1;
    if (Math.abs(mv) > MOVE_LIMIT) flags.push(`${k.l} moved ${(mv * 100).toFixed(1)}% vs main (${p.v} → ${k.v}) — verify before merge`);
    else if (p.v !== k.v) info.push(`${k.l}: ${p.v} → ${k.v}`);
  }
  const frame = h => (h.match(/class="hdr-s">([^<]*)</) || [, ''])[1].replace(/Day \d+/, '').replace(/· \w+ 2026/, '').trim();
  const badge = h => (h.match(/class="clbl">([^<]*)</) || [, ''])[1];
  if (frame(prev) !== frame(html)) flags.push(`FRAMING CHANGE: "${frame(prev)}" → "${frame(html)}"`);
  if (badge(prev) !== badge(html)) flags.push(`BADGE CHANGE: "${badge(prev)}" → "${badge(html)}"`);
  const pFL = (/var SK_FL=\[([\s\S]*?)\];/.exec(pjs) || [, ''])[1], cFL = (/var SK_FL=\[([\s\S]*?)\];/.exec(js) || [, ''])[1];
  if (pFL !== cFL) hard.push('Sankey flow matrix differs from main — structural data is out of scope for a refresh');
  const pTL = (pjs.match(/\{date:"/g) || []).length, pN = (pjs.match(/\{t:"/g) || []).length;
  // A newly added item reusing an existing URL is usually the same story re-added. Live blogs can be legit, so flag, don't fail.
  const prevUrls = new Set([...pjs.matchAll(/url:"([^"]+)"/g)].map(m => m[1]));
  const added = NEWS.slice(0, Math.max(0, NEWS.length - pN));
  const reused = added.filter(n => prevUrls.has(n.url)).map(n => n.url);
  const selfDup = added.map(n => n.url).filter((u, i, a) => a.indexOf(u) !== i);
  if (reused.length || selfDup.length) flags.push(`new news items reuse URLs: ${[...reused, ...selfDup].slice(0, 3).join(', ')}`);
  info.push(`timeline +${TL.length - pTL}, news +${NEWS.length - pN}`);
  if (TL.length < pTL || NEWS.length < pN) flags.push('timeline or news items were REMOVED');
}

console.log(`KPIs ${KPI.length} · timeline ${TL.length} · news ${NEWS.length} · Sankey ${tot.toFixed(1)} · stamp ${stamps[0] ? stamps[0][1] : '?'}`);
info.forEach(s => console.log('  · ' + s));
flags.forEach(s => console.log('FLAG  ' + s));
hard.forEach(s => console.log('FAIL  ' + s));
const verdict = hard.length ? 'HARD FAIL — do not merge' : flags.length ? 'FLAGGED — open PR, human merges' : 'PASS — safe to auto-merge';
console.log('\nVERDICT: ' + verdict);
process.exit(hard.length ? 1 : flags.length ? 2 : 0);
