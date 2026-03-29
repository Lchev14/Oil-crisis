const https = require('https');
const http = require('http');

function fetchUrl(url, timeout = 10000) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { timeout, headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }}, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseItems(xml) {
  const items = [];
  const reItem = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = reItem.exec(xml)) !== null && items.length < 30) {
    const b = m[1];
    const title = ext(b, 'title');
    const link = ext(b, 'link') || ext(b, 'guid');
    const pubDate = ext(b, 'pubDate') || ext(b, 'dc:date');
    const source = ext(b, 'source');
    const desc = ext(b, 'description');
    if (title && link) items.push({ title, link, pubDate, source, description: stripHtml(desc).substring(0, 300) });
  }
  if (items.length === 0) {
    const reEntry = /<entry>([\s\S]*?)<\/entry>/g;
    while ((m = reEntry.exec(xml)) !== null && items.length < 30) {
      const b = m[1];
      const title = ext(b, 'title');
      const linkM = b.match(/<link[^>]*href=["']([^"']+)["']/);
      const link = linkM ? linkM[1] : '';
      const pubDate = ext(b, 'published') || ext(b, 'updated');
      const desc = ext(b, 'summary') || ext(b, 'content');
      if (title && link) items.push({ title, link, pubDate, source: '', description: stripHtml(desc).substring(0, 300) });
    }
  }
  return items;
}

