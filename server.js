import express from 'express';
import cors from 'cors';
import { parseStringPromise } from 'xml2js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
const PORT = !isNaN(cliPort) && cliPort > 0 ? cliPort : (process.env.PORT ? Number(process.env.PORT) : 3000);

app.use(cors());
app.use(express.json());

// --- Topic-driven RSS collection (Google News, no key required) ---
// Default project is TOXIC; /api/news?topic= re-anchors every feed to any
// project the room is tracking. Collected on a 5-minute cadence.
const DEFAULT_KEYWORDS = ['toxic', 'yash'];

function feedUrl(query, lang = 'en') {
  const hl = lang === 'kn' ? 'kn' : 'en-IN';
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=IN&ceid=IN:${lang === 'kn' ? 'kn' : 'en'}`;
}

function buildFeeds(keywords) {
  const anchor = keywords.join(' ');
  return {
    news: feedUrl(`${anchor} (review OR controversy OR boycott OR reaction)`),
    release: feedUrl(`${anchor} (box office OR collection OR release)`),
    industry: feedUrl(`${anchor} (interview OR statement OR director)`),
    regional: feedUrl(`${anchor} cinema`, 'kn'),
  };
}

// Backstop: Google News RSS can return loosely-related stories. Only items
// mentioning a whole project keyword count toward measurements.
function isRelevant(item, keywords) {
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  return keywords.some((k) => {
    const kw = String(k || '').toLowerCase().trim();
    if (!kw) return false;
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${esc}\\b`).test(text);
  });
}

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

function topicKeywords(req) {
  const raw = typeof req.query.topic === 'string' ? req.query.topic : '';
  const kws = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  return kws.length > 0 ? kws : DEFAULT_KEYWORDS;
}

