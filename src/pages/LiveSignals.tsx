import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GIcon } from '../components/GIcon';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { signals } from '../data/mockData';
import { ConfidenceIndicator } from '../components/ui/StatusBadge';
import { Stagger, StaggerItem, RefreshFlash } from '../components/motion';
import { useToast } from '../components/Toaster';
import { useProject } from '../components/ProjectContext';
import { useLiveData } from '../hooks/useLiveData';
import { api, estimateSentiment, estimateReach, parseReach } from '../data/apiService';

const typeLabels: Record<string, { color: string; bg: string; dot: string }> = {
  VIRAL_POST: { color: 'text-[#ff6961]', bg: 'bg-[#ff453a]/12', dot: 'bg-[#ff453a]' },
  NEWS_ALERT: { color: 'text-[#ffb340]', bg: 'bg-[#ff9f0a]/12', dot: 'bg-[#ff9f0a]' },
  INFLUENCER_SPIKE: { color: 'text-[#ffd60a]', bg: 'bg-[#ffd60a]/12', dot: 'bg-[#ffd60a]' },
  HASHTAG: { color: 'text-[#64a8ff]', bg: 'bg-[#0a84ff]/12', dot: 'bg-[#0a84ff]' },
  SENTIMENT_SHIFT: { color: 'text-[#ff6961]', bg: 'bg-[#ff453a]/12', dot: 'bg-[#ff453a]' },
  MISINFORMATION: { color: 'text-[#ffb340]', bg: 'bg-[#ff9f0a]/12', dot: 'bg-[#ff9f0a]' },
  AUDIENCE_SHIFT: { color: 'text-[#64a8ff]', bg: 'bg-[#0a84ff]/12', dot: 'bg-[#0a84ff]' },
};

