import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import { films, damageBand, bandStyles, liveScoreOf, type DamageAction } from '../data/damage';
import { rankActions } from '../data/algorithm';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useToast } from '../components/Toaster';
import { useRoom } from '../components/RoomState';
import { StatusBadge } from '../components/ui/StatusBadge';

const TABS = ['Overview', 'Why', 'Markets', 'Actions', 'Timeline', 'Competition'] as const;

const urgencyStyles: Record<DamageAction['urgency'], string> = {
  NOW: 'bg-[#ff453a]/15 text-[#ff6961]',
  'THIS WEEK': 'bg-[#ff9f0a]/15 text-[#ffb340]',
  MONITOR: 'bg-white/10 text-war-text-secondary',
};

function nowIST(): string {
  return `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST`;
}

export function FilmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { apply } = useRoom();
  const { project } = useProject();
  const { stats, isLive } = useLiveData(project.keywords.join(','));
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [executed, setExecuted] = useState<{ action: DamageAction; at: string }[]>([]);

  const film = films.find((f) => f.id === id);
  if (!film) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[15px] font-semibold text-white">Film not found</p>
          <button onClick={() => navigate('/films')} className="apple-button mt-3 bg-white/10 px-4 py-2 text-[13px] text-white hover:bg-white/15">
            Back to films
          </button>
        </div>
      </div>
    );
  }

  const liveNeg = isLive && stats && film.id === 'toxic' ? stats.negPct : undefined;
  const score = liveScoreOf(film, liveNeg);
  const band = damageBand(score);
  const visibleActions = rankActions(film.actions.filter((a) => !dismissed.includes(a.id)));

  const execute = (a: DamageAction) => {
    apply('approve');
    setExecuted((prev) => [{ action: a, at: nowIST() }, ...prev]);
    toast(`${a.title} — executing · risk −4`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <button onClick={() => navigate('/films')} className="flex items-center gap-1.5 text-[13px] text-war-text-secondary transition hover:text-white">
          <GIcon name="arrow_back" size={14} /> Films
        </button>

        {/* Film header */}
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="apple-title">{film.title}</h1>
                {!film.modelled && isLive && stats ? (
                  <span className="rounded-full bg-[#30d158]/15 px-2.5 py-1 text-[11px] font-bold text-[#30d158]">LIVE SCORE</span>
                ) : (
                  <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-war-text-muted">MODELLED</span>
                )}
              </div>
              <p className="apple-subhead mt-1">{film.language} · {film.genre} · Released {film.releaseDate} · {film.status}</p>
              {film.crises.map((c) => (
                <div key={c.id} className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge severity={c.severity} size="sm" />
                  <span className="text-[13px] text-war-text-secondary">{c.problem}</span>
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="metric-label">Damage score</div>
              <div className="text-[44px] font-bold tabular-nums leading-none tracking-tight text-white">{score}<span className="text-[15px] font-medium text-war-text-muted">/100</span></div>
              <span className={clsx('mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-bold', bandStyles[band])}>{band}</span>
              <div className="mx-auto mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/[0.08]">
                <div className={clsx('h-full rounded-full', score >= 76 ? 'bg-[#ff453a]' : score >= 51 ? 'bg-[#ff9f0a]' : score >= 26 ? 'bg-[#ffd60a]' : 'bg-[#30d158]')} style={{ width: `${score}%` }} />
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

        {tab === 'Overview' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-panel p-5">
              <div className="section-title mb-2">Why this score is high</div>
              <p className="text-[14px] leading-relaxed text-war-text-secondary">“{film.inference}”</p>
              <div className="mt-3 space-y-1.5">
                {film.observed.slice(0, 3).map((o) => (
                  <div key={o.metric} className="flex items-center justify-between text-[13px]">
                    <span className="text-war-text-muted">{o.metric}</span>
                    <span className="font-semibold tabular-nums text-white">{o.delta}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="section-title">Money at risk</span>
                <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">MODELLED</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/[0.03] p-3">
                  <div className="metric-label">Expected Wk1</div>
                  <div className="mt-0.5 text-[17px] font-bold tabular-nums text-white">{film.revenue.expected}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-3">
                  <div className="metric-label">Projected</div>
                  <div className="mt-0.5 text-[17px] font-bold tabular-nums text-white">{film.revenue.projected}</div>
                </div>
                <div className="rounded-2xl bg-[#ff453a]/[0.07] p-3">
                  <div className="metric-label">At risk</div>
                  <div className="mt-0.5 text-[17px] font-bold tabular-nums text-[#ff6961]">{film.revenue.atRisk}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
                <div><span className="text-war-text-muted">Producer </span><span className="font-semibold tabular-nums text-war-text-secondary">{film.revenue.producer}</span></div>
                <div><span className="text-war-text-muted">Distributor </span><span className="font-semibold tabular-nums text-war-text-secondary">{film.revenue.distributor}</span></div>
                <div><span className="text-war-text-muted">Exhibitor </span><span className="font-semibold tabular-nums text-war-text-secondary">{film.revenue.exhibitor}</span></div>
              </div>
              <div className={clsx('mt-3 rounded-2xl border p-3.5 text-[13px] leading-relaxed', film.footfall.warning ? 'border-[#ff9f0a]/25 bg-[#ff9f0a]/[0.07] text-war-text-secondary' : 'border-[#30d158]/25 bg-[#30d158]/[0.07] text-war-text-secondary')}>
                <span className="font-semibold text-white">Revenue health: </span>{film.footfall.verdict}
                <span className="mt-1 block text-[12px] tabular-nums text-war-text-muted">Revenue {film.footfall.revenue} · Footfalls {film.footfall.footfalls} · ATP {film.footfall.atp}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'Why' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="glass-panel p-5">
              <div className="section-title mb-3">Observed — measured</div>
              <ul className="space-y-2">
                {film.observed.map((o) => (
                  <li key={o.metric} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-[13px]">
                    <span className="text-war-text-secondary">{o.metric}</span>
                    <span className="font-semibold tabular-nums text-white">{o.delta}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-panel p-5">
              <div className="section-title mb-3">Inferred — analyst judgment</div>
              <ul className="space-y-2">
                {film.inferred.map((o) => (
                  <li key={o.metric} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-[13px]">
                    <span className="text-war-text-secondary">{o.metric}</span>
                    <span className="font-medium text-[#ffd60a]">{o.delta}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px] text-war-text-muted">Confidence</span>
                <span className="text-[13px] font-bold tabular-nums text-white">{film.confidence}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${film.confidence}%` }} />
              </div>
            </div>
          </div>
        )}

        {tab === 'Markets' && (
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">
                    {['Market', 'Health', 'Revenue', 'Occupancy', 'Shows', 'Velocity', 'Sentiment', 'Trend'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {film.markets.map((m) => (
                    <tr key={m.region} className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.04]">
                      <td className="px-4 py-3">
                        <div className="text-[14px] font-medium text-white">{m.region}</div>
                        <div className="text-[11px] text-war-text-muted">{m.language}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-[15px] font-bold tabular-nums', m.health < 50 ? 'text-[#ff6961]' : m.health < 70 ? 'text-[#ffb340]' : 'text-[#30d158]')}>{m.health}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-war-text-secondary">{m.revenue}</td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-war-text-secondary">{m.occupancy}%</td>
                      <td className="px-4 py-3 text-[13px] tabular-nums text-war-text-secondary">{m.shows}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-war-text-secondary">{m.velocity}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-war-text-secondary">{m.sentiment > 0 ? `+${m.sentiment}` : m.sentiment}</td>
                      <td className="px-4 py-3 text-[13px] text-war-text-secondary">{m.trend === 'up' ? '↗' : m.trend === 'down' ? '↘' : '→'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="apple-footnote px-5 py-3">Market figures are modelled estimates, not box-office reporting.</p>
          </div>
        )}

        {tab === 'Actions' && (
          <div className="space-y-3">
            {visibleActions.map(({ action: a, reason }, i) => (
              <div key={a.id} className="glass-panel apple-card-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[220px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a84ff]/20 text-[12px] font-bold text-[#64a8ff]">{i + 1}</span>
                      <h3 className="text-[15px] font-semibold tracking-tight text-white">{a.title}</h3>
                      <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold', urgencyStyles[a.urgency])}>{a.urgency}</span>
                      <span className="text-[11px] tabular-nums text-war-text-muted">{a.confidence}% confidence · {reason}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-war-text-secondary"><span className="font-medium text-war-text-muted">Why: </span>{a.why}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-war-text-secondary"><span className="font-medium text-war-text-muted">Expected impact: </span>{a.impact}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => execute(a)} className="apple-button bg-[#0a84ff] px-4 py-2 text-[13px] text-white hover:bg-[#409cff]">
                      Execute
                    </button>
                    <button
                      onClick={() => { setDismissed((d) => [...d, a.id]); toast('Action dismissed', 'info'); }}
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
                <div className="section-title mb-3">Interventions on this film</div>
                <div className="space-y-2">
                  {executed.map((e) => (
                    <div key={`${e.action.id}-${e.at}`} className="flex items-center gap-2.5 rounded-xl border border-[#30d158]/25 bg-[#30d158]/[0.07] px-3.5 py-2.5">
                      <GIcon name="check_circle" size={14} className="shrink-0 text-[#30d158]" />
                      <div className="flex-1 text-[13px] text-war-text-secondary">
                        <span className="font-medium text-white">{e.action.title}</span> — before metrics logged, review in 72h
                      </div>
                      <span className="flex items-center gap-2 text-[11px] tabular-nums text-war-text-muted">
                        {e.at}
                        <span className="rounded-full bg-[#ffd60a]/15 px-2 py-0.5 font-semibold text-[#ffd60a]">TRACKING</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Timeline' && (
          <div className="glass-panel p-5">
            <div className="section-title mb-4">Incident timeline — when the damage started</div>
            <div className="relative">
              <div className="absolute bottom-0 left-[13px] top-0 w-px bg-white/[0.08]" />
              <div className="space-y-1">
                {film.timeline.map((s) => (
                  <div key={s.label} className="flex items-start gap-3.5 rounded-2xl p-2.5">
                    <span className={clsx(
                      'relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                      s.state === 'done' && 'border-[#30d158] bg-[#30d158]/30',
                      s.state === 'active' && 'border-[#ff453a] bg-[#ff453a] status-pulse-critical',
                      s.state === 'upcoming' && 'border-white/20 bg-transparent'
                    )} />
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

        {tab === 'Competition' && (
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Competitive pressure</span>
              <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">MODELLED</span>
            </div>
            <div className="space-y-2">
              {film.competition.films.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <span className={clsx('text-[14px] font-medium', c.name === film.title ? 'text-white' : 'text-war-text-secondary')}>{c.name}</span>
                  <span className={clsx('text-[13px] font-bold tabular-nums', c.velocity.startsWith('+') ? 'text-[#30d158]' : 'text-[#ff6961]')}>{c.velocity} booking velocity</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-war-text-secondary">“{film.competition.note}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
