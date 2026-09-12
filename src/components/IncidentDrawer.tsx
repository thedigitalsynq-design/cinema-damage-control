import { GIcon } from './GIcon';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './ui/StatusBadge';
import { useToast } from './Toaster';
import { useRoom } from './RoomState';
import { useLiveDataContext } from '../context/LiveDataContext';
import { dispatchResolveIncident, dispatchAction } from '../lib/actionDispatcher';
import type { Incident } from '../data/types';

export function IncidentDrawer({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { apply } = useRoom();
  const { resolveIncident } = useLiveDataContext();
  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="fixed right-3 top-3 bottom-3 w-[520px] max-w-[calc(100vw-24px)] rounded-[20px] border border-white/10 bg-[#1c1c1e]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl z-50 overflow-y-auto"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#1c1c1e]/90 px-6 py-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">Incident</span>
              <span className="text-[14px] font-semibold tracking-tight text-white">{incident.code}</span>
            </div>
            <p className="mt-0.5 text-[13px] font-normal text-war-text-secondary">{incident.title}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <StatusBadge severity={incident.severity} size="md" />
            <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-war-text-secondary transition hover:bg-white/20 hover:text-white active:scale-95">
              <GIcon name="close" size={14} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="metric-label mb-1">First detected</div>
              <div className="flex items-center gap-1.5">
                <GIcon name="schedule" size={13} className="text-war-text-muted" />
                <span className="text-[17px] font-semibold tracking-tight text-white">{incident.firstDetected}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="metric-label mb-1">Velocity</div>
              <div className="text-[17px] font-semibold tracking-tight text-[#ff6961]">{incident.velocity}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="metric-label mb-1">Est. reach</div>
              <div className="flex items-center gap-1.5">
                <GIcon name="visibility" size={13} className="text-war-text-muted" />
                <span className="text-[17px] font-semibold tracking-tight text-white">{incident.reach}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="metric-label mb-1">Sentiment</div>
              <div className="text-[17px] font-semibold tracking-tight text-[#ff6961]">{incident.sentiment}%</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="metric-label mb-1">Authority</div>
              <div className="flex items-center gap-1.5">
                <GIcon name="shield" size={13} className="text-war-text-muted" />
                <span className="text-[17px] font-semibold tracking-tight text-white">{incident.authorityScore}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="metric-label mb-1">Owner</div>
              <div className="text-[14px] font-medium text-white">{incident.owner}</div>
            </div>
          </div>

          {/* Recommendation Banner */}
          <div className="rounded-2xl border border-[#ff453a]/25 bg-[#ff453a]/10 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <GIcon name="warning" size={16} className="shrink-0 text-[#ff6961]" />
              <span className="text-[13px] font-semibold tracking-[-0.006em] text-[#ff6961]">{incident.recommendation}</span>
            </div>
          </div>

          {/* What We Know */}
          <div>
            <h3 className="section-title mb-2.5">What we know</h3>
            <p className="text-[14px] leading-relaxed text-war-text-secondary">{incident.whatWeKnow}</p>
          </div>

          {/* What We Don't Know */}
          <div>
            <h3 className="section-title mb-2.5">What we don't know</h3>
            <ul className="space-y-2">
              {incident.whatWeDontKnow.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd60a]" />
                  <span className="text-[13px] leading-relaxed text-war-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Actions */}
          <div>
            <h3 className="section-title mb-2.5">Recommended actions</h3>
            <ol className="space-y-2">
              {incident.recommendedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/20 text-[12px] font-semibold text-[#64a8ff]">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed text-war-text-secondary">{action}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {incident.status !== 'RESOLVED' ? (
              <button
                onClick={() => {
                  resolveIncident(incident.id);
                  dispatchResolveIncident(incident.id, incident.title);
                  apply('approve');
                  toast(`Incident ${incident.code} marked resolved · risk −4`, 'success');
                  onClose();
                }}
                className="apple-button flex w-full items-center justify-center gap-2 bg-[#30d158] px-4 py-2.5 text-[14px] font-semibold text-black hover:brightness-110"
              >
                <GIcon name="check_circle" size={16} /> Mark Resolved & Neutralize Threat
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-[#30d158]/30 bg-[#30d158]/10 py-2.5 text-[13px] font-medium text-[#30d158]">
                <GIcon name="check_circle" size={16} /> Threat Vector Neutralized
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  apply('plan');
                  dispatchAction('CREATE_PLAN', 'INCIDENT', `Response Plan Initiated: ${incident.code}`, `Incident: ${incident.title}`, { incidentId: incident.id });
                  toast(`Response plan started for ${incident.code} · risk −3`, 'success');
                  onClose();
                  navigate('/response');
                }}
                className="apple-button flex-1 bg-[#0a84ff] px-4 py-2 text-[13px] text-white hover:bg-[#409cff]"
              >
                Open Playbook
              </button>
              <button
                onClick={() => {
                  apply('escalate');
                  dispatchAction('ESCALATE_INCIDENT', 'INCIDENT', `Escalated to C-Suite: ${incident.code}`, `Incident: ${incident.title}`, { incidentId: incident.id });
                  toast(`Escalated ${incident.code} to C-Suite`, 'warn');
                  onClose();
                }}
                className="apple-button flex items-center gap-1 bg-white/10 px-4 py-2 text-[13px] text-white hover:bg-white/15"
              >
                Escalate <GIcon name="chevron_right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
