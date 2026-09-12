import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GIcon } from './GIcon';
import { clsx } from 'clsx';
import { LiveIndicator } from './ui/StatusBadge';
import { alerts } from '../data/mockData';
import { PHASES, usePhase } from './PhaseContext';
import { useProject } from './ProjectContext';
import { useToast } from './Toaster';
import { useISTClock } from '../utils/istTime';
import { ExecutiveDossierModal } from './ExecutiveDossierModal';
import { CountermeasureModal } from './CountermeasureModal';
import { useAuth } from './AuthContext';
import { GeminiWarRoomChat } from './GeminiWarRoomChat';
import { ActivityLogModal } from './ActivityLogModal';
import { FreePluginsModal } from './FreePluginsModal';
import { QuickActionsMenu } from './QuickActionsMenu';
import { BoxOfficeTrackerModal } from './BoxOfficeTrackerModal';

function PhaseSwitcher() {
  const { phase, setPhase } = usePhase();
  const toast = useToast();

  return (
    <div
      role="group"
      aria-label="Release phase"
      title={PHASES.find((p) => p.id === phase)?.doctrine}
      className="hidden items-center gap-0.5 rounded-full bg-black/5 dark:bg-white/[0.07] p-1 xl:flex border border-[var(--color-war-border-light)]"
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
            phase === p.id ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-[var(--color-war-text-secondary)] hover:text-[var(--color-war-text)]'
          )}
        >
          {p.short}
        </button>
      ))}
    </div>
  );
}

