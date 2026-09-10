import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  crisisScore,
  timelineEvents,
  incidents,
  sentimentTimelineData,
  mentionVelocityData,
  riskTrajectoryData,
  leakLinks,
} from '../data/mockData';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/ui/StatusBadge';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { useToast } from '../components/Toaster';
import { PHASES, READINESS_ITEMS, usePhase } from '../components/PhaseContext';
import { useProject } from '../components/ProjectContext';
import { useRoom } from '../components/RoomState';
import { useLiveData } from '../hooks/useLiveData';
import { recoveryData } from './Recovery';
import { films, activeCrises, roomTotals, damageBand, bandStyles, liveScoreOf } from '../data/damage';
import { computeDamage, escalationFor, smoothScore } from '../data/algorithm';
import { motion } from 'framer-motion';
import { AnimatedNumber, RefreshFlash, Stagger, StaggerItem } from '../components/motion';
import type { Incident } from '../data/types';
import { CrisisSandbox, type ScenarioId } from '../components/CrisisSandbox';
import { ExecutiveDossierModal } from '../components/ExecutiveDossierModal';
import { CountermeasureModal, type CountermeasureType } from '../components/CountermeasureModal';
import { LiveIntelStream } from '../components/LiveIntelStream';
import { D3ThreatTelemetryChart } from '../components/D3ThreatTelemetryChart';

