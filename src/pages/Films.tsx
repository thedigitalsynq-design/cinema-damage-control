import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GIcon } from '../components/GIcon';
import { clsx } from 'clsx';
import {
  films,
  damageBand,
  bandStyles,
  liveScoreOf,
  createFilmDamageFromLatest,
  registerFilmDamage,
} from '../data/damage';
import { api, type LatestFilmItem } from '../data/apiService';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useToast } from '../components/Toaster';
import { ThirtyDaySparkline } from '../components/ThirtyDaySparkline';
import { FilmInspectionModal } from '../components/FilmInspectionModal';

type ReleaseStatusFilter = 'all' | 'inTheatres' | 'ott' | 'advance' | 'upcoming';
type SortOption = 'date_desc' | 'date_asc' | 'threat_desc' | 'threat_asc' | 'demand_desc' | 'title_asc';

const INDIAN_INDUSTRIES = [
  { id: 'all', label: 'All Indian Cinemas' },
  { id: 'bollywood', label: 'Bollywood (Hindi)' },
  { id: 'tollywood', label: 'Tollywood (Telugu)' },
  { id: 'kollywood', label: 'Kollywood (Tamil)' },
  { id: 'mollywood', label: 'Mollywood (Malayalam)' },
  { id: 'sandalwood', label: 'Sandalwood (Kannada)' },
  { id: 'pollywood', label: 'Pollywood (Punjabi)' },
  { id: 'marathi', label: 'Marathi Cinema' },
  { id: 'bengali', label: 'Bengali Cinema' },
  { id: 'gujarati', label: 'Gujarati Cinema' },
  { id: 'assamese', label: 'Assamese Cinema' },
  { id: 'odia', label: 'Odia Cinema' },
] as const;