function ext(xml, tag) {
  let m = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></' + tag + '>').exec(xml);
  if (m) return m[1].trim();
  m = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>').exec(xml);
  return m ? m[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'") : '';
}

function stripHtml(s) { return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

// ============================================================
// SOURCE WHITELIST — only trusted, reputable outlets allowed
// ============================================================
const TRUSTED_SOURCES = new Set([
  'al jazeera', 'bbc', 'reuters', 'associated press', 'ap news',
  'bloomberg', 'cnbc', 'cnn', 'nbc news', 'cbs news', 'abc news',
  'new york times', 'ny times', 'washington post', 'wall street journal', 'wsj',
  'financial times', 'ft', 'the economist', 'the guardian', 'the telegraph',
  'fortune', 'forbes', 'npr', 'pbs', 'politico', 'axios',
  'times of israel', 'haaretz', 'the national', 'arab news',
  'oilprice.com', 'oilprice', 'rigzone', 'world oil', 'offshore technology',
  'gcaptain', 'hellenic shipping news', 'lloyd\'s list', 'tradewinds',
  's&p global', 'platts', 'argus media', 'energy intelligence',
  'iea', 'opec', 'eia',
  'euronews', 'france 24', 'dw', 'deutsche welle',
  'south china morning post', 'scmp', 'nikkei', 'yonhap',
  'the hill', 'foreign affairs', 'foreign policy',
  'middle east eye', 'al-monitor', 'al arabiya',
  'sky news', 'itv news', 'channel 4',
  'investing.com', 'marketwatch', 'barron\'s',
  'google news', // Google News aggregates from trusted sources
]);

function isTrustedSource(sourceName) {
  if (!sourceName) return false;
  const s = sourceName.toLowerCase().trim();
  for (const trusted of TRUSTED_SOURCES) {
    if (s.includes(trusted) || trusted.includes(s)) return true;
  }
  return false;
}

// ============================================================
// RELEVANCE FILTER — must match the Iran/Hormuz/energy crisis
// Applied to title + description, must match 2+ keyword groups
// for general articles, or 1 group if from infrastructure keywords
// ============================================================
function isRelevant(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();

  let score = 0;

  // Group 1: Iran conflict (weight: 2)
  if (/\biran\b|tehran|hormuz|persian gulf|irgc|revolutionary guard|khamenei|pezeshkian|araghchi|epic fury/.test(text)) score += 2;

  // Group 2: Oil/gas commodities (weight: 1)
  if (/\boil price|\boil market|crude oil|brent crude|\bwti\b|\blng\b|natural gas price|opec.*cut|opec.*oil|petroleum|barrel.*oil|energy crisis|energy shock/.test(text)) score += 1;

  // Group 3: Shipping/maritime disruption (weight: 2)
  if (/tanker.*hormuz|tanker.*gulf|tanker.*attack|shipping.*strait|blockade.*hormuz|vessel.*attack|maritime.*gulf|strait.*closed|convoy.*escort/.test(text)) score += 2;

  // Group 4: Key infrastructure (weight: 2 — auto-pass)
  if (/ras laffan|ras tanura|kharg island|yanbu|fujairah|ruwais|basra oil|qatar\s?energy|saudi aramco|adnoc|habshan|south pars|samref|mina al.?ahmadi|mina abdullah/.test(text)) score += 2;

  // Group 5: Crisis diplomacy (weight: 1)
  if (/ceasefire.*iran|peace.*iran|trump.*iran|trump.*hormuz|sanction.*iran|ultimatum|force majeure|strategic.*reserve|spr.*release/.test(text)) score += 1;

  // Group 6: Specific crisis terms (weight: 2 — auto-pass)
  if (/hormuz closure|hormuz crisis|hormuz blockade|iran war|war.*iran|oil.*war|energy.*war|gulf.*attack|drone.*refinery|missile.*oil|missile.*gas/.test(text)) score += 2;

  // Need score >= 2 to pass (single vague "oil" mention not enough)
  return score >= 2;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  // TIER 1: Google News targeted queries (12)
  const googleQueries = [
    'Strait+Hormuz+oil+Iran',
    'Iran+war+energy+crisis+oil+price',
    'Iran+ceasefire+Trump+Hormuz',
    'Qatar+LNG+gas+crisis+force+majeure',
    'crude+oil+OPEC+supply+disruption+Iran',
    'Gulf+energy+infrastructure+attack+Iran',
    'Brent+crude+oil+Iran+war+2026',
    'tanker+shipping+blockade+Persian+Gulf',
    'Middle+East+war+oil+gas+Hormuz',
    'Iran+sanctions+oil+embargo+2026',
    'oil+price+surge+Iran+conflict',
    'Hormuz+crisis+energy+security+2026'
  ];

  // TIER 2: Direct publisher RSS (17 feeds)
  const feeds = [
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', name: 'NY Times Middle East' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Energy.xml', name: 'NY Times Energy' },
    { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR World' },
    { url: 'https://www.theguardian.com/world/middleeast/rss', name: 'The Guardian' },
    { url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', name: 'CNBC Energy' },
    { url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html', name: 'CNBC World' },
    { url: 'https://fortune.com/feed/', name: 'Fortune' },
    { url: 'https://oilprice.com/rss/main', name: 'OilPrice.com' },
    { url: 'https://www.rigzone.com/news/rss/rigzone_latest.aspx', name: 'Rigzone' },
    { url: 'https://gcaptain.com/feed/', name: 'gCaptain' },
    { url: 'https://www.hellenicshippingnews.com/feed/', name: 'Hellenic Shipping' },
    { url: 'https://www.offshore-technology.com/feed/', name: 'Offshore Technology' },
    { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post' },
    { url: 'https://www.worldoil.com/rss/news', name: 'World Oil' },
  ];

  const allArticles = [];
  const seen = new Set();
  const sourceStats = {};
  let totalScanned = 0;
  let filteredOut = 0;
  let sourceBlocked = 0;

  function add(a, feedName) {
    totalScanned++;
    const key = a.title.substring(0, 50).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return;

    // Determine source name
    const src = a.source || feedName;

    // SOURCE WHITELIST CHECK — Google News articles carry their original source
    // Direct feed articles use the feed name (already trusted)
    const isDirectFeed = feedName !== 'Google News';
    if (!isDirectFeed && !isTrustedSource(src)) {
      sourceBlocked++;
      return;
    }

    // RELEVANCE CHECK — every article must pass
    if (!isRelevant(a.title, a.description)) {
      filteredOut++;
      return;
    }

    seen.add(key);
    sourceStats[src] = (sourceStats[src] || 0) + 1;
    allArticles.push({ title: a.title, link: a.link, pubDate: a.pubDate, source: src, description: a.description || '' });
  }

  try {
    const googleFetches = googleQueries.map(q => {
      const url = 'https://news.google.com/rss/search?q=' + q + '&hl=en&gl=US&ceid=US:en&num=20';
      return fetchUrl(url).then(xml => ({ items: parseItems(xml), name: 'Google News' })).catch(() => ({ items: [], name: 'Google News' }));
    });

    const directFetches = feeds.map(f => {
      return fetchUrl(f.url).then(xml => ({ items: parseItems(xml), name: f.name })).catch(() => ({ items: [], name: f.name }));
    });

    const results = await Promise.all([...googleFetches, ...directFetches]);
    for (const r of results) {
      for (const a of r.items) add(a, r.name);
    }

    allArticles.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({
      success: true,
      count: allArticles.length,
      scanned: totalScanned,
      filtered: filteredOut,
      sourceBlocked: sourceBlocked,
      sources: sourceStats,
      fetchedAt: new Date().toISOString(),
      articles: allArticles.slice(0, 120)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, articles: [] });
  }
};