function plainText(html: string): string {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function snippetOf(html: string): string {
  const t = plainText(html);
  return t.length > 180 ? `${t.slice(0, 180).trimEnd()}…` : t;
}

function timeAgo(pubDate: string): string {
  const t = new Date(pubDate).getTime();
  if (!Number.isFinite(t)) return 'recent';
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const tooltipStyle = {
  background: '#2c2c2e',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 13,
  color: '#f5f5f7',
};

export function LiveSignals() {
  const navigate = useNavigate();
  const toast = useToast();
  const { project } = useProject();
  const { news, isLive, isLoading, lastUpdated, refresh, liveSignals, stats } = useLiveData(project.keywords.join(','));
  const [tab, setTab] = useState<'signals' | 'articles' | 'analyse'>('signals');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, { status: 'loading' | 'done' | 'error'; text: string; via: 'brief' | 'live' }>>({});
  const live = isLive && liveSignals.length > 0;

  const toggleSummary = async (link: string, fallbackBrief: string) => {
    if (expanded === link) {
      setExpanded(null);
      return;
    }
    setExpanded(link);
    if (!link || summaries[link]) return;
    let host = '';
    try {
      host = new URL(link).hostname;
    } catch {
      host = '';
    }
    // Google News links are opaque redirect tokens that only resolve in a
    // browser — serve the publisher's own RSS brief instead of a doomed fetch.
    if (host.includes('news.google.com') || !fallbackBrief) {
      setSummaries((prev) => ({
        ...prev,
        [link]: fallbackBrief
          ? { status: 'done', text: fallbackBrief.slice(0, 800), via: 'brief' }
          : { status: 'error', text: 'No summary available for this story.' , via: 'brief' },
      }));
      return;
    }
    setSummaries((prev) => ({ ...prev, [link]: { status: 'loading', text: '', via: 'live' } }));
    const res = await api.getArticleSummary(link);
    setSummaries((prev) => ({
      ...prev,
      [link]: res.success && res.summary
        ? { status: 'done', text: res.summary, via: 'live' }
        : fallbackBrief
          ? { status: 'done', text: fallbackBrief.slice(0, 800), via: 'brief' }
          : { status: 'error', text: res.error || 'Could not summarize this article.', via: 'live' },
    }));
  };

  const investigate = () => {
    toast('Signal queued — opening incident queue', 'success');
    navigate('/incidents');
  };

  const analysis = useMemo(() => {
    if (!live || news.length === 0) return null;
    const bySource = new Map<string, { count: number; reach: number }>();
    for (const item of news) {
      const src = item.source || 'Unknown';
      const e = bySource.get(src) || { count: 0, reach: 0 };
      e.count++;
      e.reach += parseReach(estimateReach(item.source || ''));
      bySource.set(src, e);
    }
    const topSources = [...bySource.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const peak = (stats?.velocityBuckets || []).reduce(
      (best, b) => (b.mentions > best.mentions ? b : best),
      { time: '—', mentions: 0 }
    );
    return { topSources, peak, total: news.length };
  }, [live, news, stats]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Live Signals</h1>
            <p className="apple-subhead mt-1">
              {live ? `Streaming ${project.title} headlines right now.` : `Real-time intelligence feed for ${project.title}.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {live ? (
              <div className="flex items-center gap-1.5 rounded-full bg-[#30d158]/15 px-3 py-1.5">
                <GIcon name="radio" size={12} className="text-[#30d158] status-pulse" />
                <span className="text-[12px] font-semibold tabular-nums text-[#30d158]">{liveSignals.length} live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-[#ff453a]/12 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff453a] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff453a]" />
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-[#ff6961]">{signals.length} simulated</span>
              </div>
            )}
            <button
              onClick={refresh}
              disabled={isLoading}
              aria-label="Refresh signals"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-war-text-secondary transition hover:bg-white/[0.14] hover:text-white active:scale-95 disabled:opacity-50"
            >
              <GIcon name="refresh" size={14} />
            </button>
            {lastUpdated && (
              <RefreshFlash pulseKey={lastUpdated} className="text-[12px] tabular-nums text-war-text-muted">
                {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </RefreshFlash>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1">
          {(
            [
              { id: 'signals', label: 'Signals' },
              { id: 'articles', label: `Articles${live ? ` (${news.length})` : ''}` },
              { id: 'analyse', label: 'Analyse' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97]',
                tab === t.id ? 'bg-white text-black shadow' : 'text-war-text-secondary hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'signals' && live && (
          <Stagger key={lastUpdated} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" delay={0.05}>
            {liveSignals.map((signal: any, i: number) => (
              <StaggerItem key={signal.id} index={i} className="glass-panel apple-card-hover group flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff9f0a]/12 px-2.5 py-1 text-[12px] font-semibold text-[#ffb340]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff9f0a]" />
                    news alert
                  </span>
                  <span className="text-[12px] tabular-nums text-war-text-muted">{signal.time}</span>
                </div>

                <h3 className="mb-2 flex-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white">
                  {signal.link ? (
                    <a
                      href={signal.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open the full article"
                      className="transition-colors hover:text-[#64a8ff] hover:underline hover:decoration-[#64a8ff]/50 hover:underline-offset-4"
                    >
                      {signal.title}
                    </a>
                  ) : (
                    signal.title
                  )}
                </h3>

                <div className="mb-4 flex items-center gap-1.5">
                  <span className="text-[12px] text-war-text-muted">Source</span>
                  <span className="truncate text-[13px] font-medium text-war-text-secondary">{signal.source}</span>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] tabular-nums text-war-text-muted">{signal.reach} reach</span>
                    <span
                      className={clsx(
                        'text-[12px] font-semibold capitalize',
                        signal.sentiment === 'NEGATIVE' && 'text-[#ff6961]',
                        signal.sentiment === 'POSITIVE' && 'text-[#30d158]',
                        signal.sentiment === 'NEUTRAL' && 'text-war-text-secondary'
                      )}
                    >
                      {String(signal.sentiment).toLowerCase()}
                    </span>
                  </div>
                  {signal.link ? (
                    <a
                      href={signal.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-button flex items-center gap-1 bg-[#0a84ff] px-3.5 py-1.5 text-[13px] text-white hover:bg-[#409cff]"
                    >
                      Read <GIcon name="open_in_new" size={12} />
                    </a>
                  ) : (
                    <button
                      onClick={investigate}
                      className="apple-button flex items-center gap-1 bg-[#0a84ff] px-3.5 py-1.5 text-[13px] text-white hover:bg-[#409cff]"
                    >
                      Investigate <GIcon name="arrow_outward" size={13} />
                    </button>
                  )}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {tab === 'signals' && !live && (
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" delay={0.05}>
            {signals.map((signal, i) => {
              const typeStyle = typeLabels[signal.type] || typeLabels.VIRAL_POST;
              return (
                <StaggerItem
                  key={signal.id}
                  index={i}
                  className="glass-panel apple-card-hover group p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', typeStyle.bg, typeStyle.color)}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', typeStyle.dot)} />
                      {signal.type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="text-[12px] tabular-nums text-war-text-muted">{signal.time}</span>
                  </div>

                  <h3 className="mb-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white">{signal.title}</h3>

                  <div className="mb-4 flex items-center gap-1.5">
                    <span className="text-[12px] text-war-text-muted">Source</span>
                    <span className="text-[13px] font-medium text-war-text-secondary">{signal.source}</span>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.03] p-3">
                    <div>
                      <div className="metric-label">Velocity</div>
                      <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-[#ff6961]">{signal.velocity}</div>
                    </div>
                    <div>
                      <div className="metric-label">Reach</div>
                      <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{signal.reach}</div>
                    </div>
                    <div>
                      <div className="metric-label">Confidence</div>
                      <div className="mt-0.5"><ConfidenceIndicator level={signal.confidenceLevel} confidence={signal.confidence} /></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-war-text-muted">Sentiment</span>
                      <span
                        className={clsx(
                          'text-[12px] font-semibold capitalize',
                          signal.sentiment === 'NEGATIVE' && 'text-[#ff6961]',
                          signal.sentiment === 'POSITIVE' && 'text-[#30d158]',
                          signal.sentiment === 'NEUTRAL' && 'text-war-text-secondary'
                        )}
                      >
                        {signal.sentiment.toLowerCase()}
                      </span>
                    </div>
                    <button
                      onClick={investigate}
                      aria-label={`Investigate: ${signal.title.slice(0, 60)}`}
                      className="apple-button flex items-center gap-1 bg-[#0a84ff] px-3.5 py-1.5 text-[13px] text-white hover:bg-[#409cff]"
                    >
                      Investigate <GIcon name="arrow_outward" size={13} />
                    </button>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}

        {tab === 'articles' && (
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Live articles</span>
              <span className="apple-footnote">{live ? `${news.length} stories · newest first` : 'Backend offline'}</span>
            </div>
            {!live ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07]">
                  <GIcon name="newspaper" size={20} className="text-war-text-muted" />
                </span>
                <p className="max-w-[320px] text-[14px] text-war-text-secondary">
                  No live articles right now. Start the backend (`npm run server`) to stream real coverage.
                </p>
              </div>
            ) : (
              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {news.slice(0, 30).map((item, i) => {
                  const sentiment = estimateSentiment(item.title);
                  const snippet = snippetOf(item.description);
                  const isOpen = expanded === item.link;
                  const summary = summaries[item.link];
                  return (
                    <div
                      key={`${item.link}-${i}`}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 font-mono text-[11px] tabular-nums text-war-text-muted">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] font-medium leading-snug text-white transition-colors hover:text-[#64a8ff]"
                          >
                            {item.title}
                          </a>
                          {snippet && (
                            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-war-text-muted">{snippet}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-[12px] font-medium text-war-text-secondary">{item.source || 'News'}</span>
                            <span className="text-[12px] tabular-nums text-war-text-muted">{timeAgo(item.pubDate)}</span>
                            <span className="text-[12px] tabular-nums text-war-text-muted">{estimateReach(item.source || '')} reach</span>
                            <span className={clsx(
                              'text-[12px] font-semibold capitalize',
                              sentiment === 'NEGATIVE' && 'text-[#ff6961]',
                              sentiment === 'POSITIVE' && 'text-[#30d158]',
                              sentiment === 'NEUTRAL' && 'text-war-text-secondary'
                            )}>
                              {sentiment.toLowerCase()}
                            </span>
                            {item.link && (
                              <button
                                onClick={() => toggleSummary(item.link, plainText(item.description))}
                                aria-expanded={isOpen}
                                className="flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-war-text-secondary transition hover:bg-white/[0.12] hover:text-white"
                              >
                                <GIcon name="description" size={11} />
                                {isOpen ? 'Hide summary' : 'Summary'}
                                <GIcon name="expand_more" size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open: ${item.title.slice(0, 60)}`}
                          className="mt-1 shrink-0 text-war-text-muted transition hover:text-white"
                        >
                          <GIcon name="open_in_new" size={14} />
                        </a>
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 rounded-xl border border-[#0a84ff]/20 bg-[#0a84ff]/[0.07] p-3.5">
                              {!summary || summary.status === 'loading' ? (
                                <div className="flex items-center gap-2.5">
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-[#64a8ff]" />
                                  <span className="text-[13px] text-war-text-secondary">Summarizing article…</span>
                                </div>
                              ) : summary.status === 'done' ? (
                                <>
                                  <p className="text-[13px] leading-relaxed text-war-text-secondary">{summary.text}</p>
                                  <p className="mt-2 text-[11px] text-war-text-muted">
                                    {summary.via === 'live' ? 'Extractive summary · fetched live from the publisher' : 'Publisher brief · via news feed'}
                                  </p>
                                </>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[13px] text-[#ffb340]">{summary.text}</p>
                                  <button
                                    onClick={() => {
                                      setSummaries((prev) => {
                                        const next = { ...prev };
                                        delete next[item.link];
                                        return next;
                                      });
                                      toggleSummary(item.link, plainText(item.description));
                                    }}
                                    className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[12px] text-white hover:bg-white/15"
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'analyse' && (
          <div className="space-y-4">
            {!live || !stats || !analysis ? (
              <div className="glass-panel flex flex-col items-center gap-2 p-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07]">
                  <GIcon name="analytics" size={20} className="text-war-text-muted" />
                </span>
                <p className="max-w-[340px] text-[14px] text-war-text-secondary">
                  Analysis runs on the live feed. Start the backend (`npm run server`) to analyse real coverage.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {(
                    [
                      { label: 'Stories analysed', value: `${analysis.total}`, tone: 'text-white' },
                      { label: 'Negative share', value: `${stats.negPct}%`, tone: 'text-[#ff6961]' },
                      { label: 'Peak day', value: `${analysis.peak.time} (${analysis.peak.mentions})`, tone: 'text-[#ffb340]' },
                      { label: 'Top outlet', value: analysis.topSources[0]?.source.split(' ')[0] || '—', tone: 'text-[#64a8ff]' },
                    ] as const
                  ).map((s) => (
                    <div key={s.label} className="glass-panel apple-card-hover p-5">
                      <div className="metric-label mb-1">{s.label}</div>
                      <div className={`truncate text-[22px] font-bold tracking-tight tabular-nums ${s.tone}`} title={s.value}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="glass-panel p-5">
                    <div className="section-title mb-4">Sentiment split</div>
                    <div className="space-y-3">
                      {(
                        [
                          { label: 'Negative', pct: stats.negPct, color: '#ff453a' },
                          { label: 'Neutral', pct: stats.neuPct, color: '#636366' },
                          { label: 'Positive', pct: stats.posPct, color: '#30d158' },
                        ] as const
                      ).map((row) => (
                        <div key={row.label}>
                          <div className="mb-1 flex items-center justify-between text-[13px]">
                            <span className="text-war-text-secondary">{row.label}</span>
                            <span className="font-semibold tabular-nums text-white">{row.pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="apple-footnote mt-4">Keyword-classified from {analysis.total} live headlines.</p>
                  </div>

                  <div className="glass-panel p-5">
                    <div className="section-title mb-4">Top outlets by volume</div>
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={analysis.topSources} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="source" tick={{ fontSize: 12, fill: '#a1a1a6' }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1a6' }} />
                        <Bar dataKey="count" radius={[4, 8, 8, 4]}>
                          {analysis.topSources.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#ff453a' : i === 1 ? '#ff9f0a' : '#0a84ff'} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass-panel p-5">
                    <div className="section-title mb-4">Story volume by day</div>
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={stats.velocityBuckets} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                        <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} interval={2} />
                        <YAxis tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#a1a1a6' }} />
                        <Bar dataKey="mentions" radius={[6, 6, 2, 2]} fill="#0a84ff" fillOpacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass-panel p-5">
                    <div className="section-title mb-4">Top terms in headlines</div>
                    <div className="space-y-3">
                      {stats.trending.map((t) => {
                        const max = Math.max(1, ...stats.trending.map((x) => x.mentions));
                        return (
                          <div key={t.term}>
                            <div className="mb-1 flex items-center justify-between text-[13px]">
                              <span className="capitalize text-war-text-secondary">{t.term}</span>
                              <span className="font-semibold tabular-nums text-white">{t.mentions} stories · {t.reachLabel}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                              <div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${Math.round((t.mentions / max) * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {stats.trending.length === 0 && (
                        <p className="text-[13px] text-war-text-muted">Not enough headline variety to mine terms yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
