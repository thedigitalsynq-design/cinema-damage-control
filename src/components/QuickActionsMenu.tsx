import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GIcon } from './GIcon';
import { useToast } from './Toaster';
import { useRoom } from './RoomState';
import { useProject } from './ProjectContext';
import { useLiveDataContext } from '../context/LiveDataContext';
import {
  dispatchAction,
  dispatchReportExport,
  dispatchCountermeasure,
} from '../lib/actionDispatcher';

interface QuickActionsMenuProps {
  onOpenDossier?: () => void;
  onOpenDispatch?: () => void;
  onOpenAdvisor?: () => void;
  onOpenBoxOfficeTracker?: () => void;
}

export function QuickActionsMenu({
  onOpenDossier,
  onOpenDispatch,
  onOpenAdvisor: _onOpenAdvisor,
  onOpenBoxOfficeTracker,
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [executingTask, setExecutingTask] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toast = useToast();
  const { apply } = useRoom();
  const { project } = useProject();
  const { liveIncidents, resolveIncident } = useLiveDataContext();

  // Close on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  /**
   * Action 1: Generate Situation Brief
   * Generates a 60-second operational situation brief, triggers download, and updates the audit log.
   */
  const handleGenerateSituationBrief = async () => {
    setExecutingTask('brief');
    try {
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const briefContent = [
        `# CINEMA DAMAGE CONTROL - SITUATION BRIEF`,
        `**Project**: ${project.title} (${project.subtitle || 'Active Feature'})`,
        `**Timestamp**: ${timestamp} IST`,
        `**Doctrine**: Rapid De-escalation & Narrative Control`,
        `---`,
        `## 1. Executive Summary`,
        `Active telemetry monitoring remains operational. Cross-platform surveillance active for sentiment shifts, unauthorized clip leaks, and influencer rating clusters.`,
        ``,
        `## 2. Threat & Leak Matrix`,
        `- Active Threat Vectors: ${liveIncidents.filter((i) => i.status !== 'RESOLVED').length}`,
        `- Resolved/Neutralized Incidents: ${liveIncidents.filter((i) => i.status === 'RESOLVED').length}`,
        `- Strategic Objective: Mitigate weekend box office erosion and preserve distributor confidence.`,
        ``,
        `## 3. Recommended Protocol`,
        `1. Execute targeted counter-briefing across verified trade portals.`,
        `2. Maintain continuous 15-minute sentiment sweeps.`,
        `3. Keep legal and PR counsel in high-readiness stand-by.`,
      ].join('\n');

      const blob = new Blob([briefContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-situation-brief-${Date.now().toString().slice(-4)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      apply('plan');
      dispatchReportExport('Live Situation Brief', project.title);
      toast('Situation Brief generated & downloaded', 'success');
      setIsOpen(false);
    } catch {
      toast('Failed to generate Situation Brief', 'warn');
    } finally {
      setExecutingTask(null);
    }
  };

  /**
   * Action 2: Notify PR Team
   * Broadcasts high-priority alert to PR counsel, trade liaisons, and crisis command desk.
   */
  const handleNotifyPRTeam = async () => {
    setExecutingTask('pr');
    try {
      apply('escalate');
      dispatchCountermeasure(
        'critic_advisory',
        project.title,
        `URGENT NOTIFICATION to Studio PR & Trade Liaison Desks: Live crisis response active for ${project.title}. Coordinate immediate unified talking points.`
      );
      dispatchAction(
        'NOTIFY_PR_TEAM',
        'COUNTERMEASURE',
        `PR Crisis Team Alerted (${project.title})`,
        `High-priority advisory dispatched to verified studio publicists, agency reps, and trade press leads.`
      );
      toast('PR Team alerted with priority crisis bulletin', 'success');
      setIsOpen(false);
    } catch {
      toast('Failed to notify PR team', 'warn');
    } finally {
      setExecutingTask(null);
    }
  };

  /**
   * Action 3: Archive / Resolve Top Active Incident
   * Quickly archives and resolves the most pressing threat vector to de-escalate crisis pressure.
   */
  const handleArchiveIncident = async () => {
    setExecutingTask('archive');
    try {
      const activeIncident = liveIncidents.find((i) => i.status !== 'RESOLVED');
      if (activeIncident) {
        resolveIncident(activeIncident.id);
        apply('approve');
        dispatchAction(
          'ARCHIVE_INCIDENT',
          'INCIDENT',
          `Archived Incident: ${activeIncident.code}`,
          `Threat vector "${activeIncident.title}" moved to archive. Risk reduced by −4.`,
          { incidentId: activeIncident.id }
        );
        toast(`Archived ${activeIncident.code} · risk reduced`, 'success');
      } else {
        toast('No active incidents requiring archival', 'info');
      }
      setIsOpen(false);
    } catch {
      toast('Failed to archive incident', 'warn');
    } finally {
      setExecutingTask(null);
    }
  };

  /**
   * Action 4: Freeze & Lockdown Leak Channels
   */
  const handleTriggerDMCAWave = async () => {
    setExecutingTask('dmca');
    try {
      apply('takedown');
      dispatchAction(
        'DISPATCH_DMCA_WAVE',
        'TAKEDOWN',
        `Bulk DMCA Notice Wave Issued (${project.title})`,
        `Expedited Section 51 copyright takedown notices dispatched to major Telegram bots, Google Drive links, and mirror hosting intermediaries.`
      );
      toast('Emergency DMCA takedown wave dispatched', 'success');
      setIsOpen(false);
    } catch {
      toast('Failed to dispatch takedown wave', 'warn');
    } finally {
      setExecutingTask(null);
    }
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        id="quick-actions-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Quick Damage Control Actions"
        aria-expanded={isOpen}
        title="Quick Damage Control Tasks (Single-Click Execution)"
        className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[12px] font-semibold transition-all active:scale-95 shadow-sm select-none ${
          isOpen
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
        }`}
      >
        <GIcon name="flash_on" size={14} className="text-amber-500 dark:text-amber-400 animate-pulse" />
        <span className="hidden sm:inline">Quick Actions</span>
        <GIcon
          name="expand_more"
          size={13}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="quick-actions-dropdown"
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-[var(--color-war-border-light)] bg-[var(--color-war-surface-3)] dark:bg-[#181922] p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/10 dark:ring-white/10"
          >
            {/* Header / Subtitle */}
            <div className="px-3 py-2 border-b border-[var(--color-war-border-light)] mb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-war-text-muted)]">
                  Rapid Response Protocols
                </span>
                <span className="text-[10px] font-mono text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  STANDBY
                </span>
              </div>
              <p className="text-[11.5px] text-[var(--color-war-text-secondary)] mt-0.5 truncate">
                Target: <span className="font-semibold text-[var(--color-war-text)]">{project.title}</span>
              </p>
            </div>

            {/* Task Item 1: Generate Situation Brief */}
            <button
              id="action-situation-brief"
              onClick={handleGenerateSituationBrief}
              disabled={executingTask === 'brief'}
              className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400 group-hover:bg-blue-500/20">
                <GIcon name="description" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--color-war-text)]">
                    Generate Situation Brief
                  </span>
                  <span className="text-[10px] font-mono text-blue-500">1-CLICK</span>
                </div>
                <p className="text-[11.5px] text-[var(--color-war-text-muted)] leading-tight mt-0.5">
                  Produce & download 60-sec strategic markdown briefing
                </p>
              </div>
            </button>

            {/* Task Item 2: Notify PR Team */}
            <button
              id="action-notify-pr"
              onClick={handleNotifyPRTeam}
              disabled={executingTask === 'pr'}
              className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 group-hover:bg-rose-500/20">
                <GIcon name="campaign" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--color-war-text)]">
                    Notify PR Team
                  </span>
                  <span className="text-[10px] font-mono text-rose-500">PRIORITY</span>
                </div>
                <p className="text-[11.5px] text-[var(--color-war-text-muted)] leading-tight mt-0.5">
                  Broadcast urgent crisis advisory to verified media desks
                </p>
              </div>
            </button>

            {/* Task Item 3: Archive Top Incident */}
            <button
              id="action-archive-incident"
              onClick={handleArchiveIncident}
              disabled={executingTask === 'archive'}
              className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 group-hover:bg-emerald-500/20">
                <GIcon name="inventory_2" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--color-war-text)]">
                    Archive Incident
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500">-4 RISK</span>
                </div>
                <p className="text-[11.5px] text-[var(--color-war-text-muted)] leading-tight mt-0.5">
                  Neutralize top threat vector & de-escalate radar
                </p>
              </div>
            </button>

            {/* Task Item 4: Emergency DMCA Takedown Wave */}
            <button
              id="action-dmca-wave"
              onClick={handleTriggerDMCAWave}
              disabled={executingTask === 'dmca'}
              className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400 group-hover:bg-purple-500/20">
                <GIcon name="gavel" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--color-war-text)]">
                    Emergency DMCA Wave
                  </span>
                  <span className="text-[10px] font-mono text-purple-500">LEGAL</span>
                </div>
                <p className="text-[11.5px] text-[var(--color-war-text-muted)] leading-tight mt-0.5">
                  Issue batch copyright takedowns to Telegram & cloud mirrors
                </p>
              </div>
            </button>

            {/* Task Item 5: Scan Box Office Consensus */}
            {onOpenBoxOfficeTracker && (
              <button
                id="action-scan-boxoffice"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBoxOfficeTracker();
                }}
                className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08] active:scale-[0.99] group"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 group-hover:bg-amber-500/20">
                  <GIcon name="receipt_long" size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[var(--color-war-text)]">
                      Scan Box Office Consensus
                    </span>
                    <span className="text-[10px] font-mono text-amber-500">FREE TOOL</span>
                  </div>
                  <p className="text-[11.5px] text-[var(--color-war-text-muted)] leading-tight mt-0.5">
                    Scan Sacnilk & web trade portals to calculate verified collection average
                  </p>
                </div>
              </button>
            )}

            {/* Subtle Divider for Modal Shortcuts */}
            <div className="my-1.5 h-px bg-[var(--color-war-border-light)]" />

            <div className="grid grid-cols-2 gap-1 p-1">
              {onOpenDossier && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDossier();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-[var(--color-war-text-secondary)] hover:bg-black/5 dark:hover:bg-white/[0.07] hover:text-[var(--color-war-text)] transition"
                >
                  <GIcon name="feed" size={13} />
                  <span>Dossier View</span>
                </button>
              )}
              {onOpenDispatch && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDispatch();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-[var(--color-war-text-secondary)] hover:bg-black/5 dark:hover:bg-white/[0.07] hover:text-[var(--color-war-text)] transition"
                >
                  <GIcon name="send" size={13} />
                  <span>Studio Dispatch</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
