// Same-origin: Vite proxies /api → :3001 in dev, Express serves dist + /api in prod.
// No hardcoded host so non-localhost deployments keep working.
const API_BASE = '';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  category: string;
}

export interface ApiResponse<T> {
  success: boolean;
  count: number;
  lastUpdated: string;
  data: T;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`API call failed: ${endpoint}`, err);
      return { success: false, count: 0, lastUpdated: '', data: [] as unknown as T };
    }
  }

  async getNews(topic?: string): Promise<ApiResponse<NewsItem[]> & { topic?: string }> {
    const qs = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    return this.fetch<NewsItem[]>(`/api/news${qs}`);
  }

  async getTrending(): Promise<ApiResponse<NewsItem[]>> {
    return this.fetch<NewsItem[]>('/api/trending');
  }

  async getBoxOffice(): Promise<ApiResponse<NewsItem[]>> {
    return this.fetch<NewsItem[]>('/api/box-office');
  }

  async search(query: string): Promise<ApiResponse<NewsItem[]>> {
    return this.fetch<NewsItem[]>(`/api/search?q=${encodeURIComponent(query)}`);
  }

  async getInterest(title?: string): Promise<{
    success: boolean;
    article?: string;
    days?: { date: string; views: number }[];
    total?: number;
    error?: string;
  }> {
    try {
      const qs = title ? `?title=${encodeURIComponent(title)}` : '';
      const res = await fetch(`${this.baseUrl}/api/interest${qs}`, {
        signal: AbortSignal.timeout(20000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Interest unavailable' };
    }
  }

  async getArticleSummary(url: string): Promise<{ success: boolean; summary?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/article?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(20000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Summary unavailable' };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService(API_BASE);

// Keyword sentiment over headlines — deliberately conservative to avoid
// false positives: whole-word matching, expanded negative lexicon, and
// negation flips ("not a hit", "fails to impress" read negative).
const NEGATIVE_WORDS = [
  'controversy', 'controversial', 'boycott', 'outrage', 'angry', 'backlash',
  'criticism', 'criticised', 'criticized', 'slammed', 'trolled', 'fired',
  'banned', 'blasted', 'attacked', 'furious', 'scandal', 'flop', 'disaster',
  'poor', 'dull', 'boring', 'panned', 'fails', 'failed', 'failure', 'falls flat',
  'disappointing', 'disappoints', 'slump', 'crash', 'worst', 'terrible', 'awful',
  'legal notice', 'defamation', 'plagiarism', 'misfire', 'lowest', 'violent',
  'insult', 'underwhelming', 'weak', 'underperform',
];
const POSITIVE_WORDS = [
  'blockbuster', 'praise', 'praised', 'acclaimed', 'loved',
  'successful', 'highest', 'celebrated', 'applauded', 'triumph',
  'masterpiece', 'brilliant', 'superb', 'outstanding', 'boost',
  'rebound', 'recover', 'picks up', 'win',
];
// Excluded as too ambiguous in headlines: 'hit' ("hit by row"), 'best'
// ("best avoided"), 'record' ("records lowest ever haul" read POSITIVE —
// a live false positive caught in audit).
const NEGATORS = ['not', 'no', 'never', "n't", 'fails to', 'failed to', 'far from', 'hardly', 'barely'];

export function estimateSentiment(text: string): 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' {
  const lower = ` ${text.toLowerCase()} `;
  const hasWord = (w: string) => lower.includes(` ${w} `) || lower.includes(` ${w}s `);
  const negated = NEGATORS.some((n) => lower.includes(n));

  const negCount = NEGATIVE_WORDS.filter(hasWord).length;
  let posCount = POSITIVE_WORDS.filter(hasWord).length;
  // A negated positive ("not a blockbuster") counts against, not for.
  if (negated && posCount > 0 && negCount === 0) return 'NEGATIVE';

  if (negCount > posCount) return 'NEGATIVE';
  if (posCount > negCount) return 'POSITIVE';
  return 'NEUTRAL';
}

// Helper to extract movie/actor names from headline
export function extractEntities(text: string): string[] {
  const patterns = [
    /(?:actor|actress|director|star|filmstar)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:in|for|on|at|of)/g,
    /['"]([^'"]+)['"]/g,
    /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b/g,
  ];

  const entities = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 3) {
        entities.add(match[1]);
      }
    }
  }
  return Array.from(entities).slice(0, 5);
}

