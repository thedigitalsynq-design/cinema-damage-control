import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GIcon } from '../components/GIcon';
import { incidents as fallbackIncidents } from '../data/mockData';
import { StatusBadge } from '../components/ui/StatusBadge';
import { IncidentDrawer } from '../components/IncidentDrawer';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useLiveDataContext } from '../context/LiveDataContext';
import { dispatchCreateIncident, dispatchResolveIncident } from '../lib/actionDispatcher';
import { useToast } from '../components/Toaster';
import { useRoom } from '../components/RoomState';
import type { Incident } from '../data/types';

export function Incidents() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('HIGH');
  const [newReach, setNewReach] = useState('750K');
  const [newRecommendation, setNewRecommendation] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const { project } = useProject();
  const { liveIncidents, isLive, lastUpdated, refresh, isLoading } = useLiveData(project.keywords.join(','));
  const { addIncident, resolveIncident } = useLiveDataContext();
  const toast = useToast();
  const { apply } = useRoom();

  const activeIncidents: Incident[] = liveIncidents && liveIncidents.length > 0 ? liveIncidents : fallbackIncidents;

  const counts = {
    CRITICAL: activeIncidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length,
    HIGH: activeIncidents.filter((i) => i.severity === 'HIGH' && i.status !== 'RESOLVED').length,
    MEDIUM: activeIncidents.filter((i) => i.severity === 'MEDIUM' && i.status !== 'RESOLVED').length,
    RESOLVED: activeIncidents.filter((i) => i.status === 'RESOLVED').length,
  };

  const displayedIncidents = activeIncidents.filter((i) => {
    if (filterTab === 'ACTIVE') return i.status !== 'RESOLVED';
    if (filterTab === 'RESOLVED') return i.status === 'RESOLVED';
    return true;
  });

  const handleCreateThreat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newInc: Partial<Incident> = {
      id: `inc-manual-${Date.now()}`,
      code: `CW-THR-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle.trim(),
      severity: newSeverity,
      status: 'ACTIVE',
      firstDetected: 'Just now',
      velocity: '+32% / 15m',
      reach: newReach,
      sentiment: newSeverity === 'CRITICAL' ? -65 : -40,
      authorityScore: 78,
      owner: 'War Room Analyst',
      recommendation: newRecommendation.trim() || 'Monitor and issue factual counter-brief.',
      whatWeKnow: `Manually reported threat vector for ${project.title}.`,
      whatWeDontKnow: ['Cross-platform syndication rate'],
      recommendedActions: ['Engage PR counsel', 'Monitor influencer sentiment', 'Draft clarifying memo'],
    };

    addIncident(newInc);
    dispatchCreateIncident(newInc);
    apply('escalate');
    toast(`New threat vector logged: "${newTitle.slice(0, 30)}..."`, 'warn');

    setNewTitle('');
    setNewRecommendation('');
    setIsLogModalOpen(false);
  };

  const handleQuickResolve = (e: React.MouseEvent, inc: Incident) => {
    e.stopPropagation();
    resolveIncident(inc.id);
    dispatchResolveIncident(inc.id, inc.title);
    apply('approve');
    toast(`Incident ${inc.code} marked resolved · risk −4`, 'success');
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
                  LIVE RADAR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-war-text-muted">
                  SIMULATED
                </span>
              )}
            </div>
            <h1 className="apple-title mt-0.5">Incidents</h1>
            <p className="apple-subhead mt-1">
              Active crisis incidents and dynamic risk telemetry for {project.title}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="apple-button flex items-center gap-1.5 bg-[#0a84ff] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#409cff]"
            >
              <GIcon name="add" size={14} />
              <span>Log Threat Vector</span>
            </button>

            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
              title="Refresh live telemetry"
            >
              <GIcon name="refresh" size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>

            <div className="flex items-center gap-2">
              {(
                [
                  { label: 'Critical', count: counts.CRITICAL, dot: 'bg-[#ff453a]', text: 'text-[#ff6961]' },
                  { label: 'High', count: counts.HIGH, dot: 'bg-[#ff9f0a]', text: 'text-[#ffb340]' },
                  { label: 'Medium', count: counts.MEDIUM, dot: 'bg-[#ffd60a]', text: 'text-[#ffd60a]' },
                  { label: 'Resolved', count: counts.RESOLVED, dot: 'bg-[#30d158]', text: 'text-[#30d158]' },
                ] as const
              ).map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-[12px] font-semibold ${s.text}`}>{s.count} {s.label.toLowerCase()}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                  filterTab === tab
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-war-text-secondary hover:text-white'
                }`}
              >
                {tab === 'ALL' ? `All (${activeIncidents.length})` : tab === 'ACTIVE' ? `Active (${activeIncidents.length - counts.RESOLVED})` : `Resolved (${counts.RESOLVED})`}
              </button>
            ))}
          </div>

          {lastUpdated && (
            <div className="text-[12px] text-war-text-muted">
              Last synced: {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">
                  {['Severity', 'Code', 'Incident', 'Detected', 'Velocity', 'Reach', 'Sentiment', 'Authority', 'Status', 'Owner', 'Recommendation', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedIncidents.map((inc) => {
                  const isResolved = inc.status === 'RESOLVED';
                  return (
                    <tr
                      key={inc.id}
                      className={`group cursor-pointer border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.04] ${
                        isResolved ? 'opacity-60' : ''
                      }`}
                      onClick={() => setSelectedIncident(inc)}
                    >
                      <td className="px-4 py-3">
                        <StatusBadge severity={inc.severity} size="xs" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] font-semibold text-war-text-muted">{inc.code}</span>
                      </td>
                      <td className="max-w-[260px] px-4 py-3">
                        <span className="block truncate text-[14px] font-medium tracking-[-0.006em] text-white" title={inc.title}>{inc.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] tabular-nums text-war-text-secondary">{inc.firstDetected}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-semibold tabular-nums text-[#ff6961]">{inc.velocity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] tabular-nums text-war-text-secondary">{inc.reach}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[13px] font-semibold tabular-nums ${inc.sentiment < 0 ? 'text-[#ff6961]' : 'text-[#30d158]'}`}>
                          {inc.sentiment > 0 ? `+${inc.sentiment}` : inc.sentiment}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] tabular-nums text-war-text-secondary">{inc.authorityScore}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[12px] font-semibold uppercase ${isResolved ? 'text-[#30d158]' : 'text-[#ffb340]'}`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-war-text-secondary">{inc.owner}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="line-clamp-1 text-[12px] font-semibold text-[#ffb340]" title={inc.recommendation}>
                          {inc.recommendation}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isResolved ? (
                            <button
                              onClick={(e) => handleQuickResolve(e, inc)}
                              className="rounded-full bg-[#30d158]/20 px-2.5 py-1 text-[11px] font-semibold text-[#30d158] transition hover:bg-[#30d158]/30"
                              title="Mark resolved and relieve risk"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#30d158]">Neutralized</span>
                          )}
                          <button
                            onClick={() => setSelectedIncident(inc)}
                            className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-war-text-secondary transition hover:bg-white/20 hover:text-white"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Threat Vector Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsLogModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div
                className="w-full max-w-[500px] rounded-[24px] border border-white/15 bg-[#1c1c1e] p-6 shadow-2xl backdrop-blur-2xl pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff453a]/20 text-[#ff6961]">
                      <GIcon name="warning" size={16} />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-bold text-white">Log Threat Vector</h2>
                      <p className="text-[12px] text-war-text-muted">Broadcast new controversy or risk telemetry</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsLogModalOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-war-text-secondary hover:bg-white/20 hover:text-white"
                  >
                    <GIcon name="close" size={14} />
                  </button>
                </div>

                <form onSubmit={handleCreateThreat} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-war-text-secondary mb-1">
                      Threat Title / Vector Description
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Unverified rumor regarding climax leak on Telegram"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-white/30 focus:border-[#0a84ff] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-war-text-secondary mb-1">
                        Severity Level
                      </label>
                      <select
                        value={newSeverity}
                        onChange={(e) => setNewSeverity(e.target.value as any)}
                        className="w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3 py-2 text-[13px] text-white focus:border-[#0a84ff] focus:outline-none"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-war-text-secondary mb-1">
                        Estimated Reach
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 850K or 1.2M"
                        value={newReach}
                        onChange={(e) => setNewReach(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-white/30 focus:border-[#0a84ff] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-war-text-secondary mb-1">
                      Recommended Immediate Action
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Deploy swift PR rebuttal before 8 PM prime time"
                      value={newRecommendation}
                      onChange={(e) => setNewRecommendation(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-white/30 focus:border-[#0a84ff] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsLogModalOpen(false)}
                      className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/15"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-[#0a84ff] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#409cff]"
                    >
                      Broadcast & Track
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIncident && (
          <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
