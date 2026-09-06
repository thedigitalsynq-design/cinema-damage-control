import { useState } from 'react';
import { clsx } from 'clsx';
import { influencers } from '../data/mockData';
import { LiveBanner } from '../components/LiveBanner';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';

const categoryLabels: Record<string, string> = {
  ACTOR: 'Actor',
  CREATOR: 'Creator',
  JOURNALIST: 'Journalist',
  CRITIC: 'Critic',
  FAN_ACCOUNT: 'Fan account',
  POLITICAL_FIGURE: 'Political figure',
  ENTERTAINMENT_PAGE: 'Ent. page',
};

export function InfluencerIntelligence() {
  const [filter, setFilter] = useState<string>('ALL');
  const categories = ['ALL', 'ACTOR', 'CREATOR', 'JOURNALIST', 'CRITIC', 'FAN_ACCOUNT', 'POLITICAL_FIGURE', 'ENTERTAINMENT_PAGE'];
  const filtered = filter === 'ALL' ? influencers : influencers.filter((i) => i.category === filter);
  const { project } = useProject();
  const { liveIncidents, isLive } = useLiveData(project.keywords.join(','));

  const surfacing = (() => {
    if (!isLive) return [];
    const counts = new Map<string, number>();
    for (const inc of liveIncidents as { entities?: string[] }[]) {
      for (const e of inc.entities || []) counts.set(e, (counts.get(e) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Influencers</h1>
            <p className="apple-subhead mt-1">Key voices shaping the conversation.</p>
          </div>
          <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-medium tabular-nums text-war-text-secondary">{filtered.length} voices</span>
        </div>

        <LiveBanner />

        {surfacing.length > 0 && (
          <div className="glass-panel p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="section-title">Names surfacing in live coverage</span>
              <span className="apple-footnote">extracted from headlines</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {surfacing.map(([name, n]) => (
                <span key={name} className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] text-war-text-secondary">
                  {name}
                  <span className="font-semibold tabular-nums text-white">{n}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Segmented filter */}
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={clsx(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97]',
                filter === cat
                  ? 'bg-white text-black shadow'
                  : 'text-war-text-secondary hover:text-white'
              )}
            >
              {cat === 'ALL' ? 'All' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Influencer Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inf) => (
            <div key={inf.id} className="glass-panel apple-card-hover p-5">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#48484a] to-[#2c2c2e] ring-1 ring-white/10">
                    <span className="text-[14px] font-semibold text-white">
                      {inf.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold tracking-[-0.006em] text-white">{inf.name}</div>
                    <div className="text-[12px] text-war-text-muted">{inf.handle}</div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-war-text-secondary">
                  {categoryLabels[inf.category] || inf.category}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.03] p-3.5">
                <div>
                  <div className="metric-label">Audience</div>
                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{inf.audience}</div>
                </div>
                <div>
                  <div className="metric-label">Engagement</div>
                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{inf.engagement}</div>
                </div>
                <div>
                  <div className="metric-label">Reach</div>
                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{inf.reach}</div>
                </div>
                <div>
                  <div className="metric-label">Influence</div>
                  <div className={clsx('mt-0.5 text-[14px] font-semibold tabular-nums', inf.influenceScore > 80 ? 'text-[#ff6961]' : inf.influenceScore > 60 ? 'text-[#ffb340]' : 'text-[#ffd60a]')}>
                    {inf.influenceScore}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-war-text-muted">Sentiment</span>
                  <span className={clsx('text-[12px] font-semibold capitalize', inf.sentiment === 'NEGATIVE' ? 'text-[#ff6961]' : inf.sentiment === 'POSITIVE' ? 'text-[#30d158]' : 'text-war-text-secondary')}>
                    {inf.sentiment.toLowerCase()}
                  </span>
                </div>
                <span className="max-w-[140px] truncate text-[12px] text-war-text-muted" title={inf.narrative}>{inf.narrative}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Amplification Network */}
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="section-title">Amplification network</span>
            <span className="apple-footnote">Connections between top voices</span>
          </div>
          <div className="relative h-[220px] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40">
            <svg className="h-full w-full" viewBox="0 0 800 200">
              <line x1={80} y1={50} x2={260} y2={50} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4" />
              <line x1={260} y1={50} x2={440} y2={50} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4" />
              <line x1={440} y1={50} x2={620} y2={150} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4" />
              <line x1={80} y1={150} x2={260} y2={150} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4" />
              <line x1={260} y1={150} x2={440} y2={50} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4" />
              {influencers.map((inf, i) => {
                const x = 80 + (i % 4) * 180;
                const y = 50 + Math.floor(i / 4) * 100;
                return (
                  <g key={inf.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={Math.max(9, inf.influenceScore / 8)}
                      fill={inf.sentiment === 'NEGATIVE' ? '#ff453a33' : inf.sentiment === 'POSITIVE' ? '#30d15833' : '#a1a1a633'}
                      stroke={inf.sentiment === 'NEGATIVE' ? '#ff453a' : inf.sentiment === 'POSITIVE' ? '#30d158' : '#a1a1a6'}
                      strokeWidth={1.5}
                    />
                    <text x={x} y={y + 26} textAnchor="middle" fill="#a1a1a6" fontSize={11}>
                      {inf.handle.split('@')[1]?.substring(0, 12)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