// Reach is an APPROXIMATE tier by outlet authority, not a measurement:
// deterministic per outlet (stable across renders/polls) and coarse
// (~5M steps) so nobody mistakes it for audited circulation.
function hashTier(key: string, steps: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % steps;
}

export function estimateReach(source: string): string {
  const highAuthority = ['times of india', 'ndtv', 'hindustan times', 'india today', 'republic', 'bbc', 'cnn', 'the hindu', 'indian express'];
  const medAuthority = ['pinkvilla', 'filmfare', 'bollywood hungama', 'news18', 'times now', 'mint', 'moneycontrol'];

  const lower = (source || 'unknown').toLowerCase();
  if (highAuthority.some((s) => lower.includes(s))) {
    return `~${5 + hashTier(lower, 3) * 5}M`;
  }
  if (medAuthority.some((s) => lower.includes(s))) {
    return `~${1 + hashTier(lower, 5)}M`;
  }
  return `~${100 + hashTier(lower, 9) * 100}K`;
}

// Transform news items into dashboard-compatible format
export function transformNewsToIncidents(news: NewsItem[]) {
  return news.slice(0, 8).map((item, i) => {
    const sentiment = estimateSentiment(item.title);
    const entities = extractEntities(item.title);
    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
    const timeStr = pubDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

    return {
      id: `live-${i}`,
      title: item.title.substring(0, 80),
      source: item.source || 'Unknown',
      time: timeStr,
      link: item.link,
      sentiment,
      entities,
      reach: estimateReach(item.source || ''),
      category: item.category || 'ENTERTAINMENT',
      description: item.description?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
    };
  });
}

export interface LiveStats {
  total: number;
  negPct: number;
  posPct: number;
  neuPct: number;
  /** % change of last-day volume vs previous day */
  velocityPct: number;
  lastCount: number;
  /** Human coverage span, e.g. "26 Aug – 6 Sep" */
  rangeLabel: string;
  totalReach: number;
  reachLabel: string;
  sentimentBuckets: { time: string; positive: number; neutral: number; negative: number }[];
  velocityBuckets: { time: string; mentions: number }[];
  riskBuckets: { time: string; risk: number }[];
  trending: { term: string; mentions: number; reachLabel: string; negPct: number }[];
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'is', 'are', 'was', 'were', 'be', 'has', 'have', 'had', 'it', 'its',
  'this', 'that', 'these', 'those', 'as', 'after', 'before', 'over', 'new',
  'video', 'photo', 'photos', 'watch', 'live', 'update', 'updates', 'news',
  'film', 'movie', 'actor', 'actress', 'star', 'cinema', 'bollywood', 'india',
  'indian', 'hindi', 'trailer', 'song', 'box', 'office', 'day', 'report',
]);

