import { useState, useEffect, useCallback, useRef } from 'react';
import { GIcon } from './GIcon';
import { api } from '../data/apiService';
import type { VideoItem, WikiRevision } from '../data/apiService';
import { useProject } from './ProjectContext';
import { useToast } from './Toaster';

export function LiveIntelStream() {
  const { project } = useProject();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'videos' | 'wikipedia' | 'audience'>('videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [wikiData, setWikiData] = useState<{
    article?: string;
    revisions: WikiRevision[];
    hasRecentEditWar?: boolean;
    lastUpdated?: string;
  }>({ revisions: [] });
  const [audienceData, setAudienceData] = useState<{
    days: { date: string; views: number }[];
    total: number;
  }>({ days: [], total: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(60); // seconds
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound generator for radar blip
  const playRadarPing = useCallback(() => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15); // Drop to A4
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [audioEnabled]);

  const loadAllData = useCallback(async (isManual = false) => {
    setIsLoading(true);
    try {
      const topicStr = project.keywords ? project.keywords.join(',') : project.title;
      const cleanTitle = project.title;

      const [vidRes, revRes, intRes] = await Promise.all([
        api.getVideos(topicStr),
        api.getRevisions(cleanTitle),
        api.getInterest(cleanTitle),
      ]);

      if (vidRes.success && vidRes.data.length > 0) {
        setVideos(vidRes.data);
      }
      if (revRes.success && revRes.revisions) {
        setWikiData({
          article: revRes.article,
          revisions: revRes.revisions,
          hasRecentEditWar: revRes.hasRecentEditWar,
          lastUpdated: revRes.lastUpdated,
        });
      }
      if (intRes.success && intRes.days) {
        setAudienceData({
          days: intRes.days,
          total: intRes.total || 0,
        });
      }

      setSecondsAgo(0);
      if (isManual) {
        toast('Live feeds synchronized with real-time sources', 'success');
        playRadarPing();
      }
    } catch {
      if (isManual) toast('Live sync timed out — retrying on schedule', 'warn');
    } finally {
      setIsLoading(false);
    }
  }, [project, playRadarPing, toast]);

  // Initial load & when project changes
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Interval timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      loadAllData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, loadAllData]);

  // Seconds counter
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#0c0e15] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
      {/* Top Header & Realtime Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <GIcon name="radar" size={22} className={isLoading ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue-400">Live Telemetry Feeds</span>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                STREAMING
              </span>
            </div>
            <h3 className="text-[19px] font-bold text-white">External Public Signals Radar</h3>
          </div>
        </div>

        {/* Live Controls: Cadence, Refresh, Audio */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Ping Toggle */}
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) {
                toast('Command Center Audio Ping activated', 'info');
                playRadarPing();
              }
            }}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition ${
              audioEnabled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
            title="Play acoustic radar blip on high threats"
          >
            <GIcon name={audioEnabled ? 'volume_up' : 'volume_off'} size={15} />
            Audio Radar
          </button>

          {/* Cadence Dropdown */}
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-[12px]">
            {[
              { label: '30s', val: 30 },
              { label: '1m', val: 60 },
              { label: '5m', val: 300 },
            ].map((c) => (
              <button
                key={c.val}
                onClick={() => setAutoRefreshInterval(c.val)}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  autoRefreshInterval === c.val ? 'bg-white/20 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            className="flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-lg transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
          >
            <GIcon name="sync" size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Syncing...' : 'Sync Live'}
          </button>
        </div>
      </div>

      {/* Verified Data Sources Banner */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <GIcon name="check_circle" size={13} className="text-emerald-400" />
            Google News RSS (Real-time)
          </span>
          <span className="flex items-center gap-1">
            <GIcon name="check_circle" size={13} className="text-emerald-400" />
            Wikimedia Official REST API (Wikipedia Pageviews)
          </span>
          <span className="flex items-center gap-1">
            <GIcon name="check_circle" size={13} className="text-emerald-400" />
            YouTube Media Feed (Live Reactions & Reviews)
          </span>
        </div>
        <div className="tabular-nums text-zinc-500">
          Last polled: <span className="font-semibold text-zinc-300">{secondsAgo}s ago</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="mt-5 flex border-b border-white/8">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-2.5 text-[13px] font-semibold transition ${
            activeTab === 'videos'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <GIcon name="smart_display" size={16} className="text-red-400" />
          YouTube Influencers & Reviews ({videos.length})
        </button>

        <button
          onClick={() => setActiveTab('wikipedia')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-2.5 text-[13px] font-semibold transition ${
            activeTab === 'wikipedia'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <GIcon name="history_edu" size={16} className="text-amber-400" />
          Wikipedia Edit War & Vandalism Guard
          {wikiData.hasRecentEditWar && (
            <span className="rounded-full bg-red-500/20 px-1.5 py-0.2 text-[10px] font-bold text-red-300">
              DISPUTE
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audience')}
          className={`flex items-center gap-2 border-b-2 px-4 pb-2.5 text-[13px] font-semibold transition ${
            activeTab === 'audience'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <GIcon name="show_chart" size={16} className="text-emerald-400" />
          30-Day Audience Demand Curve ({audienceData.total.toLocaleString()} Views)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {/* 1. YouTube & Influencers */}
        {activeTab === 'videos' && (
          <div className="space-y-2.5">
            {videos.length === 0 && (
              <div className="py-8 text-center text-[13px] text-zinc-400">
                {isLoading ? 'Scanning YouTube public feeds...' : 'No external video feeds currently cached for this title.'}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {videos.slice(0, 8).map((vid, idx) => (
                <div
                  key={idx}
                  className="group relative flex flex-col justify-between rounded-xl border border-white/8 bg-[#141620] p-3.5 transition hover:border-white/20 hover:bg-[#1a1e2d]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-red-400">
                        <GIcon name="play_circle" size={14} />
                        {vid.source || 'YouTube'}
                      </span>
                      {vid.hasControversy ? (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                          CONTROVERSY / NOTICE
                        </span>
                      ) : vid.isReview ? (
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                          AUDIENCE VERDICT
                        </span>
                      ) : (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                          OFFICIAL / EVENT
                        </span>
                      )}
                    </div>
                    <a
                      href={vid.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block text-[13px] font-semibold text-white transition hover:text-blue-300 line-clamp-2"
                    >
                      {vid.title}
                    </a>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{vid.pubDate ? new Date(vid.pubDate).toLocaleDateString() : 'Recent'}</span>
                    <a
                      href={vid.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium text-blue-400 hover:underline"
                    >
                      Watch Source
                      <GIcon name="open_in_new" size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Wikipedia Edit War Guard */}
        {activeTab === 'wikipedia' && (
          <div>
            <div className="mb-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[12px] text-zinc-300">
              <div className="flex items-center gap-2">
                <GIcon name="verified" size={16} className="text-blue-400" />
                <span>
                  Tracking article: <strong className="text-white">{wikiData.article || project.title}</strong>
                </span>
              </div>
              <span className="text-zinc-500">Direct Wikimedia Query API</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Editor</th>
                    <th className="pb-2">Revision Summary / Edit Note</th>
                    <th className="pb-2 text-right">Delta</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {wikiData.revisions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500">
                        {isLoading ? 'Fetching Wikipedia revision tree...' : 'No revisions found.'}
                      </td>
                    </tr>
                  ) : (
                    wikiData.revisions.map((rev, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 text-zinc-400 whitespace-nowrap">
                          {new Date(rev.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 font-medium text-blue-300 whitespace-nowrap">{rev.user}</td>
                        <td className="py-2.5 text-zinc-300 max-w-md truncate">{rev.comment}</td>
                        <td className={`py-2.5 text-right font-mono font-bold tabular-nums ${rev.delta > 0 ? 'text-emerald-400' : rev.delta < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {rev.delta > 0 ? `+${rev.delta}` : rev.delta} B
                        </td>
                        <td className="py-2.5 text-right">
                          {rev.isControversial ? (
                            <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                              CONTESTED
                            </span>
                          ) : (
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              PASS
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. 30-Day Audience Demand Curve */}
        {activeTab === 'audience' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider">30-Day Pageviews</span>
                <div className="text-[22px] font-bold text-white">{audienceData.total.toLocaleString()} Organic Searches</div>
              </div>
              <div className="text-right text-[11px] text-zinc-400">
                Data source: <span className="font-semibold text-emerald-400">Wikimedia REST API</span>
              </div>
            </div>

            {/* Sparkline / Bar Graph */}
            {audienceData.days.length > 0 ? (
              <div className="mt-2">
                <div className="flex h-36 items-end gap-1.5 rounded-xl border border-white/5 bg-[#141620] p-4">
                  {(() => {
                    const max = Math.max(...audienceData.days.map((d) => d.views), 1);
                    return audienceData.days.map((d, idx) => {
                      const pct = Math.round((d.views / max) * 100);
                      return (
                        <div
                          key={idx}
                          className="group relative flex-1 flex flex-col items-center justify-end h-full"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 hidden group-hover:block z-20 rounded bg-black/90 px-2 py-1 text-[10px] text-white shadow whitespace-nowrap">
                            {d.date}: {d.views.toLocaleString()} views
                          </div>
                          <div
                            style={{ height: `${Math.max(6, pct)}%` }}
                            className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-emerald-400 transition-all group-hover:from-blue-400 group-hover:to-emerald-300"
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
                  <span>{audienceData.days[0]?.date}</span>
                  <span>Wikimedia Daily Activity (Last 30 Days)</span>
                  <span>{audienceData.days[audienceData.days.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[13px] text-zinc-400">
                {isLoading ? 'Querying Wikimedia server metrics...' : 'No daily pageview timeline available for this title.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
