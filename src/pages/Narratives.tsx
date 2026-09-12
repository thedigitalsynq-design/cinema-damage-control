import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import { narratives as fallbackNarratives } from '../data/mockData';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { CountermeasureModal } from '../components/CountermeasureModal';
import type { Narrative } from '../data/types';

function NarrativeCard({ narrative, onClick }: { narrative: Narrative; onClick: () => void }) {
  const sentimentColor =
    narrative.sentiment === 'NEGATIVE' ? 'text-[#ff6961]' : narrative.sentiment === 'POSITIVE' ? 'text-[#30d158]' : 'text-war-text-secondary';
  const barColor =
    narrative.sentiment === 'NEGATIVE' ? '#ff453a' : narrative.sentiment === 'POSITIVE' ? '#30d158' : '#0a84ff';

  return (
    <button
      onClick={onClick}
      className="glass-panel apple-card-hover w-full p-5 text-left"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white">{narrative.title}</h3>
        <span className="shrink-0 text-[22px] font-bold tabular-nums tracking-tight text-white">{narrative.share}<span className="text-[13px] font-medium text-war-text-muted">%</span></span>
      </div>

      {/* Share bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full"
          style={{ width: `${narrative.share}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.03] p-3 text-center">
        <div>
          <div className="metric-label">Posts</div>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">{(narrative.posts / 1000).toFixed(0)}K</div>
        </div>
        <div>
          <div className="metric-label">Voices</div>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">{narrative.influencers}</div>
        </div>
        <div>
          <div className="metric-label">Velocity</div>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#ff6961]">{narrative.velocity}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {narrative.hashtags.slice(0, 3).map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[12px] text-war-text-secondary">
            <GIcon name="tag" size={11} /> {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
        <span className={clsx('text-[12px] font-semibold capitalize', sentimentColor)}>{narrative.sentiment.toLowerCase()}</span>
        <span className="text-[12px] font-medium text-[#64a8ff]">Explore →</span>
      </div>
    </button>
  );
}

function NarrativeDetail({
  narrative,
  onClose,
  onCountermeasure,
}: {
  narrative: Narrative;
  onClose: () => void;
  onCountermeasure: (narrative: Narrative) => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="fixed bottom-3 right-3 top-3 z-50 w-[560px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-[20px] border border-white/10 bg-[#1c1c1e]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#1c1c1e]/90 px-6 py-4 backdrop-blur-xl">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Narrative</span>
            <h2 className="mt-0.5 text-[16px] font-semibold tracking-tight text-white">{narrative.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-war-text-secondary transition hover:bg-white/20 hover:text-white active:scale-95">
            <GIcon name="close" size={14} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { label: 'Share', value: `${narrative.share}%`, tone: 'text-white' },
                { label: 'Posts', value: `${(narrative.posts / 1000).toFixed(0)}K`, tone: 'text-white' },
                { label: 'Velocity', value: narrative.velocity, tone: 'text-[#ff6961]' },
              ] as const
            ).map((m) => (
              <div key={m.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-center">
                <div className="metric-label">{m.label}</div>
                <div className={clsx('mt-1 text-[22px] font-bold tabular-nums tracking-tight', m.tone)}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Tactical Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
            <button
              onClick={() => onCountermeasure(narrative)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0a84ff] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(10,132,255,0.3)] transition hover:bg-[#409cff] active:scale-[0.98]"
            >
              <GIcon name="shield" size={14} />
              Deploy Countermeasure
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/response');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[13px] font-medium text-war-text-secondary transition hover:bg-white/[0.09] hover:text-white"
            >
              <GIcon name="description" size={14} />
              Playbooks
            </button>
          </div>

          {[
            { label: 'Origin', value: narrative.origin },
            { label: 'Amplifiers', value: narrative.amplifiers.join(', ') },
            { label: 'Audience', value: narrative.audience },
            { label: 'Geography', value: narrative.geography },
            { label: 'Timeline', value: narrative.timeline },
          ].map((item) => (
            <div key={item.label}>
              <h3 className="section-title mb-1.5">{item.label.toLowerCase()}</h3>
              <p className="text-[14px] leading-relaxed text-war-text-secondary">{item.value}</p>
            </div>
          ))}

          <div>
            <h3 className="section-title mb-2">Evidence</h3>
            <ul className="space-y-2">
              {narrative.evidence.map((ev, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff9f0a]" />
                  <span className="text-[13px] leading-relaxed text-war-text-secondary">{ev}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="section-title mb-2">Hashtags</h3>
            <div className="flex flex-wrap gap-1.5">
              {narrative.hashtags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] text-war-text-secondary">
                  <GIcon name="tag" size={12} /> {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export function Narratives() {
  const [selected, setSelected] = useState<Narrative | null>(null);
  const [countermeasureOpen, setCountermeasureOpen] = useState(false);
  const { project } = useProject();
  const { liveNarratives, stats, isLive, lastUpdated, refresh, isLoading } = useLiveData(project.keywords.join(','));
  const activeNarratives = liveNarratives && liveNarratives.length > 0 ? liveNarratives : fallbackNarratives;
  const liveTerms = isLive && stats ? stats.trending : [];

  const handleOpenCountermeasure = (_narrative: Narrative) => {
    setSelected(null);
    setCountermeasureOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#30d158]/30 bg-[#30d158]/10 px-2 py-0.5 text-[11px] font-semibold text-[#30d158]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] animate-pulse" />
                  LIVE THEMES
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-war-text-muted">
                  SIMULATED
                </span>
              )}
            </div>
            <h1 className="apple-title mt-0.5">Narratives</h1>
            <p className="apple-subhead mt-1">
              Major storylines and narrative share shaping sentiment for {project.title}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <GIcon name="refresh" size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex items-center justify-between text-[12px] text-war-text-muted px-1">
            <span>
              {activeNarratives.length} active narrative vectors analyzed across trade and consumer coverage
            </span>
            <span className="tabular-nums">
              Last updated: {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {liveTerms.length > 0 && stats && (
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Live keyword clusters</span>
              <span className="apple-footnote">mined from {stats.total} real-time stories</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {liveTerms.map((t) => {
                const share = stats.total > 0 ? Math.round((t.mentions / stats.total) * 100) : 0;
                return (
                  <div key={t.term} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="mb-1 flex items-center gap-1 truncate text-[13px] font-semibold capitalize text-white" title={t.term}>
                      <GIcon name="tag" size={12} className="shrink-0 text-[#64a8ff]" />
                      <span className="truncate">{t.term}</span>
                    </div>
                    <div className="text-[20px] font-bold tabular-nums tracking-tight text-white">{share}<span className="text-[13px] font-medium text-war-text-muted">%</span></div>
                    <div className="mt-0.5 text-[12px] tabular-nums text-war-text-muted">{t.mentions} stories · {t.negPct}% neg</div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${Math.min(100, share * 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeNarratives.map((narrative) => (
            <NarrativeCard
              key={narrative.id}
              narrative={narrative}
              onClick={() => setSelected(narrative)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <NarrativeDetail
            narrative={selected}
            onClose={() => setSelected(null)}
            onCountermeasure={handleOpenCountermeasure}
          />
        )}
      </AnimatePresence>

      <CountermeasureModal
        isOpen={countermeasureOpen}
        onClose={() => setCountermeasureOpen(false)}
        initialType="press_release"
      />
    </div>
  );
}