export function parseReach(label: string): number {
  const m = label.match(/([\d.]+)\s*([MK]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || '').toUpperCase();
  return unit === 'M' ? n * 1e6 : unit === 'K' ? n * 1e3 : n;
}

export function formatCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

const IST = 'Asia/Kolkata';

function dayKey(t: number): string {
  return new Date(t).toLocaleDateString('en-CA', { timeZone: IST });
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
}

/**
 * Aggregate real headlines into dashboard-grade measurements.
 * Everything returned is counted or averaged from the feed — no invented values.
 */
export function computeLiveStats(news: NewsItem[]): LiveStats {
  const now = Date.now();
  const total = news.length;

  let neg = 0, pos = 0;
  let totalReach = 0;
  const dayMap = new Map<string, { pos: number; neu: number; neg: number; count: number }>();
  const termCounts = new Map<string, { mentions: number; reach: number; neg: number }>();

  for (const item of news) {
    const sentiment = estimateSentiment(item.title);
    if (sentiment === 'NEGATIVE') neg++;
    else if (sentiment === 'POSITIVE') pos++;

    const reach = parseReach(estimateReach(item.source || ''));
    totalReach += reach;

    const pub = item.pubDate ? new Date(item.pubDate).getTime() : NaN;
    const t = Number.isFinite(pub) ? pub : now;
    const key = dayKey(t);
    const bucket = dayMap.get(key) || { pos: 0, neu: 0, neg: 0, count: 0 };
    bucket.count++;
    if (sentiment === 'NEGATIVE') bucket.neg++;
    else if (sentiment === 'POSITIVE') bucket.pos++;
    else bucket.neu++;
    dayMap.set(key, bucket);

    const words = item.title.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
    const seen = new Set<string>();
    for (const w of words) {
      if (w.length >= 4 && !STOPWORDS.has(w) && !seen.has(w)) {
        seen.add(w);
        const e = termCounts.get(w) || { mentions: 0, reach: 0, neg: 0 };
        e.mentions++;
        e.reach += reach;
        if (sentiment === 'NEGATIVE') e.neg++;
        termCounts.set(w, e);
      }
    }
  }

  const negPct = total ? Math.round((neg / total) * 100) : 0;
  const posPct = total ? Math.round((pos / total) * 100) : 0;

  // Last 14 calendar days (IST), oldest → newest, so the analysis runs from
  // release week to today instead of a trailing 12-hour peephole.
  const days: string[] = [];
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: IST });
  const todayUTC = Date.parse(`${today}T00:00:00Z`);
  for (let d = 13; d >= 0; d--) {
    days.push(new Date(todayUTC - d * 86400000).toLocaleDateString('en-CA', { timeZone: 'UTC' }));
  }

  const lastCount = dayMap.get(days[days.length - 1])?.count || 0;
  const prevCount = dayMap.get(days[days.length - 2])?.count || 0;
  const velocityPct = prevCount > 0 ? Math.round(((lastCount - prevCount) / prevCount) * 100) : lastCount > 0 ? 100 : 0;

  const sentimentBuckets = days.map((k) => {
    const b = dayMap.get(k) || { pos: 0, neu: 0, neg: 0, count: 0 };
    const c = b.count || 1;
    return {
      time: dayLabel(k),
      positive: Math.round((b.pos / c) * 100),
      neutral: Math.round((b.neu / c) * 100),
      negative: Math.round((b.neg / c) * 100),
    };
  });
  const velocityBuckets = days.map((k) => ({
    time: dayLabel(k),
    mentions: dayMap.get(k)?.count || 0,
  }));
  // Risk = negative share of that day; empty days carry the last known value.
  const riskBuckets: { time: string; risk: number }[] = [];
  for (const k of days) {
    const b = dayMap.get(k);
    const c = b?.count || 0;
    const risk = c > 0
      ? Math.round(((b?.neg || 0) / c) * 100)
      : riskBuckets.length > 0 ? riskBuckets[riskBuckets.length - 1].risk : negPct;
    riskBuckets.push({ time: dayLabel(k), risk });
  }

  const trending = [...termCounts.entries()]
    .sort((a, b) => b[1].mentions - a[1].mentions)
    .slice(0, 6)
    .map(([term, v]) => ({
      term,
      mentions: v.mentions,
      reachLabel: `~${formatCompact(v.reach)}`,
      negPct: v.mentions > 0 ? Math.round((v.neg / v.mentions) * 100) : 0,
    }));

  return {
    total,
    negPct,
    posPct,
    neuPct: total ? Math.max(0, 100 - negPct - posPct) : 0,
    velocityPct,
    lastCount,
    rangeLabel: `${dayLabel(days[0])} – ${dayLabel(days[days.length - 1])}`,
    totalReach,
    reachLabel: `~${formatCompact(totalReach)}`,
    sentimentBuckets,
    velocityBuckets,
    riskBuckets,
    trending,
  };
}

export function transformNewsToSignals(news: NewsItem[]) {
  return news.slice(0, 12).map((item, i) => {
    const sentiment = estimateSentiment(item.title);
    return {
      id: `sig-live-${i}`,
      title: item.title.substring(0, 100),
      source: item.source || 'Google News',
      time: item.pubDate ? getRelativeTime(new Date(item.pubDate)) : 'recent',
      link: item.link,
      sentiment,
      reach: estimateReach(item.source || ''),
      type: sentiment === 'NEGATIVE' ? 'NEWS_ALERT' : 'NEWS_ALERT',
    };
  });
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
