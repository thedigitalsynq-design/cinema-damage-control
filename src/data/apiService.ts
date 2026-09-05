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

  async getNews(): Promise<ApiResponse<NewsItem[]>> {
    return this.fetch<NewsItem[]>('/api/news');
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

// Helper to extract sentiment from headline text
export function estimateSentiment(text: string): 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' {
  const lower = text.toLowerCase();
  const negativeWords = ['controversy', 'controversial', 'boycott', 'outrage', 'angry', 'backlash', 'criticism', 'slammed', 'trolled', 'fired', 'banned', 'row', 'blasted', 'attacked', 'furious', 'scandal'];
  const positiveWords = ['hit', 'blockbuster', 'praise', 'acclaimed', 'loved', 'record', 'success', 'highest', 'best', 'celebrated', 'applauded', 'triumph'];

  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  const posCount = positiveWords.filter(w => lower.includes(w)).length;

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

// Helper to estimate reach based on source authority
export function estimateReach(source: string): string {
  const highAuthority = ['times of india', 'ndtv', 'hindustan times', 'india today', 'republic', 'ndtv', 'bbc', 'cnn'];
  const medAuthority = ['bollywood life', 'pinkvilla', 'filmfare', 'komal nahta', 'taran adarsh'];

  const lower = source.toLowerCase();
  if (highAuthority.some(s => lower.includes(s))) {
    return `${(Math.random() * 15 + 5).toFixed(1)}M`;
  }
  if (medAuthority.some(s => lower.includes(s))) {
    return `${(Math.random() * 5 + 1).toFixed(1)}M`;
  }
  return `${(Math.random() * 2 + 0.1).toFixed(1)}M`;
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
