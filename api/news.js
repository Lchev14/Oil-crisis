const https = require('https');
const http = require('http');

function fetchUrl(url, timeout = 10000) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { timeout, headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }}, (res) => {
      // Follow redirects
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
  // Try RSS <item> first
  const reItem = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = reItem.exec(xml)) !== null && items.length < 25) {
    const b = m[1];
    const title = ext(b, 'title');
    const link = ext(b, 'link') || ext(b, 'guid');
    const pubDate = ext(b, 'pubDate') || ext(b, 'dc:date') || ext(b, 'published');
    const source = ext(b, 'source');
    const desc = ext(b, 'description');
    if (title && link) items.push({ title, link, pubDate, source, description: stripHtml(desc).substring(0, 250) });
  }
  // Try Atom <entry> if no RSS items
  if (items.length === 0) {
    const reEntry = /<entry>([\s\S]*?)<\/entry>/g;
    while ((m = reEntry.exec(xml)) !== null && items.length < 25) {
      const b = m[1];
      const title = ext(b, 'title');
      const linkM = b.match(/<link[^>]*href=["']([^"']+)["']/);
      const link = linkM ? linkM[1] : '';
      const pubDate = ext(b, 'published') || ext(b, 'updated');
      const desc = ext(b, 'summary') || ext(b, 'content');
      if (title && link) items.push({ title, link, pubDate, source: '', description: stripHtml(desc).substring(0, 250) });
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

function isEnergy(title) {
  const t = (title || '').toLowerCase();
  return /oil|crude|brent|wti|gas\b|lng|hormuz|iran|gulf|opec|energy|refiner|tanker|strait|qatar|saudi|pipeline|barrel|fuel|petrol|diesel|shipping|sanction|war.*middle|middle.*east|blockade|drone.*strike|missile.*gulf/.test(t);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  // ============================================================
  // TIER 1: Google News Search (targeted queries = most relevant)
  // ============================================================
  const googleQueries = [
    'Strait+Hormuz+oil+Iran',
    'Iran+war+energy+crisis+oil+price',
    'Iran+ceasefire+Trump+Hormuz',
    'Qatar+LNG+gas+crisis+force+majeure',
    'crude+oil+OPEC+supply+disruption',
    'Gulf+energy+infrastructure+attack',
    'Brent+crude+oil+surge+2026',
    'tanker+shipping+blockade+Persian+Gulf',
    'Middle+East+war+oil+gas+supply',
    'Iran+nuclear+sanctions+oil+embargo',
    'oil+price+today+2026',
    'energy+crisis+global+2026'
  ];

  // ============================================================
  // TIER 2: Direct publisher RSS feeds (verified working URLs)
  // ============================================================
  const feeds = [
    // --- GENERAL NEWS with energy filter ---
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', filter: true },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East', filter: true },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business', filter: true },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', name: 'NY Times Middle East', filter: true },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Energy.xml', name: 'NY Times Energy', filter: false },
    { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR World', filter: true },
    { url: 'https://www.theguardian.com/world/middleeast/rss', name: 'The Guardian ME', filter: true },
    // --- BUSINESS / FINANCIAL ---
    { url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', name: 'CNBC Energy', filter: false },
    { url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html', name: 'CNBC World', filter: true },
    { url: 'https://fortune.com/feed/', name: 'Fortune', filter: true },
    // --- ENERGY SPECIALISTS (no filter needed) ---
    { url: 'https://oilprice.com/rss/main', name: 'OilPrice.com', filter: false },
    { url: 'https://www.rigzone.com/news/rss/rigzone_latest.aspx', name: 'Rigzone', filter: false },
    { url: 'https://gcaptain.com/feed/', name: 'gCaptain Maritime', filter: false },
    { url: 'https://www.hellenicshippingnews.com/feed/', name: 'Hellenic Shipping News', filter: true },
    { url: 'https://www.offshore-technology.com/feed/', name: 'Offshore Technology', filter: false },
    { url: 'https://www.worldoil.com/rss/news', name: 'World Oil', filter: false },
    // --- WIRE SERVICES ---
    { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post World', filter: true },
  ];

  const allArticles = [];
  const seen = new Set();
  const sourceStats = {};

  function add(a, srcName) {
    const key = a.title.substring(0, 50).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return;
    seen.add(key);
    const src = a.source || srcName;
    sourceStats[src] = (sourceStats[src] || 0) + 1;
    allArticles.push({ title: a.title, link: a.link, pubDate: a.pubDate, source: src, description: a.description || '' });
  }

  try {
    // Launch ALL fetches in parallel
    const googleFetches = googleQueries.map(q => {
      const url = 'https://news.google.com/rss/search?q=' + q + '&hl=en&gl=US&ceid=US:en&num=20';
      return fetchUrl(url).then(xml => ({ items: parseItems(xml), name: 'Google News', filter: false })).catch(() => ({ items: [], name: 'Google News', filter: false }));
    });

    const directFetches = feeds.map(f => {
      return fetchUrl(f.url).then(xml => ({ items: parseItems(xml), name: f.name, filter: f.filter })).catch(() => ({ items: [], name: f.name, filter: f.filter }));
    });

    const results = await Promise.all([...googleFetches, ...directFetches]);

    for (const r of results) {
      let articles = r.items;
      if (r.filter) articles = articles.filter(a => isEnergy(a.title));
      for (const a of articles) add(a, r.name);
    }

    // Sort newest first
    allArticles.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({
      success: true,
      count: allArticles.length,
      sources: sourceStats,
      fetchedAt: new Date().toISOString(),
      articles: allArticles.slice(0, 120)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, articles: [] });
  }
};
