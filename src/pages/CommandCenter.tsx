import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Zap,
  Hash,
  ArrowRight,
  RefreshCw,
  Radio,
} from 'lucide-react';
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
} from '../data/mockData';
import { StatusBadge } from '../components/ui/StatusBadge';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { useToast } from '../components/Toaster';
import { useLiveData } from '../hooks/useLiveData';
import { motion } from 'framer-motion';
import { AnimatedNumber, RefreshFlash, Stagger, StaggerItem } from '../components/motion';
import type { Incident } from '../data/types';

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

export function CommandCenter() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const { lastUpdated, isLive, isLoading, refresh } = useLiveData();
  const toast = useToast();

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
            <p className="apple-subhead mt-1">Real-time reputation intelligence for Project Veera.</p>
          </div>
          <div className="flex items-center gap-2.5">
            {isLive ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#30d158]/15 px-3 py-1.5">
                <Radio size={12} className="text-[#30d158] status-pulse" />
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
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </motion.button>
            <RefreshFlash
              pulseKey={lastUpdated || 'loading'}
              className="text-[12px] tabular-nums text-war-text-muted"
            >
              {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-IN')}` : 'Loading…'}
            </RefreshFlash>
          </div>
        </div>

        {/* Current Situation */}
        <div className="glass-panel p-6 lg:p-7">
          <div className="mb-5 flex items-center justify-between">
            <span className="section-title">Current situation</span>
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-war-text-muted">Simulation mode</span>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Main Risk Score */}
            <div className="col-span-12 flex flex-col items-center justify-center pb-6 md:col-span-3 md:border-r md:border-white/[0.08] md:pb-0 md:pr-6">
              <RiskGauge score={crisisScore.overall} label="Reputation risk" />
              <div className="mt-4 text-center">
                <StatusBadge severity="CRITICAL" size="md" />
                <p className="mx-auto mt-2.5 max-w-[220px] text-[13px] leading-relaxed text-war-text-muted">
                  Risk increased <span className="font-semibold text-[#ff6961]">18%</span> in the last{' '}
                  <span className="font-semibold text-white">42 minutes</span>
                </p>
              </div>
            </div>

            {/* Metrics Grid — spring count-ups on mount + every live refresh */}
            <Stagger className="col-span-12 grid grid-cols-2 gap-x-4 gap-y-6 md:col-span-3">
              <StaggerItem index={0}>
                <div className="metric-label">Sentiment</div>
                <AnimatedNumber value={-24} suffix="%" className="metric-value mt-1 block text-[#ff6961]" />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <TrendingDown size={12} className="text-[#ff6961]" />
                  <span className="text-[12px] font-medium text-[#ff6961]">Declining</span>
                </div>
              </StaggerItem>
              <StaggerItem index={1}>
                <div className="metric-label">Neg. velocity</div>
                <AnimatedNumber value={38} prefix="+" suffix="%" className="metric-value mt-1 block text-[#ff6961]" />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Zap size={12} className="text-[#ff6961]" />
                  <span className="text-[12px] font-medium text-[#ff6961]">Accelerating</span>
                </div>
              </StaggerItem>
              <StaggerItem index={2}>
                <div className="metric-label">Mentions</div>
                <AnimatedNumber value={1.84} decimals={2} suffix="M" className="metric-value mt-1 block text-white" />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-[#ff9f0a]" />
                  <span className="text-[12px] font-medium text-[#ff9f0a]">+62%</span>
                </div>
              </StaggerItem>
              <StaggerItem index={3}>
                <div className="metric-label">Est. reach</div>
                <AnimatedNumber value={46.7} decimals={1} suffix="M" className="metric-value mt-1 block text-white" />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Eye size={12} className="text-[#64a8ff]" />
                  <span className="text-[12px] font-medium text-[#64a8ff]">Expanding</span>
                </div>
              </StaggerItem>
            </Stagger>

            {/* Trending */}
            <div className="col-span-12 md:col-span-3 md:border-l md:border-white/[0.08] md:pl-6">
              <div className="metric-label mb-2.5">Trending</div>
              <div className="rounded-2xl border border-[#ff453a]/25 bg-[#ff453a]/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Hash size={15} className="text-[#ff6961]" />
                  <span className="text-[15px] font-semibold tracking-tight text-[#ff6961]">BoycottVeera</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-[#ff6961]">+94% / 20 min</span>
                  <span className="text-[12px] text-war-text-muted">4.2M reach</span>
                </div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[13px]">
                  <span className="text-war-text-secondary">#VeeraControversy</span>
                  <span className="font-semibold text-[#ff9f0a]">+42%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[13px]">
                  <span className="text-war-text-secondary">#BoycottBollywood</span>
                  <span className="font-semibold text-[#ffd60a]">+18%</span>
                </div>
              </div>
            </div>

            {/* Crisis Score Breakdown */}
            <div className="col-span-12 md:col-span-3 md:border-l md:border-white/[0.08] md:pl-6">
              <div className="metric-label mb-2">Risk model</div>
              <div className="space-y-1">
                <SubMetricBar label="SENTIMENT" score={crisisScore.sentiment} tooltip="Measures the proportion and intensity of negative conversation." />
                <SubMetricBar label="VELOCITY" score={crisisScore.velocity} tooltip="Measures the rate at which negative conversation is accelerating." />
                <SubMetricBar label="REACH" score={crisisScore.reach} tooltip="Estimated total audience exposure across all platforms." />
                <SubMetricBar label="AUTHORITY" score={crisisScore.authority} tooltip="Weighted influence of accounts driving the conversation." />
                <SubMetricBar label="COORDINATION" score={crisisScore.coordination} tooltip="Degree of coordinated inauthentic behavior detected." />
                <SubMetricBar label="PERSISTENCE" score={crisisScore.persistence} tooltip="How long the negative narrative has sustained itself." />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-panel apple-card-hover p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="section-title">Sentiment timeline</span>
              <span className="apple-footnote">Last 12h</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={sentimentTimelineData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 13, color: '#f5f5f7' }}
                  labelStyle={{ color: '#a1a1a6' }}
                />
                <Area type="monotone" dataKey="positive" stroke="#30d158" strokeWidth={2} fill="url(#posGrad)" dot={false} />
                <Area type="monotone" dataKey="negative" stroke="#ff453a" strokeWidth={2} fill="url(#negGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel apple-card-hover p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="section-title">Mention velocity</span>
              <span className="apple-footnote">Per hour</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={mentionVelocityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 13, color: '#f5f5f7' }}
                  labelStyle={{ color: '#a1a1a6' }}
                />
                <Bar dataKey="mentions" radius={[6, 6, 2, 2]}>
                  {mentionVelocityData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={idx >= mentionVelocityData.length - 3 ? '#ff453a' : idx >= mentionVelocityData.length - 6 ? '#ff9f0a' : '#0a84ff'}
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
              <span className="apple-footnote">Projected</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={riskTrajectoryData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff453a" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
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
              <span className="apple-footnote">Today</span>
            </div>
            <div className="relative">
              <div className="absolute bottom-0 left-[26px] top-0 w-px bg-white/[0.08]" />
              <Stagger className="space-y-1">
                {timelineEvents.map((event, i) => (
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
                        <span className="mt-0.5 block text-[12px] text-war-text-muted">Reach · {event.reach}</span>
                      )}
                    </div>
                    {flagged.has(event.id) ? (
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/20 text-[12px] font-bold text-[#64a8ff]">
                        ✓
                      </span>
                    ) : (
                      <ArrowRight size={14} className="mt-1 shrink-0 text-war-text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
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
                    <Radio size={10} /> Live
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
    </div>
  );
}
