import { motion } from 'framer-motion';
import { GIcon } from './GIcon';
import { useProject } from './ProjectContext';
import { films, liveScoreOf, damageBand, bandStyles } from '../data/damage';
import { useToast } from './Toaster';
import { useState } from 'react';
import type { ScenarioId } from './CrisisSandbox';

export function ExecutiveDossierModal({
  isOpen,
  onClose,
  activeScenario = 'baseline',
}: {
  isOpen: boolean;
  onClose: () => void;
  activeScenario?: ScenarioId;
}) {
  const { project } = useProject();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFilm = films.find((f) => f.id === project.id) || films[0];
  const baseScore = liveScoreOf(currentFilm);
  const score = Math.min(
    99,
    baseScore + (activeScenario === 'leak' ? 24 : activeScenario === 'boycott' ? 20 : activeScenario === 'embargo' ? 14 : 0)
  );
  const band = damageBand(score);

  const copyBriefing = () => {
    const text = `=== CINE-AEGIS STUDIO THREAT INTELLIGENCE DOSSIER ===
PROJECT: ${currentFilm.title} (${currentFilm.genre})
LANGUAGE: ${currentFilm.language} | BUDGET: ${currentFilm.budget}
RELEASE STATUS: ${currentFilm.status}
DAMAGE INDEX: ${score}/100 [${band.toUpperCase()}]
TOTAL REVENUE AT RISK: ${currentFilm.revenue.atRisk}
EXPECTED LIFETIME GROSS: ${currentFilm.revenue.expected}
PROJECTED REALIZATION: ${currentFilm.revenue.projected}
MARKET EXPOSURE:
${currentFilm.markets.map(m => ` • ${m.region} (${m.language}): Health ${m.health}% | Rev: ${m.revenue} | Occ: ${m.occupancy}% | Trend: ${m.trend.toUpperCase()}`).join('\n')}

PRIMARY INFERENCE:
${currentFilm.inference}

RECOMMENDED 24-HOUR MITIGATION:
${currentFilm.actions.map(a => ` • [${a.urgency}] ${a.title}: ${a.why} (Impact: ${a.impact})`).join('\n')}

CLASSIFICATION: STRICTLY CONFIDENTIAL // STUDIO BOARD ONLY
TIMESTAMP: ${new Date().toISOString()}
======================================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Confidential executive dossier copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      <motion.div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/15 bg-[#0f1117] text-white shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-amber-700 shadow-md">
              <GIcon name="security" size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-[0.12em] text-red-400 uppercase">Classified Dossier</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/70">CONFIDENTIAL</span>
              </div>
              <h2 className="text-[17px] font-bold tracking-tight text-white">{currentFilm.title} · Executive Briefing</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyBriefing}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/20 active:scale-95"
            >
              <GIcon name={copied ? 'check' : 'content_copy'} size={14} className={copied ? 'text-green-400' : ''} />
              {copied ? 'Copied' : 'Copy Briefing'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/20 active:scale-95"
            >
              <GIcon name="print" size={14} />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <GIcon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-[13px] leading-relaxed text-zinc-300">
          {/* Film Metadata Strip */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-4">
            <div>
              <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Release Timeline</div>
              <div className="mt-0.5 text-[14px] font-semibold text-white">{currentFilm.releaseDate}</div>
              <div className="text-[11px] text-zinc-400">{currentFilm.status}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Production Scale</div>
              <div className="mt-0.5 text-[14px] font-semibold text-white">{currentFilm.budget}</div>
              <div className="text-[11px] text-zinc-400">{currentFilm.genre}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Damage Band</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${bandStyles[band]}`}>
                  {band.toUpperCase()}
                </span>
                <span className="text-[14px] font-bold text-white tabular-nums">{score}/100</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Capital at Risk</div>
              <div className="mt-0.5 text-[16px] font-bold text-red-400 tabular-nums">{currentFilm.revenue.atRisk}</div>
              <div className="text-[11px] text-zinc-400">Target: {currentFilm.revenue.expected}</div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white">1. Situation Diagnosis & Signal Inference</h3>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-[13.5px] leading-relaxed text-zinc-200">
              <p>{currentFilm.inference}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentFilm.observed.map((obs, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    <span className="font-semibold text-white">{obs.metric}:</span> {obs.delta}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Territory Risk Matrix */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white">2. Territory-by-Territory Distribution Health</h3>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-white/10 bg-white/[0.04] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-2.5">Region</th>
                    <th className="px-3 py-2.5">Language</th>
                    <th className="px-3 py-2.5">Health</th>
                    <th className="px-3 py-2.5">Est. Revenue</th>
                    <th className="px-3 py-2.5">Occupancy</th>
                    <th className="px-3 py-2.5">Trajectory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentFilm.markets.map((m, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-medium text-white">{m.region}</td>
                      <td className="px-3 py-2.5 text-zinc-400">{m.language}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          m.health >= 70 ? 'bg-green-500/20 text-green-400' : m.health >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {m.health}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-zinc-200">{m.revenue}</td>
                      <td className="px-3 py-2.5 font-mono text-zinc-200">{m.occupancy}%</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-semibold ${
                          m.trend === 'up' ? 'text-green-400' : m.trend === 'down' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {m.trend === 'up' ? '↑ GAINING' : m.trend === 'down' ? '↓ ERODING' : '→ STABLE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rapid Response Actions */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white">3. Prescribed Studio Countermeasures</h3>
            <div className="space-y-2">
              {currentFilm.actions.map((act) => (
                <div key={act.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        act.urgency === 'NOW' ? 'bg-red-500/20 text-red-400' : act.urgency === 'THIS WEEK' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {act.urgency}
                      </span>
                      <h4 className="text-[13px] font-semibold text-white">{act.title}</h4>
                    </div>
                    <p className="text-[12px] text-zinc-400">{act.why}</p>
                    <p className="text-[11.5px] text-green-400/90 font-medium">Strategic Impact: {act.impact}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-zinc-500 uppercase">Confidence</div>
                    <div className="text-[13px] font-bold text-white tabular-nums">{act.confidence}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal / Sign-off Notice */}
          <div className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-[11px] text-zinc-500">
            <p>DISCLAIMER: This automated briefing incorporates verified RSS signals, Wikipedia audience curiosity curves, and mathematical box-office exposure algorithms. Information contained herein is privileged studio work-product intended solely for accredited production decision-makers.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
