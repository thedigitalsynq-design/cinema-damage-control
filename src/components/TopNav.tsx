import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GIcon } from './GIcon';
import { clsx } from 'clsx';
import { LiveIndicator } from './ui/StatusBadge';
import { alerts } from '../data/mockData';
import { PHASES, usePhase } from './PhaseContext';
import { useProject } from './ProjectContext';
import { useToast } from './Toaster';
import { ExecutiveDossierModal } from './ExecutiveDossierModal';
import { CountermeasureModal } from './CountermeasureModal';

function PhaseSwitcher() {
  const { phase, setPhase } = usePhase();
  const toast = useToast();

  return (
    <div
      role="group"
      aria-label="Release phase"
      title={PHASES.find((p) => p.id === phase)?.doctrine}
      className="hidden items-center gap-0.5 rounded-full bg-white/[0.07] p-1 xl:flex"
    >
      {PHASES.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            if (p.id === phase) return;
            setPhase(p.id);
            toast(`Phase: ${p.label} — ${p.doctrine}`, 'info');
          }}
          aria-pressed={phase === p.id}
          className={clsx(
            'whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-all active:scale-[0.97]',
            phase === p.id ? 'bg-white text-black shadow' : 'text-war-text-secondary hover:text-white'
          )}
        >
          {p.short}
        </button>
      ))}
    </div>
  );
}

function ProjectSwitcher() {
  const { projects, project, setActiveId, addProject } = useProject();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');

  const submit = () => {
    if (!name.trim() || !keywords.trim()) {
      toast('Give the project a name and comma-separated keywords', 'warn');
      return;
    }
    const created = addProject(name, keywords);
    setName('');
    setKeywords('');
    setAdding(false);
    setOpen(false);
    toast(`Now tracking ${created.title} — feeds re-anchored`, 'success');
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setAdding(false); }}
        aria-expanded={open}
        title={project.subtitle}
        className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[13px] font-normal text-war-text-muted transition hover:bg-white/[0.07] hover:text-white"
      >
        {project.title}
        <GIcon name="expand_more" size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button aria-label="Close projects" className="fixed inset-0 z-20 cursor-default bg-transparent" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
            >
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Tracked projects</p>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveId(p.id); setOpen(false); toast(`Now tracking ${p.title}`, 'info'); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.07]"
                >
                  <span>
                    <span className={clsx('block text-[13px]', p.id === project.id ? 'font-semibold text-white' : 'text-war-text-secondary')}>
                      {p.title}
                    </span>
                    <span className="block text-[11px] text-war-text-muted">{p.keywords.join(', ')}</span>
                  </span>
                  {p.id === project.id && <GIcon name="check" size={14} className="shrink-0 text-[#64a8ff]" />}
                </button>
              ))}
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-left text-[13px] text-war-text-secondary transition hover:border-white/30 hover:text-white"
                >
                  <GIcon name="add" size={13} /> Track new project
                </button>
              ) : (
                <div className="mt-1 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Film title, e.g. Kantara 2"
                    className="h-9 w-full rounded-xl bg-white/[0.07] px-3 text-[13px] text-white placeholder:text-war-text-muted outline-none focus:ring-2 focus:ring-[#0a84ff]/50"
                  />
                  <input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="Keywords, e.g. kantara, rishab"
                    className="h-9 w-full rounded-xl bg-white/[0.07] px-3 text-[13px] text-white placeholder:text-war-text-muted outline-none focus:ring-2 focus:ring-[#0a84ff]/50"
                  />
                  <button
                    onClick={submit}
                    className="apple-button w-full bg-[#0a84ff] py-2 text-[13px] font-medium text-white hover:bg-[#409cff]"
                  >
                    Start tracking
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopNav({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [showCountermeasure, setShowCountermeasure] = useState(false);
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <>
      <header className="flex h-[52px] items-center justify-between border-b border-white/[0.08] bg-black/75 px-5 backdrop-blur-2xl backdrop-saturate-150">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[14.5px] font-bold tracking-tight text-white flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-red-600/90 text-[11px] font-black text-white">C</span>
              Cinema Damage Control
            </span>
            <ProjectSwitcher />
          </div>
          <div className="h-4 w-px bg-white/10" />
          <LiveIndicator critical />
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-normal tabular-nums text-war-text-secondary">05 Sep 2026 · {timeStr} IST</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDossier(true)}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-zinc-200 transition hover:bg-white/12 hover:text-white sm:flex active:scale-95"
          >
            <GIcon name="description" size={13} className="text-amber-400" />
            Executive Dossier
          </button>

          <button
            onClick={() => setShowCountermeasure(true)}
            className="hidden items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[12px] font-medium text-white shadow-sm transition hover:bg-blue-500 sm:flex active:scale-95"
          >
            <GIcon name="bolt" size={13} />
            Quick Dispatch
          </button>

          <PhaseSwitcher />

          <button
            onClick={onOpenCommandPalette}
            className="flex h-8 w-48 xl:w-60 items-center gap-2 rounded-full bg-white/[0.08] px-3.5 text-war-text-muted transition hover:bg-white/[0.12] hover:text-white active:scale-[0.98]"
          >
            <GIcon name="search" size={14} />
            <span className="text-[13px] font-normal">Search</span>
            <kbd className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-war-text-secondary">⌘K</kbd>
          </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-war-text-secondary transition hover:bg-white/[0.12] hover:text-white active:scale-95"
          >
            <GIcon name="notifications" size={15} />
            {unreadAlerts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff453a] px-1 text-[11px] font-semibold text-white ring-2 ring-black">
                {unreadAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl fade-in">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-semibold text-white">Notifications</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-war-text-secondary">{unreadAlerts} new</span>
              </div>
              <div className="max-h-80 overflow-y-auto pb-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`mx-2 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.06] ${
                      !alert.read ? 'bg-white/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {!alert.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0a84ff]" />
                      )}
                      <div className="flex-1">
                        <p className="text-[13px] leading-snug text-white">{alert.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold ${
                              alert.severity === 'CRITICAL'
                                ? 'text-[#ff453a]'
                                : alert.severity === 'HIGH'
                                ? 'text-[#ff9f0a]'
                                : 'text-[#ffd60a]'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-[11px] text-war-text-muted">{alert.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-war-text-muted transition hover:bg-white/[0.06] hover:text-white lg:flex">
          <GIcon name="schedule" size={14} />
          <span className="text-[13px]">Activity</span>
        </div>

        <div className="flex h-8 items-center gap-2 rounded-full bg-white/[0.08] py-1 pl-1.5 pr-2.5 transition hover:bg-white/[0.12]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#64a8ff] to-[#0a84ff]">
            <GIcon name="person" size={13} className="text-white" />
          </div>
          <span className="text-[13px] font-medium text-white">Admin</span>
          <GIcon name="expand_more" size={12} className="text-war-text-muted" />
        </div>
      </div>
    </header>

    <ExecutiveDossierModal isOpen={showDossier} onClose={() => setShowDossier(false)} />
    <CountermeasureModal isOpen={showCountermeasure} onClose={() => setShowCountermeasure(false)} />
  </>
  );
}
