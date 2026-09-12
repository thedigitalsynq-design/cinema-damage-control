import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GIcon } from './GIcon';
import { clsx } from 'clsx';
import { useProject } from './ProjectContext';
import { useToast } from './Toaster';
import { useISTClock } from '../utils/istTime';
import { films, bandStyles, damageBand, liveScoreOf, type FilmDamage } from '../data/damage';

const INDIAN_INDUSTRIES = [
  { id: 'all', label: 'All Indian' },
  { id: 'Kollywood', label: 'Kollywood (Tamil)' },
  { id: 'Bollywood', label: 'Bollywood (Hindi)' },
  { id: 'Tollywood', label: 'Tollywood (Telugu)' },
  { id: 'Mollywood', label: 'Mollywood (Malayalam)' },
  { id: 'Sandalwood', label: 'Sandalwood (Kannada)' },
];

export function Latest30DaysIndianFilmsRoster() {
  const navigate = useNavigate();
  const toast = useToast();
  const { project, setActiveId, trackFilm } = useProject();
  const { dateStr, timeStr } = useISTClock();

  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'theatrical' | 'ott' | 'upcoming'>('all');

  // Filter our curated 30-day Indian films & sort most recent first
  const filteredFilms = films
    .filter((f) => {
      if (!f.isIndianCinema) return false;
      if (industryFilter !== 'all' && f.industry?.toLowerCase() !== industryFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter === 'ott') {
        return ((f as any).releaseStatus || f.status || '').toLowerCase().includes('ott') || (f.theatricalDaysText || '').toLowerCase().includes('ott');
      }
      if (statusFilter === 'theatrical') {
        const isOtt = ((f as any).releaseStatus || f.status || '').toLowerCase().includes('ott') || (f.theatricalDaysText || '').toLowerCase().includes('ott');
        const isUp = (f.theatricalDaysText || '').toLowerCase().includes('releasing');
        return !isOtt && !isUp;
      }
      if (statusFilter === 'upcoming') {
        return (f.theatricalDaysText || '').toLowerCase().includes('releasing');
      }
      return true;
    })
    .sort((a, b) => (a.theatricalDays ?? 99) - (b.theatricalDays ?? 99));

  const handleTrackFilm = (film: FilmDamage) => {
    setActiveId(film.id);
    trackFilm({
      id: film.id,
      title: film.title,
      subtitle: `${film.industry || 'Indian Cinema'} · ${film.theatricalDaysText || 'In Theatres'}`,
      keywords: [film.title.toLowerCase(), film.language.toLowerCase()],
    });
    toast(`Command Center re-anchored to ${film.title} (IST Synced)`, 'success');
  };

  return (
    <div className="rounded-[22px] border border-white/10 bg-gradient-to-b from-[#11131a] to-[#0a0c10] p-5 shadow-2xl lg:p-6">
      {/* Header with Title, IST Sync & Data Sources */}
      <div className="flex flex-col gap-3 pb-4 border-b border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-600/90 text-[12px] font-bold text-white shadow-sm">
              🇮🇳
            </span>
            <h3 className="text-[16px] font-bold tracking-tight text-white sm:text-[18px]">
              Latest 30-Day Indian Theatrical Releases
            </h3>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-400">
              Only Indian Cinema
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-war-text-secondary">
            Strict 30-day window current theatrical tracking · Calibrated for Indian multi-circuit box office
          </p>
        </div>

        {/* IST Live Synchronization & Source Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-mono text-emerald-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>IST: {dateStr} · {timeStr}</span>
          </div>

          <button
            onClick={() => navigate('/films')}
            className="flex items-center gap-1 text-[12px] font-medium text-blue-400 hover:text-blue-300 transition"
          >
            <span>View 30d Full Almanac</span>
            <GIcon name="arrow_forward" size={13} />
          </button>
        </div>
      </div>

      {/* Verified Data Sources & 30-Day Active Window Banner */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-[11.5px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-white">
              Active Evaluation: <span className="text-emerald-300 font-mono">Today is 11-09-2026 (IST)</span>
            </span>
            <span className="text-war-text-muted">·</span>
            <span className="text-zinc-300 font-medium">
              30-Day Window: <span className="text-amber-300 font-mono">12-Aug-2026 to 11-Sep-2026</span>
            </span>
          </div>
          <div className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300">
            {filteredFilms.length} Indian Releases Tracked
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-war-text-muted">
          <span className="font-semibold text-zinc-300 flex items-center gap-1">
            <GIcon name="verified" size={13} className="text-blue-400" />
            Verified Release Sources:
          </span>
          {['BookMyShow', 'Wikipedia (IST Almanac)', 'District / Trade Wire', 'IMDb India', 'Google Knowledge'].map((src) => (
            <span
              key={src}
              className="rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 font-medium text-zinc-300"
            >
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* Regional Industry & Status Filter Bar */}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {INDIAN_INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              onClick={() => setIndustryFilter(ind.id)}
              className={clsx(
                'whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-all active:scale-95',
                industryFilter === ind.id
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-white/[0.06] text-war-text-secondary hover:bg-white/[0.10] hover:text-white'
              )}
            >
              {ind.label}
            </button>
          ))}
        </div>

        {/* Release Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1 text-[11.5px]">
          {(
            [
              { id: 'all', label: 'All Releases' },
              { id: 'theatrical', label: 'In Theatres' },
              { id: 'ott', label: 'OTT' },
              { id: 'upcoming', label: 'Upcoming' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={clsx(
                'rounded-full px-2.5 py-0.5 font-medium transition-all',
                statusFilter === st.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-war-text-muted hover:text-white'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Indian Films in 30-day Window */}
      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredFilms.map((film) => {
          const isCurrentlyActive = film.id === project.id;
          const score = liveScoreOf(film);
          const band = damageBand(score);

          return (
            <motion.div
              key={film.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                'relative flex flex-col justify-between rounded-2xl border p-4 transition-all',
                isCurrentlyActive
                  ? 'border-blue-500/50 bg-blue-950/20 shadow-lg shadow-blue-950/30'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              )}
            >
              {/* Top metadata: Industry & Theatrical Days */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[10.5px] font-semibold tracking-wider text-zinc-300 uppercase">
                    {film.industry || 'Indian Cinema'}
                  </span>
                  {((film as any).releaseStatus || film.status || '').toLowerCase().includes('ott') || (film.theatricalDaysText || '').toLowerCase().includes('ott') ? (
                    <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-purple-300">
                      OTT Streaming
                    </span>
                  ) : (film.theatricalDaysText || '').toLowerCase().includes('releasing') ? (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
                      Upcoming
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                      {film.theatricalDaysText || 'In Theatres'}
                    </span>
                  )}
                </div>

                <h4 className="text-[15px] font-bold text-white tracking-tight line-clamp-1">
                  {film.title}
                </h4>
                <p className="text-[11.5px] text-war-text-secondary mt-0.5">
                  {film.language} · {film.genre}
                </p>
                <div className="mt-1 text-[11px] text-war-text-muted">
                  Released: <span className="text-zinc-300">{film.releaseDate}</span> (Latest 30d)
                </div>

                {/* Status / Trade Verdict */}
                <div className="mt-3 rounded-lg bg-white/[0.04] p-2 text-[11.5px] border border-white/5">
                  <div className="flex items-center justify-between text-war-text-muted mb-0.5">
                    <span>Box Office Gross</span>
                    <span className="font-semibold text-white">{film.revenue.gross}</span>
                  </div>
                  <div className="flex items-center justify-between text-war-text-muted">
                    <span>Revenue at Risk</span>
                    <span className={clsx('font-semibold', film.revenue.atRiskCr > 0 ? 'text-[#ff6961]' : 'text-emerald-400')}>
                      {film.revenue.atRisk}
                    </span>
                  </div>
                </div>

                {/* Threat Index & Band */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-war-text-muted">Reputation Threat</span>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold', bandStyles[band])}>
                    {band} · {score}/100
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => handleTrackFilm(film)}
                  disabled={isCurrentlyActive}
                  className={clsx(
                    'flex-1 rounded-xl py-1.5 text-[12px] font-semibold transition active:scale-95 text-center',
                    isCurrentlyActive
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30 cursor-default'
                      : 'bg-white/[0.08] text-white hover:bg-blue-600 hover:text-white'
                  )}
                >
                  {isCurrentlyActive ? '✓ Active in Room' : 'Track in Room'}
                </button>
                <button
                  onClick={() => navigate(`/film/${film.id}`)}
                  title="Diagnose film telemetry"
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-war-text-secondary hover:bg-white/[0.12] hover:text-white transition"
                >
                  <GIcon name="insights" size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
