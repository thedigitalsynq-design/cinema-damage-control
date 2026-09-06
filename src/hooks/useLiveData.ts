import { useState, useEffect, useCallback } from 'react';
import { api, transformNewsToIncidents, transformNewsToSignals, computeLiveStats } from '../data/apiService';
import type { NewsItem, LiveStats } from '../data/apiService';
import { signals as mockSignals, incidents as mockIncidents } from '../data/mockData';

interface LiveDataState {
  news: NewsItem[];
  liveIncidents: any[];
  liveSignals: any[];
  stats: LiveStats | null;
  lastUpdated: string;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
}

export function useLiveData(topic?: string) {
  const [state, setState] = useState<LiveDataState>({
    news: [],
    liveIncidents: [],
    liveSignals: [],
    stats: null,
    lastUpdated: '',
    isLoading: true,
    isLive: false,
    error: null,
  });

  const fetchLiveData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const newsRes = await api.getNews(topic);

      if (newsRes.success && newsRes.data.length > 0) {
        const liveIncidents = transformNewsToIncidents(newsRes.data);
        const liveSignals = transformNewsToSignals(newsRes.data);
        const stats = computeLiveStats(newsRes.data);

        setState({
          news: newsRes.data,
          liveIncidents,
          liveSignals,
          stats,
          lastUpdated: newsRes.lastUpdated,
          isLoading: false,
          isLive: true,
          error: null,
        });
      } else {
        // Fall back to mock data — clear live state so nothing stale renders as live
        setState(prev => ({
          ...prev,
          news: [],
          stats: null,
          liveIncidents: mockIncidents.map(inc => ({
            id: inc.id,
            title: inc.title,
            source: 'Damage Control Monitor',
            time: inc.firstDetected,
            link: '',
            sentiment: 'NEGATIVE' as const,
            entities: [],
            reach: inc.reach,
            category: inc.severity,
            recommendation: inc.recommendation,
          })),
          liveSignals: mockSignals.map(sig => ({
            id: sig.id,
            title: sig.title,
            source: sig.source,
            time: sig.time,
            link: '',
            sentiment: sig.sentiment,
            reach: sig.reach,
            type: sig.type,
          })),
          isLoading: false,
          isLive: false,
          lastUpdated: new Date().toISOString(),
          error: 'Using simulated data — API unavailable',
        }));
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        news: [],
        stats: null,
        liveIncidents: mockIncidents.map(inc => ({
          id: inc.id,
          title: inc.title,
          source: 'Damage Control Monitor',
          time: inc.firstDetected,
          link: '',
          sentiment: 'NEGATIVE' as const,
          entities: [],
          reach: inc.reach,
          category: inc.severity,
          recommendation: inc.recommendation,
        })),
        liveSignals: mockSignals.map(sig => ({
          id: sig.id,
          title: sig.title,
          source: sig.source,
          time: sig.time,
          link: '',
          sentiment: sig.sentiment,
          reach: sig.reach,
          type: sig.type,
        })),
        isLoading: false,
        isLive: false,
        lastUpdated: new Date().toISOString(),
        error: 'Using simulated data — ' + (err.message || 'Connection failed'),
      }));
    }
  }, [topic]);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  return { ...state, refresh: fetchLiveData };
}
