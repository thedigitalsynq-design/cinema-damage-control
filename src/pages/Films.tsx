import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GIcon } from '../components/GIcon';
import { clsx } from 'clsx';
import { films, damageBand, bandStyles, liveScoreOf } from '../data/damage';
import { api } from '../data/apiService';
import { useLiveData } from '../hooks/useLiveData';
import { useProject } from '../components/ProjectContext';
import { useToast } from '../components/Toaster';

export function Films() {
  const navigate = useNavigate();
  const toast = useToast();
  const { projects, project, setActiveId, removeProject } = useProject();
  const { stats, isLive } = useLiveData(project.keywords.join(','));
  const liveNeg = isLive && stats ? stats.negPct : undefined;

  // Live story counts per tracked project — selecting one re-anchors the room.
  const [counts, setCounts] = useState<Record<string, { n: number; live: boolean }>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await api.getNews(p.keywords.join(','));
            return [p.id, { n: res.success ? res.count : 0, live: res.success && res.count > 0 }] as const;
          } catch {
            return [p.id, { n: 0, live: false }] as const;
          }
        })
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const select = (id: string, title: string) => {
    setActiveId(id);
    navigate('/');
    toast(`Dashboard now tracking ${title} — all panels re-anchored`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="pb-1">
          <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
          <h1 className="apple-title mt-0.5">Films</h1>
          <p className="apple-subhead mt-1">Select a movie — the whole dashboard re-anchors to its live data.</p>
        </div>

        <div className="glass-panel p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="section-title">Tracked projects</span>
            <span className="apple-footnote">add more from the top bar</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const c = counts[p.id];
              const active = p.id === project.id;
              return (
                <div
                  key={p.id}
                  className={clsx(
                    'rounded-2xl border p-4 transition',
                    active ? 'border-[#0a84ff]/50 bg-[#0a84ff]/[0.08]' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.14]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold tracking-tight text-white">{p.title}</span>
                        {active && <GIcon name="check" size={14} className="shrink-0 text-[#64a8ff]" />}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-war-text-muted">{p.subtitle} · {p.keywords.join(', ')}</div>
                    </div>
                    {projects.length > 1 && (
                      <button
                        onClick={() => { removeProject(p.id); toast(`${p.title} removed from tracking`, 'info'); }}
                        aria-label={`Remove ${p.title}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-war-text-muted transition hover:bg-[#ff453a]/20 hover:text-[#ff6961]"
                      >
                        <GIcon name="close" size={12} />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12px] tabular-nums text-war-text-secondary">
                      {c ? (c.live ? `${c.n} live stories` : 'feed quiet') : 'checking feed…'}
                    </span>
                    {!active && (
                      <button
                        onClick={() => select(p.id, p.title)}
                        className="apple-button bg-[#0a84ff] px-3.5 py-1.5 text-[13px] text-white hover:bg-[#409cff]"
                      >
                        Select
                      </button>
                    )}
                    {active && <span className="text-[12px] font-medium text-[#64a8ff]">Tracking now</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {films.map((f) => {
            const score = liveScoreOf(f, f.id === 'toxic' ? liveNeg : undefined);
            const band = damageBand(score);
            return (
              <button
                key={f.id}
                onClick={() => navigate(`/film/${f.id}`)}
                className="glass-panel apple-card-hover group p-5 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-bold tracking-tight text-white">{f.title}</h3>
                    <p className="mt-0.5 text-[12px] text-war-text-muted">{f.language} · {f.genre} · {f.releaseDate}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[26px] font-bold tabular-nums tracking-tight text-white">{score}<span className="text-[13px] font-medium text-war-text-muted">/100</span></div>
                    <span className={clsx('mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold', bandStyles[band])}>{band}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={clsx('h-full rounded-full', score >= 76 ? 'bg-[#ff453a]' : score >= 51 ? 'bg-[#ff9f0a]' : score >= 26 ? 'bg-[#ffd60a]' : 'bg-[#30d158]')}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!f.modelled && isLive && stats ? (
                      <span className="rounded-full bg-[#30d158]/15 px-2 py-0.5 text-[10px] font-bold text-[#30d158]">LIVE</span>
                    ) : (
                      <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-war-text-muted">MODELLED</span>
                    )}
                    <span className="text-[12px] text-war-text-muted">{f.status}</span>
                  </div>
                  <span className="flex items-center gap-1 text-[12px] font-medium text-[#64a8ff] opacity-0 transition group-hover:opacity-100">
                    Open film <GIcon name="arrow_forward" size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