// Get project news — ?topic=comma,separated,keywords (default: TOXIC)
app.get('/api/news', async (req, res) => {
  try {
    const keywords = topicKeywords(req);
    const feeds = buildFeeds(keywords);
    const [news, release, industry, regional] = await Promise.all([
      fetchRSSFeed(feeds.news),
      fetchRSSFeed(feeds.release),
      fetchRSSFeed(feeds.industry),
      fetchRSSFeed(feeds.regional),
    ]);

    // Regional-script headlines can't match the Latin relevance filter, so the
    // topic-anchored regional feed is trusted by origin instead.
    const allNews = [
      ...news,
      ...release,
      ...industry,
      ...regional.map((item) => ({ ...item, _trustedRegional: true })),
    ];
    const uniqueNews = [];
    const seen = new Set();

    for (const item of allNews) {
      const key = item.title?.toLowerCase().trim();
      if (key && !seen.has(key) && (isRelevant(item, keywords) || item._trustedRegional)) {
        seen.add(key);
        uniqueNews.push(item);
      }
    }

    for (const item of uniqueNews) delete item._trustedRegional;

    res.json({
      success: true,
      count: uniqueNews.length,
      lastUpdated: new Date().toISOString(),
      topic: keywords.join(', '),
      data: uniqueNews.slice(0, 150),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get trending topics
app.get('/api/trending', async (req, res) => {
  try {
    const keywords = topicKeywords(req);
    const trending = await fetchRSSFeed(feedUrl(`${keywords.join(' ')} (trending OR fans OR social media)`));
    res.json({
      success: true,
      count: trending.length,
      lastUpdated: new Date().toISOString(),
      topic: keywords.join(', '),
      data: trending.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get box office news
app.get('/api/box-office', async (req, res) => {
  try {
    const keywords = topicKeywords(req);
    const data = await fetchRSSFeed(feedUrl(`${keywords.join(' ')} (box office OR collection)`));
    res.json({
      success: true,
      count: data.length,
      lastUpdated: new Date().toISOString(),
      topic: keywords.join(', '),
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

// --- Audience interest via Wikipedia pageviews (free, keyless) ---
// Resolves "{film} film" to an article, then pulls 30 days of daily views.
// Real audience-curiosity signal — no scraping, no auth, no cost.
const interestCache = new Map();
const INTEREST_TTL = 30 * 60 * 1000;

function cleanArticleTitle(raw) {
  const t = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  return /^[A-Za-z0-9_(),.\- ]+$/.test(t) && t.length > 0 ? t : null;
}

async function resolveArticle(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&srlimit=5&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CinemaWarRoom/1.0 (contact: war-room-local)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Wiki search HTTP ${res.status}`);
  const json = await res.json();
  const hits = json?.query?.search || [];
  const filmHit = hits.find((h) => /film|movie|cinema/i.test(h.title)) || hits[0];
  return filmHit ? filmHit.title : null;
}

app.get('/api/interest', async (req, res) => {
  const raw = typeof req.query.title === 'string' && req.query.title.trim()
    ? req.query.title
    : 'Toxic (2026 film)';
  const clean = cleanArticleTitle(raw);
  if (!clean) return res.status(400).json({ success: false, error: 'Invalid title' });

  const cached = interestCache.get(clean.toLowerCase());
  if (cached && Date.now() - cached.time < INTEREST_TTL) {
    return res.json({ success: true, cached: true, ...cached.data });
  }

  try {
    const article = await resolveArticle(`${clean} film`);
    if (!article) throw new Error('No Wikipedia article found');

    const end = new Date();
    const start = new Date(end.getTime() - 29 * 86400000);
    const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${encodeURIComponent(article.replace(/ /g, '_'))}/daily/${fmt(start)}/${fmt(end)}`;
    const pv = await fetch(url, {
      headers: { 'User-Agent': 'CinemaWarRoom/1.0 (contact: war-room-local)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!pv.ok) throw new Error(`Pageviews HTTP ${pv.status}`);
    const json = await pv.json();
    const days = (json?.items || []).map((it) => ({
      date: it.timestamp.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      views: it.views || 0,
    }));

    const data = {
      article,
      days,
      total: days.reduce((s, d) => s + d.views, 0),
      lastUpdated: new Date().toISOString(),
    };
    interestCache.set(clean.toLowerCase(), { data, time: Date.now() });
    res.json({ success: true, cached: false, ...data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Interest lookup failed' });
  }
});

// --- Article summarizer (extractive, no AI, no extra deps) ---
const articleCache = new Map();
const ARTICLE_TTL = 30 * 60 * 1000;
const MAX_HTML_BYTES = 1.5 * 1024 * 1024;

function isPublicHttpUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return !(
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '[::1]'
    );
  } catch {
    return false;
  }
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractSummary(html) {
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const substantial = sentences.map((s) => s.trim()).filter((s) => s.length >= 40 && s.length <= 400);
  return substantial.slice(0, 3).join(' ').slice(0, 600);
}

// Summarize a live article URL — fetched server-side (no browser CORS issue)
app.get('/api/article', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || url.length > 2000) {
    return res.status(400).json({ success: false, error: 'Valid URL required' });
  }
  if (!isPublicHttpUrl(url)) {
    return res.status(400).json({ success: false, error: 'Only public http(s) URLs allowed' });
  }

  const cached = articleCache.get(url);
  if (cached && Date.now() - cached.time < ARTICLE_TTL) {
    return res.json({ success: true, cached: true, ...cached.data });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_HTML_BYTES) { reader.cancel(); break; }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    const summary = extractSummary(html);
    if (!summary) throw new Error('No readable text found');
    const data = { summary, lastUpdated: new Date().toISOString() };
    articleCache.set(url, { data, time: Date.now() });
    res.json({ success: true, cached: false, ...data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Fetch failed' });
  }
});

// Backward compatibility for GitHub Pages subpath
app.get('/cinema-damage-control', (req, res) => res.redirect('/'));
app.get('/cinema-damage-control/{*splat}', (req, res) => {
  const target = req.url.replace(/^\/cinema-damage-control/, '') || '/';
  res.redirect(target);
});

if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(join(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      if (vite.ssrFixStacktrace) vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} else {
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  CINEMA DAMAGE CONTROL ROOM Server`);
  console.log(`  ─────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}`);
  console.log(`  API:     http://0.0.0.0:${PORT}/api/news`);
  console.log(`\n  Collecting project news via Google News RSS (5-min cadence)...\n`);
});
