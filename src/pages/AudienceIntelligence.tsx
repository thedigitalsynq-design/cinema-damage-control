import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { audienceSegments, geographyData, languageData } from '../data/mockData';

const tooltipStyle = {
  background: '#2c2c2e',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 13,
  color: '#f5f5f7',
};

export function AudienceIntelligence() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Audience</h1>
          <p className="apple-subhead mt-1">Segments and geography for Project Veera.</p>
        </div>

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