function RiskGauge({ score, label }: { score: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 70 ? '#ff453a' : score >= 50 ? '#ff9f0a' : score >= 30 ? '#ffd60a' : '#30d158';

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[132px] w-[132px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber value={score} className="text-[34px] font-bold tracking-[-0.03em] text-white" />
          <span className="text-[11px] font-medium text-war-text-muted">of 100</span>
        </div>
      </div>
      <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">{label}</span>
    </div>
  );
}

const levelDot: Record<string, string> = {
  red: 'bg-[#ff453a]',
  amber: 'bg-[#ff9f0a]',
  green: 'bg-[#30d158]',
};

/** Room status strip + active crises + plain-language diagnosis. */
function DamageCommand({ liveNegPct, backendLive }: { liveNegPct?: number; backendLive: boolean }) {
  const navigate = useNavigate();
  const totals = roomTotals();
  const redMarkets = films.flatMap((f) => f.markets).filter((m) => m.health < 50).length;
  const top = activeCrises[0];
  const topFilm = top ? films.find((f) => f.id === top.filmId) : undefined;
  const topScore = topFilm ? liveScoreOf(topFilm, topFilm.id === 'toxic' ? liveNegPct : undefined) : 0;

  const strip = [
    { label: 'Films tracked', value: `${totals.tracked}`, tone: 'text-white' },
    { label: 'Needs attention', value: `${totals.attention}`, tone: 'text-[#ffb340]' },
    { label: 'Critical', value: `${totals.critical}`, tone: totals.critical > 0 ? 'text-[#ff6961]' : 'text-[#30d158]' },
    { label: 'Revenue at risk', value: totals.atRisk, tone: 'text-[#ff6961]' },
    { label: 'Markets intervening', value: `${redMarkets}`, tone: 'text-[#ffb340]' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[15px] font-bold tracking-[0.08em] text-white">CINEMA DAMAGE CONTROL ROOM</h2>
        {backendLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-[#ff453a]/15 px-2.5 py-1 text-[11px] font-bold text-[#ff6961]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff453a] status-pulse-critical" /> LIVE
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-war-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-war-text-muted" /> STANDBY
          </span>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {strip.map((s) => (
          <div key={s.label} className="glass-panel min-w-[150px] flex-1 px-4 py-3">
            <div className="metric-label mb-0.5">{s.label}</div>
            <div className={`text-[22px] font-bold tabular-nums tracking-tight ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {activeCrises.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-[13px] font-bold tracking-[0.08em] text-[#ff6961]">🚨 ACTIVE CRISES</span>
            <span className="apple-footnote">{activeCrises.length} open</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeCrises.map((c) => {
              const film = films.find((f) => f.id === c.filmId)!;
              const score = liveScoreOf(film, film.id === 'toxic' ? liveNegPct : undefined);
              return (
                <div key={c.id} className="rounded-[20px] border border-[#ff453a]/30 bg-gradient-to-b from-[#ff453a]/[0.10] to-transparent p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge severity={c.severity} size="sm" />
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${bandStyles[damageBand(score)]}`}>
                      Damage {score}
                    </span>
                    {film.modelled && (
                      <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-war-text-muted">MODELLED</span>
                    )}
                  </div>
                  <h3 className="text-[17px] font-bold tracking-tight text-white">{c.filmTitle}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-war-text-secondary">{c.problem}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
                    {c.markets.map((m) => (
                      <span key={m.name} className="flex items-center gap-1.5 text-war-text-secondary">
                        <span className={`h-1.5 w-1.5 rounded-full ${levelDot[m.level]}`} /> {m.name}
                      </span>
                    ))}
                    <span className="tabular-nums text-war-text-muted">Revenue at risk <span className="font-semibold text-[#ff6961]">{c.revenueAtRisk}</span></span>
                    <span className="tabular-nums text-war-text-muted">{c.trend}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => navigate(`/film/${c.filmId}`)}
                      className="apple-button bg-white/[0.10] px-4 py-2 text-[13px] font-medium text-white hover:bg-white/[0.16]"
                    >
                      Diagnose
                    </button>
                    <button
                      onClick={() => navigate('/response')}
                      className="apple-button bg-[#0a84ff] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#409cff]"
                    >
                      Take action
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {top && topFilm && (
        <div className="glass-panel p-5 lg:p-6">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="section-title">What is going wrong — {topFilm.title}</span>
            <span className="apple-footnote">Confidence {topFilm.confidence}% · Damage {topScore}</span>
          </div>
          <p className="max-w-[900px] text-[15px] font-medium leading-relaxed text-white">“{topFilm.inference}”</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="metric-label mb-2">Observed</div>
              <ul className="space-y-1.5">
                {topFilm.observed.map((o) => (
                  <li key={o.metric} className="flex items-center justify-between text-[13px]">
                    <span className="text-war-text-secondary">{o.metric}</span>
                    <span className="font-semibold tabular-nums text-white">{o.delta}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="metric-label mb-2">Inferred</div>
              <ul className="space-y-1.5">
                {topFilm.inferred.map((o) => (
                  <li key={o.metric} className="flex items-center justify-between text-[13px]">
                    <span className="text-war-text-secondary">{o.metric}</span>
                    <span className="font-medium text-[#ffd60a]">{o.delta}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${topFilm.confidence}%` }} />
              </div>
            </div>
          </div>
          <p className="apple-footnote mt-3">Why this score is high: {topFilm.observed.slice(0, 3).map((o) => `${o.metric} ${o.delta}`).join(' · ')}</p>
        </div>
      )}
    </div>
  );
}

/** Mini gradient sparkline for the light metric cards. */
function Spark({ data, dataKey, id }: { data: unknown[]; dataKey: string; id: string }) {
  return (
    <ResponsiveContainer width={104} height={38}>
      <AreaChart data={data} margin={{ top: 3, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6bff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2f6bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke="#2f6bff" strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SubMetricBar({ label, score, tooltip }: { label: string; score: number; tooltip: string }) {
  const color =
    score >= 70 ? '#ff453a' : score >= 50 ? '#ff9f0a' : score >= 30 ? '#ffd60a' : '#30d158';

  return (
    <div className="group relative">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-[12px] font-medium tracking-[-0.006em] text-war-text-secondary">{label.toLowerCase()}</span>
        <span style={{ color }}>
          <AnimatedNumber value={score} className="text-[13px] font-semibold tabular-nums" />
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-[220px] -translate-x-1/2 whitespace-normal rounded-xl border border-white/10 bg-[#2c2c2e]/95 px-2.5 py-1.5 text-center text-[12px] leading-snug text-war-text-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {tooltip}
      </div>
    </div>
  );
}

interface SimValues {
  sentiment: number;
  velocity: number;
  mentions: number;
  reach: number;
  gauge: number;
}

const SIM_BASE: SimValues = { sentiment: -24, velocity: 38, mentions: 1.84, reach: 46.7, gauge: 72 };

function driftValue(v: number, jitter: number, min: number, max: number, decimals: number): number {
  const next = v + (Math.random() * 2 - 1) * jitter;
  const clamped = Math.min(max, Math.max(min, next));
  return Number(clamped.toFixed(decimals));
}

const READINESS_KEY = 'cdc-readiness';

/** Phase lead panel: readiness checklist pre-release, triage board on opening week, recovery snapshot after. */
function PhaseLead({ flaggedCount }: { flaggedCount: number }) {
  const { phase } = usePhase();
  const navigate = useNavigate();
  const toast = useToast();
  const meta = PHASES.find((p) => p.id === phase)!;

  const [done, setDone] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(READINESS_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  const toggleItem = (id: string, label: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem(READINESS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if (next.length === READINESS_ITEMS.length && prev.length !== next.length) {
        toast('War room ready — all checks green', 'success');
      } else if (next.length > prev.length) {
        toast(`${label} — checked`, 'info');
      }
      return next;
    });
  };

  if (phase === 'pre') {
    const pct = Math.round((done.length / READINESS_ITEMS.length) * 100);
    return (
      <div className="glass-panel p-5 lg:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a84ff]/15">
              <GIcon name="fact_check" size={15} className="text-[#64a8ff]" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-white">Pre-release readiness</h2>
              <p className="text-[12px] text-war-text-muted">{meta.doctrine}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/[0.07] px-3 py-1 text-[12px] font-semibold tabular-nums text-white">{pct}% ready</span>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="h-full rounded-full bg-[#0a84ff]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {READINESS_ITEMS.map((item) => {
            const checked = done.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id, item.label)}
                aria-pressed={checked}
                className={clsx(
                  'rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]',
                  checked
                    ? 'border-[#30d158]/30 bg-[#30d158]/[0.07]'
                    : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
                )}
              >
                <span className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold transition-colors',
                  checked ? 'bg-[#30d158] text-black' : 'bg-white/10 text-war-text-muted'
                )}>
                  {checked ? '✓' : ''}
                </span>
                <span className="mt-2 block text-[13px] font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-war-text-muted">{item.detail}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'opening') {
    const activeCount = incidents.filter((i) => i.status !== 'RESOLVED').length;
    return (
      <div className="rounded-[20px] border border-[#ff453a]/25 bg-gradient-to-r from-[#ff453a]/[0.12] to-transparent p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff453a]/15">
              <GIcon name="crisis_alert" size={15} className="text-[#ff6961]" />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-white">Opening week triage</h2>
              <p className="text-[12px] text-war-text-muted">{meta.doctrine}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-semibold tabular-nums text-white">
              {activeCount} active · {flaggedCount} flagged
            </span>
            <button
              onClick={() => navigate('/incidents')}
              className="apple-button bg-white/10 px-4 py-2 text-[13px] text-white hover:bg-white/15"
            >
              Queue
            </button>
            <button
              onClick={() => navigate('/response')}
              className="apple-button bg-[#0a84ff] px-4 py-2 text-[13px] text-white hover:bg-[#409cff]"
            >
              Respond
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 lg:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[220px] flex-1">
          <h2 className="text-[16px] font-semibold tracking-tight text-white">Recovery trajectory</h2>
          <p className="text-[12px] text-war-text-muted">{meta.doctrine}</p>
          <button
            onClick={() => navigate('/recovery')}
            className="apple-button mt-3 bg-white/10 px-4 py-2 text-[13px] text-white hover:bg-white/15"
          >
            Open recovery center →
          </button>
        </div>
        <div className="min-w-[240px] flex-[2]">
          <ResponsiveContainer width="100%" height={96}>
            <AreaChart data={recoveryData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="phaseRiskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff453a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6e6e73' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#6e6e73' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Area type="monotone" dataKey="risk" stroke="#ff453a" strokeWidth={2} fill="url(#phaseRiskGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function CommandCenter() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const { project } = useProject();
  const { lastUpdated, isLive, isLoading, refresh, stats, liveIncidents } = useLiveData(project.keywords.join(','));
  const toast = useToast();
  const { pressure, reset: resetPressure } = useRoom();

  // Pressure belongs to the project under watch — clear it on switch.
  const projectId = project.id;
  useEffect(() => {
    resetPressure();
  }, [projectId, resetPressure]);

  // Demo-mode drift: while the backend is unreachable the labelled simulation
  // breathes slowly so the room feels alive. Never applied to live measurements.
  const [sim, setSim] = useState<SimValues>(SIM_BASE);
  useEffect(() => {
    if (isLive || isLoading) return;
    const id = window.setInterval(() => {
      setSim((s) => ({
        sentiment: driftValue(s.sentiment, 1.2, -35, -12, 0),
        velocity: driftValue(s.velocity, 2.5, 22, 55, 0),
        mentions: driftValue(s.mentions, 0.04, 1.5, 2.2, 2),
        reach: driftValue(s.reach, 0.6, 40, 54, 1),
        gauge: driftValue(s.gauge, 1.5, 62, 82, 0),
      }));
    }, 6000);
    return () => window.clearInterval(id);
  }, [isLive, isLoading]);

  // Period window + series filters drive the charts, sparklines and deltas.
  // Live data runs daily since release week; simulation runs hourly.
  // The selection is derived (not reset by effect) so labels never lie
  // when the data mode flips.
  const [periodSel, setPeriodSel] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showPos, setShowPos] = useState(true);
  const [showNeg, setShowNeg] = useState(true);

  const live = isLive ? stats : null;
  const periodOpts = live
    ? [{ id: 'ALL', label: 'Since release' }, { id: '7D', label: 'Last 7 days' }, { id: '3D', label: 'Last 3 days' }]
    : [{ id: '12H', label: 'Last 12 hours' }, { id: '6H', label: 'Last 6 hours' }, { id: '3H', label: 'Last 3 hours' }];
  const activeOpt = periodOpts.find((o) => o.id === periodSel) || periodOpts[0];
  const period = activeOpt.id;
  const periodCount = period === '7D' || period === '6H' ? 7 : period === '3D' || period === '3H' ? 3 : 14;
  const sentData = (live ? live.sentimentBuckets : sentimentTimelineData).slice(-periodCount);
  const velData = (live ? live.velocityBuckets : mentionVelocityData).slice(-periodCount);
  const riskData = (live ? live.riskBuckets : riskTrajectoryData).slice(-periodCount);

  const deltaPts = (arr: { negative: number }[]): number =>
    arr.length > 1 ? arr[arr.length - 1].negative - arr[arr.length - 2].negative : 0;
  const deltaPct = (arr: { mentions: number }[]): number => {
    if (arr.length < 2) return 0;
    const prev = arr[arr.length - 2].mentions;
    if (prev <= 0) return arr[arr.length - 1].mentions > 0 ? 100 : 0;
    return Math.round(((arr[arr.length - 1].mentions - prev) / prev) * 100);
  };
  const cumulative = (arr: { mentions: number }[]): { i: number; total: number }[] => {
    let run = 0;
    return arr.map((d, i) => ({ i, total: (run += d.mentions) }));
  };

  // Your interventions bend the room: gauge, negativity and velocity all
  // carry pressure. Signs are arranged so relief moves numbers toward calm.
  const negBase = live ? live.negPct : -sim.sentiment;
  const negShown = negBase + pressure.sentiment;
  const velBase = live ? live.velocityPct : sim.velocity;
  const velShown = velBase + pressure.velocity;
  const pressureActive = Math.abs(pressure.risk) >= 0.5 || Math.abs(pressure.velocity) >= 0.5;

  // Damage algorithm: one explainable score from measurements + model + you.
  const activeFilm = films.find((f) => f.id === projectId) || films[0];
  const activeMarkets = activeFilm.markets || [];

  const [activeScenario, setActiveScenario] = useState<ScenarioId>('baseline');
  const [dossierOpen, setDossierOpen] = useState(false);
  const [countermeasureOpen, setCountermeasureOpen] = useState(false);
  const [countermeasureType, setCountermeasureType] = useState<CountermeasureType>('press_release');

  const scenarioScoreOffset =
    activeScenario === 'leak' ? 24 : activeScenario === 'boycott' ? 20 : activeScenario === 'embargo' ? 14 : 0;

  const damage = computeDamage({
    negativity: live ? live.negPct : -sim.sentiment,
    velocityPct: live ? live.velocityPct : sim.velocity,
    reachMillions: live ? live.totalReach / 1e6 : sim.reach,
    weakMarkets: activeMarkets.filter((m) => m.health < 50).length,
    totalMarkets: activeMarkets.length,
    activeLeaks: leakLinks.filter((l) => l.status === 'ACTIVE').length + (activeScenario === 'leak' ? 3 : 0),
    pressureRisk: pressure.risk,
    sampleSize: live ? live.total : 0,
  });
  const gaugeScore = Math.min(98, Math.max(12, damage.score + scenarioScoreOffset));
  const escalation = escalationFor(gaugeScore, live ? live.velocityPct : sim.velocity);
  const [showWhy, setShowWhy] = useState(false);

  // Asymmetric easing: bad news lands instantly, relief settles slowly.
  // Snaps on project switch so films never inherit each other's score.
  const [gaugeShown, setGaugeShown] = useState(gaugeScore);
  const gaugeState = useRef({ id: projectId, value: gaugeScore });
  useEffect(() => {
    const s = gaugeState.current;
    if (s.id !== projectId) {
      gaugeState.current = { id: projectId, value: gaugeScore };
      setGaugeShown(gaugeScore);
      return;
    }
    if (s.value !== gaugeScore) {
      const next = smoothScore(s.value, gaugeScore);
      gaugeState.current = { id: projectId, value: next };
      setGaugeShown(next);
    }
  }, [projectId, gaugeScore]);

  const toggleFlag = (id: string, title: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast('Removed from investigation queue', 'info');
      } else {
        next.add(id);
        toast(`Flagged for investigation: ${title.slice(0, 60)}`, 'success');
      }
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        {/* Header — Apple large title */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Command Center</h1>
            <p className="apple-subhead mt-1">Real-time reputation intelligence for {project.title}.</p>
          </div>
          <div className="flex items-center gap-2.5">
            {isLive ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#30d158]/15 px-3 py-1.5">
                <GIcon name="radio" size={12} className="text-[#30d158] status-pulse" />
                <span className="text-[12px] font-semibold text-[#30d158]">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-[#ffd60a]/15 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd60a]" />
                <span className="text-[12px] font-semibold text-[#ffd60a]">Simulation</span>
              </div>
            )}
            <motion.button
              onClick={refresh}
              disabled={isLoading}
              aria-label="Refresh data"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-war-text-secondary transition hover:bg-white/[0.14] hover:text-white disabled:opacity-50"
              whileTap={{ scale: 0.85, rotate: -40 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <GIcon name="refresh" size={14} />
            </motion.button>
            <RefreshFlash
              pulseKey={lastUpdated || 'loading'}
              className="text-[12px] tabular-nums text-war-text-muted"
            >
              {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-IN')}` : 'Loading…'}
            </RefreshFlash>
          </div>
        </div>

        {/* Crisis Simulation Sandbox */}
        <CrisisSandbox
          activeScenario={activeScenario}
          onSelectScenario={setActiveScenario}
          onOpenCountermeasure={() => {
            setCountermeasureType(
              activeScenario === 'leak' ? 'piracy_dmca' : activeScenario === 'boycott' ? 'press_release' : 'exhibitor_memo'
            );
            setCountermeasureOpen(true);
          }}
        />

        {/* Active Scenario Warning Strip */}
        {activeScenario !== 'baseline' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-xl ${
              activeScenario === 'leak'
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : activeScenario === 'boycott'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                <GIcon name={activeScenario === 'leak' ? 'videocam_off' : activeScenario === 'boycott' ? 'report' : 'storefront'} size={20} />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider">
                  {activeScenario === 'leak' ? 'CRITICAL LEAK INJECTION' : activeScenario === 'boycott' ? 'COORDINATED BOYCOTT DRILL' : 'EXHIBITOR RESISTANCE DRILL'}
                </div>
                <div className="text-[13px] font-medium text-white">
                  {activeScenario === 'leak'
                    ? '14 Telegram & X channels circulating 4K climax sequence. Threat score elevated +24.'
                    : activeScenario === 'boycott'
                    ? '38,000 synthetic bot accounts targeting lead cast and rating portals. Threat score +20.'
                    : '320 South single-screens disputing revenue terms. Threat score +14.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCountermeasureType(
                    activeScenario === 'leak' ? 'piracy_dmca' : activeScenario === 'boycott' ? 'press_release' : 'exhibitor_memo'
                  );
                  setCountermeasureOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black shadow-md transition hover:bg-zinc-200 active:scale-95"
              >
                <GIcon name="bolt" size={14} />
                Execute Response Protocol
              </button>
              <button
                onClick={() => setActiveScenario('baseline')}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/20 active:scale-95"
              >
                Dismiss Drill
              </button>
            </div>
          </motion.div>
        )}

        <DamageCommand liveNegPct={live ? live.negPct : undefined} backendLive={isLive && !!stats} />

        <PhaseLead flaggedCount={flagged.size} />

        {/* Overview — High-contrast dark studio intelligence panel */}
        <div className="relative mt-8">
          <div className="relative rounded-[22px] border border-white/10 bg-[#0e1017] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] lg:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold tracking-[0.08em] text-blue-400 uppercase">Executive Intelligence</span>
                <h2 className="text-[22px] font-bold tracking-tight text-white">Reputation & Audience Velocity</h2>
              </div>
              <div className="relative z-30 flex items-center gap-2">
                <button
                  onClick={() => setDossierOpen(true)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-[13px] font-medium text-white transition hover:bg-white/15 active:scale-[0.98]"
                >
                  <GIcon name="description" size={14} className="text-amber-400" />
                  Print Briefing
                </button>
                {(periodOpen || filterOpen) && (
                  <button
                    aria-label="Close menus"
                    className="fixed inset-0 z-20 cursor-default bg-transparent"
                    onClick={() => { setPeriodOpen(false); setFilterOpen(false); }}
                  />
                )}
                <div className="relative z-30">
                  <button
                    onClick={() => { setPeriodOpen((o) => !o); setFilterOpen(false); }}
                    aria-expanded={periodOpen}
                    className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-[13px] font-medium text-white transition hover:bg-white/15 active:scale-[0.98]"
                  >
                    <GIcon name="calendar_month" size={14} />
                    {activeOpt.id === periodOpts[0].id ? 'Select Period' : activeOpt.label}
                    <GIcon name="expand_more" size={15} className={`text-white/60 transition-transform duration-300 ${periodOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {periodOpen && (
                      <motion.div
                        className="absolute right-0 z-30 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
                        initial={{ opacity: 0, scale: 0.92, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                      >
                        {periodOpts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setPeriodSel(p.id); setPeriodOpen(false); }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.07] active:scale-[0.98]"
                          >
                            <span className={period === p.id ? 'font-semibold text-white' : 'text-war-text-secondary'}>
                              {p.label}
                            </span>
                            {period === p.id && <GIcon name="check" size={14} className="text-[#64a8ff]" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative z-30">
                  <button
                    onClick={() => { setFilterOpen((o) => !o); setPeriodOpen(false); }}
                    aria-expanded={filterOpen}
                    className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-[13px] font-medium text-white transition hover:bg-white/15 active:scale-[0.98]"
                  >
                    <GIcon name="filter_alt" size={14} />
                    Filter
                    {(!showPos || !showNeg) && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0a84ff] px-1 text-[10px] font-bold text-white">
                        {(!showPos ? 1 : 0) + (!showNeg ? 1 : 0)}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {filterOpen && (
                      <motion.div
                        className="absolute right-0 z-30 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
                        initial={{ opacity: 0, scale: 0.92, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                      >
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Sentiment series</p>
                        {(
                          [
                            { label: 'Positive', on: showPos, set: setShowPos, dot: 'bg-[#30d158]' },
                            { label: 'Negative', on: showNeg, set: setShowNeg, dot: 'bg-[#ff453a]' },
                          ] as const
                        ).map((row) => (
                          <button
                            key={row.label}
                            onClick={() => row.set(!row.on)}
                            aria-pressed={row.on}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.07] active:scale-[0.98]"
                          >
                            <span className="flex items-center gap-2 text-war-text-secondary">
                              <span className={`h-2 w-2 rounded-full ${row.dot}`} /> {row.label}
                            </span>
                            <motion.span
                              className={`flex h-5 w-5 items-center justify-center rounded-full ${row.on ? 'bg-[#0a84ff]' : 'bg-white/10'}`}
                              animate={{ scale: row.on ? 1 : 0.85 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            >
                              {row.on && <GIcon name="check" size={12} className="text-white" />}
                            </motion.span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <Stagger key={`cards-${period}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Sentiment */}
              <StaggerItem index={0} className="rounded-2xl border border-white/8 bg-[#141620] p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 shadow-sm text-red-400">
                    <GIcon name="trending_down" size={16} />
                  </span>
                  <span className="text-[12px] font-medium text-zinc-400">Negative share</span>
                </div>
                {live ? (
                  <AnimatedNumber value={-negShown} suffix="%" className="metric-value mt-1 block tabular-nums text-white" />
                ) : (
                  <AnimatedNumber value={sim.sentiment - pressure.sentiment} suffix="%" className="metric-value mt-1 block tabular-nums text-white" />
                )}
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div>
                    {(() => {
                      const d = live ? deltaPts(live.sentimentBuckets) : deltaPts(sentimentTimelineData);
                      return (
                        <div className={`text-[13px] font-bold tabular-nums ${d > 0 ? 'text-[#ff6961]' : d < 0 ? 'text-[#30d158]' : 'text-zinc-400'}`}>
                          {d > 0 ? `−${d} pts` : d < 0 ? `+${-d} pts` : '0 pts'}
                        </div>
                      );
                    })()}
                    <div className="text-[11px] text-zinc-500">vs. last period</div>
                  </div>
                  <Spark data={sentData} dataKey="negative" id="spark-sent" />
                </div>
              </StaggerItem>

              {/* Velocity */}
              <StaggerItem index={1} className="rounded-2xl border border-white/8 bg-[#141620] p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 shadow-sm text-blue-400">
                    <GIcon name="bolt" size={16} />
                  </span>
                  <span className="text-[12px] font-medium text-zinc-400">{live ? 'Stories / day' : 'Neg. velocity'}</span>
                </div>
                {live ? (
                  <AnimatedNumber value={live.lastCount} className="metric-value mt-1 block tabular-nums text-white" />
                ) : (
                  <AnimatedNumber value={Math.round(velShown)} prefix={velShown >= 0 ? '+' : ''} suffix="%" className="metric-value mt-1 block tabular-nums text-white" />
                )}
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div>
                    {(() => {
                      const v = live ? Math.round(velShown) : deltaPct(mentionVelocityData);
                      return (
                        <>
                          <div className={`text-[13px] font-bold tabular-nums ${v > 0 ? 'text-[#ff6961]' : v < 0 ? 'text-[#30d158]' : 'text-zinc-400'}`}>
                            {v > 0 ? `+${v} %` : v < 0 ? `${v} %` : '0 %'}
                          </div>
                          <div className="text-[11px] text-zinc-500">vs. last period</div>
                        </>
                      );
                    })()}
                  </div>
                  <Spark data={velData} dataKey="mentions" id="spark-vel" />
                </div>
              </StaggerItem>

              {/* Mentions */}
              <StaggerItem index={2} className="rounded-2xl border border-white/8 bg-[#141620] p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 shadow-sm text-amber-400">
                    <GIcon name="tag" size={16} />
                  </span>
                  <span className="text-[12px] font-medium text-zinc-400">Stories tracked</span>
                </div>
                {live ? (
                  <AnimatedNumber value={live.total} className="metric-value mt-1 block tabular-nums text-white" />
                ) : (
                  <AnimatedNumber value={sim.mentions} decimals={2} suffix="M" className="metric-value mt-1 block tabular-nums text-white" />
                )}
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div>
                    {live ? (
                      <>
                        <div className={`text-[13px] font-bold tabular-nums ${live.lastCount > 0 ? 'text-[#ff6961]' : 'text-zinc-400'}`}>
                          {live.lastCount > 0 ? `+${live.lastCount}` : '0'}
                        </div>
                        <div className="text-[11px] text-zinc-500">stories today</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[13px] font-bold tabular-nums text-[#ff6961]">+62 %</div>
                        <div className="text-[11px] text-zinc-500">vs. last period</div>
                      </>
                    )}
                  </div>
                  <Spark data={cumulative(velData)} dataKey="total" id="spark-men" />
                </div>
              </StaggerItem>

              {/* Reach */}
              <StaggerItem index={3} className="rounded-2xl border border-white/8 bg-[#141620] p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 shadow-sm text-emerald-400">
                    <GIcon name="visibility" size={16} />
                  </span>
                  <span className="text-[12px] font-medium text-zinc-400">Est. reach</span>
                </div>
                {live ? (
                  <AnimatedNumber value={live.totalReach / 1e6} decimals={1} suffix="M" className="metric-value mt-1 block tabular-nums text-white" />
                ) : (
                  <AnimatedNumber value={sim.reach} decimals={1} suffix="M" className="metric-value mt-1 block tabular-nums text-white" />
                )}
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div>
                    {live ? (
                      <>
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 status-pulse" /> live
                        </div>
                        <div className="text-[11px] text-zinc-500">counting now</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[13px] font-bold tabular-nums text-blue-400">Expanding</div>
                        <div className="text-[11px] text-zinc-500">vs. last period</div>
                      </>
                    )}
                  </div>
                  <Spark data={sentData} dataKey="positive" id="spark-reach" />
                </div>
              </StaggerItem>
            </Stagger>
          </div>
        </div>

        {/* Real-time External Intel Radar (YouTube, Wikipedia Edit Guard, 30-Day Audience Curve) */}
        <div className="mt-8">
          <LiveIntelStream />
        </div>

        {/* Risk detail — gauge, trending, model */}
        <div className="glass-panel p-6 lg:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <span className="section-title">Risk detail</span>
            <div className="flex items-center gap-2">
              {pressureActive && (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${pressure.risk < 0 ? 'bg-[#30d158]/15 text-[#30d158]' : 'bg-[#ffd60a]/15 text-[#ffd60a]'}`}>
                  Interventions {pressure.risk > 0 ? '+' : ''}{Math.round(pressure.risk)} risk
                </span>
              )}
              {live && live.total < 20 && (
                <span className="rounded-full bg-[#ffd60a]/15 px-2.5 py-1 text-[11px] font-semibold text-[#ffd60a]">
                  Thin coverage — treat as approximate
                </span>
              )}
              <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium tabular-nums text-war-text-muted">
                {live ? `Live · ${live.total} stories` : 'Simulation mode'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Main Risk Score */}
            <div className="col-span-12 flex flex-col items-center justify-center pb-6 md:col-span-4 md:border-r md:border-white/[0.08] md:pb-0 md:pr-6">
              <RiskGauge score={Math.round(gaugeShown)} label="Reputation risk" />
              <div className="mt-4 text-center">
                <StatusBadge
                  severity={
                    gaugeShown >= 70 ? 'CRITICAL' : gaugeShown >= 45 ? 'HIGH' : gaugeShown >= 20 ? 'MEDIUM' : 'LOW'
                  }
                  size="md"
                />
                <p className="mx-auto mt-2.5 max-w-[220px] text-[13px] leading-relaxed text-war-text-muted">
                  {isLive && stats ? (
                    <>Negative share of <span className="font-semibold text-white">{stats.total} live stories</span></>
                  ) : (
                    <>Risk increased <span className="font-semibold text-[#ff6961]">18%</span> in the last{' '}
                    <span className="font-semibold text-white">42 minutes</span></>
                  )}
                </p>
                <button
                  onClick={() => setShowWhy((v) => !v)}
                  aria-expanded={showWhy}
                  className="mx-auto mt-2 flex items-center gap-1 text-[12px] font-medium text-[#64a8ff] transition hover:text-white"
                >
                  Why this score?
                  <GIcon name="expand_more" size={14} className={`transition-transform duration-300 ${showWhy ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {showWhy && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mx-auto mt-2 max-w-[240px] space-y-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left">
                        {damage.contributions.map((c) => (
                          <div key={c.factor} className="flex items-center justify-between text-[11px]">
                            <span className="text-war-text-secondary">{c.factor} <span className="text-war-text-muted">· {c.weight}</span></span>
                            <span className="font-semibold tabular-nums text-white">+{c.points}</span>
                          </div>
                        ))}
                        {damage.surcharge > 0 && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-war-text-secondary">Viral-hostility surcharge</span>
                            <span className="font-semibold tabular-nums text-[#ff6961]">+{damage.surcharge}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-white/[0.08] pt-1.5 text-[11px]">
                          <span className="text-war-text-secondary">Interventions</span>
                          <span className="font-semibold tabular-nums text-white">{pressure.risk >= 0 ? '+' : ''}{Math.round(pressure.risk * 10) / 10}</span>
                        </div>
                        {damage.capped && (
                          <p className="text-[10px] leading-snug text-[#ffd60a]">Capped: thin sample, refusing to cry Critical.</p>
                        )}
                        <p className="pt-0.5 text-[10px] leading-snug text-war-text-muted">
                          {escalation.level} protocol · {escalation.protocol}
                        </p>
                        <p className="text-[10px] leading-snug text-war-text-muted">Rises instantly, eases slowly.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Trending */}
            <div className="col-span-12 md:col-span-4 md:border-l md:border-white/[0.08] md:pl-6">
              <div className="metric-label mb-2.5">Trending</div>
              {isLive && stats && stats.trending.length > 0 ? (
                <>
                  <div className="rounded-2xl border border-[#ff453a]/25 bg-[#ff453a]/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GIcon name="tag" size={15} className="text-[#ff6961]" />
                      <span className="text-[15px] font-semibold capitalize tracking-tight text-[#ff6961]">{stats.trending[0].term}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-[12px] font-semibold tabular-nums text-[#ff6961]">{stats.trending[0].mentions} stories</span>
                      <span className="text-[12px] tabular-nums text-war-text-muted">{stats.trending[0].reachLabel} reach</span>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {stats.trending.slice(1, 3).map((t, i) => (
                      <div key={t.term} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[13px]">
                        <span className="capitalize text-war-text-secondary">{t.term}</span>
                        <span className={i === 0 ? 'font-semibold tabular-nums text-[#ff9f0a]' : 'font-semibold tabular-nums text-[#ffd60a]'}>
                          {t.mentions} stories
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-[#ff453a]/25 bg-[#ff453a]/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GIcon name="tag" size={15} className="text-[#ff6961]" />
                      <span className="text-[15px] font-semibold tracking-tight text-[#ff6961]">BoycottToxic</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-[12px] font-semibold text-[#ff6961]">+94% / 20 min</span>
                      <span className="text-[12px] text-war-text-muted">4.2M reach</span>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[13px]">
                      <span className="text-war-text-secondary">#ToxicControversy</span>
                      <span className="font-semibold text-[#ff9f0a]">+42%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[13px]">
                      <span className="text-war-text-secondary">#BoycottBollywood</span>
                      <span className="font-semibold text-[#ffd60a]">+18%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Crisis Score Breakdown */}
            <div className="col-span-12 md:col-span-4 md:border-l md:border-white/[0.08] md:pl-6">
              <div className="metric-label mb-2">Risk model</div>
              <div className="space-y-1">
                <SubMetricBar label="SENTIMENT" score={live ? live.negPct : crisisScore.sentiment} tooltip="Measured live: negative share of tracked stories." />
                <SubMetricBar label="VELOCITY" score={live ? Math.min(100, Math.abs(live.velocityPct)) : crisisScore.velocity} tooltip="Measured live: day-over-day volume change." />
                <SubMetricBar label="REACH" score={live ? Math.min(100, Math.round(Math.sqrt(live.totalReach) / 40)) : crisisScore.reach} tooltip="Measured live: normalized audience exposure index." />
                <SubMetricBar label="AUTHORITY" score={crisisScore.authority} tooltip="Modelled estimate: weighted influence of accounts driving the conversation." />
                <SubMetricBar label="COORDINATION" score={crisisScore.coordination} tooltip="Modelled estimate: degree of coordinated inauthentic behavior detected." />
                <SubMetricBar label="PERSISTENCE" score={crisisScore.persistence} tooltip="Modelled estimate: how long the negative narrative has sustained itself." />
              </div>
              <p className="apple-footnote mt-2">{live ? 'Top 3 measured live · bottom 3 modelled' : 'Simulation values'}</p>
            </div>
          </div>
        </div>

        {/* D3.js High-Fidelity Threat Telemetry Stream Chart */}
        <div className="mt-8">
          <D3ThreatTelemetryChart
            currentRisk={Math.round(gaugeShown)}
            liveStoryCount={live?.total ?? 42}
          />
        </div>

        {/* Charts Row */}
        <div key={`charts-${period}`} className="grid grid-cols-1 gap-4 lg:grid-cols-3 fade-in">
          <div className="glass-panel apple-card-hover p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="section-title">Sentiment timeline</span>
              <span className="apple-footnote">{live ? `Live · ${live.rangeLabel}` : 'Last 12h'}</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={sentData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#30d158" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 13, color: '#f5f5f7' }}
                  labelStyle={{ color: '#a1a1a6' }}
                />
                {showPos && (
                  <Area type="monotone" dataKey="positive" stroke="#30d158" strokeWidth={2} fill="url(#posGrad)" dot={false} />
                )}
                {showNeg && (
                  <Area type="monotone" dataKey="negative" stroke="#ff453a" strokeWidth={2} fill="url(#negGrad)" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel apple-card-hover p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="section-title">Mention velocity</span>
              <span className="apple-footnote">{live ? `Live · ${live.rangeLabel}` : 'Per hour'}</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={velData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 13, color: '#f5f5f7' }}
                  labelStyle={{ color: '#a1a1a6' }}
                />
                <Bar dataKey="mentions" radius={[6, 6, 2, 2]}>
                  {velData.map((_, idx, arr) => (
                    <Cell
                      key={idx}
                      fill={idx >= arr.length - 3 ? '#ff453a' : idx >= arr.length - 6 ? '#ff9f0a' : '#0a84ff'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel apple-card-hover p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="section-title">Risk trajectory</span>
              <span className="apple-footnote">{live ? `Live · ${live.rangeLabel}` : 'Projected'}</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={riskData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 13, color: '#f5f5f7' }}
                  labelStyle={{ color: '#a1a1a6' }}
                />
                <Area type="monotone" dataKey="risk" stroke="#ff453a" strokeWidth={2.5} fill="url(#riskGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline + Incidents Row */}
        <div className="grid grid-cols-12 gap-4">
          {/* Timeline */}
          <div className="col-span-12 glass-panel p-5 xl:col-span-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">What changed</span>
              <span className="apple-footnote">{live ? 'Live detections' : 'Today'}</span>
            </div>
            <div className="relative">
              <div className="absolute bottom-0 left-[26px] top-0 w-px bg-white/[0.08]" />
              <Stagger key={live ? `tl-${lastUpdated}` : 'tl-sim'} className="space-y-1">
                {(live
                  ? liveIncidents.slice(0, 7).map((inc: any) => ({
                      id: inc.id,
                      time: inc.time,
                      title: inc.title,
                      severity: (inc.sentiment === 'NEGATIVE' ? 'HIGH' : inc.sentiment === 'POSITIVE' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
                      reach: inc.reach,
                      source: inc.source as string | undefined,
                    }))
                  : timelineEvents
                ).map((event, i) => (
                  <StaggerItem key={event.id} index={i}>
                  <button
                    onClick={() => toggleFlag(event.id, event.title)}
                    aria-pressed={flagged.has(event.id)}
                    title={flagged.has(event.id) ? 'Unflag event' : 'Flag for investigation'}
                    className={clsx(
                      'group flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.05] active:scale-[0.99]',
                      flagged.has(event.id) && 'bg-[#0a84ff]/[0.07]'
                    )}
                  >
                    <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#2c2c2e]">
                      <div
                        className={clsx(
                          'h-2 w-2 rounded-full',
                          event.severity === 'CRITICAL' && 'bg-[#ff453a]',
                          event.severity === 'HIGH' && 'bg-[#ff9f0a]',
                          event.severity === 'MEDIUM' && 'bg-[#ffd60a]',
                          event.severity === 'LOW' && 'bg-[#0a84ff]'
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium tabular-nums text-war-text-secondary">{event.time}</span>
                        <StatusBadge severity={event.severity} size="xs" />
                      </div>
                      <p className="mt-1 text-[14px] font-normal leading-snug text-white">{event.title}</p>
                      {event.reach && (
                        <span className="mt-0.5 block text-[12px] text-war-text-muted">
                          Reach · {event.reach}{'source' in event && event.source ? ` · ${event.source}` : ''}
                        </span>
                      )}
                    </div>
                    {flagged.has(event.id) ? (
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/20 text-[12px] font-bold text-[#64a8ff]">
                        ✓
                      </span>
                    ) : (
                      <GIcon name="arrow_forward" size={14} className="mt-1 shrink-0 text-war-text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    )}
                  </button>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>

          {/* Active Incidents */}
          <div className="col-span-12 glass-panel p-5 xl:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <span className="section-title">Active incidents</span>
              <div className="flex items-center gap-2.5">
                {isLive && (
                  <span className="flex items-center gap-1.5 rounded-full bg-[#30d158]/15 px-2.5 py-1 text-[11px] font-semibold text-[#30d158]">
                    <GIcon name="radio" size={10} /> Live
                  </span>
                )}
                <span className="text-[12px] text-war-text-muted">{incidents.filter(i => i.status !== 'RESOLVED').length} active</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">
                    <th className="pb-2.5 pr-3 text-left font-semibold">Severity</th>
                    <th className="pb-2.5 pr-3 text-left font-semibold">Incident</th>
                    <th className="pb-2.5 pr-3 text-left font-semibold">Detected</th>
                    <th className="pb-2.5 pr-3 text-left font-semibold">Velocity</th>
                    <th className="pb-2.5 pr-3 text-left font-semibold">Reach</th>
                    <th className="pb-2.5 pr-3 text-left font-semibold">Status</th>
                    <th className="pb-2.5 pr-3 text-left font-semibold">Owner</th>
                    <th className="pb-2.5 text-left font-semibold"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className="group cursor-pointer border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.04]"
                      onClick={() => setSelectedIncident(inc)}
                    >
                      <td className="py-3 pr-3">
                        <StatusBadge severity={inc.severity} size="xs" />
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[14px] font-medium tracking-[-0.006em] text-white">{inc.title}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[12px] tabular-nums text-war-text-secondary">{inc.firstDetected}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[13px] font-semibold tabular-nums text-[#ff6961]">{inc.velocity}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[13px] tabular-nums text-war-text-secondary">{inc.reach}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[12px] font-medium capitalize text-war-text-secondary">{inc.status.toLowerCase()}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[13px] text-war-text-secondary">{inc.owner}</span>
                      </td>
                      <td className="py-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.07] text-[13px] text-war-text-secondary opacity-0 transition group-hover:opacity-100">
                          →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedIncident && (
          <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
        )}
      </AnimatePresence>

      {/* Executive Briefing Dossier */}
      <ExecutiveDossierModal
        isOpen={dossierOpen}
        onClose={() => setDossierOpen(false)}
        activeScenario={activeScenario}
      />

      {/* Actionable Countermeasure Dispatcher */}
      <CountermeasureModal
        isOpen={countermeasureOpen}
        onClose={() => setCountermeasureOpen(false)}
        initialType={countermeasureType}
      />
    </div>
  );
}