function ProjectSwitcher({
  isOpen,
  onToggle,
  onClose,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { projects, project, setActiveId, addProject } = useProject();
  const toast = useToast();
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
    onClose();
    toast(`Now tracking ${created.title} — feeds re-anchored`, 'success');
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => {
          onToggle();
          setAdding(false);
        }}
        aria-expanded={isOpen}
        title={project.subtitle}
        className={clsx(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition active:scale-95 shadow-sm",
          isOpen
            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300"
            : "border-[var(--color-war-border-light)] bg-black/5 dark:bg-white/[0.06] text-[var(--color-war-text)] hover:bg-black/10 dark:hover:bg-white/[0.1] hover:border-[var(--color-war-border)]"
        )}
      >
        <span className="max-w-[110px] sm:max-w-[140px] truncate">{project.title}</span>
        <GIcon name="expand_more" size={13} className={clsx('transition-transform text-[var(--color-war-text-muted)]', isOpen ? 'rotate-180' : '')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              aria-label="Close projects"
              className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-[2px]"
              onClick={onClose}
            />
            <motion.div
              className="absolute left-0 top-full z-50 mt-2 w-88 overflow-hidden rounded-2xl border border-[var(--color-war-border-light)] bg-[var(--color-war-surface-3)] dark:bg-[#16171e] p-2 shadow-2xl backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
            >
              <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-war-text-muted)]">
                  Current Indian Films (Latest 30d)
                </span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono">IST Synced</span>
              </div>
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'].map((src) => (
                  <span key={src} className="text-[9px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.06] text-[var(--color-war-text-muted)] border border-[var(--color-war-border)]">
                    {src}
                  </span>
                ))}
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveId(p.id);
                      onClose();
                      toast(`Now tracking ${p.title}`, 'info');
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition',
                      p.id === project.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                    )}
                  >
                    <span className="min-w-0 pr-2">
                      <span className={clsx('block truncate text-[13px]', p.id === project.id ? 'font-semibold text-white' : 'text-zinc-300')}>
                        {p.title}
                      </span>
                      <span className="block truncate text-[11px] text-war-text-muted">{p.keywords.join(', ')}</span>
                    </span>
                    {p.id === project.id && <GIcon name="check" size={15} className="shrink-0 text-[#0a84ff]" />}
                  </button>
                ))}
              </div>
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-left text-[13px] text-war-text-secondary transition hover:border-white/30 hover:bg-white/[0.03] hover:text-white"
                >
                  <GIcon name="add" size={14} /> Track new project
                </button>
              ) : (
                <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAdding(false)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-[12px] text-war-text-muted hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      className="apple-button flex-1 bg-[#0a84ff] py-1.5 text-[13px] font-medium text-white hover:bg-[#409cff]"
                    >
                      Start tracking
                    </button>
                  </div>
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
  const { dateStr, timeStr } = useISTClock();
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const { project } = useProject();
  const [activeMenu, setActiveMenu] = useState<'projects' | 'notifications' | 'user' | 'utilities' | null>(null);
  const [showDossier, setShowDossier] = useState(false);
  const [showCountermeasure, setShowCountermeasure] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showFreePlugins, setShowFreePlugins] = useState(false);
  const [showBoxOfficeTracker, setShowBoxOfficeTracker] = useState(false);
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="relative z-40 flex h-[54px] items-center justify-between border-b border-[var(--color-war-border-light)] bg-[var(--color-war-surface)] px-4 sm:px-5 backdrop-blur-2xl backdrop-saturate-150">
        {/* Left: Brand, Active Subject & Live Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[14px] sm:text-[14.5px] font-bold tracking-tight text-[var(--color-war-text)] flex items-center gap-1.5 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-black text-white shadow-sm shadow-indigo-500/30">C</span>
              <span className="hidden md:inline">Cinema Damage Control</span>
              <span className="md:hidden">CDC</span>
            </span>
            <ProjectSwitcher
              isOpen={activeMenu === 'projects'}
              onToggle={() => setActiveMenu((m) => (m === 'projects' ? null : 'projects'))}
              onClose={() => setActiveMenu(null)}
            />
          </div>

          <div className="hidden sm:block h-4 w-px bg-[var(--color-war-border-light)] shrink-0" />
          <div className="hidden sm:flex shrink-0">
            <LiveIndicator critical />
          </div>

          <div className="hidden md:block h-4 w-px bg-[var(--color-war-border-light)] shrink-0" />
          {/* Live IST Telemetry Badge - cleanly formatted on one line */}
          <div className="hidden md:flex items-center shrink-0">
            <span
              title={`Synchronized with Indian Standard Time (UTC+5:30)\n${dateStr} · ${timeStr}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20 text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-300 select-none shadow-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold">{timeStr}</span>
              <span className="text-emerald-600/70 dark:text-emerald-400/70 text-[9.5px] uppercase tracking-wider font-mono">IST</span>
            </span>
          </div>
        </div>

        {/* Right: Operational Controls & Executive Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gemini AI Advisor */}
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowChat(true);
            }}
            className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-500/15 px-2.5 sm:px-3 py-1.5 text-[12px] font-semibold text-indigo-600 dark:text-indigo-300 transition hover:bg-indigo-500/20 active:scale-95 shadow-sm shadow-indigo-500/10 whitespace-nowrap"
            title="Open Gemini AI Crisis Advisor"
          >
            <GIcon name="smart_toy" size={14} className="text-indigo-500 dark:text-indigo-400" />
            <span className="hidden sm:inline">AI Advisor</span>
          </button>

          {/* Box Office Consensus Tracker Button */}
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowBoxOfficeTracker(true);
            }}
            className="hidden lg:flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 dark:bg-amber-500/15 px-2.5 sm:px-3 py-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-300 transition hover:bg-amber-500/20 active:scale-95 shadow-sm whitespace-nowrap"
            title="Scan Internet Box Office Consensus & Calculate Averages"
          >
            <GIcon name="receipt_long" size={14} className="text-amber-500 dark:text-amber-400" />
            <span>Box Office</span>
          </button>

          {/* Quick Actions (1-Click Tasks) */}
          <QuickActionsMenu
            onOpenDossier={() => setShowDossier(true)}
            onOpenDispatch={() => setShowCountermeasure(true)}
            onOpenAdvisor={() => setShowChat(true)}
            onOpenBoxOfficeTracker={() => setShowBoxOfficeTracker(true)}
          />

          {/* Executive Dossier (wide screens) */}
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowDossier(true);
            }}
            className="hidden xl:flex items-center gap-1.5 rounded-full border border-[var(--color-war-border-light)] bg-black/5 dark:bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-[var(--color-war-text-secondary)] transition hover:bg-black/10 dark:hover:bg-white/12 hover:text-[var(--color-war-text)] active:scale-95 whitespace-nowrap"
            title="Generate 60-Second Executive Dossier"
          >
            <GIcon name="description" size={13} className="text-amber-500 dark:text-amber-400" />
            <span>Dossier</span>
          </button>

          {/* Quick Dispatch (Primary CTA) */}
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowCountermeasure(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-500/25 transition hover:brightness-110 active:scale-95 whitespace-nowrap"
            title="Deploy Countermeasure Dispatch"
          >
            <GIcon name="bolt" size={13} />
            <span>Dispatch</span>
          </button>

          {/* Release Phase Switcher */}
          <PhaseSwitcher />

          {/* Global Search Button */}
          <button
            onClick={() => {
              setActiveMenu(null);
              onOpenCommandPalette();
            }}
            className="flex h-8 items-center gap-1.5 sm:gap-2 rounded-full bg-black/5 dark:bg-white/[0.07] border border-[var(--color-war-border-light)] px-2.5 sm:px-3 text-[var(--color-war-text-muted)] transition hover:bg-black/10 dark:hover:bg-white/[0.12] hover:text-[var(--color-war-text)] active:scale-95 shrink-0"
            title="Search & Command Menu (⌘K)"
          >
            <GIcon name="search" size={14} />
            <span className="hidden 2xl:inline text-[12px] font-normal">Search</span>
            <kbd className="hidden sm:inline-block rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-war-text-secondary)]">⌘K</kbd>
          </button>

          {/* Notifications Bell */}
          <div className="relative shrink-0">
            <button
              onClick={() => setActiveMenu((m) => (m === 'notifications' ? null : 'notifications'))}
              aria-label="Notifications"
              aria-expanded={activeMenu === 'notifications'}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/[0.07] border border-[var(--color-war-border-light)] text-[var(--color-war-text-secondary)] transition hover:bg-black/10 dark:hover:bg-white/[0.12] hover:text-[var(--color-war-text)] active:scale-95"
            >
              <GIcon name="notifications" size={14} />
              {unreadAlerts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e11d48] px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-black">
                  {unreadAlerts}
                </span>
              )}
            </button>

            <AnimatePresence>
              {activeMenu === 'notifications' && (
                <>
                  <div
                    aria-label="Close notifications"
                    className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setActiveMenu(null)}
                  />
                  <motion.div
                    className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-[var(--color-war-border-light)] bg-[var(--color-war-surface-3)] dark:bg-[#16171e] shadow-2xl backdrop-blur-2xl"
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                  >
                    <div className="flex items-center justify-between border-b border-[var(--color-war-border)] px-4 py-3 bg-black/[0.02] dark:bg-white/[0.02]">
                      <span className="text-[13px] font-semibold text-[var(--color-war-text)]">Notifications</span>
                      <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-war-text-secondary)]">{unreadAlerts} new</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`rounded-xl px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/[0.06] ${
                            !alert.read ? 'bg-indigo-50/60 dark:bg-white/[0.03]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {!alert.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] leading-snug text-[var(--color-war-text)] break-words">{alert.title}</p>
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
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Workspace Utilities & Tools Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setActiveMenu((m) => (m === 'utilities' ? null : 'utilities'))}
              aria-label="Workspace Utilities"
              aria-expanded={activeMenu === 'utilities'}
              title="Workspace Tools, Plugins & Audit Log"
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-95',
                activeMenu === 'utilities'
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-400'
                  : 'border-[var(--color-war-border-light)] bg-black/5 dark:bg-white/[0.07] text-[var(--color-war-text-secondary)] hover:bg-black/10 dark:hover:bg-white/[0.12] hover:text-[var(--color-war-text)]'
              )}
            >
              <GIcon name="more_vert" size={15} />
            </button>
            <AnimatePresence>
              {activeMenu === 'utilities' && (
                <>
                  <div
                    aria-label="Close utilities menu"
                    className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setActiveMenu(null)}
                  />
                  <motion.div
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--color-war-border-light)] bg-[var(--color-war-surface-3)] dark:bg-[#16171e] p-2 shadow-2xl backdrop-blur-2xl"
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                  >
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-war-text-muted)]">
                      War Room Utilities
                    </div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setShowActivityLog(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-[var(--color-war-text)] hover:bg-black/5 dark:hover:bg-white/[0.07] transition"
                      >
                        <GIcon name="history" size={15} className="text-blue-500" />
                        <span>Activity Audit Trail</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setShowFreePlugins(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-[var(--color-war-text)] hover:bg-black/5 dark:hover:bg-white/[0.07] transition"
                      >
                        <GIcon name="extension" size={15} className="text-emerald-500" />
                        <span>Free Plugins Hub</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setShowBoxOfficeTracker(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-[var(--color-war-text)] hover:bg-black/5 dark:hover:bg-white/[0.07] transition"
                      >
                        <GIcon name="receipt_long" size={15} className="text-amber-500" />
                        <span>Box Office Consensus</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          setShowDossier(true);
                        }}
                        className="xl:hidden flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-[var(--color-war-text)] hover:bg-black/5 dark:hover:bg-white/[0.07] transition"
                      >
                        <GIcon name="description" size={15} className="text-amber-500" />
                        <span>Executive Dossier</span>
                      </button>
                      <div className="my-1 h-px bg-[var(--color-war-border-light)]" />
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenCommandPalette();
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12.5px] text-[var(--color-war-text-secondary)] hover:bg-black/5 dark:hover:bg-white/[0.07] hover:text-[var(--color-war-text)] transition"
                      >
                        <span className="flex items-center gap-2.5">
                          <GIcon name="terminal" size={15} />
                          <span>Command Palette</span>
                        </span>
                        <kbd className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Firebase Auth & Profile */}
          <div className="relative shrink-0">
            {user ? (
              <button
                onClick={() => setActiveMenu((m) => (m === 'user' ? null : 'user'))}
                className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-1 pl-1 pr-2 transition hover:bg-emerald-500/20 active:scale-95"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                    {(user.displayName || user.email || 'A')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-[12px] font-medium text-emerald-300 max-w-[80px] truncate">
                  {user.displayName?.split(' ')[0] || 'Analyst'}
                </span>
                <GIcon name="expand_more" size={12} className="text-emerald-400" />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-2.5 sm:px-3 text-[12px] font-semibold text-white shadow-md transition hover:from-red-500 hover:to-rose-500 active:scale-95 shrink-0"
              >
                <GIcon name="login" size={14} />
                <span className="hidden sm:inline">Google Sign In</span>
              </button>
            )}

            <AnimatePresence>
              {activeMenu === 'user' && user && (
                <>
                  <div
                    aria-label="Close user menu"
                    className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setActiveMenu(null)}
                  />
                  <motion.div
                    className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/15 bg-[#16171e] p-3 shadow-2xl shadow-black ring-1 ring-white/5 space-y-3"
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                  >
                    <div className="flex items-center space-x-2.5 pb-2 border-b border-white/10">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
                          {(user.displayName || user.email || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{user.displayName || 'Analyst'}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl flex items-center justify-between">
                      <span>Firestore Sync:</span>
                      <span className="font-mono font-bold">ACTIVE</span>
                    </div>

                    <button
                      onClick={() => {
                        signOutUser();
                        setActiveMenu(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition"
                    >
                      <GIcon name="logout" size={14} />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <ExecutiveDossierModal isOpen={showDossier} onClose={() => setShowDossier(false)} />
      <CountermeasureModal isOpen={showCountermeasure} onClose={() => setShowCountermeasure(false)} />
      <GeminiWarRoomChat isOpen={showChat} onClose={() => setShowChat(false)} />
      <ActivityLogModal isOpen={showActivityLog} onClose={() => setShowActivityLog(false)} />
      <FreePluginsModal
        isOpen={showFreePlugins}
        onClose={() => setShowFreePlugins(false)}
        onOpenBoxOfficeTracker={() => setShowBoxOfficeTracker(true)}
      />
      <BoxOfficeTrackerModal
        isOpen={showBoxOfficeTracker}
        onClose={() => setShowBoxOfficeTracker(false)}
        initialFilm={project.title}
      />
    </>
  );
}
