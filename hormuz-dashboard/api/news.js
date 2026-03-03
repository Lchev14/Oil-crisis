// Vercel Serverless Function: fetches Google News RSS and returns JSON
// No API key needed — uses Google News public RSS feed
// Endpoint: /api/news?q=oil+crude+energy+Hormuz

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const q = req.query.q || 'oil crude energy Hormuz strait Iran';
  const hl = req.query.hl || 'en';
  const gl = req.query.gl || 'US';
  const num = parseInt(req.query.num) || 15;

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;

  try {
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyDashboard/1.0)' }
    });
    if (!response.ok) throw new Error(`Google News responded with ${response.status}`);
    const xml = await response.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < num) {
      const itemXml = match[1];
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const source = extractTag(itemXml, 'source');
      if (title) {
        items.push({
          title: decodeHtml(title),
          link,
          pubDate,
          source: source ? decodeHtml(source) : 'Unknown',
          timestamp: pubDate ? new Date(pubDate).toISOString() : null
        });
      }
    }
    res.status(200).json({ status:'ok', totalResults:items.length, query:q, fetchedAt:new Date().toISOString(), articles:items });
  } catch (error) {
    res.status(500).json({ status:'error', message:error.message, articles:[] });
  }
}

function extractTag(xml, tag) {
  let m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`).exec(xml);
  if (m) return m[1].trim();
  m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? m[1].trim() : '';
}

function decodeHtml(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&#x2F;/g,'/');
}
