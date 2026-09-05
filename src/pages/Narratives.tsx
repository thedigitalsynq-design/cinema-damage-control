import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Hash, X } from 'lucide-react';
import { narratives } from '../data/mockData';
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
            <Hash size={11} /> {tag}
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

function NarrativeDetail({ narrative, onClose }: { narrative: Narrative; onClose: () => void }) {
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
            <X size={14} />
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
                  <Hash size={12} /> {tag}
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

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Narratives</h1>
          <p className="apple-subhead mt-1">Major storylines shaping Project Veera.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {narratives.map((narrative) => (
            <NarrativeCard
              key={narrative.id}
              narrative={narrative}
              onClick={() => setSelected(narrative)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && <NarrativeDetail narrative={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
