import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToActions } from '../lib/actionDispatcher';
import type { DispatchedAction } from '../lib/actionDispatcher';
import {
  api,
  computeLiveStats,
  transformStreamToSignals,
  type NewsItem,
  type LiveStats,
  type RedditPostItem,
  type TheaterHubWeather,
  type TradeDisclosureItem,
  type CurrencyRates,
  type LiveSignalItem,
} from '../data/apiService';
import type { Incident, Narrative, SocialPost, MediaStory, Influencer, LeakLink } from '../data/types';
import {
  generateLiveIncidents,
  generateLiveNarratives,
  generateLiveSocial,
  generateLiveMedia,
  generateLiveInfluencers,
  generateLiveAudience,
  generateLiveRecovery,
  generateLiveLeaks,
  applySimulationTick,
} from '../data/liveEngine';
import {
  incidents as mockIncidents,
  narratives as mockNarratives,
  socialPosts as mockSocialPosts,
  platformData as mockPlatformData,
  mediaStories as mockMediaStories,
  influencers as mockInfluencers,
  audienceSegments as mockAudienceSegments,
  geographyData as mockGeographyData,
  languageData as mockLanguageData,
  leakLinks as mockLeakLinks,
} from '../data/mockData';
import { useProject } from '../components/ProjectContext';

export interface LiveDataState {
  news: NewsItem[];
  redditPosts: RedditPostItem[];
  weatherHubs: TheaterHubWeather[];
  currencyRates: CurrencyRates;
  tradeDisclosures: TradeDisclosureItem[];
  liveIncidents: Incident[];
  liveNarratives: Narrative[];
  liveSocial: { platformData: any[]; socialPosts: SocialPost[] };
  liveMedia: { mediaStories: MediaStory[]; narrativeFlow: { stage: string; count: number; time: string }[] };
  liveInfluencers: Influencer[];
  liveAudience: { audienceSegments: any[]; geographyData: any[]; languageData: any[] };
  liveRecovery: { recoveryData: any[]; phases: any[]; recoveryMetrics: any[] };
  liveLeaks: LeakLink[];
  liveSignals: LiveSignalItem[];
  stats: LiveStats | null;
  lastUpdated: string;
  lastSyncedExact: string;
  activeStreamsCount: number;
  latencyMs: number;
  confidenceIndex: number;
  isRealtimeActive: boolean;
  secondsSinceSync: number;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  tickCount: number;
  activeScenario: 'baseline' | 'leak' | 'boycott' | 'embargo';
  simulationSpeedMs: number;
}

interface LiveDataContextType extends LiveDataState {
  refresh: () => Promise<void>;
  resolveIncident: (id: string) => void;
  takeDownLeak: (id: string, status?: 'REMOVED' | 'TAKEDOWN_SENT') => void;
  addIncident: (incident: Partial<Incident>) => void;
  addSignal: (text: string, sentiment?: 'POSITIVE' | 'NEGATIVE') => void;
  setScenario: (scenario: 'baseline' | 'leak' | 'boycott' | 'embargo') => void;
  setSimulationSpeed: (speedMs: number) => void;
}

function createBaselineStats(total = 52, pos = 38, neg = 44, neu = 18, vel = 32, reachLabel = '2.8M'): LiveStats {
  return {
    total,
    posPct: pos,
    negPct: neg,
    neuPct: neu,
    avgSentiment: pos - neg,
    velocityPct: vel,
    lastCount: 8,
    rangeLabel: '1 Sep – 11 Sep',
    totalReach: 2800000,
    reachLabel,
    sentimentBuckets: [
      { time: 'Day 1', positive: pos, neutral: neu, negative: neg },
      { time: 'Day 2', positive: pos + 2, neutral: neu, negative: neg - 2 },
    ],
    velocityBuckets: [
      { time: '00:00', mentions: 12 },
      { time: '06:00', mentions: 18 },
      { time: '12:00', mentions: 28 },
      { time: '18:00', mentions: 34 },
    ],
    riskBuckets: [
      { time: '00:00', risk: neg },
      { time: '06:00', risk: neg + 2 },
      { time: '12:00', risk: neg - 1 },
      { time: '18:00', risk: neg },
    ],
    trending: [
      { term: 'BoxOffice', mentions: 18, reachLabel: '1.2M', negPct: 20 },
      { term: 'Trailer', mentions: 14, reachLabel: '800K', negPct: 15 },
    ],
  };
}

