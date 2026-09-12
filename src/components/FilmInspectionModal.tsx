import { GIcon } from './GIcon';
import { clsx } from 'clsx';
import { type LatestFilmItem } from '../data/apiService';
import { bandStyles } from '../data/damage';
import { ThirtyDaySparkline } from './ThirtyDaySparkline';

interface FilmInspectionModalProps {
  film: LatestFilmItem | null;
  isOpen: boolean;
  isActiveInWarRoom: boolean;
  onClose: () => void;
  onSelectForDamageControl: (film: LatestFilmItem) => void;
  onOpenMarkets: (film: LatestFilmItem) => void;
  onOpenTelemetry: (film: LatestFilmItem) => void;
}

export function FilmInspectionModal({
  film,
  isOpen,
  isActiveInWarRoom,
  onClose,
  onSelectForDamageControl,
  onOpenMarkets,
  onOpenTelemetry,
}: FilmInspectionModalProps) {
  if (!isOpen || !film) return null;

  const isReleased = film.telemetry30d.isReleased;
  const band = film.riskBand;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/15 bg-[#141416] text-white shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                isReleased
                  ? 'border border-[#30d158]/30 bg-[#30d158]/15 text-[#30d158]'
                  : 'border border-[#0a84ff]/30 bg-[#0a84ff]/15 text-[#64a8ff]'
              )}
            >
              <span
                className={clsx(
                  'h-1.5 w-1.5 rounded-full',
                  isReleased ? 'bg-[#30d158] animate-pulse' : 'bg-[#64a8ff]'
                )}
              />
              {film.releaseStatus || (isReleased ? 'In Theatres Now' : 'Advance Theatrical')}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-war-text-secondary font-medium">
              {film.industry || 'Indian Cinema'} · {film.language}
            </span>
            {isActiveInWarRoom && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#0a84ff]/40 bg-[#0a84ff]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#64a8ff]">
                <GIcon name="radar" size={12} className="animate-spin text-[#64a8ff]" />
                Active in War Room
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-war-text-muted transition hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            <GIcon name="close" size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Title & Key Identifiers */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-[26px] font-extrabold tracking-tight text-white">{film.title}</h2>
                {film.originalTitle && film.originalTitle !== film.title && (
                  <span className="text-[15px] font-normal text-war-text-muted">({film.originalTitle})</span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-war-text-secondary">
                Directed by <span className="text-white font-medium">{film.director}</span> · {film.genre}
              </p>
              {film.alternateTitles && film.alternateTitles.length > 0 && (
                <p className="mt-1 text-[11px] text-war-text-muted">
                  Alternate titles: {film.alternateTitles.join(' · ')}
                </p>
              )}
            </div>

            {/* Threat Badge */}
            <div className="flex md:flex-col items-center md:items-end justify-between gap-2 p-3 rounded-2xl border border-white/10 bg-white/[0.03]">
              <span className="text-[11px] uppercase tracking-wider text-war-text-muted">Damage / Threat Score</span>
              <div className="flex items-center gap-2">
                <span className="text-[26px] font-bold tabular-nums text-white">{film.threatScore}</span>
                <span className="text-[12px] text-war-text-muted">/100</span>
                <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-bold', bandStyles[band])}>
                  {band}
                </span>
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-war-text-muted">Narrative & Synopsis</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-war-text-secondary">{film.synopsis}</p>
          </div>

          {/* Metadata Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-war-text-muted">Release Date</span>
              <div className="mt-1 text-[13px] font-semibold text-white">
                {film.releaseDateFormatted || film.releaseDate}
              </div>
              <div className="text-[10px] text-[#30d158]">{film.telemetry30d.daysSinceReleaseText}</div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-war-text-muted">Box Office</span>
              <div className="mt-1 text-[13px] font-semibold text-white truncate">{film.boxOffice}</div>
              <div className="text-[10px] text-war-text-muted">Budget: {film.budget}</div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-war-text-muted">BookMyShow Status</span>
              <div className="mt-1 text-[13px] font-semibold text-[#ff2d55] truncate">{film.bookingStatus}</div>
              <div className="text-[10px] text-war-text-muted">Live Theatrical Radar</div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-war-text-muted">Studio / House</span>
              <div className="mt-1 text-[13px] font-semibold text-white truncate">{film.studio}</div>
              <div className="text-[10px] text-war-text-muted">Production & Distribution</div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-war-text-muted">Languages</span>
              <div className="mt-1 text-[13px] font-semibold text-white truncate">
                {film.language}
                {film.secondaryLanguages && film.secondaryLanguages.length > 0 && ` + ${film.secondaryLanguages.join(', ')}`}
              </div>
              <div className="text-[10px] text-war-text-muted">Territory: {film.region || 'Pan-India'}</div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-war-text-muted">Platform / Runtime</span>
              <div className="mt-1 text-[13px] font-semibold text-white">
                {film.theatricalAvailability || 'Theatrical Multiplex'}
              </div>
              <div className="text-[10px] text-war-text-muted">Runtime: {film.runtime || '145 mins'}</div>
            </div>
          </div>

          {/* Cast & Crew Details */}
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-war-text-muted">Primary Cast & Crew</h4>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {film.cast.map((actor, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] font-medium text-white"
                >
                  {actor}
                </span>
              ))}
            </div>
            {film.crew && film.crew.length > 0 && (
              <div className="pt-2 text-[12px] text-war-text-secondary">
                {film.crew.map((c) => `${c.role}: ${c.name}`).join(' · ')}
              </div>
            )}
          </div>

          {/* 30-Day Demand Telemetry Sparkline */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-[12px] font-bold text-white">30-Day Theatrical Demand & Velocity Curve</h4>
                <p className="text-[11px] text-war-text-muted">
                  August 11 – September 10, 2026 telemetry · Peak on {film.telemetry30d.peakDemandDate}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[15px] font-bold text-[#64a8ff] tabular-nums">
                  {(film.telemetry30d.total30dViews / 1000).toFixed(1)}k
                </span>
                <span className="text-[11px] text-war-text-muted ml-1">total views</span>
              </div>
            </div>
            <ThirtyDaySparkline
              data={film.telemetry30d.dailyData}
              color={film.threatScore > 65 ? '#ff453a' : film.threatScore > 45 ? '#ff9f0a' : '#0a84ff'}
              height={50}
            />
          </div>

          {/* Data Verification & Providers Attribution */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[11px] text-war-text-muted">
            <div className="flex items-center gap-2">
              <GIcon name="verified" size={14} className="text-[#30d158]" />
              <span>
                Status: <span className="text-white font-medium">{film.verificationStatus || 'Verified Theatrical Release'}</span>
              </span>
            </div>
            <div className="truncate text-right">
              Sources: {film.dataSources ? film.dataSources.join(' · ') : film.source || 'Wikipedia & BookMyShow'}
            </div>
          </div>
        </div>

        {/* Modal Action Bar Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenMarkets(film)}
              className="apple-button flex items-center gap-1.5 border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-white hover:bg-white/10"
            >
              <GIcon name="public" size={14} />
              <span>Regional Markets</span>
            </button>
            <button
              onClick={() => onOpenTelemetry(film)}
              className="apple-button flex items-center gap-1.5 border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-white hover:bg-white/10"
            >
              <GIcon name="timeline" size={14} />
              <span>30D Intel</span>
            </button>
            {film.bookMyShowUrl && (
              <a
                href={film.bookMyShowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-button flex items-center gap-1.5 border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-[#ff2d55] hover:bg-[#ff2d55]/10"
              >
                <GIcon name="confirmation_number" size={14} />
                <span>BookMyShow</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="apple-button border border-white/10 bg-transparent px-4 py-2 text-[13px] font-medium text-war-text-secondary hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelectForDamageControl(film)}
              className="apple-button flex items-center gap-2 bg-[#0a84ff] px-5 py-2 text-[13px] font-bold text-white shadow-lg shadow-[#0a84ff]/30 hover:bg-[#409cff]"
            >
              <GIcon name="shield" size={15} />
              <span>Select & Synchronize Damage Control</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
