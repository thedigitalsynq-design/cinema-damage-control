import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { incidents } from '../data/mockData';
import { StatusBadge } from '../components/ui/StatusBadge';
import { IncidentDrawer } from '../components/IncidentDrawer';
import type { Incident } from '../data/types';

export function Incidents() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const counts = {
    CRITICAL: incidents.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: incidents.filter((i) => i.severity === 'HIGH').length,
    MEDIUM: incidents.filter((i) => i.severity === 'MEDIUM').length,
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Incidents</h1>
            <p className="apple-subhead mt-1">Active crisis incidents for Project Veera.</p>
          </div>
          <div className="flex items-center gap-2">
            {(
              [
                { label: 'Critical', count: counts.CRITICAL, dot: 'bg-[#ff453a]', text: 'text-[#ff6961]' },
                { label: 'High', count: counts.HIGH, dot: 'bg-[#ff9f0a]', text: 'text-[#ffb340]' },
                { label: 'Medium', count: counts.MEDIUM, dot: 'bg-[#ffd60a]', text: 'text-[#ffd60a]' },
              ] as const
            ).map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className={`text-[12px] font-semibold ${s.text}`}>{s.count} {s.label.toLowerCase()}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">
                  {['Severity', 'Code', 'Incident', 'Detected', 'Velocity', 'Reach', 'Sentiment', 'Authority', 'Status', 'Owner', 'Recommendation'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className="group cursor-pointer border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.04]"
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
                      <span className="text-[13px] font-semibold tabular-nums text-[#ff6961]">{inc.sentiment}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] tabular-nums text-war-text-secondary">{inc.authorityScore}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-medium capitalize text-war-text-secondary">{inc.status.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-war-text-secondary">{inc.owner}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold text-[#ffb340]">{inc.recommendation}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedIncident && (
          <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
