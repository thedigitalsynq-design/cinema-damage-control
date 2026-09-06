import { GIcon } from './GIcon';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from './ProjectContext';

/**
 * Thin live-context strip for pages whose body is modelled/simulated.
 * Appears only when the backend feed is up — offline, sim pages stay clean.
 */
export function LiveBanner() {
  const { project } = useProject();
  const { stats, isLive, lastUpdated } = useLiveData(project.keywords.join(','));

  if (!isLive || !stats) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[#30d158]/20 bg-[#30d158]/[0.07] px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#30d158]">
        <GIcon name="radio" size={11} className="status-pulse" /> Live
      </span>
      <span className="text-[12px] tabular-nums text-war-text-secondary">
        {stats.total} {project.title} stories · {stats.negPct}% negative · {stats.reachLabel} reach
      </span>
      {lastUpdated && (
        <span className="ml-auto text-[11px] tabular-nums text-war-text-muted">
          updated {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
