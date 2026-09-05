import { useState } from 'react';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { incidents } from '../data/mockData';
import { useToast } from '../components/Toaster';

interface ExecutionEntry {
  id: number;
  tone: 'approved' | 'pending' | 'draft' | 'rejected' | 'escalated';
  title: string;
  detail: string;
  meta: string;
}

const toneStyles: Record<ExecutionEntry['tone'], { box: string; text: string; icon: typeof CheckCircle }> = {
  approved: { box: 'border-[#30d158]/25 bg-[#30d158]/10', text: 'text-[#30d158]', icon: CheckCircle },
  pending: { box: 'border-white/[0.08] bg-white/[0.03]', text: 'text-[#ffd60a]', icon: AlertTriangle },
  draft: { box: 'border-white/[0.08] bg-white/[0.03]', text: 'text-[#64a8ff]', icon: FileText },
  rejected: { box: 'border-white/[0.08] bg-white/[0.03]', text: 'text-[#ff6961]', icon: XCircle },
  escalated: { box: 'border-[#ff453a]/25 bg-[#ff453a]/10', text: 'text-[#ff6961]', icon: AlertTriangle },
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
  { name: 'Monitor', objective: 'Track and observe', risk: 'LOW', timing: 'Immediate', owner: 'System', approval: 'None', outcome: 'Continued awareness' },
  { name: 'Clarify', objective: 'Provide factual context', risk: 'MEDIUM', timing: '1–2 hours', owner: 'PR Lead', approval: 'Director', outcome: 'Reduced confusion' },
  { name: 'Correct', objective: 'Counter misinformation', risk: 'MEDIUM', timing: '2–4 hours', owner: 'Comms Team', approval: 'VP', outcome: 'Truth correction' },
  { name: 'Amplify positive', objective: 'Boost positive narratives', risk: 'LOW', timing: '1–3 hours', owner: 'Marketing', approval: 'Director', outcome: 'Narrative rebalance' },
  { name: 'Engage media', objective: 'Proactive media outreach', risk: 'HIGH', timing: '2–6 hours', owner: 'PR Agency', approval: 'C-Suite', outcome: 'Media narrative shift' },
  { name: 'Activate community', objective: 'Mobilize fan base', risk: 'MEDIUM', timing: '1–4 hours', owner: 'Community Mgr', approval: 'Director', outcome: 'Fan defense' },
  { name: 'Executive response', objective: 'Leadership statement', risk: 'HIGH', timing: '4–12 hours', owner: 'CEO / Studio Head', approval: 'Board', outcome: 'Authority intervention' },
  { name: 'Legal review', objective: 'Legal assessment', risk: 'HIGH', timing: '2–24 hours', owner: 'Legal Counsel', approval: 'General Counsel', outcome: 'Legal guidance' },
  { name: 'Crisis statement', objective: 'Official public statement', risk: 'CRITICAL', timing: '4–24 hours', owner: 'PR Director', approval: 'C-Suite', outcome: 'Public address' },
];

const riskStyles: Record<string, string> = {
  LOW: 'bg-[#30d158]/15 text-[#30d158]',
  MEDIUM: 'bg-[#ffd60a]/15 text-[#ffd60a]',
  HIGH: 'bg-[#ff9f0a]/15 text-[#ffb340]',
  CRITICAL: 'bg-[#ff453a]/15 text-[#ff6961]',
};

export function ResponseCenter() {
  const [selectedIncident, setSelectedIncident] = useState(incidents[0]);
  const [log, setLog] = useState<ExecutionEntry[]>(initialLog);
  const toast = useToast();

  const decide = (tone: ExecutionEntry['tone'], message: string) => {
    if (!selectedIncident) return;
    setLog((prev) => [
      {
        id: Date.now(),
        tone,
        title: tone.charAt(0).toUpperCase() + tone.slice(1),
        detail: `${message}: ${selectedIncident.title}`,
        meta: nowIST(),
      },
      ...prev,
    ]);
    toast(message, tone === 'rejected' || tone === 'escalated' ? 'warn' : 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Response</h1>
          <p className="apple-subhead mt-1">Decide, approve, and execute for Project Veera.</p>
        </div>

        {/* Three-Column Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Incoming */}
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">Incoming</span>
              <span className="apple-footnote">{incidents.filter(i => i.status !== 'RESOLVED').length} open</span>
            </div>
            <div className="space-y-2">
              {incidents.filter(i => i.status !== 'RESOLVED').map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
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
              ))}
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
                    onClick={() => decide('approved', 'Recommendation approved')}
                    className="apple-button flex items-center justify-center gap-1.5 bg-[#30d158] px-3 py-2 text-[13px] text-black hover:brightness-110"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => decide('pending', 'Sent back for modification')}
                    className="apple-button bg-white/10 px-3 py-2 text-[13px] text-white hover:bg-white/15"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => decide('rejected', 'Recommendation rejected')}
                    className="apple-button flex items-center justify-center gap-1.5 bg-white/10 px-3 py-2 text-[13px] text-white hover:bg-white/15"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => decide('escalated', 'Escalated to C-Suite')}
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
                const Icon = style.icon;
                return (
                  <div key={entry.id} className={clsx('rounded-2xl border p-4 fade-in', style.box)}>
                    <div className="mb-1 flex items-center gap-2">
                      <Icon size={14} className={style.text} />
                      <span className={clsx('text-[12px] font-semibold', style.text)}>{entry.title}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-war-text-secondary">{entry.detail}</p>
                    <span className="mt-1 block text-[12px] tabular-nums text-war-text-muted">{entry.meta}</span>
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
            {playbooks.map((pb) => (
              <div key={pb.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.05]">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold tracking-[-0.006em] text-white">{pb.name}</span>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', riskStyles[pb.risk])}>{pb.risk.toLowerCase()} risk</span>
                </div>
                <p className="mb-2.5 text-[13px] text-war-text-secondary">{pb.objective}</p>
                <div className="space-y-1 border-t border-white/[0.06] pt-2.5 text-[12px] text-war-text-muted">
                  <div>Timing · <span className="text-war-text-secondary">{pb.timing}</span></div>
                  <div>Owner · <span className="text-war-text-secondary">{pb.owner}</span></div>
                  <div>Approval · <span className="text-war-text-secondary">{pb.approval}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
