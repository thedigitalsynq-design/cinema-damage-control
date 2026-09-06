import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import { mediaStories } from '../data/mockData';
import { LiveBanner } from '../components/LiveBanner';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { estimateSentiment, estimateReach } from '../data/apiService';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const mediaSentimentData = [
  { name: 'Positive', value: 8 },
  { name: 'Neutral', value: 22 },
  { name: 'Negative', value: 70 },
];

const narrativeFlow = [
  { stage: 'Social post', count: 184000, time: '18:47' },
  { stage: 'Influencer', count: 47, time: '19:00' },
  { stage: 'Portal', count: 12, time: '19:31' },
  { stage: 'Mainstream', count: 5, time: '19:52' },
  { stage: 'Amplified', count: 890000, time: '20:00' },
];

export function MediaIntelligence() {
  const { project } = useProject();
  const { news, stats, isLive } = useLiveData(project.keywords.join(','));
  const live = isLive && stats;

  const landscape = live
    ? [
        { label: 'Total coverage', value: `${stats.total}`, sub: 'live stories', tone: 'text-white', ring: '' },
        { label: 'Positive', value: `${stats.posPct}%`, sub: 'of coverage', tone: 'text-[#30d158]', ring: 'ring-1 ring-[#30d158]/25' },
        { label: 'Neutral', value: `${stats.neuPct}%`, sub: 'of coverage', tone: 'text-war-text-secondary', ring: 'ring-1 ring-white/10' },
        { label: 'Negative', value: `${stats.negPct}%`, sub: 'of coverage', tone: 'text-[#ff6961]', ring: 'ring-1 ring-[#ff453a]/25' },
      ]
    : [
        { label: 'Total coverage', value: '1.84M', sub: 'articles & mentions', tone: 'text-white', ring: '' },
        { label: 'Positive', value: '8%', sub: 'of coverage', tone: 'text-[#30d158]', ring: 'ring-1 ring-[#30d158]/25' },
        { label: 'Neutral', value: '22%', sub: 'of coverage', tone: 'text-war-text-secondary', ring: 'ring-1 ring-white/10' },
        { label: 'Negative', value: '70%', sub: 'of coverage', tone: 'text-[#ff6961]', ring: 'ring-1 ring-[#ff453a]/25' },
      ];

  const donut = live
    ? [
        { name: 'Positive', value: stats.posPct },
        { name: 'Neutral', value: stats.neuPct },
        { name: 'Negative', value: stats.negPct },
      ]
    : mediaSentimentData;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Media</h1>
          <p className="apple-subhead mt-1">Coverage and narrative flow under tracking.</p>
        </div>

        <LiveBanner />

        {/* Media Landscape */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {landscape.map((m) => (
            <div key={m.label} className={clsx('glass-panel apple-card-hover p-5', m.ring)}>
              <div className="metric-label mb-1">{m.label}</div>
              <div className={clsx('metric-value tabular-nums', m.tone)}>{m.value}</div>
              <div className="mt-1 text-[12px] text-war-text-muted">{m.sub}{live ? ' · measured' : ''}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Sentiment Breakdown */}
          <div className="glass-panel p-5">
            <div className="section-title mb-3">MEDIA SENTIMENT</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={donut}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donut.map((_entry, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? '#30d158' : i === 1 ? '#636366' : '#ff453a'}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex justify-center gap-4">
              {donut.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-[12px] text-war-text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? '#30d158' : i === 1 ? '#636366' : '#ff453a' }} />
                  {d.name} {d.value}%
                </span>
              ))}
            </div>
          </div>

          {/* Narrative Flow */}
          <div className="glass-panel p-5 lg:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">How the story spread</span>
              <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">MODELLED FLOW</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              {narrativeFlow.map((stage, i) => (
                <div key={stage.stage} className="flex flex-1 items-center gap-2">
                  <div className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-center">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-secondary">{stage.stage}</div>
                    <div className="text-[17px] font-semibold tabular-nums tracking-tight text-white">
                      {stage.count > 1000 ? `${(stage.count / 1000).toFixed(0)}K` : stage.count}
                    </div>
                    <div className="mt-0.5 text-[12px] tabular-nums text-war-text-muted">{stage.time}</div>
                  </div>
                  {i < narrativeFlow.length - 1 && (
                    <GIcon name="arrow_forward" size={15} className="hidden shrink-0 text-[#ff6961] sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Stories */}
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="section-title">Top stories</span>
            <span className="apple-footnote">{live ? `${news.length} live stories` : `${mediaStories.length} stories`}</span>
          </div>
          <div className="space-y-2.5">
            {live ? news.slice(0, 8).map((item, i) => {
              const sentiment = estimateSentiment(item.title);
              return (
                <a
                  key={`${item.link}-${i}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-white">{item.source || 'News'}</span>
                      <span className="text-[12px] tabular-nums text-war-text-muted">
                        · {item.pubDate ? new Date(item.pubDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'recent'}
                      </span>
                    </div>
                    <h3 className="mb-2 text-[14px] font-medium leading-snug text-white transition-colors group-hover:text-[#64a8ff]">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-[12px] text-war-text-muted">Reach <span className="font-semibold tabular-nums text-war-text-secondary">{estimateReach(item.source || '')}</span></span>
                      <span className={clsx('text-[12px] font-semibold capitalize', sentiment === 'NEGATIVE' ? 'text-[#ff6961]' : sentiment === 'POSITIVE' ? 'text-[#30d158]' : 'text-war-text-secondary')}>
                        {sentiment.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <GIcon name="open_in_new" size={15} className="mt-1 shrink-0 text-war-text-muted transition group-hover:text-white" />
                </a>
              );
            }) : mediaStories.map((story) => (
              <div key={story.id} className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.05]">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-white">{story.publication}</span>
                    <span className="text-[12px] text-war-text-muted">· {story.timestamp}</span>
                  </div>
                  <h3 className="mb-2 text-[14px] font-medium leading-snug text-white">{story.headline}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-[12px] text-war-text-muted">Reach <span className="font-semibold tabular-nums text-war-text-secondary">{story.reach}</span></span>
                    <span className={clsx('text-[12px] font-semibold capitalize', story.sentiment === 'NEGATIVE' ? 'text-[#ff6961]' : story.sentiment === 'POSITIVE' ? 'text-[#30d158]' : 'text-war-text-secondary')}>
                      {story.sentiment.toLowerCase()}
                    </span>
                    <span className="text-[12px] text-war-text-muted">Narrative <span className="text-war-text-secondary">{story.narrative}</span></span>
                    <span className="text-[12px] text-war-text-muted">Influence <span className="font-semibold tabular-nums text-war-text-secondary">{story.influence}</span></span>
                  </div>
                </div>
                <GIcon name="open_in_new" size={15} className="mt-1 shrink-0 text-war-text-muted transition group-hover:text-white" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
