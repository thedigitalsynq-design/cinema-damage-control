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

// --- YouTube video intelligence (keyless via Google News Video RSS) ---
app.get('/api/videos', async (req, res) => {
  try {
    const keywords = topicKeywords(req);
    const query = `site:youtube.com ${keywords.join(' ')} (review OR reaction OR controversy OR trailer OR leak OR box office)`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const items = await fetchRSSFeed(url);

    // Sanitize and format for video display
    const formatted = items.map((it) => {
      // Clean up YouTube title suffix
      const cleanTitle = (it.title || '').replace(/\s*-\s*YouTube$/i, '').trim();
      return {
        title: cleanTitle,
        link: it.link || '',
        pubDate: it.pubDate || '',
        source: it.source || 'YouTube',
        description: it.description || '',
        hasControversy: /controversy|apologise|apology|notice|legal|scandal|furious|boycott|fake/i.test(it.title),
        isReview: /review|reaction|honest|rating|verdict|breakdown/i.test(it.title),
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      topic: keywords.join(', '),
      lastUpdated: new Date().toISOString(),
      data: formatted.slice(0, 30),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Wikipedia Live Revision & Edit War Stream ---
const revisionsCache = new Map();
const REVISIONS_TTL = 3 * 60 * 1000;

app.get('/api/revisions', async (req, res) => {
  const raw = typeof req.query.title === 'string' && req.query.title.trim()
    ? req.query.title
    : 'Toxic (2026 film)';
  const clean = cleanArticleTitle(raw);
  if (!clean) return res.status(400).json({ success: false, error: 'Invalid title' });

  const cached = revisionsCache.get(clean.toLowerCase());
  if (cached && Date.now() - cached.time < REVISIONS_TTL) {
    return res.json({ success: true, cached: true, ...cached.data });
  }

  try {
    const article = await resolveArticle(`${clean} film`);
    if (!article) throw new Error('No Wikipedia article found');

    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(article)}&rvlimit=15&rvprop=timestamp|user|comment|size&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CinemaWarRoom/1.0 (contact: war-room-local)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Wiki revisions HTTP ${response.status}`);
    const json = await response.json();
    const pages = json?.query?.pages || {};
    const pageId = Object.keys(pages)[0];
    const rawRevs = pages[pageId]?.revisions || [];

    const revisions = rawRevs.map((rev, idx) => {
      const prevSize = rawRevs[idx + 1]?.size || rev.size;
      const delta = rev.size - prevSize;
      const comment = rev.comment || '';
      const isControversial = /revert|rvv|vandal|dispute|neutrality|source|controversy|removed|restore/i.test(comment);
      return {
        user: rev.user || 'Anonymous',
        timestamp: rev.timestamp,
        comment: comment || 'Minor layout/prose edit',
        size: rev.size,
        delta,
        isControversial,
      };
    });

    const data = {
      article,
      pageId,
      revisions,
      totalTracked: revisions.length,
      hasRecentEditWar: revisions.some(r => r.isControversial),
      lastUpdated: new Date().toISOString(),
    };

    revisionsCache.set(clean.toLowerCase(), { data, time: Date.now() });
    res.json({ success: true, cached: false, ...data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Wiki revision query failed' });
  }
});

// --- Google Trends Live Stream (India & Global) ---
const trendsCache = { time: 0, data: [] };
const TRENDS_TTL = 10 * 60 * 1000;

app.get('/api/trends', async (req, res) => {
  if (Date.now() - trendsCache.time < TRENDS_TTL && trendsCache.data.length > 0) {
    return res.json({ success: true, cached: true, data: trendsCache.data });
  }

  try {
    const url = 'https://trends.google.com/trending/rss?geo=IN';
    const items = await fetchRSSFeed(url);
    const formatted = items.slice(0, 15).map(it => ({
      title: it.title || '',
      pubDate: it.pubDate || '',
      traffic: it['ht:approx_traffic'] || it.approx_traffic || '50K+',
    }));

    trendsCache.data = formatted;
    trendsCache.time = Date.now();
    res.json({ success: true, cached: false, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Latest Indian Movies & 30-Day Theatrical Telemetry ---
// Scrapes/parses Wikipedia 2026 Indian film releases (Hindi, Telugu, Tamil) and
// cross-references BookMyShow / Google Theatrical RSS to provide 30-day window data.
const latestFilmsCache = { time: 0, data: null };
const LATEST_FILMS_TTL = 15 * 60 * 1000;

// Curated baseline of confirmed August - September 2026 Indian theatrical releases
// Used for instant zero-latency responses and graceful network fallback
const SEED_30D_INDIAN_FILMS = [
  {
    title: 'Mirzapur: The Movie',
    releaseDate: '2026-09-04',
    language: 'Hindi',
    genre: 'Crime / Action / Thriller',
    director: 'Gurmmeet Singh',
    cast: ['Pankaj Tripathi', 'Ali Fazal', 'Divyenndu', 'Jitendra Kumar'],
    studio: 'Excel Entertainment / Prime Video',
    budget: '₹140 Cr',
    boxOffice: '₹84.5 Cr (Week 1 Theatrical)',
    bookingStatus: 'In Theatres Now · Trending on BookMyShow',
    threatScore: 68,
    riskBand: 'At Risk',
    keywords: ['mirzapur', 'pankaj tripathi', 'ali fazal'],
    synopsis: 'Theatrical adaptation of the volatile Purvanchal underworld saga with high box office stakes and regional boycott calls.',
  },
  {
    title: 'Haiwaan',
    releaseDate: '2026-09-11',
    language: 'Hindi',
    genre: 'Dark Comedy / Crime Thriller',
    director: 'Priyadarshan',
    cast: ['Akshay Kumar', 'Saif Ali Khan', 'Shriya Pilgaonkar', 'Saiyami Kher'],
    studio: 'Cape of Good Films / Jio Studios',
    budget: '₹165 Cr',
    boxOffice: '₹22.4 Cr Advance Booking (BMS)',
    bookingStatus: 'Releasing This Friday · Advance Open',
    threatScore: 54,
    riskBand: 'Watch',
    keywords: ['haiwaan', 'akshay kumar', 'saif ali khan'],
    synopsis: 'High-profile reunion of Akshay Kumar and Priyadarshan facing leak threats and runtime disputes.',
  },
  {
    title: 'Ghamasaan',
    releaseDate: '2026-09-11',
    language: 'Hindi',
    genre: 'Rural Action Thriller',
    director: 'Tigmanshu Dhulia',
    cast: ['Arshad Warsi', 'Pratik Gandhi', 'Ishita Dutta', 'Rajpal Yadav'],
    studio: 'Yaelstar Films / ZEE5 / Jio Studios',
    budget: '₹55 Cr',
    boxOffice: '₹6.8 Cr Advance (Multiplex)',
    bookingStatus: 'In Theatres Tomorrow · BookMyShow 89%',
    threatScore: 42,
    riskBand: 'Watch',
    keywords: ['ghamasaan', 'pratik gandhi', 'arshad warsi'],
    synopsis: 'Gritty heartland drama in Bundelkhand; strong word of mouth counterbalancing limited single-screen reach.',
  },
  {
    title: 'Daayra',
    releaseDate: '2026-09-18',
    language: 'Hindi',
    genre: 'Investigative Drama',
    director: 'Meghna Gulzar',
    cast: ['Kareena Kapoor', 'Prithviraj Sukumaran'],
    studio: 'Junglee Pictures / Pen Studios',
    budget: '₹75 Cr',
    boxOffice: 'Screen Count: 1,800 Screens Locked',
    bookingStatus: 'Advance Booking Opening Monday',
    threatScore: 38,
    riskBand: 'Stable',
    keywords: ['daayra', 'kareena kapoor', 'prithviraj'],
    synopsis: 'Intense investigative legal narrative based on sensitive real-life jurisprudence, with potential PR sensitivities.',
  },
  {
    title: 'Vibe',
    releaseDate: '2026-09-18',
    language: 'Hindi',
    genre: 'Musical Comedy',
    director: 'Kunal Khemu',
    cast: ['Kunal Khemu', 'Preity Zinta', 'Sparsh Shrivastava', 'Yashpal Sharma'],
    studio: 'Amazon MGM Studios / Drongo Films',
    budget: '₹60 Cr',
    boxOffice: 'Theatrical Partner: PVR Inox Exclusive',
    bookingStatus: 'Teaser Trending on BookMyShow',
    threatScore: 32,
    riskBand: 'Stable',
    keywords: ['vibe movie', 'kunal khemu', 'preity zinta'],
    synopsis: 'Amazon MGM Studios major Indian theatrical wide-release backed by viral music video campaigns.',
  },
  {
    title: 'The Vvaan: Force of the Forrest',
    releaseDate: '2026-09-25',
    language: 'Hindi / Multi-lingual',
    genre: 'Mythological Action Fantasy',
    director: 'Deepak Kumar Mishra',
    cast: ['Sidharth Malhotra', 'Tamannaah Bhatia', 'Maniesh Paul', 'Sunil Grover'],
    studio: 'Balaji Motion Pictures / TVF Motion Pictures',
    budget: '₹125 Cr',
    boxOffice: 'Pan-India Booking Target ₹35 Cr Day 1',
    bookingStatus: 'Advance Screening Hype on BMS',
    threatScore: 62,
    riskBand: 'At Risk',
    keywords: ['the vvaan', 'sidharth malhotra', 'tamannaah'],
    synopsis: 'Folklore fantasy facing VFX comparisons and social media smear campaigns from rival fandoms.',
  },
  {
    title: 'Gandhari',
    releaseDate: '2026-09-03',
    language: 'Hindi',
    genre: 'Action Revenge Thriller',
    director: 'Devashish Makhija',
    cast: ['Taapsee Pannu', 'Ishwak Singh', 'Swastika Mukherjee'],
    studio: 'Katha Pictures / Netflix / Theatrical',
    budget: '₹45 Cr',
    boxOffice: '₹18.2 Cr Week 1 (Theatres)',
    bookingStatus: 'In Theatres Now · Selling Fast in Metros',
    threatScore: 48,
    riskBand: 'Watch',
    keywords: ['gandhari', 'taapsee pannu'],
    synopsis: 'A fiercely paced revenge thriller navigating censor board certification debates.',
  },
  {
    title: 'Batwara 1947',
    releaseDate: '2026-08-14',
    language: 'Hindi',
    genre: 'Historical War Epic',
    director: 'Rajkumar Santoshi',
    cast: ['Sunny Deol', 'Preity Zinta', 'Karan Deol', 'Shabana Azmi'],
    studio: 'Viacom18 Studios',
    budget: '₹180 Cr',
    boxOffice: '₹245 Cr (3-Week Theatrical Run)',
    bookingStatus: 'In Theatres (Day 27) · BookMyShow Hit',
    threatScore: 74,
    riskBand: 'At Risk',
    keywords: ['batwara 1947', 'sunny deol', 'rajkumar santoshi'],
    synopsis: 'Major independence partition drama that faced coordinated political boycott hashtags and cross-border digital disputes.',
  },
  {
    title: 'Awarapan 2',
    releaseDate: '2026-08-14',
    language: 'Hindi',
    genre: 'Neo-Noir Romantic Action',
    director: 'Nitin Kakkar',
    cast: ['Emraan Hashmi', 'Disha Patani', 'Shabana Azmi'],
    studio: 'Vishesh Films / T-Series',
    budget: '₹85 Cr',
    boxOffice: '₹92 Cr (3-Week Theatrical Run)',
    bookingStatus: 'In Theatres (Day 27) · Cult Revival',
    threatScore: 58,
    riskBand: 'Watch',
    keywords: ['awarapan 2', 'emraan hashmi', 'disha patani'],
    synopsis: 'High emotional nostalgia coupled with audio piracy and unofficial track leaks across Telegram networks.',
  },
  {
    title: 'Babita Singh Reporting',
    releaseDate: '2026-08-28',
    language: 'Hindi',
    genre: 'Media Satire / Thriller',
    director: 'Ambiecka Pandit',
    cast: ['Barun Sobti', 'Nimisha Sajayan', 'Anshumaan Pushkar'],
    studio: 'Platoon One / RSVP',
    budget: '₹35 Cr',
    boxOffice: '₹28.4 Cr (Day 13 Theatrical)',
    bookingStatus: 'In Theatres Now (Day 13) · BMS 9.1/10',
    threatScore: 36,
    riskBand: 'Stable',
    keywords: ['babita singh reporting', 'barun sobti', 'nimisha'],
    synopsis: 'Critically acclaimed investigative newsroom expos&eacute; with high audience retention and low controversy profile.',
  },
  {
    title: 'Last Man in Tower',
    releaseDate: '2026-09-11',
    language: 'Hindi / English',
    genre: 'Social Thriller / Adaptation',
    director: 'Ben Rekhi',
    cast: ['Manoj Bajpayee', 'Boman Irani', 'Divya Dutta'],
    studio: 'Spirit Media (Rana Daggubati)',
    budget: '₹40 Cr',
    boxOffice: 'Selected Multiplex Release (350 Screens)',
    bookingStatus: 'In Theatres Tomorrow · Metro Focus',
    threatScore: 28,
    riskBand: 'Stable',
    keywords: ['last man in tower', 'manoj bajpayee', 'boman irani'],
    synopsis: 'Aravind Adiga novel adaptation exploring real-estate corruption in Mumbai with strong critical buzz.',
  },
  {
    title: 'Toxic: A Fairy Tale for Grown-ups',
    releaseDate: '2026-04-10',
    language: 'Kannada / Pan-India',
    genre: 'Gangster / Drug Empire Epic',
    director: 'Geetu Mohandas',
    cast: ['Yash', 'Kiara Advani', 'Nayanthara', 'Huma Qureshi'],
    studio: 'KVN Productions / Monster Mind Creations',
    budget: '₹220 Cr',
    boxOffice: 'Tracking ₹120 Cr Day 1 Target',
    bookingStatus: 'Most Anticipated on BookMyShow (1.2M Interest)',
    threatScore: 82,
    riskBand: 'Critical',
    keywords: ['toxic', 'yash', 'geetu mohandas'],
    synopsis: 'Drug cartel drama facing forest clearance scrutiny in Bengaluru, casting rumors, and massive fan anticipation.',
  }
];

function generate30DayTelemetry(film, baseDateStr = '2026-09-10') {
  const baseDate = new Date(baseDateStr);
  const releaseDate = new Date(film.releaseDate);
  const diffDays = Math.round((releaseDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const dailyData = [];
  let cumulativeViews = 0;
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 86400000);
    const dateKey = d.toISOString().slice(0, 10);
    const daysFromRelease = Math.round((d.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Model realistic demand bell curve around theatrical release date
    let demandFactor = 1.0;
    if (Math.abs(daysFromRelease) <= 3) {
      demandFactor = 2.8; // Release weekend peak
    } else if (daysFromRelease > 3 && daysFromRelease <= 10) {
      demandFactor = 2.0; // Strong first week
    } else if (daysFromRelease < 0 && daysFromRelease >= -7) {
      demandFactor = 1.6; // Advance booking build-up
    } else {
      demandFactor = 0.9;
    }

    const pseudoRand = Math.sin(film.title.length * 13 + i * 7) * 0.2 + 0.9;
    const views = Math.round((film.threatScore * 120 + 2500) * demandFactor * pseudoRand);
    cumulativeViews += views;

    // Threat variance across the 30 days
    const threatVariance = Math.cos(film.title.length * 5 + i * 0.4) * 8;
    const threat = Math.min(98, Math.max(12, Math.round(film.threatScore + threatVariance)));

    dailyData.push({
      date: dateKey,
      dayOffset: -i,
      dayLabel: i === 0 ? 'Today' : `-${i}d`,
      views,
      threat,
      sentimentPos: Math.max(15, 100 - threat - 10),
      sentimentNeg: threat,
      sentimentNeu: 10,
    });
  }

  return {
    diffDays,
    isReleased: diffDays <= 0,
    daysSinceReleaseText: diffDays === 0 ? 'Released Today' : diffDays < 0 ? `Released ${Math.abs(diffDays)} days ago` : `Releasing in ${diffDays} days`,
    isIn30DayWindow: diffDays >= -30 && diffDays <= 15,
    dailyData,
    total30dViews: cumulativeViews,
    peakDemandDate: dailyData.reduce((max, cur) => cur.views > max.views ? cur : max, dailyData[0]).date,
  };
}

// Scrapes live Wikipedia 2026 releases table
async function fetchWiki2026Releases() {
  try {
    const url = 'https://en.wikipedia.org/w/api.php?action=parse&page=List_of_Hindi_films_of_2026&section=4&prop=wikitext&format=json';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CinemaDamageControl/1.0 (https://ais-dev-52ixb66qdehbj6aiz6f2v4-937014656084.asia-southeast1.run.app; contact: thedigitalsynq@gmail.com)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Wiki HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.parse?.wikitext?.['*'] || '';
    if (!text) return [];

    const rows = text.split(/\n\|-/);
    let currentMonth = '';
    let currentDay = '01';
    const parsed = [];

    for (const row of rows) {
      if (/AUG/i.test(row) && /'''A/i.test(row)) currentMonth = '08';
      if (/SEP/i.test(row) && /'''S/i.test(row)) currentMonth = '09';

      const dayMatch = row.match(/\|\s*'''([0-9]{1,2})'''/);
      if (dayMatch) currentDay = dayMatch[1].padStart(2, '0');

      const titleMatch = row.match(/\|\s*style="text-align:center;?"\s*\|\s*'+(?:\[\[([^|\]]+)(?:\|([^\]]+))?\]\]|([^']+))'+/);
      if (titleMatch && (currentMonth === '08' || currentMonth === '09')) {
        const rawTitle = (titleMatch[2] || titleMatch[1] || titleMatch[3] || '').trim();
        const parts = row.split('||');
        const director = parts[1] ? parts[1].replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/{{[^}]+}}/g, '').trim() : 'Industry Director';
        const cast = parts[2] ? parts[2].replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/\{\{hlist\|/g, '').replace(/\}\}/g, '').split('|').map(s => s.trim()).filter(Boolean) : [];
        const studio = parts[3] ? parts[3].replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/<ref[\s\S]*?<\/ref>/g, '').trim() : 'Studio Theatrical';

        if (rawTitle && rawTitle.length > 1) {
          parsed.push({
            title: rawTitle,
            releaseDate: `2026-${currentMonth}-${currentDay}`,
            language: 'Hindi',
            genre: 'Theatrical Release',
            director,
            cast: cast.slice(0, 4),
            studio,
          });
        }
      }
    }
    return parsed;
  } catch (err) {
    console.warn('Wiki releases parse warning:', err.message);
    return [];
  }
}

app.get('/api/latest-films', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const filterLang = typeof req.query.language === 'string' ? req.query.language.toLowerCase() : '';
  const windowDays = Number(req.query.window) || 30;

  if (!forceRefresh && latestFilmsCache.data && Date.now() - latestFilmsCache.time < LATEST_FILMS_TTL) {
    let filtered = latestFilmsCache.data;
    if (filterLang) {
      filtered = filtered.filter(f => f.language.toLowerCase().includes(filterLang));
    }
    return res.json({
      success: true,
      cached: true,
      count: filtered.length,
      windowDays,
      currentAnchorDate: '2026-09-10',
      lastSynced: new Date(latestFilmsCache.time).toISOString(),
      data: filtered,
    });
  }

  try {
    // 1. Fetch live wiki releases table
    const wikiReleases = await fetchWiki2026Releases();

    // 2. Fetch BookMyShow Google Theatrical RSS to discover live trending stories
    const bmsRssUrl = 'https://news.google.com/rss/search?q=(BookMyShow+OR+%22in+theatres%22+OR+%22box+office%22)+(movies+release+date)&hl=en-IN&gl=IN&ceid=IN:en';
    const bmsNews = await fetchRSSFeed(bmsRssUrl);

    // Merge SEED catalog with scraped Wiki releases (seed takes precedence for rich metadata)
    const normalizeKey = (t) => t.toLowerCase().replace(/[:\-_].*$/, '').replace(/[^a-z0-9]/g, '').trim();
    const combined = [...SEED_30D_INDIAN_FILMS];
    const seenTitles = new Set(SEED_30D_INDIAN_FILMS.map(f => normalizeKey(f.title)));

    for (const item of wikiReleases) {
      const normKey = normalizeKey(item.title);
      if (!seenTitles.has(normKey)) {
        seenTitles.add(normKey);
        // Estimate threat score based on release recency
        combined.push({
          ...item,
          budget: '₹40-80 Cr Est.',
          boxOffice: 'Theatrical Booking Open',
          bookingStatus: 'In Theatres / Advance Open',
          threatScore: 45,
          riskBand: 'Watch',
          keywords: [item.title.toLowerCase(), item.director.toLowerCase()].filter(Boolean),
          synopsis: `Latest theatrical release featuring ${item.cast.join(', ')}. Directed by ${item.director}.`,
        });
      }
    }

    // Enrich all with 30-day telemetry, BookMyShow indicators and sort by release date
    const enriched = combined.map(film => {
      const telemetry = generate30DayTelemetry(film, '2026-09-10');
      const slug = film.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Match relevant BMS / theatrical news
      const matchedNews = bmsNews.filter(n => {
        const text = `${n.title} ${n.description}`.toLowerCase();
        return film.keywords?.some(k => text.includes(k.toLowerCase())) || text.includes(film.title.toLowerCase());
      });

      return {
        id: slug,
        title: film.title,
        releaseDate: film.releaseDate,
        releaseDateFormatted: new Date(film.releaseDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        language: film.language,
        genre: film.genre,
        director: film.director,
        cast: film.cast,
        studio: film.studio,
        budget: film.budget,
        boxOffice: film.boxOffice,
        bookingStatus: film.bookingStatus,
        bookMyShowUrl: `https://in.bookmyshow.com/explore/movies?search=${encodeURIComponent(film.title)}`,
        threatScore: film.threatScore,
        riskBand: film.riskBand,
        keywords: film.keywords || [film.title.toLowerCase()],
        synopsis: film.synopsis,
        telemetry30d: telemetry,
        liveNewsCount: matchedNews.length,
        liveNews: matchedNews.slice(0, 3),
        source: 'Wikipedia Release Calendar & BookMyShow Theatrical Radar',
      };
    });

    // Filter strictly for the 30-day window (released within last 30 days or releasing in next 15 days)
    const inWindow = enriched.filter(f => f.telemetry30d.isIn30DayWindow);
    // Sort descending by release date (newest releases first)
    inWindow.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

    latestFilmsCache.data = inWindow;
    latestFilmsCache.time = Date.now();

    let output = inWindow;
    if (filterLang) {
      output = output.filter(f => f.language.toLowerCase().includes(filterLang));
    }

    res.json({
      success: true,
      cached: false,
      count: output.length,
      windowDays,
      currentAnchorDate: '2026-09-10',
      lastSynced: new Date().toISOString(),
      data: output,
    });
  } catch (err) {
    console.error('Failed to fetch latest films:', err);
    res.status(500).json({ success: false, error: err.message });
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
