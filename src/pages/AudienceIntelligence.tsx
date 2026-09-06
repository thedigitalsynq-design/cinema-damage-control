import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { audienceSegments, geographyData, languageData } from '../data/mockData';
import { LiveBanner } from '../components/LiveBanner';
import { useProject } from '../components/ProjectContext';
import { api, formatCompact } from '../data/apiService';

const tooltipStyle = {
  background: '#2c2c2e',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 13,
  color: '#f5f5f7',
};

export function AudienceIntelligence() {
  const { project } = useProject();
  const [interest, setInterest] = useState<{ article: string; days: { date: string; views: number }[]; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getInterest(project.title);
      if (!cancelled && res.success && res.days && res.days.length > 0) {
        setInterest({ article: res.article || project.title, days: res.days, total: res.total || 0 });
      } else if (!cancelled) {
        setInterest(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project]);

  const peak = interest ? interest.days.reduce((b, d) => (d.views > b.views ? d : b), interest.days[0]) : null;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Audience</h1>
          <p className="apple-subhead mt-1">Audience segmentation and geographic distribution.</p>
        </div>

        <LiveBanner />

        {interest && peak && (
          <div className="glass-panel p-5">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="section-title">Search interest — Wikipedia</span>
              <span className="apple-footnote">{interest.article} · daily pageviews</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1">
              <span className="text-[13px] text-war-text-muted">30-day total <span className="font-bold tabular-nums text-white">{formatCompact(interest.total)}</span></span>
              <span className="text-[13px] text-war-text-muted">Peak <span className="font-bold tabular-nums text-[#ffb340]">{peak.date} · {formatCompact(peak.views)}</span></span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={interest.days.map((d) => ({ ...d, day: d.date.slice(5).replace('-', ' ') }))} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1a6' }} formatter={(v: any) => [`${Number(v).toLocaleString('en-IN')} views`, 'Views']} />
                <Area type="monotone" dataKey="views" stroke="#0a84ff" strokeWidth={2} fill="url(#interestGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="apple-footnote mt-2">Real audience-curiosity signal · Wikimedia Foundation data</p>
          </div>
        )}

        {/* Audience Segments */}
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="section-title">Audience segments</span>
            <span className="apple-footnote">{audienceSegments.length} segments</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {audienceSegments.map((seg) => (
              <div key={seg.name} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">{seg.name}</div>
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[12px] text-war-text-muted">Sentiment</div>
                    <div className={clsx('text-[17px] font-semibold tabular-nums tracking-tight', seg.sentiment < -40 ? 'text-[#ff6961]' : seg.sentiment < -15 ? 'text-[#ffb340]' : 'text-[#ffd60a]')}>
                      {seg.sentiment}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-war-text-muted">Volume</div>
                    <div className="text-[15px] font-semibold tabular-nums text-white">{(seg.volume / 1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-war-text-muted">Engagement</div>
                    <div className="text-[13px] font-semibold text-war-text-secondary">{seg.engagement}</div>
                  </div>
                  <div>
                    <span
                      className={clsx(
                        'inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        seg.conversionPotential === 'HIGH' && 'bg-[#30d158]/15 text-[#30d158]',
                        seg.conversionPotential === 'MEDIUM' && 'bg-[#ffd60a]/15 text-[#ffd60a]',
                        seg.conversionPotential === 'LOW' && 'bg-[#ff9f0a]/15 text-[#ffb340]',
                        seg.conversionPotential === 'NONE' && 'bg-white/10 text-war-text-muted'
                      )}
                    >
                      {seg.conversionPotential.toLowerCase()} conversion
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Geography */}
          <div className="glass-panel p-5">
            <div className="section-title mb-4">Geography · India</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={geographyData} layout="vertical" margin={{ top: 0, right: 20, left: 70, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 12, fill: '#a1a1a6' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1a6' }} />
                <Bar dataKey="mentions" radius={[4, 8, 8, 4]}>
                  {geographyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.sentiment < -40 ? '#ff453a' : entry.sentiment < -25 ? '#ff9f0a' : '#ffd60a'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Language */}
          <div className="glass-panel p-5">
            <div className="section-title mb-4">Languages</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={languageData} layout="vertical" margin={{ top: 0, right: 20, left: 70, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="language" tick={{ fontSize: 12, fill: '#a1a1a6' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1a6' }} />
                <Bar dataKey="mentions" radius={[4, 8, 8, 4]}>
                  {languageData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.sentiment < -35 ? '#ff453a' : entry.sentiment < -20 ? '#ff9f0a' : '#ffd60a'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