export function Films() {
  const navigate = useNavigate();
  const toast = useToast();
  const { projects, project, setActiveId, trackFilm, removeProject } = useProject();
  const { stats, isLive } = useLiveData(project.keywords.join(','));
  const liveNeg = isLive && stats ? stats.negPct : undefined;

  // Dynamic catalog state from server
  const [latestFilms, setLatestFilms] = useState<LatestFilmItem[]>([]);
  const [loadingLatest, setLoadingLatest] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string>('');

  // Filters & Sorting state
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewTab, setViewTab] = useState<'catalog' | 'tracked' | 'modelled'>('catalog');

  // Inspection modal state
  const [inspectingFilm, setInspectingFilm] = useState<LatestFilmItem | null>(null);

  // Live story counts per tracked project
  const [counts, setCounts] = useState<Record<string, { n: number; live: boolean }>>({});

  // Fetch or refresh Indian movie catalog from server
  const fetchCatalog = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setSyncing(true);
    try {
      const res = await api.getLatestFilms({
        refresh: forceRefresh,
        window: 30,
        sort: sortBy,
      });
      if (res.success && res.data) {
        setLatestFilms(res.data);
        setLastSynced(res.lastSynced || new Date().toISOString());

        // Pre-register each film in the dynamic registry so all connected pages can find it
        for (const item of res.data) {
          registerFilmDamage(createFilmDamageFromLatest(item));
        }

        if (forceRefresh) {
          toast(
            `Catalog synced with Wikipedia Live Almanac & BookMyShow (${res.count} films across Indian regional industries)`,
            'success'
          );
        }
      } else {
        if (forceRefresh) toast('Retaining current verified theatrical telemetry', 'info');
      }
    } catch {
      if (forceRefresh) toast('Network error refreshing Indian cinema catalog', 'warn');
    } finally {
      if (forceRefresh) setSyncing(false);
      setLoadingLatest(false);
    }
  }, [sortBy, toast]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchCatalog(false);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchCatalog]);

  // Track story counts for active tracked projects
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

  // Synchronize movie selection across the entire website
  const handleSelectAndSynchronize = (film: LatestFilmItem, openCommandCenter = true) => {
    // 1. Convert into full FilmDamage and register in runtime registry
    const filmDamage = createFilmDamageFromLatest(film);
    registerFilmDamage(filmDamage);

    // 2. Track in ProjectContext
    trackFilm({
      id: film.id,
      title: film.title,
      subtitle: `${film.industry || film.language} · Dir. ${film.director} · Verified Theatrical Radar`,
      keywords: film.keywords && film.keywords.length > 0 ? film.keywords : [film.title.toLowerCase(), film.director.toLowerCase()],
    });

    if (openCommandCenter) {
      navigate('/');
      toast(
        `Synchronized "${film.title}" across War Room, Threat Telemetry, Regional Markets, and Damage Control!`,
        'success'
      );
    } else {
      toast(`"${film.title}" is now the active tracked project across the entire application.`, 'success');
    }
  };

  // Filtered & Sorted Indian cinema list
  const filteredFilms = useMemo(() => {
    const sorted = latestFilms
      .filter((f) => {
        // Industry filter
        if (selectedIndustry !== 'all') {
          const ind = (f.industry || '').toLowerCase();
          const target = selectedIndustry.toLowerCase();
          if (!ind.includes(target) && !f.language.toLowerCase().includes(target)) {
            // Also check mapped language
            if (target === 'bollywood' && !f.language.toLowerCase().includes('hindi')) return false;
            if (target === 'tollywood' && !f.language.toLowerCase().includes('telugu')) return false;
            if (target === 'kollywood' && !f.language.toLowerCase().includes('tamil')) return false;
            if (target === 'mollywood' && !f.language.toLowerCase().includes('malayalam')) return false;
            if (target === 'sandalwood' && !f.language.toLowerCase().includes('kannada')) return false;
            if (target === 'pollywood' && !f.language.toLowerCase().includes('punjabi')) return false;
            if (target === 'marathi' && !f.language.toLowerCase().includes('marathi')) return false;
            if (target === 'bengali' && !f.language.toLowerCase().includes('bengali')) return false;
            if (target === 'gujarati' && !f.language.toLowerCase().includes('gujarati')) return false;
            if (target === 'assamese' && !f.language.toLowerCase().includes('assamese')) return false;
            if (target === 'odia' && !f.language.toLowerCase().includes('odia')) return false;
          }
        }

        // Language filter
        if (languageFilter !== 'all') {
          const matchPrimary = f.language.toLowerCase().includes(languageFilter.toLowerCase());
          const matchSecondary = f.secondaryLanguages?.some((sl) =>
            sl.toLowerCase().includes(languageFilter.toLowerCase())
          );
          if (!matchPrimary && !matchSecondary) return false;
        }

        // Status filter
        const isOtt = (f.releaseStatus || '').toLowerCase().includes('ott') || (f.platform || '').toLowerCase().includes('ott');
        if (statusFilter === 'ott' && !isOtt) return false;
        if (statusFilter === 'inTheatres' && (isOtt || !f.telemetry30d.isReleased)) return false;
        if (statusFilter === 'advance' && (isOtt || f.telemetry30d.isReleased)) return false;
        if (statusFilter === 'upcoming') {
          const diff = f.telemetry30d.diffDays;
          if (isOtt || diff < 7) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const inTitle = f.title.toLowerCase().includes(q);
          const inOrig = (f.originalTitle || '').toLowerCase().includes(q);
          const inDirector = f.director.toLowerCase().includes(q);
          const inCast = f.cast.some((c) => c.toLowerCase().includes(q));
          const inStudio = (f.studio || '').toLowerCase().includes(q);
          const inGenre = (f.genre || '').toLowerCase().includes(q);
          if (!inTitle && !inOrig && !inDirector && !inCast && !inStudio && !inGenre) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        }
        if (sortBy === 'threat_desc') {
          return b.threatScore - a.threatScore;
        }
        if (sortBy === 'threat_asc') {
          return a.threatScore - b.threatScore;
        }
        if (sortBy === 'demand_desc') {
          return (b.telemetry30d?.total30dViews || 0) - (a.telemetry30d?.total30dViews || 0);
        }
        if (sortBy === 'title_asc') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });

    // Deduplicate by film ID strictly
    const seenIds = new Set<string>();
    return sorted.filter((f) => {
      if (seenIds.has(f.id)) return false;
      seenIds.add(f.id);
      return true;
    });
  }, [latestFilms, selectedIndustry, languageFilter, statusFilter, searchQuery, sortBy]);

  // Overall Catalog Statistics
  const catalogStats = useMemo(() => {
    const totalCount = latestFilms.length;
    const inTheatres = latestFilms.filter((f) => f.telemetry30d.isReleased).length;
    const advanceOpen = latestFilms.filter((f) => !f.telemetry30d.isReleased).length;
    const highRisk = latestFilms.filter((f) => f.threatScore >= 65).length;
    const totalAudienceCuriosity = latestFilms.reduce(
      (acc, f) => acc + (f.telemetry30d?.total30dViews || 0),
      0
    );
    return { totalCount, inTheatres, advanceOpen, highRisk, totalAudienceCuriosity };
  }, [latestFilms]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* Main Header & Real-Time Sync Action Bar */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#30d158] animate-pulse" />
              <p className="text-[12px] font-semibold tracking-wider text-[#64a8ff] uppercase">
                Dynamic Indian Cinema Radar · Live 30-Day Theatrical Almanac
              </p>
            </div>
            <h1 className="apple-title mt-1">Films & Theatrical Intelligence</h1>
            <p className="apple-subhead mt-1">
              Real-time multi-industry Indian cinema catalog covering Bollywood, Tollywood, Kollywood, Mollywood, Sandalwood, and regional cinemas with BookMyShow signals and automated website-wide synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastSynced && (
              <span className="text-[11px] text-war-text-muted hidden sm:inline">
                Synced {new Date(lastSynced).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
              </span>
            )}
            <button
              onClick={() => fetchCatalog(true)}
              disabled={syncing}
              className="apple-button flex items-center gap-2 border border-white/10 bg-white/[0.05] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.1] hover:border-white/20 active:scale-95 disabled:opacity-50"
              title="Query live Wikipedia 2026 releases almanac and BookMyShow theatrical signals"
            >
              <GIcon name="sync" size={15} className={clsx(syncing && 'animate-spin text-[#64a8ff]')} />
              <span>{syncing ? 'Refreshing Indian Almanac…' : 'Sync Live Catalog'}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[10px] font-medium text-war-text-muted uppercase tracking-wider">Catalog Films</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-bold tabular-nums text-white">{catalogStats.totalCount}</span>
              <span className="text-[11px] text-[#64a8ff] font-medium">11 Industries</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[10px] font-medium text-war-text-muted uppercase tracking-wider">In Theatres Now</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-bold tabular-nums text-[#30d158]">{catalogStats.inTheatres}</span>
              <span className="text-[11px] text-war-text-muted">releases</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[10px] font-medium text-war-text-muted uppercase tracking-wider">Advance Open</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-bold tabular-nums text-[#0a84ff]">{catalogStats.advanceOpen}</span>
              <span className="text-[11px] text-war-text-muted">upcoming</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[10px] font-medium text-war-text-muted uppercase tracking-wider">Threat Watch</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-bold tabular-nums text-[#ff453a]">{catalogStats.highRisk}</span>
              <span className="text-[11px] text-war-text-muted">critical/at-risk</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
            <span className="text-[10px] font-medium text-war-text-muted uppercase tracking-wider">30D Audience Reach</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-bold tabular-nums text-[#ffd60a]">
                {(catalogStats.totalAudienceCuriosity / 1000).toFixed(0)}k
              </span>
              <span className="text-[11px] text-war-text-muted">signals</span>
            </div>
          </div>
        </div>

        {/* View Switcher: Indian Cinema Catalog vs Tracked Projects vs Reference Models */}
        <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-3">
          <button
            onClick={() => setViewTab('catalog')}
            className={clsx(
              'rounded-xl px-4 py-2 text-[13px] font-semibold transition flex items-center gap-2',
              viewTab === 'catalog'
                ? 'bg-[#0a84ff] text-white shadow-md shadow-[#0a84ff]/20'
                : 'bg-white/[0.03] text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
            )}
          >
            <GIcon name="movie" size={15} />
            <span>Indian Cinema Live Catalog ({latestFilms.length})</span>
          </button>

          <button
            onClick={() => setViewTab('tracked')}
            className={clsx(
              'rounded-xl px-4 py-2 text-[13px] font-semibold transition flex items-center gap-2',
              viewTab === 'tracked'
                ? 'bg-[#0a84ff] text-white shadow-md shadow-[#0a84ff]/20'
                : 'bg-white/[0.03] text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
            )}
          >
            <GIcon name="radar" size={15} />
            <span>Active War Room Projects ({projects.length})</span>
          </button>

          <button
            onClick={() => setViewTab('modelled')}
            className={clsx(
              'rounded-xl px-4 py-2 text-[13px] font-semibold transition flex items-center gap-2',
              viewTab === 'modelled'
                ? 'bg-[#0a84ff] text-white shadow-md shadow-[#0a84ff]/20'
                : 'bg-white/[0.03] text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
            )}
          >
            <GIcon name="analytics" size={15} />
            <span>Modelled Benchmark Films ({films.length})</span>
          </button>
        </div>

        {/* TAB 1: DYNAMIC INDIAN CINEMA CATALOG */}
        {viewTab === 'catalog' && (
          <div className="space-y-4">
            {/* Quick Industry Pills Ribbon */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {INDIAN_INDUSTRIES.map((ind) => {
                const isSelected = selectedIndustry === ind.id;
                return (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedIndustry(ind.id)}
                    className={clsx(
                      'whitespace-nowrap rounded-xl px-3 py-1.5 text-[12px] font-medium transition border',
                      isSelected
                        ? 'border-[#0a84ff] bg-[#0a84ff]/20 text-[#64a8ff]'
                        : 'border-white/[0.08] bg-white/[0.03] text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    {ind.label}
                  </button>
                );
              })}
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <GIcon
                  name="search"
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-war-text-muted"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Indian films by title, director, cast, studio, or genre…"
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-8 py-2 text-[13px] text-white placeholder-war-text-muted focus:border-[#0a84ff] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-war-text-muted hover:text-white"
                  >
                    <GIcon name="close" size={13} />
                  </button>
                )}
              </div>

              {/* Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Language */}
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#1c1c1e] px-3 py-2 text-[12px] text-white focus:border-[#0a84ff] focus:outline-none"
                  aria-label="Filter by language"
                >
                  <option value="all">All Languages</option>
                  <option value="hindi">Hindi</option>
                  <option value="telugu">Telugu</option>
                  <option value="tamil">Tamil</option>
                  <option value="malayalam">Malayalam</option>
                  <option value="kannada">Kannada</option>
                  <option value="punjabi">Punjabi</option>
                  <option value="marathi">Marathi</option>
                  <option value="bengali">Bengali</option>
                  <option value="gujarati">Gujarati</option>
                  <option value="assamese">Assamese</option>
                  <option value="odia">Odia</option>
                </select>

                {/* Release Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ReleaseStatusFilter)}
                  className="rounded-xl border border-white/10 bg-[#1c1c1e] px-3 py-2 text-[12px] text-white focus:border-[#0a84ff] focus:outline-none"
                  aria-label="Filter by release status"
                >
                  <option value="all">All Release Windows</option>
                  <option value="inTheatres">In Theatres Now</option>
                  <option value="ott">Released on OTT (Streaming)</option>
                  <option value="advance">Advance Booking Open</option>
                  <option value="upcoming">Upcoming Theatrical Slate</option>
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-xl border border-white/10 bg-[#1c1c1e] px-3 py-2 text-[12px] text-white focus:border-[#0a84ff] focus:outline-none"
                  aria-label="Sort movies"
                >
                  <option value="date_desc">Release Date (Newest First)</option>
                  <option value="date_asc">Release Date (Oldest First)</option>
                  <option value="threat_desc">Threat Score (Highest Risk First)</option>
                  <option value="threat_asc">Threat Score (Safest First)</option>
                  <option value="demand_desc">Audience Demand (Highest First)</option>
                  <option value="title_asc">Title (A to Z)</option>
                </select>
              </div>
            </div>

            {/* Currently Active Selection Sync Status Bar */}
            <div className="flex items-center justify-between rounded-xl border border-[#0a84ff]/30 bg-[#0a84ff]/10 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#64a8ff] animate-ping" />
                <span className="text-[12px] font-semibold text-white">
                  Active Synchronized Project: <span className="text-[#64a8ff] underline">{project.title}</span>
                </span>
              </div>
              <span className="text-[11px] text-war-text-secondary hidden sm:inline">
                Selecting any movie below will automatically update all dashboards, analytics, simulations, and market panels.
              </span>
            </div>

            {/* Movie Catalog Grid */}
            {loadingLatest ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="h-72 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.03]" />
                ))}
              </div>
            ) : filteredFilms.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-12 text-center">
                <GIcon name="movie" size={36} className="mx-auto text-war-text-muted opacity-40" />
                <p className="mt-3 text-[16px] font-semibold text-white">No Indian movies matched this filter</p>
                <p className="mt-1 text-[13px] text-war-text-muted">
                  Try selecting a different industry or clearing your search keywords.
                </p>
                <button
                  onClick={() => {
                    setSelectedIndustry('all');
                    setLanguageFilter('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="apple-button mt-4 bg-[#0a84ff] px-4 py-2 text-[13px] text-white"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2 xl:grid-cols-3">
                {filteredFilms.map((film) => {
                  const isCurrentlyActive = project.id === film.id || project.title.toLowerCase() === film.title.toLowerCase();
                  const isOtt = (film.releaseStatus || '').toLowerCase().includes('ott') || (film.platform || '').toLowerCase().includes('ott');
                  const isReleased = film.telemetry30d.isReleased || isOtt;
                  const band = film.riskBand;

                  return (
                    <div
                      key={film.id}
                      className={clsx(
                        'group relative flex flex-col justify-between rounded-2xl border p-5 backdrop-blur-lg transition-all duration-200',
                        isCurrentlyActive
                          ? 'border-[#0a84ff]/70 bg-[#0a84ff]/[0.08] shadow-lg shadow-[#0a84ff]/10'
                          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.20] hover:bg-white/[0.05]'
                      )}
                    >
                      <div>
                        {/* Top Ribbon */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={clsx(
                                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border',
                                isOtt
                                  ? 'bg-[#bf5af2]/15 text-[#da8fff] border-[#bf5af2]/30'
                                  : isReleased
                                  ? 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30'
                                  : 'bg-[#0a84ff]/15 text-[#64a8ff] border-[#0a84ff]/30'
                              )}
                            >
                              {film.telemetry30d.daysSinceReleaseText}
                            </span>
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-war-text-muted">
                              {film.industry || film.language}
                            </span>
                            {film.secondaryLanguages && film.secondaryLanguages.length > 0 && (
                              <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-war-text-muted">
                                +{film.secondaryLanguages.length} dubs
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span
                              className={clsx(
                                'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                                bandStyles[band]
                              )}
                            >
                              {band} ({film.threatScore})
                            </span>
                          </div>
                        </div>

                        {/* Title, Original Title & Credits */}
                        <div className="mt-3">
                          <div className="flex items-baseline gap-1.5">
                            <h3 className="text-[18px] font-bold tracking-tight text-white group-hover:text-[#64a8ff] transition-colors">
                              {film.title}
                            </h3>
                            {film.originalTitle && film.originalTitle !== film.title && (
                              <span className="text-[12px] text-war-text-muted truncate">({film.originalTitle})</span>
                            )}
                          </div>
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
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GIcon name="confirmation_number" size={14} className="shrink-0 text-[#ff2d55]" />
                            <span className="truncate text-[12px] font-medium text-white/90">
                              {film.bookingStatus}
                            </span>
                          </div>
                          {film.boxOffice && (
                            <span className="text-[11px] font-semibold text-[#30d158] shrink-0 ml-2">
                              {film.boxOffice.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* 30-Day Velocity & Demand Sparkline */}
                        <div className="mt-3.5">
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="font-medium text-war-text-muted">30-Day Demand Telemetry</span>
                            <span className="text-[11px] tabular-nums text-war-text-secondary">
                              {(film.telemetry30d.total30dViews / 1000).toFixed(1)}k views · Peak {film.telemetry30d.peakDemandDate}
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

                        {/* Verification Tag */}
                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-war-text-muted">
                          <span className="flex items-center gap-1">
                            <GIcon name="verified" size={11} className="text-[#30d158]" />
                            <span>{film.verificationStatus || 'Verified Release'}</span>
                          </span>
                          <span className="truncate max-w-[150px]">{film.studio}</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                        {/* Primary: Select & Synchronize */}
                        <button
                          onClick={() => handleSelectAndSynchronize(film, true)}
                          className={clsx(
                            'flex-1 apple-button py-2 text-[12px] font-semibold transition',
                            isCurrentlyActive
                              ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40'
                              : 'bg-[#0a84ff] text-white hover:bg-[#409cff]'
                          )}
                          title="Select this film and synchronize across all rooms, simulations, and telemetry"
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <GIcon name={isCurrentlyActive ? 'check_circle' : 'radar'} size={13} />
                            <span>{isCurrentlyActive ? 'Active in Room' : 'Select for War Room'}</span>
                          </span>
                        </button>

                        {/* Inspect Dossier Modal Trigger */}
                        <button
                          onClick={() => setInspectingFilm(film)}
                          className="apple-button border border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-medium text-white hover:bg-white/[0.1] hover:border-white/20"
                          title="Inspect comprehensive film dossier, cast, crew, and distribution specs"
                        >
                          <span className="flex items-center gap-1">
                            <span>Inspect</span>
                            <GIcon name="info" size={13} />
                          </span>
                        </button>

                        {/* BookMyShow Outbound */}
                        {film.bookMyShowUrl && (
                          <a
                            href={film.bookMyShowUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-war-text-muted transition hover:bg-[#ff2d55]/20 hover:text-[#ff2d55] hover:border-[#ff2d55]/40"
                            title="Open on BookMyShow"
                          >
                            <GIcon name="confirmation_number" size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE TRACKED PROJECTS */}
        {viewTab === 'tracked' && (
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-[17px] font-bold text-white">Active War Room Projects</h2>
                <p className="text-[12px] text-war-text-muted">
                  These films have been selected by your team for continuous threat monitoring. Selecting any project instantly switches live news streams, damage calculations, and market breakdowns across the platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => {
                const c = counts[p.id];
                const active = p.id === project.id;
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      'rounded-2xl border p-4.5 transition-all',
                      active
                        ? 'border-[#0a84ff]/70 bg-[#0a84ff]/[0.09] shadow-lg shadow-[#0a84ff]/10'
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
                            toast(`${p.title} removed from tracking list`, 'info');
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
                          onClick={() => {
                            setActiveId(p.id);
                            navigate('/');
                            toast(`War Room switched to ${p.title}! All telemetry synchronized.`, 'success');
                          }}
                          className="apple-button bg-[#0a84ff] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#409cff]"
                        >
                          Anchor Room
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-[#64a8ff]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#64a8ff] animate-ping" />
                          Currently Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MODELLED BENCHMARK FILMS */}
        {viewTab === 'modelled' && (
          <div className="glass-panel p-6 space-y-4">
            <div>
              <h2 className="text-[17px] font-bold text-white">Modelled Benchmark Reference Films</h2>
              <p className="text-[12px] text-war-text-muted">
                Pre-calibrated crisis telemetry profiles used for training and algorithmic comparisons.
              </p>
            </div>
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
                      <span className="text-[#64a8ff]">View telemetry diagnostics →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Source & Verification Footer */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-war-text-muted">
            <div className="flex items-center gap-2">
              <GIcon name="security" size={15} className="text-[#30d158]" />
              <span>
                Authorized Indian Cinema Feeds: <span className="text-white font-medium">Wikipedia 2026 Releases Almanac</span> · <span className="text-white font-medium">BookMyShow Theatrical Radar</span> · <span className="text-white font-medium">Google Theatrical RSS</span> · <span className="text-white font-medium">Verified Distributor Schedules</span>
              </span>
            </div>
            <div>
              Auto-refreshed periodically · Full fallback protection
            </div>
          </div>
        </div>
      </div>

      {/* Deep Inspection Modal */}
      <FilmInspectionModal
        film={inspectingFilm}
        isOpen={!!inspectingFilm}
        isActiveInWarRoom={!!inspectingFilm && (project.id === inspectingFilm.id || project.title.toLowerCase() === inspectingFilm.title.toLowerCase())}
        onClose={() => setInspectingFilm(null)}
        onSelectForDamageControl={(film) => {
          setInspectingFilm(null);
          handleSelectAndSynchronize(film, true);
        }}
        onOpenMarkets={(film) => {
          setInspectingFilm(null);
          handleSelectAndSynchronize(film, false);
          navigate('/markets');
        }}
        onOpenTelemetry={(film) => {
          setInspectingFilm(null);
          handleSelectAndSynchronize(film, false);
          navigate(`/film/${film.id}`);
        }}
      />
    </div>
  );
}
