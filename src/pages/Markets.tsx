import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { films, getResolvedFilmDamage, dynamicFilmsRegistry } from '../data/damage';
import { useProject } from '../components/ProjectContext';
import { useLiveData } from '../hooks/useLiveData';
import { GIcon } from '../components/GIcon';

export function Markets() {
  const { project } = useProject();
  const { liveAudience, isLive, lastUpdated, refresh, isLoading } = useLiveData(project.keywords.join(','));
  const [filmId, setFilmId] = useState<string>('ACTIVE');

  // Combined catalog of built-in models and dynamically registered films
  const resolvedList = useMemo(() => {
    const list = [...films];
    for (const [id, f] of dynamicFilmsRegistry.entries()) {
      if (!list.some((item) => item.id === id)) {
        list.push(f);
      }
    }
    const activeResolved = getResolvedFilmDamage(project.id);
    if (activeResolved && !list.some((item) => item.id === activeResolved.id)) {
      list.push(activeResolved);
    }
    return list;
  }, [project.id]);

  const allFilmOptions = useMemo(() => {
    return [
      { id: 'ACTIVE', title: `★ Active: ${project.title}` },
      { id: 'ALL', title: 'All films' },
      ...resolvedList.map((f) => ({ id: f.id, title: f.title })),
    ];
  }, [project.title, resolvedList]);

  const scoped = useMemo(() => {
    if (filmId === 'ALL') return resolvedList;
    if (filmId === 'ACTIVE') {
      const activeF = getResolvedFilmDamage(project.id);
      return activeF ? [activeF] : resolvedList;
    }
    const found = getResolvedFilmDamage(filmId);
    return found ? [found] : resolvedList;
  }, [filmId, project.id, resolvedList]);

  const languages = [...new Set(scoped.flatMap((f) => f.markets.map((m) => m.language)))];
  const redCount = scoped.flatMap((f) => f.markets).filter((m) => m.health < 50).length;

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
                  LIVE REGIONAL SIGNALS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-war-text-muted">
                  SYNCHRONIZED
                </span>
              )}
            </div>
            <h1 className="apple-title mt-0.5">Markets</h1>
            <p className="apple-subhead mt-1">India-first theatrical & digital health by language and region across active territories.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-war-text-secondary transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <GIcon name="refresh" size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>
            <span className="rounded-full bg-[#ff453a]/12 px-3 py-1.5 text-[12px] font-semibold text-[#ff6961]">
              {redCount} markets need intervention
            </span>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex items-center justify-between text-[12px] text-war-text-muted px-1">
            <span>Dynamic territorial sentiment correlated with real-time news & Wikimedia volume for {project.title}</span>
            <span className="tabular-nums">
              Last synced: {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1">
          {allFilmOptions.map((f, idx) => (
            <button
              key={`${f.id}-${idx}`}
              onClick={() => setFilmId(f.id)}
              className={clsx(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97]',
                filmId === f.id ? 'bg-white text-black shadow' : 'text-war-text-secondary hover:text-white'
              )}
            >
              {f.title}
            </button>
          ))}
        </div>

        {/* Live Territorial Signals Banner if available */}
        {isLive && liveAudience?.geographyData && (
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-white">Live State Sentiment Telemetry</span>
              <span className="apple-footnote">Direct from real-time news & audience queries</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {liveAudience.geographyData.slice(0, 6).map((geo, idx) => (
                <div key={`${geo.state || 'geo'}-${idx}`} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <div className="text-[11px] text-war-text-muted truncate">{geo.state}</div>
                  <div className={clsx(
                    'text-[15px] font-bold tabular-nums mt-0.5',
                    (geo.sentiment ?? 0) < -40 ? 'text-[#ff6961]' : (geo.sentiment ?? 0) < -20 ? 'text-[#ffb340]' : 'text-[#30d158]'
                  )}>
                    {geo.sentiment ?? 0}%
                  </div>
                  <div className="text-[10px] text-war-text-muted tabular-nums mt-0.5">{(geo.mentions ?? 0).toLocaleString()} mentions</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {languages.map((lang, langIdx) => (
          <div key={`${lang || 'lang'}-${langIdx}`} className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">{lang}</span>
              <span className="apple-footnote">
                {scoped.flatMap((f) => f.markets || []).filter((m) => m.language === lang && m.health < 50).length} weak
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {scoped.flatMap((f) => (f.markets || []).map((m) => ({ ...m, film: f.title })))
                .filter((m) => m.language === lang)
                .map((m, mIdx) => (
                  <div key={`${m.film}-${m.region}-${mIdx}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-semibold text-white">{m.region}</span>
                      <span className={clsx(
                        'text-[20px] font-bold tabular-nums',
                        m.health < 50 ? 'text-[#ff6961]' : m.health < 70 ? 'text-[#ffb340]' : 'text-[#30d158]'
                      )}>{m.health}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className={clsx('h-full rounded-full', m.health < 50 ? 'bg-[#ff453a]' : m.health < 70 ? 'bg-[#ff9f0a]' : 'bg-[#30d158]')}
                        style={{ width: `${m.health}%` }}
                      />
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-[12px]">
                      <div><div className="text-war-text-muted">Revenue</div><div className="font-semibold tabular-nums text-war-text-secondary">{m.revenue}</div></div>
                      <div><div className="text-war-text-muted">Occupancy</div><div className="font-semibold tabular-nums text-war-text-secondary">{m.occupancy}%</div></div>
                      <div><div className="text-war-text-muted">Shows</div><div className="font-semibold tabular-nums text-war-text-secondary">{m.shows}</div></div>
                      <div><div className="text-war-text-muted">Velocity</div><div className="font-semibold tabular-nums text-war-text-secondary">{m.velocity}</div></div>
                      <div><div className="text-war-text-muted">Sentiment</div><div className="font-semibold tabular-nums text-war-text-secondary">{m.sentiment > 0 ? `+${m.sentiment}` : m.sentiment}</div></div>
                      <div><div className="text-war-text-muted">Film</div><div className="truncate font-medium text-war-text-secondary" title={m.film}>{m.film}</div></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        <p className="apple-footnote">Health scores blend occupancy, velocity and sentiment into one modelled number — direction, not audit.</p>
      </div>
    </div>
  );
}
