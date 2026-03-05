const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
  
  const q = req.query.q || 'Strait Hormuz oil Iran tanker';
  const num = req.query.num || 20;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en&num=${num}`;
  
  try {
    const data = await new Promise((resolve, reject) => {
      const request = https.get(rssUrl, { timeout: 8000 }, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => resolve(body));
      });
      request.on('error', reject);
      request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
    });
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news', message: error.message });
  }
};
