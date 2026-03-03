export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const q = req.query.q || 'oil crude energy Iran Hormuz';
  const num = parseInt(req.query.num) || 15;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`;

  try {
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyDashboard/1.0)' }
    });
    if (!response.ok) throw new Error(`RSS ${response.status}`);
    const xml = await response.text();
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null && items.length < num) {
      const ix = m[1];
      const title = ex(ix,'title');
      const link = ex(ix,'link');
      const pubDate = ex(ix,'pubDate');
      const source = ex(ix,'source');
      if (title) items.push({ title:dh(title), link, pubDate, source:source?dh(source):'Google News', timestamp:pubDate?new Date(pubDate).toISOString():null });
    }
    res.status(200).json({ status:'ok', totalResults:items.length, fetchedAt:new Date().toISOString(), articles:items });
  } catch (e) {
    res.status(500).json({ status:'error', message:e.message, articles:[] });
  }
}

function ex(xml,tag) {
  let m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`).exec(xml);
  if (m) return m[1].trim();
  m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m ? m[1].trim() : '';
}

function dh(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
