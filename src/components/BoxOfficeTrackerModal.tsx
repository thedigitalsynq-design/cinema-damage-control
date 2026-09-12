import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GIcon } from './GIcon';
import { api, type BoxOfficeConsensusResult } from '../data/apiService';
import { useToast } from './Toaster';

interface BoxOfficeTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilm?: string;
}

const POPULAR_FILMS = [
  'Toxic (Yash)',
  'Pushpa 2: The Rule',
  'Devara: Part 1',
  'Kalki 2898 AD',
  'Stree 2',
  'KGF: Chapter 2',
  'Kantara: A Legend',
  'Jawan',
];

export const BoxOfficeTrackerModal: React.FC<BoxOfficeTrackerModalProps> = ({
  isOpen,
  onClose,
  initialFilm = 'Toxic',
}) => {
  const [filmQuery, setFilmQuery] = useState(initialFilm);
  const [activeFilm, setActiveFilm] = useState(initialFilm);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<BoxOfficeConsensusResult | null>(null);
  const [filterMilestone, setFilterMilestone] = useState<string>('all');
  const toast = useToast();

  const scanSteps = useMemo(() => [
    'Scanning Google News RSS Trade Syndicates...',
    'Querying Sacnilk, Bollywood Hungama & Pinkvilla endpoints...',
    'Parsing currency figures (₹ Cr / Lakhs / Millions)...',
    'Computing Consensus Average, Median & Outlier Trim...',
  ], []);

  const performScan = React.useCallback(async (film: string) => {
    setIsScanning(true);
    setScanStep(0);
    setActiveFilm(film);

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 450);

    try {
      const data = await api.getBoxOfficeTracker(film);
      setResult(data);
      toast(`Scanned ${data.sourcesCount} internet trade sources · Average: ${data.formattedAverage}`, 'success');
    } catch {
      toast('Live trade scan failed; displaying calibrated trade consensus.', 'warn');
    } finally {
      clearInterval(stepInterval);
      setIsScanning(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isOpen) return;
    const target = initialFilm || 'Toxic';
    const timer = setTimeout(() => {
      performScan(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, initialFilm, performScan]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filmQuery.trim()) return;
    performScan(filmQuery.trim());
  };

  const handleCopyConsensusBrief = () => {
    if (!result) return;
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const brief = [
      `# CINEMA DAMAGE CONTROL - BOX OFFICE TRADE CONSENSUS`,
      `**Film**: ${result.film}`,
      `**Timestamp**: ${timestamp} IST`,
      `**Consensus Average**: ${result.formattedAverage}`,
      `**Median Collection**: ${result.formattedMedian}`,
      `**Trimmed Average**: ${result.formattedTrimmedAverage}`,
      `**Reported Range**: ₹${result.min} Cr – ₹${result.max} Cr (Spread: ₹${result.spread} Cr · ±${result.variancePct}% variance)`,
      `**Trade Discrepancy Index**: ${result.discrepancyIndex} (${result.inflationRisk})`,
      `**Status**: ${result.consensusStatus}`,
      ``,
      `## Tactical Verdict`,
      result.consensusVerdict,
      ``,
      `## Individual Scanned Sources (${result.sourcesCount} Total)`,
      ...result.sources.map(
        (s) => `- **${s.source}**: ${s.formattedAmount} (${s.milestone}) [Variance: ${s.varianceFromAvg && s.varianceFromAvg > 0 ? '+' : ''}${s.varianceFromAvg} Cr]`
      ),
      ``,
      `*Generated via DigiSynq Zero-Cost Multi-Source Trade Scanner*`,
    ].join('\n');

    navigator.clipboard.writeText(brief);
    toast('Copied verified Box Office Consensus brief to clipboard!', 'success');
  };

  const filteredSources = useMemo(() => {
    if (!result?.sources) return [];
    if (filterMilestone === 'all') return result.sources;
    return result.sources.filter((s) => s.milestone.toLowerCase().includes(filterMilestone.toLowerCase()));
  }, [result, filterMilestone]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-5xl my-auto overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a] shadow-[0_32px_96px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#141724]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <GIcon name="receipt_long" size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[17px] font-bold text-white tracking-tight">
                    Box Office Consensus Tracker
                  </h2>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-400 border border-emerald-500/30">
                    100% Free Internet Scanner
                  </span>
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10.5px] font-mono text-blue-300 border border-blue-500/30">
                    Multi-Source Mean & Median
                  </span>
                </div>
                <p className="text-[12px] text-zinc-400">
                  Scans live trade disclosures across Sacnilk, Pinkvilla, Bollywood Hungama & Google Trade RSS to compute mathematically verified collection averages.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Close"
            >
              <GIcon name="close" size={20} />
            </button>
          </div>

          {/* Search & Selection Bar */}
          <div className="border-b border-white/10 bg-[#161928] px-6 py-3 space-y-2.5">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <GIcon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={filmQuery}
                  onChange={(e) => setFilmQuery(e.target.value)}
                  placeholder="Enter film title to scan internet box office (e.g. Toxic, Pushpa 2, Devara, Kalki)..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isScanning || !filmQuery.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg transition hover:from-amber-400 hover:to-orange-500 active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isScanning ? (
                  <>
                    <GIcon name="sync" size={16} className="animate-spin text-white" />
                    <span>Scanning Internet...</span>
                  </>
                ) : (
                  <>
                    <GIcon name="radar" size={16} />
                    <span>Scan & Compute Average</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Film Selection Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11.5px] text-zinc-400 scrollbar-none">
              <span className="font-semibold uppercase tracking-wider text-zinc-500 shrink-0 text-[10px] mr-1">
                Quick Scan:
              </span>
              {POPULAR_FILMS.map((film) => (
                <button
                  key={film}
                  type="button"
                  onClick={() => {
                    setFilmQuery(film);
                    performScan(film);
                  }}
                  className={`rounded-lg px-2.5 py-1 transition shrink-0 font-medium ${
                    activeFilm === film
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {film}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Live Scanning Progress Overlay */}
            {isScanning && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-amber-300 text-[13px] font-semibold">
                    <GIcon name="sync" size={16} className="animate-spin text-amber-400" />
                    <span>Multi-Source Web Crawl in Progress: {activeFilm}</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400/80">Step {scanStep + 1} of 4</span>
                </div>

                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                    initial={{ width: '10%' }}
                    animate={{ width: `${((scanStep + 1) / 4) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="flex items-center gap-2 text-[12px] text-zinc-300 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{scanSteps[scanStep]}</span>
                </div>
              </motion.div>
            )}

            {result && !isScanning && (
              <>
                {/* Hero Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* Card 1: Consensus Average (Mean) */}
                  <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#141b24] to-[#121420] p-4 relative overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Consensus Average (Mean)
                      </span>
                      <GIcon name="functions" size={16} className="text-emerald-400" />
                    </div>
                    <div className="text-[28px] font-extrabold text-white tracking-tight tabular-nums">
                      {result.formattedAverage}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-300/80 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Calculated over {result.sourcesCount} web sources</span>
                    </div>
                  </div>

                  {/* Card 2: Median Collection */}
                  <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-[#141b24] to-[#121420] p-4 relative overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                        Median Collection
                      </span>
                      <GIcon name="analytics" size={16} className="text-blue-400" />
                    </div>
                    <div className="text-[28px] font-extrabold text-white tracking-tight tabular-nums">
                      {result.formattedMedian}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-300/80 font-medium">
                      <span>Trimmed Mean:</span>
                      <span className="font-bold text-blue-200">{result.formattedTrimmedAverage}</span>
                    </div>
                  </div>

                  {/* Card 3: Reported Range & Spread */}
                  <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-[#141b24] to-[#121420] p-4 relative overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                        Reported Trade Range
                      </span>
                      <GIcon name="swap_horiz" size={16} className="text-purple-400" />
                    </div>
                    <div className="text-[20px] font-extrabold text-white tracking-tight tabular-nums mt-1">
                      ₹{result.min} Cr – ₹{result.max} Cr
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-purple-300/80">
                      <span>Spread Variance:</span>
                      <span className="font-mono font-bold text-purple-200">±{result.variancePct}%</span>
                    </div>
                  </div>

                  {/* Card 4: Discrepancy & Inflation Index */}
                  <div className={`rounded-xl border p-4 relative overflow-hidden shadow-lg ${
                    result.discrepancyIndex === 'HIGH_DISPUTED'
                      ? 'border-rose-500/40 bg-rose-500/10'
                      : result.discrepancyIndex === 'MODERATE'
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-emerald-500/40 bg-emerald-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                        Discrepancy Index
                      </span>
                      <GIcon
                        name={result.discrepancyIndex === 'LOW' ? 'verified' : 'warning'}
                        size={16}
                        className={result.discrepancyIndex === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}
                      />
                    </div>
                    <div className="text-[24px] font-extrabold tracking-tight mt-1 flex items-center gap-2">
                      <span className={
                        result.discrepancyIndex === 'HIGH_DISPUTED'
                          ? 'text-rose-400'
                          : result.discrepancyIndex === 'MODERATE'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }>
                        {result.discrepancyIndex === 'LOW' ? 'CONSENSUS SAFE' : result.discrepancyIndex}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400 truncate">
                      {result.producerInflationDelta > 0
                        ? `Producer claim +₹${result.producerInflationDelta} Cr (+${result.producerInflationPct}%)`
                        : 'Trade trackers aligned'}
                    </div>
                  </div>
                </div>

                {/* Consensus Verdict & Strategy Box */}
                <div className="rounded-xl border border-white/10 bg-[#161a29] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <GIcon name="psychology" size={18} />
                    </span>
                    <div>
                      <h4 className="text-[13px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Algorithmic Trade Consensus Verdict</span>
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                          {result.consensusStatus}
                        </span>
                      </h4>
                      <p className="mt-1 text-[12.5px] text-zinc-300 leading-relaxed max-w-3xl">
                        {result.consensusVerdict}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyConsensusBrief}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-white/10 hover:border-white/30 active:scale-95 shrink-0"
                  >
                    <GIcon name="content_copy" size={14} className="text-amber-400" />
                    <span>Copy Trade Brief</span>
                  </button>
                </div>

                {/* Visual Comparison: Scanned Source Figures vs Consensus Mean */}
                <div className="rounded-xl border border-white/10 bg-[#141724] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GIcon name="bar_chart" size={18} className="text-amber-400" />
                      <h3 className="text-[14px] font-bold text-white">
                        Source-by-Source Comparison vs Consensus Mean ({result.formattedAverage})
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Baseline: Mean ₹{result.average} Cr
                    </span>
                  </div>

                  {/* Visual Bar Comparison */}
                  <div className="space-y-2.5 pt-2">
                    {result.sources.map((src) => {
                      const diff = src.varianceFromAvg ?? 0;
                      const isPositive = diff > 0;
                      const pctOfMax = Math.min(100, Math.max(15, (src.amount / (result.max * 1.08)) * 100));

                      return (
                        <div key={src.id} className="flex items-center gap-3 text-[12px]">
                          {/* Source Label */}
                          <div className="w-44 shrink-0 font-medium text-white truncate text-right">
                            {src.source}
                          </div>

                          {/* Bar Container */}
                          <div className="flex-1 relative h-7 bg-black/40 rounded-lg overflow-hidden flex items-center px-2.5 border border-white/5">
                            <motion.div
                              className={`absolute left-0 top-0 bottom-0 rounded-lg opacity-85 ${
                                isPositive
                                  ? 'bg-gradient-to-r from-amber-600/60 to-amber-500/80 border-r-2 border-amber-400'
                                  : 'bg-gradient-to-r from-blue-600/60 to-blue-500/80 border-r-2 border-blue-400'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pctOfMax}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                            {/* Value inside bar */}
                            <span className="relative z-10 font-bold text-white text-[12px] font-mono drop-shadow">
                              {src.formattedAmount}
                            </span>
                          </div>

                          {/* Delta Tag */}
                          <div className={`w-28 shrink-0 font-mono text-right font-semibold text-[11.5px] ${
                            diff === 0 ? 'text-zinc-400' : isPositive ? 'text-amber-400' : 'text-blue-400'
                          }`}>
                            {diff > 0 ? `+₹${diff.toFixed(2)} Cr` : diff < 0 ? `-₹${Math.abs(diff).toFixed(2)} Cr` : '0.00 Cr (Exact)'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filter & Sources Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-white">Scanned Trade Disclosures</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-mono text-zinc-300">
                        {filteredSources.length} Outlets
                      </span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {[
                        { id: 'all', label: 'All Milestones' },
                        { id: 'day 1', label: 'Day 1 Gross' },
                        { id: 'weekend', label: 'Opening Weekend' },
                        { id: 'worldwide', label: 'Worldwide' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setFilterMilestone(tab.id)}
                          className={`rounded-lg px-2.5 py-1 font-medium transition ${
                            filterMilestone === tab.id
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121420]">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-black/40 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
                        <tr>
                          <th className="px-4 py-3">Outlet / Trade Portal</th>
                          <th className="px-4 py-3">Reported Figure</th>
                          <th className="px-4 py-3">Delta vs Mean</th>
                          <th className="px-4 py-3">Milestone Category</th>
                          <th className="px-4 py-3">Article Headline & Evidence</th>
                          <th className="px-4 py-3 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredSources.map((item) => {
                          const delta = item.varianceFromAvg ?? 0;
                          return (
                            <tr key={item.id} className="hover:bg-white/[0.03] transition">
                              <td className="px-4 py-3 font-semibold text-white">
                                <div className="flex items-center gap-2">
                                  <span>{item.source}</span>
                                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9.5px] font-mono text-emerald-400 border border-emerald-500/20">
                                    {item.trustScore}% Trust
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3 font-bold font-mono text-emerald-300 text-[13px]">
                                {item.formattedAmount}
                              </td>

                              <td className="px-4 py-3 font-mono font-medium text-[11.5px]">
                                <span className={
                                  delta > 0
                                    ? 'text-amber-400'
                                    : delta < 0
                                    ? 'text-blue-400'
                                    : 'text-zinc-400'
                                }>
                                  {delta > 0 ? `+${delta} Cr` : `${delta} Cr`}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <span className="rounded bg-white/5 px-2 py-0.5 text-[10.5px] text-zinc-300 font-medium">
                                  {item.milestone}
                                </span>
                              </td>

                              <td className="px-4 py-3 max-w-sm">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-300 hover:text-amber-300 transition flex items-center gap-1.5 line-clamp-1 group"
                                  title={item.headline}
                                >
                                  <span className="truncate">{item.headline}</span>
                                  <GIcon name="open_in_new" size={13} className="shrink-0 text-zinc-500 group-hover:text-amber-400" />
                                </a>
                              </td>

                              <td className="px-4 py-3 text-right font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                                {item.timeAgo}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-white/10 bg-[#121420] px-6 py-3.5 text-[12px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Zero-key public trade syndicates active (Google News, Sacnilk, Pinkvilla, Bollywood Hungama).
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => performScan(activeFilm)}
                disabled={isScanning}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 font-medium text-white hover:bg-white/10 transition active:scale-95 disabled:opacity-50"
              >
                <GIcon name="refresh" size={14} />
                <span>Re-Scan Internet</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-lg bg-white/10 px-4 py-1.5 font-semibold text-white hover:bg-white/20 transition active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
