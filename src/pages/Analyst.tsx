import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GIcon } from '../components/GIcon';
import { clsx } from 'clsx';
import { incidents, leakLinks } from '../data/mockData';
import { useLiveData } from '../hooks/useLiveData';
import { usePhase } from '../components/PhaseContext';
import { useProject } from '../components/ProjectContext';
import { useRoom } from '../components/RoomState';
import { useToast } from '../components/Toaster';
import { analystAnswer, type AgentAction, type ChatMessage } from '../components/AnalystEngine';
import { READINESS_ITEMS } from '../components/PhaseContext';

const SUGGESTIONS = ['Morning brief', 'Biggest risk?', 'What should we do?', 'Leak status'];

interface RichMessage extends ChatMessage {
  actions: AgentAction[];
  engine?: 'ai' | 'local';
}

export function Analyst() {
  const navigate = useNavigate();
  const toast = useToast();
  const { phase, setPhase } = usePhase();
  const { pressure } = useRoom();
  const { project } = useProject();
  const { news, stats, isLive, lastUpdated, refresh, liveIncidents, liveLeaks, isLoading } = useLiveData(project.keywords.join(','));

  const [messages, setMessages] = useState<RichMessage[]>([
    {
      role: 'assistant',
      text: 'Analyst online. I read this room\u2019s live numbers and discuss what they mean — briefings, risks, narratives, next actions. Ask me anything, or tap a suggestion.',
      actions: [],
      engine: 'local',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [engine, setEngine] = useState<'ai' | 'local' | 'unknown'>('unknown');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60);
  };

  const runAction = (a: AgentAction) => {
    if (a.kind === 'goto' || a.kind === 'export') {
      navigate(a.kind === 'export' ? '/reports' : a.arg || '/');
      toast(a.kind === 'export' ? 'Export desk opened' : `Opening ${a.arg}`, 'info');
    } else if (a.kind === 'phase') {
      const p = a.arg as 'pre' | 'opening' | 'recovery';
      if (p === 'pre' || p === 'opening' || p === 'recovery') {
        setPhase(p);
        toast(`Phase switched — room reshaped for ${p}`, 'success');
      }
    } else if (a.kind === 'refresh') {
      refresh();
      toast('Refreshing live feed…', 'info');
    }
  };

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    setInput('');
    setThinking(true);
    const history: ChatMessage[] = [...messages, { role: 'user' as const, text: q }];
    setMessages([...history.map((m) => ({ ...m, actions: (m as RichMessage).actions || [], engine: (m as RichMessage).engine }))]);
    scrollDown();

    let readiness = '0/5';
    try {
      const saved = JSON.parse(window.localStorage.getItem('cdc-readiness') || '[]');
      if (Array.isArray(saved)) readiness = `${saved.length}/${READINESS_ITEMS.length}`;
    } catch {
      /* ignore */
    }
    const effectiveIncidents = isLive && liveIncidents && liveIncidents.length > 0 ? liveIncidents : incidents;
    const effectiveLeaks = liveLeaks && liveLeaks.length > 0 ? liveLeaks : leakLinks;
    const activeInc = effectiveIncidents.filter((i) => i.status !== 'RESOLVED');
    const reply = await analystAnswer(
      {
        film: `${project.title} (${project.subtitle})`,
        phase,
        mode: isLive && stats ? 'LIVE' : 'SIMULATION',
        updated: lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-IN') : '—',
        total: stats?.total ?? news.length,
        negPct: stats?.negPct ?? 0,
        posPct: stats?.posPct ?? 0,
        velocityPct: stats?.velocityPct ?? 0,
        reach: stats?.reachLabel ?? '—',
        trending: stats && stats.trending.length > 0 ? stats.trending.map((t) => `${t.term}(${t.mentions})`).join(', ') : '—',
        activeIncidents: activeInc.length,
        topIncidents: activeInc.slice(0, 3).map((i) => `${i.title.slice(0, 40)} [${i.severity}]`).join('; ') || '—',
        activeLeaks: effectiveLeaks.filter((l) => l.status === 'ACTIVE').length,
        signals: news.length,
        readiness,
        interventions: `risk ${pressure.risk >= 0 ? '+' : ''}${Math.round(pressure.risk)}, velocity ${pressure.velocity >= 0 ? '+' : ''}${Math.round(pressure.velocity)} (decays ~10%/min)`,
      },
      history,
      q
    );

    setEngine(reply.engine);
    if (reply.engine === 'local' && engine === 'unknown') {
      toast('AI service unreachable — local analyst answering', 'warn');
    }
    setMessages((prev) => [...prev, { role: 'assistant', text: reply.text, actions: reply.actions, engine: reply.engine }]);
    setThinking(false);
    scrollDown();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-6 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Analyst</h1>
            <p className="apple-subhead mt-1">Free AI discussion over live room data — real-time feeds & offline fallback.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <GIcon name="refresh" size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>
            <span className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold',
              engine === 'ai' ? 'bg-[#30d158]/15 text-[#30d158]'
              : engine === 'local' ? 'bg-[#ffd60a]/15 text-[#ffd60a]'
              : 'bg-white/[0.07] text-war-text-secondary'
            )}>
              <GIcon name="auto_awesome" size={12} />
              {engine === 'ai' ? 'AI analyst · online' : engine === 'local' ? 'Local analyst · offline mode' : 'Analyst · ready'}
            </span>
          </div>
        </div>

        <div ref={scrollRef} className="glass-panel mb-3 flex-1 space-y-3 overflow-y-auto p-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className={clsx('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/20">
                    <GIcon name="auto_awesome" size={13} className="text-[#64a8ff]" />
                  </span>
                )}
                <div className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-2.5',
                  m.role === 'user'
                    ? 'rounded-br-md bg-[#0a84ff] text-[14px] text-white'
                    : 'rounded-bl-md border border-white/[0.08] bg-white/[0.04] text-[14px] leading-relaxed text-war-text-secondary'
                )}>
                  <p>{m.text}</p>
                  {m.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.actions.map((a, j) => (
                        <button
                          key={j}
                          onClick={() => runAction(a)}
                          className="apple-button flex items-center gap-1 bg-[#0a84ff] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#409cff]"
                        >
                          <GIcon name="bolt" size={11} /> {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <GIcon name="person" size={13} className="text-war-text-secondary" />
                  </span>
                )}
              </motion.div>
            ))}
            {thinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a84ff]/20">
                  <GIcon name="auto_awesome" size={13} className="text-[#64a8ff]" />
                </span>
                <span className="flex gap-1 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-war-text-secondary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18 }}
                    />
                  ))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={thinking}
              className="rounded-full bg-white/[0.07] px-3.5 py-1.5 text-[13px] text-war-text-secondary transition hover:bg-white/[0.12] hover:text-white active:scale-[0.97] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="Ask about risk, narratives, leaks, next actions…"
            className="h-11 flex-1 rounded-full bg-white/[0.07] px-5 text-[14px] text-white placeholder:text-war-text-muted outline-none transition focus:bg-white/[0.1] focus:ring-2 focus:ring-[#0a84ff]/50"
          />
          <button
            onClick={() => ask(input)}
            disabled={thinking || !input.trim()}
            aria-label="Send"
            className="apple-button flex h-11 w-11 shrink-0 items-center justify-center bg-[#0a84ff] text-white hover:bg-[#409cff] disabled:opacity-40"
          >
            <GIcon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
