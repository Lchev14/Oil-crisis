// Vercel Serverless Function: Yahoo Finance Chart Data Proxy
// Fetches OHLCV data for TTF=F, RB=F, BDI

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const symbol = req.query.symbol || 'TTF=F';
  const range = req.query.range || '5d';
  const interval = req.query.interval || '60m';

  const allowed = ['TTF=F', 'RB=F', 'BDI'];
  if (!allowed.includes(symbol)) {
    return res.status(400).json({ error: 'Symbol not allowed', allowed });
  }

  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].timestamp) {
          return res.status(200).json(data);
        }
      }
    } catch (e) {
      continue;
    }
  }

  return res.status(502).json({ error: 'All Yahoo Finance endpoints failed for ' + symbol });
}
