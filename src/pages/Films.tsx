import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GIcon } from '../components/GIcon';
import { clsx } from 'clsx';
import { films, damageBand, bandStyles, liveScoreOf } from '../data/damage';
import { api, type LatestFilmItem } from '../data/apiService';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useToast } from '../components/Toaster';
import { ThirtyDaySparkline } from '../components/ThirtyDaySparkline';

type ViewTab = 'latest30d' | 'inTheatres' | 'releasingSoon' | 'trackedProjects' | 'modelled';

export function Films() {
  const navigate = useNavigate();
  const toast = useToast();
  const { projects, project, setActiveId, trackFilm, removeProject } = useProject();
  const { stats, isLive } = useLiveData(project.keywords.join(','));
  const liveNeg = isLive && stats ? stats.negPct : undefined;

  // 30-day latest Indian movies state
  const [latestFilms, setLatestFilms] = useState<LatestFilmItem[]>([]);
  const [loadingLatest, setLoadingLatest] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ViewTab>('latest30d');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live story counts per tracked project
  const [counts, setCounts] = useState<Record<string, { n: number; live: boolean }>>({});

  // Manual sync for 30-day latest Indian movies from /api/latest-films
  const refreshLatestFilms = async () => {
    setSyncing(true);
    try {
      const res = await api.getLatestFilms({ refresh: true, window: 30 });
      if (res.success && res.data) {
        setLatestFilms(res.data);
        setLastSynced(res.lastSynced || new Date().toISOString());
        toast(`Synced ${res.count} latest Indian films with BookMyShow & 30-day theatrical calendar!`, 'success');
      } else {
        toast('Unable to refresh latest films; displaying cached telemetry', 'warn');
      }
    } catch {
      toast('Network error refreshing 30-day movie radar', 'warn');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getLatestFilms({ refresh: false, window: 30 });
        if (cancelled) return;
        if (res.success && res.data) {
          setLatestFilms(res.data);
          setLastSynced(res.lastSynced || new Date().toISOString());
        }
      } catch {
        /* fallback handled gracefully */
      } finally {
        if (!cancelled) setLoadingLatest(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.getNews(p.keywords.join(','));
            return [p.id, { n: res.success ? res.count : 0, live: res.success && res.count > 0 }] as const;
          } catch {
            return [p.id, { n: 0, live: false }] as const;
          }
        })
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const selectProject = (id: string, title: string) => {
    setActiveId(id);
    navigate('/');
    toast(`Dashboard now tracking ${title} — all panels re-anchored`, 'success');
  };

  const handleTrackInWarRoom = (film: LatestFilmItem) => {
    trackFilm({
      id: film.id,
      title: film.title,
      subtitle: `${film.language} · ${film.director} · BookMyShow 30D Radar`,
      keywords: film.keywords && film.keywords.length > 0 ? film.keywords : [film.title.toLowerCase()],
    });
    navigate('/');
    toast(`War Room switched to ${film.title}! Live D3 telemetry & feeds re-anchored.`, 'success');
  };

  // Filtered latest films
  const filteredLatest = useMemo(() => {
    return latestFilms.filter((f) => {
      // Tab filter
      if (activeTab === 'inTheatres' && !f.telemetry30d.isReleased) return false;
      if (activeTab === 'releasingSoon' && f.telemetry30d.isReleased) return false;

      // Language filter
      if (languageFilter !== 'all') {
        if (!f.language.toLowerCase().includes(languageFilter.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = f.title.toLowerCase().includes(q);
        const inDirector = f.director.toLowerCase().includes(q);
        const inCast = f.cast.some((c) => c.toLowerCase().includes(q));
        if (!inTitle && !inDirector && !inCast) return false;
      }

      return true;
    });
  }, [latestFilms, activeTab, languageFilter, searchQuery]);

  // Statistics for summary badges
  const stats30d = useMemo(() => {
    const inTheatresCount = latestFilms.filter((f) => f.telemetry30d.isReleased).length;
    const advanceCount = latestFilms.filter((f) => !f.telemetry30d.isReleased).length;
    const total30dAudience = latestFilms.reduce((acc, f) => acc + (f.telemetry30d.total30dViews || 0), 0);
    return { inTheatresCount, advanceCount, total30dAudience };
  }, [latestFilms]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header with 30-Day Theatrical Radar Banner */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#30d158] animate-pulse" />
              <p className="text-[12px] font-semibold tracking-wider text-[#64a8ff] uppercase">
                Indian Theatrical Radar · 30-Day Live Window
              </p>
            </div>
            <h1 className="apple-title mt-1">Films & Theatrical Sync</h1>
            <p className="apple-subhead mt-1">
              Synchronized 30-day window (Aug 11 – Sep 10, 2026) for latest Indian releases across BookMyShow, Wikipedia & box office signals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastSynced && (
              <span className="text-[11px] text-war-text-muted hidden sm:inline">
                Synced {new Date(lastSynced).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => refreshLatestFilms()}
              disabled={syncing}
              className="apple-button flex items-center gap-2 border border-white/10 bg-white/[0.05] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.1] hover:border-white/20 active:scale-95 disabled:opacity-50"
              title="Sync latest movie releases from BookMyShow and Wikipedia"
            >
              <GIcon name="sync" size={15} className={clsx(syncing && 'animate-spin text-[#64a8ff]')} />
              <span>{syncing ? 'Syncing BMS & Calendar…' : 'Sync 30-Day Radar'}</span>
            </button>
          </div>
        </div>

        {/* 30-Day Summary Ribbon */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[11px] font-medium text-war-text-muted uppercase tracking-wider">30-Day Window Window</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[20px] font-bold tabular-nums text-white">Aug 11 – Sep 10</span>
              <span className="text-[11px] text-[#30d158] font-medium">30 Days</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[11px] font-medium text-war-text-muted uppercase tracking-wider">In Theatres Now</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[20px] font-bold tabular-nums text-white">{stats30d.inTheatresCount}</span>
              <span className="text-[11px] text-war-text-muted">releases</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[11px] font-medium text-war-text-muted uppercase tracking-wider">BookMyShow Advance</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[20px] font-bold tabular-nums text-[#64a8ff]">{stats30d.advanceCount}</span>
              <span className="text-[11px] text-war-text-muted">upcoming</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[11px] font-medium text-war-text-muted uppercase tracking-wider">30D Audience Curiosity</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[20px] font-bold tabular-nums text-[#ffd60a]">
                {(stats30d.total30dAudience / 1000).toFixed(0)}k
              </span>
              <span className="text-[11px] text-war-text-muted">queries</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Search Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Main Tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('latest30d')}
              className={clsx(
                'rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition',
                activeTab === 'latest30d'
                  ? 'bg-[#0a84ff] text-white shadow-sm'
                  : 'text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
              )}
            >
              Latest Indian Releases (30-Day Window)
            </button>
            <button
              onClick={() => setActiveTab('inTheatres')}
              className={clsx(
                'rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition',
                activeTab === 'inTheatres'
                  ? 'bg-[#0a84ff] text-white shadow-sm'
                  : 'text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
              )}
            >
              In Theatres Now
            </button>
            <button
              onClick={() => setActiveTab('releasingSoon')}
              className={clsx(
                'rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition',
                activeTab === 'releasingSoon'
                  ? 'bg-[#0a84ff] text-white shadow-sm'
                  : 'text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
              )}
            >
              Releasing This Week / Advance
            </button>
            <button
              onClick={() => setActiveTab('trackedProjects')}
              className={clsx(
                'rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition',
                activeTab === 'trackedProjects'
                  ? 'bg-[#0a84ff] text-white shadow-sm'
                  : 'text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
              )}
            >
              Tracked Projects ({projects.length})
            </button>
          </div>

          {/* Search & Language Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, cast…"
                className="w-40 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] text-white placeholder-war-text-muted focus:border-[#0a84ff] focus:outline-none sm:w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-war-text-muted hover:text-white"
                >
                  <GIcon name="close" size={12} />
                </button>
              )}
            </div>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#1c1c1e] px-2.5 py-1.5 text-[12px] text-white focus:border-[#0a84ff] focus:outline-none"
            >
              <option value="all">All Languages</option>
              <option value="hindi">Hindi</option>
              <option value="telugu">Telugu</option>
              <option value="tamil">Tamil</option>
              <option value="kannada">Kannada</option>
            </select>
          </div>
        </div>

        {/* TAB 1: 30-Day Latest Indian Releases / In Theatres / Advance */}
        {activeTab !== 'trackedProjects' && (
          <div>
            {loadingLatest ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="h-64 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.03]" />
                ))}
              </div>
            ) : filteredLatest.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
                <GIcon name="movie" size={32} className="mx-auto text-war-text-muted opacity-40" />
                <p className="mt-2 text-[15px] font-semibold text-white">No Indian movies matched the 30-day filter</p>
                <p className="mt-1 text-[13px] text-war-text-muted">Try changing language or clearing search keywords.</p>
                <button
                  onClick={() => {
                    setLanguageFilter('all');
                    setSearchQuery('');
                  }}
                  className="apple-button mt-4 bg-[#0a84ff] px-4 py-2 text-[13px] text-white"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2 xl:grid-cols-3">
                {filteredLatest.map((film) => {
                  const isTracked = projects.some(
                    (p) => p.id === film.id || p.title.toLowerCase() === film.title.toLowerCase()
                  );
                  const isReleased = film.telemetry30d.isReleased;
                  const band = film.riskBand;

                  return (
                    <div
                      key={film.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-lg transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.05]"
                    >
                      <div>
                        {/* Top Badge Ribbon */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={clsx(
                                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
                                isReleased
                                  ? 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'
                                  : 'bg-[#0a84ff]/15 text-[#64a8ff] border border-[#0a84ff]/30'
                              )}
                            >
                              {film.telemetry30d.daysSinceReleaseText}
                            </span>
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-war-text-muted">
                              {film.language}
                            </span>
                          </div>

                          <div className="text-right">
                            <span
                              className={clsx(
                                'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                                bandStyles[band]
                              )}
                            >
                              {band}
                            </span>
                          </div>
                        </div>

                        {/* Title & Credits */}
                        <div className="mt-3">
                          <h3 className="text-[18px] font-bold tracking-tight text-white group-hover:text-[#64a8ff] transition-colors">
                            {film.title}
                          </h3>
                          <p className="mt-0.5 text-[12px] text-war-text-muted">
                            Dir. {film.director} · {film.genre}
                          </p>
                          {film.cast && film.cast.length > 0 && (
                            <p className="mt-1 text-[11px] text-war-text-secondary line-clamp-1">
                              Starring: {film.cast.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </div>

                        {/* BookMyShow Live Booking Status Indicator */}
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
                          <GIcon name="confirmation_number" size={14} className="shrink-0 text-[#ff2d55]" />
                          <span className="truncate text-[12px] font-medium text-white/90">
                            {film.bookingStatus}
                          </span>
                        </div>

                        {/* 30-Day Demand & Threat Sparkline */}
                        <div className="mt-3.5">
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="font-medium text-war-text-muted">30-Day Theatrical Velocity</span>
                            <span className="text-[11px] tabular-nums text-war-text-secondary">
                              Peak: {film.telemetry30d.peakDemandDate}
                            </span>
                          </div>
                          <div className="rounded-xl border border-white/[0.05] bg-black/40 p-2">
                            <ThirtyDaySparkline
                              data={film.telemetry30d.dailyData}
                              color={film.threatScore > 65 ? '#ff453a' : film.threatScore > 45 ? '#ff9f0a' : '#0a84ff'}
                              height={38}
                            />
                          </div>
                        </div>

                        {/* 30-Day Key Metrics Grid */}
                        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-center">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-war-text-muted">Box Office</span>
                            <div className="mt-0.5 truncate text-[12px] font-semibold text-white">
                              {film.boxOffice.split(' ')[0]} {film.boxOffice.split(' ')[1] || ''}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-war-text-muted">30D Curiosity</span>
                            <div className="mt-0.5 text-[12px] font-semibold tabular-nums text-[#64a8ff]">
                              {(film.telemetry30d.total30dViews / 1000).toFixed(1)}k views
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-war-text-muted">Threat Index</span>
                            <div className="mt-0.5 text-[12px] font-bold tabular-nums text-white">
                              {film.threatScore}<span className="text-[10px] text-war-text-muted">/100</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                        <button
                          onClick={() => handleTrackInWarRoom(film)}
                          className={clsx(
                            'flex-1 apple-button py-2 text-[12px] font-semibold transition',
                            isTracked
                              ? 'bg-white/[0.08] text-[#64a8ff] hover:bg-white/[0.14]'
                              : 'bg-[#0a84ff] text-white hover:bg-[#409cff]'
                          )}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <GIcon name="radar" size={13} />
                            <span>{isTracked ? 'Active in Room' : 'Track in War Room'}</span>
                          </span>
                        </button>

                        <button
                          onClick={() => navigate(`/film/${film.id}`)}
                          className="apple-button border border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-medium text-white hover:bg-white/[0.1] hover:border-white/20"
                          title="Open 30-day deep telemetry intelligence"
                        >
                          <span className="flex items-center gap-1">
                            <span>30D Intel</span>
                            <GIcon name="arrow_forward" size={13} />
                          </span>
                        </button>

                        <a
                          href={film.bookMyShowUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-war-text-muted transition hover:bg-[#ff2d55]/20 hover:text-[#ff2d55] hover:border-[#ff2d55]/40"
                          title="View on BookMyShow"
                        >
                          <GIcon name="confirmation_number" size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Tracked War Room Projects & Modelled Films */}
        {activeTab === 'trackedProjects' && (
          <div className="space-y-6">
            <div className="glass-panel p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[17px] font-bold text-white">Active War Room Tracking</h2>
                  <p className="text-[12px] text-war-text-muted">
                    Switch the command room anchor to any of these films. All real-time news, D3 threat telemetry, and risk metrics adapt instantly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {projects.map((p) => {
                  const c = counts[p.id];
                  const active = p.id === project.id;
                  return (
                    <div
                      key={p.id}
                      className={clsx(
                        'rounded-2xl border p-4.5 transition-all',
                        active
                          ? 'border-[#0a84ff]/60 bg-[#0a84ff]/[0.09] shadow-lg shadow-[#0a84ff]/10'
                          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[16px] font-bold tracking-tight text-white">{p.title}</span>
                            {active && <GIcon name="check_circle" size={15} className="shrink-0 text-[#64a8ff]" />}
                          </div>
                          <div className="mt-1 truncate text-[12px] text-war-text-muted">
                            {p.subtitle} · {p.keywords.join(', ')}
                          </div>
                        </div>
                        {projects.length > 1 && (
                          <button
                            onClick={() => {
                              removeProject(p.id);
                              toast(`${p.title} removed from tracking`, 'info');
                            }}
                            aria-label={`Remove ${p.title}`}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-war-text-muted transition hover:bg-[#ff453a]/20 hover:text-[#ff6961]"
                          >
                            <GIcon name="close" size={12} />
                          </button>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                        <span className="text-[12px] tabular-nums text-war-text-secondary">
                          {c ? (c.live ? `${c.n} live stories detected` : 'Feed quiet') : 'Checking feed…'}
                        </span>
                        {!active ? (
                          <button
                            onClick={() => selectProject(p.id, p.title)}
                            className="apple-button bg-[#0a84ff] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#409cff]"
                          >
                            Anchor Room
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-[#64a8ff]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#64a8ff] animate-ping" />
                            Tracking Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modelled Films Catalog */}
            <div className="glass-panel p-5">
              <h2 className="text-[16px] font-bold text-white mb-3">Studio Catalog & Modelled Reference Films</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {films.map((f) => {
                  const score = liveScoreOf(f, f.id === 'toxic' ? liveNeg : undefined);
                  const band = damageBand(score);
                  return (
                    <button
                      key={f.id}
                      onClick={() => navigate(`/film/${f.id}`)}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition hover:border-white/[0.18] hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[16px] font-bold text-white">{f.title}</h3>
                          <p className="mt-0.5 text-[12px] text-war-text-muted">
                            {f.language} · {f.genre} · {f.releaseDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[22px] font-bold text-white">
                            {score}
                            <span className="text-[12px] text-war-text-muted">/100</span>
                          </div>
                          <span className={clsx('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold', bandStyles[band])}>
                            {band}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-war-text-muted">
                        <span>{f.status}</span>
                        <span className="text-[#64a8ff]">View diagnostics →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
