export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  // Short cache to ensure freshness — 2 min cache, 5 min stale
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const q = req.query.q || 'Strait Hormuz oil Iran tanker energy crisis';
  const num = parseInt(req.query.num) || 15;

  // Try multiple Google News RSS queries to get the freshest results
  const queries = [
    q,
    'oil price Iran Hormuz tanker',
    'crude oil energy Middle East crisis'
  ];

  let allItems = [];

  for (const query of queries) {
    if (allItems.length >= num) break;
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en&when=1d`;
      const response = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyDashboard/1.0)' }
      });
      if (!response.ok) continue;
      const xml = await response.text();
      const re = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = re.exec(xml)) !== null && allItems.length < num * 2) {
        const ix = m[1];
        const title = ex(ix, 'title');
        const link = ex(ix, 'link');
        const pubDate = ex(ix, 'pubDate');
        const source = ex(ix, 'source');
        if (title && !allItems.some(a => a.title === dh(title))) {
          allItems.push({
            title: dh(title),
            link,
            pubDate,
            source: source ? dh(source) : 'Google News',
            timestamp: pubDate ? new Date(pubDate).toISOString() : null
          });
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Sort by date (newest first) and limit
  allItems.sort((a, b) => {
    const da = a.timestamp ? new Date(a.timestamp) : new Date(0);
    const db = b.timestamp ? new Date(b.timestamp) : new Date(0);
    return db - da;
  });

  const articles = allItems.slice(0, num);

  res.status(200).json({
    status: 'ok',
    totalResults: articles.length,
    fetchedAt: new Date().toISOString(),
    articles
  });
}

function ex(xml, tag) {
  let m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`).exec(xml);
  if (m) return m[1].trim();
  m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? m[1].trim() : '';
}

function dh(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
