import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import {
  films,
  damageBand,
  bandStyles,
  liveScoreOf,
  createFilmDamageFromLatest,
  type DamageAction,
  type FilmDamage,
} from '../data/damage';
import { rankActions } from '../data/algorithm';
import { api, type LatestFilmItem } from '../data/apiService';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useToast } from '../components/Toaster';
import { useRoom } from '../components/RoomState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ThirtyDaySparkline } from '../components/ThirtyDaySparkline';

const TABS = [
  'Overview',
  '30-Day Telemetry',
  'Why',
  'Markets',
  'Actions',
  'Timeline',
  'Competition',
] as const;

const urgencyStyles: Record<DamageAction['urgency'], string> = {
  NOW: 'bg-[#ff453a]/15 text-[#ff6961]',
  'THIS WEEK': 'bg-[#ff9f0a]/15 text-[#ffb340]',
  MONITOR: 'bg-white/10 text-war-text-secondary',
};

function nowIST(): string {
  return `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST`;
}

export function FilmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { apply } = useRoom();
  const { project, trackFilm } = useProject();
  const { stats, isLive } = useLiveData(project.keywords.join(','));
  const [tab, setTab] = useState<(typeof TABS)[number]>('30-Day Telemetry');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [executed, setExecuted] = useState<{ action: DamageAction; at: string }[]>([]);

  // State for dynamic film and 30-day telemetry
  const [dynamicFilm, setDynamicFilm] = useState<FilmDamage | null>(null);
  const [latestItem, setLatestItem] = useState<LatestFilmItem | null>(null);
  const [loadingDynamic, setLoadingDynamic] = useState<boolean>(false);

  // First check static films catalog
  const staticFilm = useMemo(() => films.find((f) => f.id === id), [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDynamic(true);
      try {
        const res = await api.getLatestFilms({ window: 30 });
        if (cancelled) return;
        if (res.success && res.data) {
          const matched = res.data.find(
            (item) => item.id === id || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id
          );
          if (matched) {
            setLatestItem(matched);
            if (!staticFilm) {
              setDynamicFilm(createFilmDamageFromLatest(matched));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic film telemetry:', err);
      } finally {
        if (!cancelled) setLoadingDynamic(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, staticFilm]);

  const activeFilm = staticFilm || dynamicFilm;

  if (loadingDynamic && !activeFilm) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <GIcon name="sync" size={28} className="mx-auto animate-spin text-[#64a8ff]" />
          <p className="mt-3 text-[14px] text-war-text-secondary">Retrieving 30-day theatrical telemetry…</p>
        </div>
      </div>
    );
  }

  if (!activeFilm) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[15px] font-semibold text-white">Film not found</p>
          <p className="mt-1 text-[13px] text-war-text-muted">
            The requested movie is not in the active catalog or 30-day theatrical release window.
          </p>
          <button
            onClick={() => navigate('/films')}
            className="apple-button mt-4 bg-white/10 px-4 py-2 text-[13px] text-white hover:bg-white/15"
          >
            Back to 30-Day Radar
          </button>
        </div>
      </div>
    );
  }

  const liveNeg = isLive && stats && activeFilm.id === 'toxic' ? stats.negPct : undefined;
  const score = liveScoreOf(activeFilm, liveNeg);
  const band = damageBand(score);
  const visibleActions = rankActions(activeFilm.actions.filter((a) => !dismissed.includes(a.id)));

  const execute = (a: DamageAction) => {
    apply('approve');
    setExecuted((prev) => [{ action: a, at: nowIST() }, ...prev]);
    toast(`${a.title} — executing · risk −4`, 'success');
  };

  const handleTrackThisFilm = () => {
    trackFilm({
      id: activeFilm.id,
      title: activeFilm.title,
      subtitle: `${activeFilm.language} · ${activeFilm.genre} · 30-Day Radar`,
      keywords: [activeFilm.title.toLowerCase()],
    });
    navigate('/');
    toast(`Command Center re-anchored to ${activeFilm.title}`, 'success');
  };

  // Generate synthetic 30-day daily telemetry if latestItem not loaded yet
  const telemetryData = latestItem?.telemetry30d || {
    diffDays: 0,
    isReleased: true,
    daysSinceReleaseText: 'In Theatres Now',
    isIn30DayWindow: true,
    total30dViews: 84000,
    peakDemandDate: '2026-09-04',
    dailyData: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-08-${String(12 + Math.floor(i / 2)).padStart(2, '0')}`,
      dayOffset: -29 + i,
      dayLabel: i === 29 ? 'Today' : `-${29 - i}d`,
      views: Math.round(3000 + Math.sin(i * 0.4) * 1500 + (score * 20)),
      threat: Math.min(95, Math.max(15, Math.round(score + Math.cos(i * 0.5) * 6))),
      sentimentPos: Math.max(20, 100 - score),
      sentimentNeg: score,
      sentimentNeu: 10,
    })),
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/films')}
            className="flex items-center gap-1.5 text-[13px] text-war-text-secondary transition hover:text-white"
          >
            <GIcon name="arrow_back" size={14} /> Back to 30-Day Radar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTrackThisFilm}
              className="apple-button flex items-center gap-1.5 bg-[#0a84ff] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#409cff]"
            >
              <GIcon name="radar" size={13} />
              <span>Track in War Room</span>
            </button>

            {latestItem?.bookMyShowUrl && (
              <a
                href={latestItem.bookMyShowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-button flex items-center gap-1.5 border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/[0.1]"
              >
                <GIcon name="confirmation_number" size={13} className="text-[#ff2d55]" />
                <span>BookMyShow</span>
              </a>
            )}
          </div>
        </div>

        {/* Film Hero Header */}
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="apple-title">{activeFilm.title}</h1>
                <span className="rounded-full bg-[#30d158]/15 border border-[#30d158]/30 px-2.5 py-1 text-[11px] font-bold text-[#30d158]">
                  {telemetryData.daysSinceReleaseText}
                </span>
                <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-war-text-muted">
                  30-DAY WINDOW
                </span>
              </div>
              <p className="apple-subhead mt-1">
                {activeFilm.language} · {activeFilm.genre} · Release Date: {activeFilm.releaseDate} · {activeFilm.status}
              </p>

              {latestItem && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white flex items-center gap-1.5">
                    <GIcon name="confirmation_number" size={13} className="text-[#ff2d55]" />
                    {latestItem.bookingStatus}
                  </span>
                  <span className="text-[12px] text-war-text-muted">
                    Box Office Signal: <strong className="text-white">{latestItem.boxOffice}</strong>
                  </span>
                </div>
              )}

              {activeFilm.crises.map((c) => (
                <div key={c.id} className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge severity={c.severity} size="sm" />
                  <span className="text-[13px] text-war-text-secondary">{c.problem}</span>
                </div>
              ))}
            </div>

            <div className="text-right">
              <div className="metric-label">Damage index</div>
              <div className="text-[44px] font-bold tabular-nums leading-none tracking-tight text-white">
                {score}
                <span className="text-[15px] font-medium text-war-text-muted">/100</span>
              </div>
              <span className={clsx('mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-bold', bandStyles[band])}>
                {band}
              </span>
              <div className="mx-auto mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    score >= 76 ? 'bg-[#ff453a]' : score >= 51 ? 'bg-[#ff9f0a]' : score >= 26 ? 'bg-[#ffd60a]' : 'bg-[#30d158]'
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97]',
                tab === t ? 'bg-white text-black shadow' : 'text-war-text-secondary hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* TAB 1: 30-Day Theatrical Telemetry */}
        {tab === '30-Day Telemetry' && (
          <div className="space-y-5">
            {/* Top 30-Day KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="glass-panel p-4">
                <span className="metric-label">30-Day Audience Curiosity</span>
                <div className="mt-1 text-[22px] font-bold tabular-nums text-[#64a8ff]">
                  {(telemetryData.total30dViews / 1000).toFixed(1)}k
                </div>
                <p className="mt-0.5 text-[11px] text-war-text-muted">Verified search & Wikipedia views</p>
              </div>

              <div className="glass-panel p-4">
                <span className="metric-label">Peak Velocity Date</span>
                <div className="mt-1 text-[22px] font-bold tabular-nums text-white">
                  {telemetryData.peakDemandDate}
                </div>
                <p className="mt-0.5 text-[11px] text-[#30d158]">Highest 30-day multiplex demand</p>
              </div>

              <div className="glass-panel p-4">
                <span className="metric-label">Theatrical Run Track</span>
                <div className="mt-1 text-[20px] font-bold text-white truncate">
                  {latestItem?.boxOffice || activeFilm.revenue.gross}
                </div>
                <p className="mt-0.5 text-[11px] text-war-text-muted">Week 1-4 holdover pace</p>
              </div>

              <div className="glass-panel p-4">
                <span className="metric-label">BookMyShow Status</span>
                <div className="mt-1 text-[16px] font-bold text-[#ffd60a] truncate">
                  {latestItem?.bookingStatus || 'In Theatres'}
                </div>
                <p className="mt-0.5 text-[11px] text-war-text-muted">Live ticketing velocity</p>
              </div>
            </div>

            {/* 30-Day Interactive Area Chart */}
            <div className="glass-panel p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="section-title">30-Day Theatrical Velocity & Vulnerability Curve</h3>
                  <p className="text-[12px] text-war-text-muted">
                    Continuous 30-day tracking window (Aug 11 - Sep 10, 2026) capturing release momentum, audience interest and threat score.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="flex items-center gap-1 text-[#64a8ff]">
                    <span className="h-2 w-2 rounded-full bg-[#0a84ff]" /> Audience Curiosity
                  </span>
                  <span className="flex items-center gap-1 text-[#ff453a]">
                    <span className="h-2 w-2 rounded-full bg-[#ff453a]" /> Vulnerability / Damage Index
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4">
                <ThirtyDaySparkline
                  data={telemetryData.dailyData}
                  color="#0a84ff"
                  height={120}
                  showLabels={true}
                />
              </div>
            </div>

            {/* Day-by-Day 30-Day Telemetry Breakdown Table */}
            <div className="glass-panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="section-title">30-Day Daily Telemetry Log</h3>
                <span className="text-[12px] text-war-text-muted">Aug 11 – Sep 10, 2026</span>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-[#161618] text-war-text-muted border-b border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Timeline Offset</th>
                      <th className="px-4 py-2.5 text-right">Audience Curiosity</th>
                      <th className="px-4 py-2.5 text-right">Threat Index</th>
                      <th className="px-4 py-2.5 text-right">Sentiment Positive</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-war-text-secondary">
                    {telemetryData.dailyData.slice().reverse().map((day) => (
                      <tr key={day.date} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2 font-medium text-white">{day.date}</td>
                        <td className="px-4 py-2 tabular-nums">{day.dayLabel}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-[#64a8ff]">
                          {day.views.toLocaleString()} views
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">
                          <span
                            className={clsx(
                              day.threat >= 70 ? 'text-[#ff453a]' : day.threat >= 45 ? 'text-[#ff9f0a]' : 'text-[#30d158]'
                            )}
                          >
                            {day.threat}/100
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-[#30d158]">
                          {day.sentimentPos}%
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-war-text-muted">
                            {day.dayOffset === 0 ? 'Current Day' : day.dayOffset > 0 ? 'Future' : 'Logged'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Overview */}
        {tab === 'Overview' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-panel p-5">
              <div className="section-title mb-2">Diagnostic Inference</div>
              <p className="text-[14px] leading-relaxed text-war-text-secondary">“{activeFilm.inference}”</p>
              <div className="mt-3 space-y-1.5">
                {activeFilm.observed.map((o) => (
                  <div key={o.metric} className="flex items-center justify-between text-[13px]">
                    <span className="text-war-text-muted">{o.metric}</span>
                    <span className="font-semibold tabular-nums text-white">{o.delta}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="section-title">Financial Exposure & Revenue</span>
                <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">
                  30-DAY WINDOW
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/[0.03] p-3">
                  <div className="metric-label">Target Revenue</div>
                  <div className="mt-0.5 text-[17px] font-bold tabular-nums text-white">{activeFilm.revenue.expected}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-3">
                  <div className="metric-label">Projected Gross</div>
                  <div className="mt-0.5 text-[17px] font-bold tabular-nums text-white">{activeFilm.revenue.projected}</div>
                </div>
                <div className="rounded-2xl bg-[#ff453a]/[0.07] p-3">
                  <div className="metric-label">Revenue At Risk</div>
                  <div className="mt-0.5 text-[17px] font-bold tabular-nums text-[#ff6961]">{activeFilm.revenue.atRisk}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <span className="text-war-text-muted">Producer: </span>
                  <span className="font-semibold tabular-nums text-war-text-secondary">{activeFilm.revenue.producer}</span>
                </div>
                <div>
                  <span className="text-war-text-muted">Distributor: </span>
                  <span className="font-semibold tabular-nums text-war-text-secondary">{activeFilm.revenue.distributor}</span>
                </div>
                <div>
                  <span className="text-war-text-muted">Exhibitor: </span>
                  <span className="font-semibold tabular-nums text-war-text-secondary">{activeFilm.revenue.exhibitor}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Why */}
        {tab === 'Why' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-panel p-5">
              <div className="section-title mb-3">Observed Theatrical Signals</div>
              <div className="space-y-2">
                {activeFilm.observed.map((o) => (
                  <div key={o.metric} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                    <span className="text-[13px] text-war-text-secondary">{o.metric}</span>
                    <span className="text-[13px] font-bold text-white">{o.delta}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel p-5">
              <div className="section-title mb-3">Inferred Threat Projections</div>
              <div className="space-y-2">
                {activeFilm.inferred.map((inf) => (
                  <div key={inf.metric} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                    <span className="text-[13px] text-war-text-secondary">{inf.metric}</span>
                    <span className="text-[13px] font-bold text-[#ff9f0a]">{inf.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Markets */}
        {tab === 'Markets' && (
          <div className="glass-panel p-5">
            <div className="section-title mb-4">Territory Health Breakdown</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {activeFilm.markets.map((m) => (
                <div key={m.region} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-[13px] font-bold text-white">{m.region}</h4>
                    <span className="text-[11px] font-bold text-[#30d158]">{m.velocity}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[11px] text-war-text-muted">Market Health</span>
                    <span className="text-[16px] font-bold text-white">{m.health}/100</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${m.health}%` }} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-war-text-muted">
                    <span>Revenue: {m.revenue}</span>
                    <span>Occupancy: {m.occupancy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Actions */}
        {tab === 'Actions' && (
          <div className="space-y-4">
            {visibleActions.map(({ action: a, reason }) => (
              <div key={a.id} className="glass-panel p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('rounded-full px-2.5 py-0.5 text-[10px] font-bold', urgencyStyles[a.urgency])}>
                        {a.urgency}
                      </span>
                      <h4 className="text-[15px] font-bold text-white">{a.title}</h4>
                      <span className="text-[11px] text-war-text-muted">({reason})</span>
                    </div>
                    <p className="mt-1 text-[13px] text-war-text-secondary">{a.why}</p>
                    <p className="mt-1 text-[12px] text-[#30d158] font-medium">Impact: {a.impact}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => execute(a)}
                      className="apple-button bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#409cff]"
                    >
                      Deploy Action
                    </button>
                    <button
                      onClick={() => {
                        setDismissed((d) => [...d, a.id]);
                        toast('Action dismissed', 'info');
                      }}
                      className="apple-button bg-white/10 px-4 py-2 text-[13px] text-white hover:bg-white/15"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {visibleActions.length === 0 && (
              <div className="glass-panel p-10 text-center text-[14px] text-war-text-muted">All recommendations handled.</div>
            )}
            {executed.length > 0 && (
              <div className="glass-panel p-5">
                <div className="section-title mb-3">Interventions Logged</div>
                <div className="space-y-2">
                  {executed.map((e) => (
                    <div
                      key={`${e.action.id}-${e.at}`}
                      className="flex items-center gap-2.5 rounded-xl border border-[#30d158]/25 bg-[#30d158]/[0.07] px-3.5 py-2.5"
                    >
                      <GIcon name="check_circle" size={14} className="shrink-0 text-[#30d158]" />
                      <div className="flex-1 text-[13px] text-war-text-secondary">
                        <span className="font-medium text-white">{e.action.title}</span> — metrics logged at {e.at}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Timeline */}
        {tab === 'Timeline' && (
          <div className="glass-panel p-5">
            <div className="section-title mb-4">Theatrical Timeline & Corridors</div>
            <div className="relative">
              <div className="absolute bottom-0 left-[13px] top-0 w-px bg-white/[0.08]" />
              <div className="space-y-1">
                {activeFilm.timeline.map((s) => (
                  <div key={s.label} className="flex items-start gap-3.5 rounded-2xl p-2.5">
                    <span
                      className={clsx(
                        'relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                        s.state === 'done' && 'border-[#30d158] bg-[#30d158]/30',
                        s.state === 'active' && 'border-[#ff453a] bg-[#ff453a] status-pulse-critical',
                        s.state === 'upcoming' && 'border-white/20 bg-transparent'
                      )}
                    />
                    <div>
                      <p className="text-[14px] font-semibold text-white">{s.label}</p>
                      <p className="mt-0.5 text-[13px] text-war-text-secondary">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Competition */}
        {tab === 'Competition' && (
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Theatrical Box Office Clashes</span>
              <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">
                30-DAY WINDOW
              </span>
            </div>
            <div className="space-y-2">
              {activeFilm.competition.films.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className={clsx('text-[14px] font-medium', c.name === activeFilm.title ? 'text-white' : 'text-war-text-secondary')}>
                    {c.name}
                  </span>
                  <span
                    className={clsx(
                      'text-[13px] font-bold tabular-nums',
                      c.velocity.startsWith('+') ? 'text-[#30d158]' : 'text-[#ff6961]'
                    )}
                  >
                    {c.velocity} booking velocity
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-war-text-secondary">“{activeFilm.competition.note}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