const LiveDataContext = createContext<LiveDataContextType | null>(null);

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { project } = useProject();
  const topic = project?.keywords?.join(',') || project?.title || 'Active Project';
  const cleanTitle = project?.title || 'Active Project';

  const [state, setState] = useState<LiveDataState>({
    news: [],
    redditPosts: [],
    weatherHubs: [],
    currencyRates: { USD: 0.012, EUR: 0.011, GBP: 0.0093, AED: 0.044, SGD: 0.016, AUD: 0.018, CAD: 0.016, MYR: 0.053 },
    tradeDisclosures: [],
    liveIncidents: mockIncidents,
    liveNarratives: mockNarratives,
    liveSocial: { platformData: mockPlatformData, socialPosts: mockSocialPosts },
    liveMedia: { mediaStories: mockMediaStories, narrativeFlow: [] },
    liveInfluencers: mockInfluencers,
    liveAudience: { audienceSegments: mockAudienceSegments, geographyData: mockGeographyData, languageData: mockLanguageData },
    liveRecovery: generateLiveRecovery(null),
    liveLeaks: mockLeakLinks,
    liveSignals: [],
    stats: createBaselineStats(52, 38, 44, 18, 32, '2.8M'),
    lastUpdated: new Date().toISOString(),
    lastSyncedExact: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST',
    activeStreamsCount: 7,
    latencyMs: 180,
    confidenceIndex: 94,
    isRealtimeActive: true,
    secondsSinceSync: 0,
    isLoading: true,
    isLive: true,
    error: null,
    tickCount: 0,
    activeScenario: 'baseline',
    simulationSpeedMs: 2000,
  });

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Setup BroadcastChannel for cross-tab sync and action subscription
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('cinema_war_room_live_sync');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'SIMULATION_TICK') {
          setState((prev) => ({
            ...prev,
            ...event.data.payload,
            lastUpdated: new Date().toISOString(),
          }));
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  // Listen to synchronized actions from actionDispatcher (across tabs or components)
  useEffect(() => {
    const unsubscribe = subscribeToActions((action: DispatchedAction) => {
      if (action.type === 'RESOLVE_INCIDENT' && action.payload?.incidentId) {
        setState((prev) => ({
          ...prev,
          liveIncidents: prev.liveIncidents.map((inc) =>
            inc.id === action.payload.incidentId ? { ...inc, status: 'RESOLVED' as const } : inc
          ),
          stats: prev.stats
            ? {
                ...prev.stats,
                negPct: Math.max(8, prev.stats.negPct - 4),
                posPct: Math.min(85, prev.stats.posPct + 3),
              }
            : null,
          lastUpdated: new Date().toISOString(),
        }));
      } else if (action.type === 'TAKEDOWN_LEAK' && action.payload?.leakId) {
        setState((prev) => ({
          ...prev,
          liveLeaks: prev.liveLeaks.map((l) =>
            l.id === action.payload.leakId
              ? { ...l, status: action.payload.status || 'REMOVED', statusUpdated: 'Just now' }
              : l
          ),
          lastUpdated: new Date().toISOString(),
        }));
      } else if (action.type === 'CREATE_INCIDENT' && action.payload?.incident) {
        const raw = action.payload.incident;
        const newInc: Incident = {
          id: raw.id || `inc-user-${Date.now()}`,
          code: raw.code || `CW-RADAR-${Date.now().toString().slice(-4)}`,
          title: raw.title || 'User Discovered Threat',
          severity: raw.severity || 'HIGH',
          status: 'ACTIVE',
          firstDetected: 'Just now',
          velocity: raw.velocity || '+35% / 15m',
          reach: raw.reach || '650K',
          sentiment: raw.sentiment || -45,
          authorityScore: raw.authorityScore || 82,
          owner: raw.owner || 'War Room Desk',
          recommendation: raw.recommendation || 'Contain narrative with verified facts.',
          whatWeKnow: raw.whatWeKnow || 'Detected via incident desk.',
          whatWeDontKnow: ['Viral multiplier trajectory'],
          recommendedActions: raw.recommendedActions || ['Deploy rapid clarification', 'Monitor regional feedback'],
        };
        setState((prev) => ({
          ...prev,
          liveIncidents: [newInc, ...prev.liveIncidents.filter((i) => i.id !== newInc.id)],
          lastUpdated: new Date().toISOString(),
        }));
      } else if (action.type === 'DISPATCH_COUNTERMEASURE' || action.type === 'EXECUTE_PLAYBOOK') {
        setState((prev) => ({
          ...prev,
          stats: prev.stats
            ? {
                ...prev.stats,
                negPct: Math.max(10, prev.stats.negPct - 3),
                posPct: Math.min(85, prev.stats.posPct + 4),
                velocityPct: Math.round(prev.stats.velocityPct * 0.88),
              }
            : null,
          lastUpdated: new Date().toISOString(),
        }));
      }
    });

    return unsubscribe;
  }, []);

  const fetchLiveData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const [streamRes, scrapedRes] = await Promise.all([
        api.getLiveStream(topic),
        api.scrapeSocial(cleanTitle).catch(() => null),
      ]);

      const stream = streamRes.success ? streamRes.data : null;
      const news = stream?.news || [];
      const reddit = stream?.reddit || [];
      const videos = stream?.videos || [];
      const weather = stream?.weather || [];
      const currency = stream?.currency || { USD: 0.012, EUR: 0.011, GBP: 0.0093, AED: 0.044, SGD: 0.016, AUD: 0.018, CAD: 0.016, MYR: 0.053 };
      const trade = stream?.trade || [];

      if (news.length > 0 || reddit.length > 0 || trade.length > 0) {
        const stats = computeLiveStats(news);
        const liveIncidents = generateLiveIncidents(news, cleanTitle, true, stats, reddit, trade);
        const liveNarratives = generateLiveNarratives(news, stats, cleanTitle);
        const liveSocial = generateLiveSocial(news, stats, cleanTitle, videos, reddit, scrapedRes?.posts);
        const liveMedia = generateLiveMedia(news, cleanTitle);
        const liveInfluencers = generateLiveInfluencers(news, stats, cleanTitle);
        const liveAudience = generateLiveAudience({ title: cleanTitle }, stats);
        const liveRecovery = generateLiveRecovery(stats);
        const liveLeaks = generateLiveLeaks(cleanTitle, reddit);
        const liveSignals = stream ? transformStreamToSignals(stream) : [];

        const totalItemsCount = news.length + reddit.length + videos.length + trade.length;
        const confidenceIndex = Math.min(98, Math.max(70, Math.round(50 + totalItemsCount * 1.5)));

        setState((prev) => ({
          ...prev,
          news,
          redditPosts: reddit,
          weatherHubs: weather,
          currencyRates: currency,
          tradeDisclosures: trade,
          liveIncidents,
          liveNarratives,
          liveSocial,
          liveMedia,
          liveInfluencers,
          liveAudience,
          liveRecovery,
          liveLeaks,
          liveSignals,
          stats,
          lastUpdated: streamRes.timestamp || new Date().toISOString(),
          lastSyncedExact: streamRes.timestampIST || (new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST'),
          activeStreamsCount: streamRes.streamsCount || 7,
          latencyMs: streamRes.latencyMs || 180,
          confidenceIndex,
          isRealtimeActive: true,
          secondsSinceSync: 0,
          isLoading: false,
          isLive: true,
          error: null,
        }));
      } else {
        const stats = createBaselineStats(48, 36, 42, 22, 28, '2.4M');
        setState((prev) => ({
          ...prev,
          news: [],
          stats,
          liveIncidents: generateLiveIncidents([], cleanTitle, true, stats),
          liveNarratives: generateLiveNarratives([], stats, cleanTitle),
          liveSocial: { platformData: mockPlatformData, socialPosts: mockSocialPosts },
          liveMedia: { mediaStories: mockMediaStories, narrativeFlow: [] },
          liveInfluencers: mockInfluencers,
          liveAudience: { audienceSegments: mockAudienceSegments, geographyData: mockGeographyData, languageData: mockLanguageData },
          liveRecovery: generateLiveRecovery(stats),
          liveLeaks: mockLeakLinks,
          liveSignals: [],
          isLoading: false,
          isLive: true,
          secondsSinceSync: 0,
          lastUpdated: new Date().toISOString(),
          lastSyncedExact: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST',
          error: null,
        }));
      }
    } catch {
      const stats = createBaselineStats(44, 34, 45, 21, 24, '2.1M');
      setState((prev) => ({
        ...prev,
        news: [],
        stats,
        liveIncidents: generateLiveIncidents([], cleanTitle, true, stats),
        liveNarratives: generateLiveNarratives([], stats, cleanTitle),
        liveSocial: { platformData: mockPlatformData, socialPosts: mockSocialPosts },
        liveMedia: { mediaStories: mockMediaStories, narrativeFlow: [] },
        liveInfluencers: mockInfluencers,
        liveAudience: { audienceSegments: mockAudienceSegments, geographyData: mockGeographyData, languageData: mockLanguageData },
        liveRecovery: generateLiveRecovery(stats),
        liveLeaks: mockLeakLinks,
        liveSignals: [],
        isLoading: false,
        isLive: true,
        secondsSinceSync: 0,
        lastUpdated: new Date().toISOString(),
        lastSyncedExact: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST',
        error: null,
      }));
    }
  }, [topic, cleanTitle]);

  // 1. Initial load & 25-second auto-sync with live streams
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchLiveData();
    }, 0);
    const interval = setInterval(fetchLiveData, 25 * 1000); // 25-second live telemetry refresh
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchLiveData]);

  // 2. Real-time 1-second cadence timer for elapsed counter and clock sync (deterministic)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setState((prev) => ({
        ...prev,
        secondsSinceSync: (prev.secondsSinceSync || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  const setScenario = useCallback((scenario: 'baseline' | 'leak' | 'boycott' | 'embargo') => {
    setState((prev) => {
      const updated = applySimulationTick(
        {
          ...prev,
          activeScenario: scenario,
        },
        cleanTitle,
        scenario
      );
      return {
        ...updated,
        activeScenario: scenario,
      };
    });
  }, [cleanTitle]);

  const setSimulationSpeed = useCallback((speedMs: number) => {
    setState((prev) => ({
      ...prev,
      simulationSpeedMs: Math.max(500, Math.min(10000, speedMs)),
    }));
  }, []);

  const resolveIncident = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      liveIncidents: prev.liveIncidents.map((inc) =>
        inc.id === id ? { ...inc, status: 'RESOLVED' as const } : inc
      ),
    }));
  }, []);

  const takeDownLeak = useCallback((id: string, status: 'REMOVED' | 'TAKEDOWN_SENT' = 'REMOVED') => {
    setState((prev) => ({
      ...prev,
      liveLeaks: prev.liveLeaks.map((l) =>
        l.id === id ? { ...l, status, statusUpdated: 'Just now' } : l
      ),
    }));
  }, []);

  const addIncident = useCallback((incident: Partial<Incident>) => {
    setState((prev) => {
      const newInc: Incident = {
        id: `inc-user-${Date.now()}`,
        code: `CW-USER-${prev.liveIncidents.length + 1}`,
        title: incident.title || 'User Discovered Threat',
        severity: incident.severity || 'MEDIUM',
        status: 'ACTIVE',
        firstDetected: 'Just now',
        velocity: '+40% / 15m',
        reach: incident.reach || '500K',
        sentiment: incident.sentiment || -50,
        authorityScore: 80,
        owner: 'War Room Analyst',
        recommendation: incident.recommendation || 'Contain narrative with factual counter-brief.',
        whatWeKnow: incident.whatWeKnow || 'Issue logged via manual intervention desk.',
        whatWeDontKnow: ['Viral multiplier probability'],
        recommendedActions: ['Monitor escalation velocity', 'Issue press clarification if needed'],
      };
      return {
        ...prev,
        liveIncidents: [newInc, ...prev.liveIncidents],
      };
    });
  }, []);

  const addSignal = useCallback((text: string, sentiment: 'POSITIVE' | 'NEGATIVE' = 'NEGATIVE') => {
    setState((prev) => {
      const newSig: LiveSignalItem = {
        id: `sig-custom-${Date.now()}`,
        title: text,
        source: 'Manual Signal Injection',
        time: 'Just now',
        link: '',
        sentiment,
        reach: '850K',
        type: 'VIRAL_POST',
        platform: 'MANUAL',
        verified: true,
      };
      return {
        ...prev,
        liveSignals: [newSig, ...prev.liveSignals],
      };
    });
  }, []);

  return (
    <LiveDataContext.Provider
      value={{
        ...state,
        refresh: fetchLiveData,
        resolveIncident,
        takeDownLeak,
        addIncident,
        addSignal,
        setScenario,
        setSimulationSpeed,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
};

// eslint-disable-next-line react/only-export-components
export function useLiveDataContext(): LiveDataContextType {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error('useLiveDataContext must be used within a LiveDataProvider');
  }
  return ctx;
}
