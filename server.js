import express from 'express';
import cors from 'cors';
import { parseStringPromise } from 'xml2js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// The production build lives under the same subpath as GitHub Pages
app.get('/', (req, res) => res.redirect('/cinema-damage-control/'));

// Serve static build files (subpath first so bundled asset URLs resolve)
app.use('/cinema-damage-control', express.static(join(__dirname, 'dist')));
app.use(express.static(join(__dirname, 'dist')));

// --- RSS Feed Fetching ---
const RSS_FEEDS = {
  bollywoodNews: 'https://news.google.com/rss/search?q=bollywood+movie+controversy+OR+review+OR+boycott&hl=en-IN&gl=IN&ceid=IN:en',
  actorNews: 'https://news.google.com/rss/search?q=indian+actor+controversy+OR+statement+OR+interview&hl=en-IN&gl=IN&ceid=IN:en',
  filmIndustry: 'https://news.google.com/rss/search?q=indian+film+industry+news&hl=en-IN&gl=IN&ceid=IN:en',
  boxOffice: 'https://news.google.com/rss/search?q=bollywood+box+office+collection+2025&hl=en-IN&gl=IN&ceid=IN:en',
  trending: 'https://news.google.com/rss/search?q=bollywood+trending+OR+social+media&hl=en-IN&gl=IN&ceid=IN:en',
};

// Cache for RSS feeds (refresh every 5 minutes)
const feedCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchRSSFeed(url) {
  const cached = feedCache.get(url);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CinemaWarRoom/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const xml = await response.text();
    const result = await parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: false,
    });

    const items = result?.rss?.channel?.item || [];
    const itemList = Array.isArray(items) ? items : [items];

    const parsed = itemList.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      source: item.source?._ || item.source || '',
      description: item.description || '',
      category: item.category || '',
    }));

    feedCache.set(url, { data: parsed, time: Date.now() });
    return parsed;
  } catch (err) {
    console.error(`Failed to fetch RSS: ${url}`, err.message);
    return cached?.data || [];
  }
}

// --- API Routes ---

// Get all entertainment news
app.get('/api/news', async (req, res) => {
  try {
    const [bollywood, actors, industry] = await Promise.all([
      fetchRSSFeed(RSS_FEEDS.bollywoodNews),
      fetchRSSFeed(RSS_FEEDS.actorNews),
      fetchRSSFeed(RSS_FEEDS.filmIndustry),
    ]);

    const allNews = [...bollywood, ...actors, ...industry];
    const uniqueNews = [];
    const seen = new Set();

    for (const item of allNews) {
      const key = item.title?.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueNews.push(item);
      }
    }

    res.json({
      success: true,
      count: uniqueNews.length,
      lastUpdated: new Date().toISOString(),
      data: uniqueNews.slice(0, 50),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get trending topics
app.get('/api/trending', async (req, res) => {
  try {
    const trending = await fetchRSSFeed(RSS_FEEDS.trending);
    res.json({
      success: true,
      count: trending.length,
      lastUpdated: new Date().toISOString(),
      data: trending.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get box office news
app.get('/api/box-office', async (req, res) => {
  try {
    const data = await fetchRSSFeed(RSS_FEEDS.boxOffice);
    res.json({
      success: true,
      count: data.length,
      lastUpdated: new Date().toISOString(),
      data: data.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search news by keyword
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const results = await fetchRSSFeed(url);
    res.json({
      success: true,
      query: q,
      count: results.length,
      lastUpdated: new Date().toISOString(),
      data: results.slice(0, 30),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  CINEMA DAMAGE CONTROL ROOM API Server`);
  console.log(`  ─────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}`);
  console.log(`  API:     http://localhost:${PORT}/api/news`);
  console.log(`\n  Fetching live entertainment news from Google News RSS...\n`);
});
