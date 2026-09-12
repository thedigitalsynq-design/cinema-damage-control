import { useState } from 'react';
import { clsx } from 'clsx';
import { GIcon } from '../components/GIcon';
import { incidents as fallbackIncidents } from '../data/mockData';
import { useToast } from '../components/Toaster';
import { LiveBanner } from '../components/LiveBanner';
import { useRoom, type RoomActionKind } from '../components/RoomState';
import { useProject } from '../components/ProjectContext';
import { useLiveData } from '../hooks/useLiveData';
import { useLiveDataContext } from '../context/LiveDataContext';
import { activeCrises } from '../data/damage';
import { projectLoss } from '../data/algorithm';
import {
  dispatchResolveIncident,
  dispatchPlaybookExecution,
  dispatchAction,
} from '../lib/actionDispatcher';
import { CountermeasureModal } from '../components/CountermeasureModal';

interface ExecutionEntry {
  id: number;
  tone: 'approved' | 'pending' | 'draft' | 'rejected' | 'escalated';
  title: string;
  detail: string;
  meta: string;
  result?: string;
}

const toneStyles: Record<ExecutionEntry['tone'], { box: string; text: string; icon: string }> = {
  approved: { box: 'border-[#30d158]/25 bg-[#30d158]/10', text: 'text-[#30d158]', icon: 'check_circle' },
  pending: { box: 'border-white/[0.08] bg-white/[0.03]', text: 'text-[#ffd60a]', icon: 'warning' },
  draft: { box: 'border-white/[0.08] bg-white/[0.03]', text: 'text-[#64a8ff]', icon: 'description' },
  rejected: { box: 'border-white/[0.08] bg-white/[0.03]', text: 'text-[#ff6961]', icon: 'cancel' },
  escalated: { box: 'border-[#ff453a]/25 bg-[#ff453a]/10', text: 'text-[#ff6961]', icon: 'warning' },
};

const initialLog: ExecutionEntry[] = [
  { id: 1, tone: 'approved', title: 'Approved', detail: 'Factual clarification released via official channels', meta: '19:45 IST · Priya Sharma' },
  { id: 2, tone: 'pending', title: 'Pending', detail: 'Media briefing preparation', meta: 'Assigned · Rahul Mehta' },
  { id: 3, tone: 'draft', title: 'Draft', detail: 'Official studio statement', meta: 'In review · Ananya Reddy' },
];

function nowIST(): string {
  return `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST · Admin`;
}

const playbooks = [
  { name: 'Monitor', objective: 'Track and observe', risk: 'LOW', timing: 'Immediate', owner: 'System', approval: 'None', outcome: 'Continued awareness', urgency: 'MONITOR', confidence: 92, why: 'Baseline watch costs nothing and catches ignition early.', impact: 'Early warning on new spikes.' },
  { name: 'Clarify', objective: 'Provide factual context', risk: 'MEDIUM', timing: '1–2 hours', owner: 'PR Lead', approval: 'Director', outcome: 'Reduced confusion', urgency: 'THIS WEEK', confidence: 78, why: 'Confusion, not hostility, drives most early negativity.', impact: 'Cut misread stories by a third.' },
  { name: 'Correct', objective: 'Counter misinformation', risk: 'MEDIUM', timing: '2–4 hours', owner: 'Comms Team', approval: 'VP', outcome: 'Truth correction', urgency: 'THIS WEEK', confidence: 74, why: 'False claims travel faster than corrections — speed matters.', impact: 'Contain false-narrative share.' },
  { name: 'Amplify positive', objective: 'Boost positive narratives', risk: 'LOW', timing: '1–3 hours', owner: 'Marketing', approval: 'Director', outcome: 'Narrative rebalance', urgency: 'THIS WEEK', confidence: 69, why: 'Algorithms reward engagement; positivity needs paid push.', impact: 'Lift positive share 5–10 pts.' },
  { name: 'Engage media', objective: 'Proactive media outreach', risk: 'HIGH', timing: '2–6 hours', owner: 'PR Agency', approval: 'C-Suite', outcome: 'Media narrative shift', urgency: 'NOW', confidence: 71, why: 'Two portals set the tone every other outlet copies.', impact: 'Flip 2–3 agenda-setting stories.' },
  { name: 'Activate community', objective: 'Mobilize fan base', risk: 'MEDIUM', timing: '1–4 hours', owner: 'Community Mgr', approval: 'Director', outcome: 'Fan defense', urgency: 'THIS WEEK', confidence: 66, why: 'Organised fans out-post critics 10:1 when briefed.', impact: 'Flood hashtags with support.' },
  { name: 'Executive response', objective: 'Leadership statement', risk: 'HIGH', timing: '4–12 hours', owner: 'CEO / Studio Head', approval: 'Board', outcome: 'Authority intervention', urgency: 'NOW', confidence: 63, why: 'Only authority ends authority-shaped controversies.', impact: 'Reset the news cycle.' },
  { name: 'Legal review', objective: 'Legal assessment', risk: 'HIGH', timing: '2–24 hours', owner: 'Legal Counsel', approval: 'General Counsel', outcome: 'Legal guidance', urgency: 'THIS WEEK', confidence: 88, why: 'Review-bombing and leaks cross legal lines fast.', impact: 'Takedowns with standing.' },
  { name: 'Crisis statement', objective: 'Official public statement', risk: 'CRITICAL', timing: '4–24 hours', owner: 'PR Director', approval: 'C-Suite', outcome: 'Public address', urgency: 'NOW', confidence: 58, why: 'Last resort: speaks once, binds the studio.', impact: 'End speculation or own it.' },
];

