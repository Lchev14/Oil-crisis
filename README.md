# Hormuz Energy Intelligence Dashboard

## Deploy via GitHub to Vercel

### Step 1: Extract zip into your GitHub repo root

```
your-repo/
  public/
    index.html        <-- Dashboard
  api/
    news.js           <-- Live news serverless function
  vercel.json
  package.json
  README.md
```

### Step 2: Push to GitHub
```
git add .
git commit -m "Hormuz dashboard"
git push
```

### Step 3: Connect to Vercel
1. Go to vercel.com > New Project
2. Import your GitHub repo
3. Framework Preset: Other
4. Output Directory: public
5. Build Command: leave empty
6. Click Deploy

Dashboard: https://your-project.vercel.app
News API: https://your-project.vercel.app/api/news

### Live News
- Serverless function at /api/news fetches Google News RSS
- Searches: "oil crude energy Iran Hormuz"
- Cached 5 min on Vercel edge, auto-refreshes
- Fallback: static scenario data if API fails
- No API key needed

### Sharing
Fine for internal/colleague use. Google News RSS is public. TradingView widgets are free for embedding.
