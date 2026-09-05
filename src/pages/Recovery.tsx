import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const recoveryData = [
  { day: 'Day 1', risk: 72, negative: 78, positive: 8, confidence: 12 },
  { day: 'Day 2', risk: 68, negative: 72, positive: 14, confidence: 18 },
  { day: 'Day 3', risk: 58, negative: 62, positive: 22, confidence: 28 },
  { day: 'Day 4', risk: 48, negative: 52, positive: 30, confidence: 38 },
  { day: 'Day 5', risk: 38, negative: 42, positive: 38, confidence: 48 },
  { day: 'Day 6', risk: 30, negative: 34, positive: 44, confidence: 56 },
  { day: 'Day 7', risk: 24, negative: 28, positive: 48, confidence: 62 },
];

const phases = [
  {
    name: 'Crisis',
    status: 'Active',
    pill: 'bg-[#ff453a]/15 text-[#ff6961]',
    metrics: [
      { label: 'Risk level', value: '72/100' },
      { label: 'Negative velocity', value: '+38%' },
      { label: 'Active incidents', value: '5' },
    ],
  },
  {
    name: 'Stabilization',
    status: 'Pending',
    pill: 'bg-[#ffd60a]/15 text-[#ffd60a]',
    metrics: [
      { label: 'Target risk', value: '<40' },
      { label: 'Sentiment recovery', value: '−15%' },
      { label: 'Est. timeline', value: '3–5 days' },
    ],
  },
  {
    name: 'Recovery',
    status: 'Upcoming',
    pill: 'bg-[#30d158]/15 text-[#30d158]',
    metrics: [
      { label: 'Target risk', value: '<20' },
      { label: 'Positive sentiment', value: '>40%' },
      { label: 'Est. timeline', value: '7–14 days' },
    ],
  },
];

const recoveryMetrics = [
  { label: 'Risk level', current: '72', target: '<20', progress: 15 },
  { label: 'Negative velocity', current: '+38%', target: '<0%', progress: 10 },
  { label: 'Positive conversation', current: '8%', target: '>40%', progress: 20 },
  { label: 'Audience confidence', current: '12%', target: '>60%', progress: 20 },
  { label: 'Media sentiment', current: '−52%', target: '>0%', progress: 12 },
];

export function Recovery() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Recovery</h1>
          <p className="apple-subhead mt-1">Reputation recovery trajectory for Project Veera.</p>
        </div>

        {/* Current Status */}
        <div className="glass-panel p-5">
          <div className="section-title mb-4">Recovery status</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {recoveryMetrics.map((m) => (
              <div key={m.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">{m.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[20px] font-bold tabular-nums tracking-tight text-white">{m.current}</span>
                  <span className="text-[12px] tabular-nums text-war-text-muted">→ {m.target}</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-[#0a84ff]"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Trajectory */}
        <div className="glass-panel p-5">
          <div className="section-title mb-4">Recovery trajectory</div>
          <div className="mb-6 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {phases.map((phase, i) => (
              <div key={phase.name} className="flex items-stretch gap-2.5">
                <div className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[14px] font-semibold tracking-[-0.006em] text-white">{phase.name}</span>
                    <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-semibold', phase.pill)}>{phase.status}</span>
                  </div>
                  <div className="space-y-1.5">
                    {phase.metrics.map((m) => (
                      <div key={m.label} className="flex items-center justify-between text-[13px]">
                        <span className="text-war-text-muted">{m.label}</span>
                        <span className="font-semibold tabular-nums text-war-text-secondary">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {i < phases.length - 1 && (
                  <ArrowRight size={15} className="hidden shrink-0 self-center text-war-text-muted md:block" />
                )}
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={recoveryData} margin={{ top: 5, right: 20, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="riskRecoveryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff453a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="posRecoveryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#30d158" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 13, color: '#f5f5f7' }}
                labelStyle={{ color: '#a1a1a6' }}
              />
              <Area type="monotone" dataKey="risk" stroke="#ff453a" strokeWidth={2.5} fill="url(#riskRecoveryGrad)" dot={false} name="Risk" />
              <Area type="monotone" dataKey="positive" stroke="#30d158" strokeWidth={2.5} fill="url(#posRecoveryGrad)" dot={false} name="Positive" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