const riskStyles: Record<string, string> = {
  LOW: 'bg-[#30d158]/15 text-[#30d158]',
  MEDIUM: 'bg-[#ffd60a]/15 text-[#ffd60a]',
  HIGH: 'bg-[#ff9f0a]/15 text-[#ffb340]',
  CRITICAL: 'bg-[#ff453a]/15 text-[#ff6961]',
};

const urgencyStyles: Record<string, string> = {
  NOW: 'bg-[#ff453a]/15 text-[#ff6961]',
  'THIS WEEK': 'bg-[#ff9f0a]/15 text-[#ffb340]',
  MONITOR: 'bg-white/10 text-war-text-secondary',
};

export function ResponseCenter() {
  const { project } = useProject();
  const { stats, isLive, liveIncidents } = useLiveData(project.keywords.join(','));
  const { resolveIncident } = useLiveDataContext();
  const [isCountermeasureOpen, setIsCountermeasureOpen] = useState(false);

  const availableIncidents = liveIncidents && liveIncidents.length > 0 ? liveIncidents : fallbackIncidents;
  const activeIncidents = availableIncidents.filter((i) => i.status !== 'RESOLVED');

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const selectedIncident = activeIncidents.find((i) => i.id === selectedIncidentId) || activeIncidents[0] || availableIncidents[0];

  const velocity = isLive && stats ? stats.velocityPct : 38;
  const exposure = (() => {
    const m = (activeCrises[0]?.revenueAtRisk || '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 8;
  })();
  const sim = projectLoss(exposure, velocity);
  const [dismissedPlays, setDismissedPlays] = useState<string[]>([]);
  const [log, setLog] = useState<ExecutionEntry[]>(initialLog);
  const toast = useToast();
  const { apply } = useRoom();

  const decide = (tone: ExecutionEntry['tone'], message: string, kind: RoomActionKind) => {
    if (!selectedIncident) return;
    apply(kind);

    if (tone === 'approved') {
      resolveIncident(selectedIncident.id);
      dispatchResolveIncident(selectedIncident.id, selectedIncident.title);
    } else if (tone === 'escalated') {
      dispatchAction('ESCALATE_INCIDENT', 'INCIDENT', `Escalated to C-Suite: ${selectedIncident.code}`, `Incident ${selectedIncident.title} escalated for Board attention.`, { incidentId: selectedIncident.id });
    } else if (tone === 'rejected') {
      dispatchAction('REJECT_RECOMMENDATION', 'INCIDENT', `Recommendation Rejected: ${selectedIncident.code}`, `Risk increased +3. Reason: Rejected by leadership.`, { incidentId: selectedIncident.id });
    } else {
      dispatchAction('MODIFY_PLAN', 'INCIDENT', `Modification Requested: ${selectedIncident.code}`, `Sent back for revision: ${selectedIncident.title}`, { incidentId: selectedIncident.id });
    }

    setLog((prev) => [
      {
        id: Date.now(),
        tone,
        title: tone.charAt(0).toUpperCase() + tone.slice(1),
        detail: `${message}: ${selectedIncident.title}`,
        meta: nowIST(),
        result: 'Before metrics logged · review in 72h · TRACKING',
      },
      ...prev,
    ]);
    toast(message, tone === 'rejected' || tone === 'escalated' ? 'warn' : 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Response</h1>
            <p className="apple-subhead mt-1">Decide, approve, and execute mitigation protocols for {project.title}.</p>
          </div>

          <button
            onClick={() => setIsCountermeasureOpen(true)}
            className="apple-button flex items-center gap-1.5 bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#409cff]"
          >
            <GIcon name="send" size={14} />
            <span>Deploy Official Dispatch</span>
          </button>
        </div>

        <LiveBanner />

        {/* Three-Column Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Incoming */}
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Incoming</span>
              <span className="apple-footnote">{activeIncidents.length} open</span>
            </div>
            <div className="space-y-2">
              {activeIncidents.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
                  <GIcon name="check_circle" size={24} className="mx-auto text-[#30d158] mb-2" />
                  <p className="text-[13px] font-semibold text-white">All Active Vectors Neutralized</p>
                  <p className="text-[12px] text-war-text-muted mt-0.5">Radar is clear. Continue background monitoring.</p>
                </div>
              ) : (
                activeIncidents.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={clsx(
                      'w-full rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99]',
                      selectedIncident?.id === inc.id
                        ? 'border-[#0a84ff]/50 bg-[#0a84ff]/12'
                        : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={clsx(
                        'text-[12px] font-semibold capitalize',
                        inc.severity === 'CRITICAL' && 'text-[#ff6961]',
                        inc.severity === 'HIGH' && 'text-[#ffb340]',
                        inc.severity === 'MEDIUM' && 'text-[#ffd60a]',
                        inc.severity === 'LOW' && 'text-[#64a8ff]'
                      )}>{inc.severity.toLowerCase()}</span>
                      <span className="font-mono text-[12px] text-war-text-muted">{inc.code}</span>
                    </div>
                    <p className="text-[14px] font-medium leading-snug text-white">{inc.title}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-[12px] tabular-nums text-war-text-muted">Velocity {inc.velocity}</span>
                      <span className="text-[12px] tabular-nums text-war-text-muted">Reach {inc.reach}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Decision */}
          <div className="glass-panel p-5">
            <div className="section-title mb-4">Decision</div>
            {selectedIncident && (
              <div className="space-y-3.5">
                <div className="rounded-2xl border border-[#0a84ff]/25 bg-[#0a84ff]/10 p-4">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64a8ff]">AI recommendation</div>
                  <p className="text-[13px] leading-relaxed text-war-text-secondary">{selectedIncident.recommendation}</p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Recommended actions</div>
                  <ol className="space-y-2">
                    {selectedIncident.recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/20 text-[12px] font-semibold text-[#64a8ff]">{i + 1}</span>
                        <span className="text-[13px] leading-relaxed text-war-text-secondary">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => decide('approved', 'Recommendation approved · risk −4', 'approve')}
                    className="apple-button flex items-center justify-center gap-1.5 bg-[#30d158] px-3 py-2 text-[13px] text-black hover:brightness-110"
                  >
                    <GIcon name="check_circle" size={15} /> Approve
                  </button>
                  <button
                    onClick={() => decide('pending', 'Sent back for modification', 'modify')}
                    className="apple-button bg-white/10 px-3 py-2 text-[13px] text-white hover:bg-white/15"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => decide('rejected', 'Recommendation rejected · risk +3', 'reject')}
                    className="apple-button flex items-center justify-center gap-1.5 bg-white/10 px-3 py-2 text-[13px] text-white hover:bg-white/15"
                  >
                    <GIcon name="cancel" size={15} /> Reject
                  </button>
                  <button
                    onClick={() => decide('escalated', 'Escalated to C-Suite', 'escalate')}
                    className="apple-button bg-[#ff453a] px-3 py-2 text-[13px] text-white hover:brightness-110"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Execution */}
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Execution</span>
              <span className="apple-footnote">{log.length} entries</span>
            </div>
            <div className="space-y-2.5">
              {log.map((entry) => {
                const style = toneStyles[entry.tone];
                return (
                  <div key={entry.id} className={clsx('rounded-2xl border p-4 fade-in', style.box)}>
                    <div className="mb-1 flex items-center gap-2">
                      <GIcon name={style.icon} size={15} className={style.text} />
                      <span className={clsx('text-[12px] font-semibold', style.text)}>{entry.title}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-war-text-secondary">{entry.detail}</p>
                    <span className="mt-1 block text-[12px] tabular-nums text-war-text-muted">{entry.meta}</span>
                    {entry.result && (
                      <span className="mt-1.5 block text-[11px] font-medium text-[#ffd60a]">{entry.result}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Response Playbook */}
        <div className="glass-panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="section-title">Response playbook</span>
            <span className="apple-footnote">{playbooks.length} plays</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playbooks.filter((pb) => !dismissedPlays.includes(pb.name)).map((pb) => (
              <div key={pb.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.05]">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold tracking-[-0.006em] text-white">{pb.name}</span>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', riskStyles[pb.risk])}>{pb.risk.toLowerCase()} risk</span>
                </div>
                <p className="mb-2 text-[13px] text-war-text-secondary">{pb.objective}</p>
                <p className="mb-1 text-[12px] leading-relaxed text-war-text-muted"><span className="font-medium text-war-text-secondary">Why: </span>{pb.why}</p>
                <p className="mb-2.5 text-[12px] leading-relaxed text-war-text-muted"><span className="font-medium text-war-text-secondary">Impact: </span>{pb.impact}</p>
                <div className="mb-3 flex items-center gap-2">
                  <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold', urgencyStyles[pb.urgency])}>{pb.urgency}</span>
                  <span className="text-[11px] tabular-nums text-war-text-muted">{pb.confidence}% confidence</span>
                </div>
                <div className="flex gap-2 border-t border-white/[0.06] pt-2.5">
                  <button
                    onClick={() => {
                      apply('approve');
                      dispatchPlaybookExecution(pb.name, pb.objective, project.title);
                      setLog((prev) => [{
                        id: Date.now(),
                        tone: 'approved',
                        title: 'Approved',
                        detail: `Playbook executed: ${pb.name} — ${pb.objective}`,
                        meta: nowIST(),
                        result: 'Before metrics logged · review in 72h · TRACKING',
                      }, ...prev]);
                      toast(`${pb.name} executing · risk −4`, 'success');
                    }}
                    className="apple-button flex-1 bg-[#0a84ff] py-1.5 text-[12px] text-white hover:bg-[#409cff]"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => { setDismissedPlays((d) => [...d, pb.name]); toast(`${pb.name} dismissed`, 'info'); }}
                    className="apple-button bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/15"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
          {dismissedPlays.length > 0 && (
            <p className="apple-footnote mt-3">{dismissedPlays.length} play{dismissedPlays.length > 1 ? 's' : ''} dismissed this session.</p>
          )}
        </div>

        {/* 72-hour risk simulation — model, not a forecast */}
        <div className="glass-panel p-5">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="section-title">72-hour risk simulation</span>
            <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">MODEL · NOT FINANCIAL ADVICE</span>
          </div>
          <p className="apple-footnote mb-4">Projected loss from current velocity ({velocity >= 0 ? '+' : ''}{Math.round(velocity)}%) if each path is taken.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                { label: 'Do nothing', loss: `₹${sim.doNothing} Cr`, note: 'Velocity compounds unchecked.', hot: false },
                { label: 'Show optimisation', loss: `₹${sim.showOpt} Cr`, note: 'Cut sub-20% morning shows.', hot: false },
                { label: 'Regional marketing + optimisation', loss: `₹${sim.combined} Cr`, note: 'Push Telugu + Tamil corridors.', hot: false },
                { label: 'Best intervention', loss: `₹${sim.protected} Cr protected`, note: 'All of the above, this week.', hot: true },
              ] as const
            ).map((s) => (
              <div key={s.label} className={clsx('rounded-2xl border p-4', s.hot ? 'border-[#30d158]/25 bg-[#30d158]/[0.07]' : 'border-white/[0.07] bg-white/[0.03]')}>
                <div className="text-[14px] font-semibold text-white">{s.label}</div>
                <div className={clsx('mt-1 text-[20px] font-bold tabular-nums', s.hot ? 'text-[#30d158]' : 'text-[#ff6961]')}>{s.loss}</div>
                <div className="mt-1 text-[12px] text-war-text-muted">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CountermeasureModal
        isOpen={isCountermeasureOpen}
        onClose={() => setIsCountermeasureOpen(false)}
      />
    </div>
  );
}
