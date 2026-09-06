import { useState } from 'react';
import { clsx } from 'clsx';
import { films } from '../data/damage';

export function Markets() {
  const [filmId, setFilmId] = useState<string>('ALL');
  const scoped = filmId === 'ALL' ? films : films.filter((f) => f.id === filmId);

  const languages = [...new Set(scoped.flatMap((f) => f.markets.map((m) => m.language)))];
  const redCount = scoped.flatMap((f) => f.markets).filter((m) => m.health < 50).length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Markets</h1>
            <p className="apple-subhead mt-1">India-first health by language and region. Figures modelled.</p>
          </div>
          <span className="rounded-full bg-[#ff453a]/12 px-3 py-1.5 text-[12px] font-semibold text-[#ff6961]">
            {redCount} markets need intervention
          </span>
        </div>

        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1">
          {[{ id: 'ALL', title: 'All films' }, ...films.map((f) => ({ id: f.id, title: f.title }))].map((f) => (
            <button
              key={f.id}
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

        {languages.map((lang) => (
          <div key={lang} className="glass-panel p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="section-title">{lang}</span>
              <span className="apple-footnote">
                {scoped.flatMap((f) => f.markets).filter((m) => m.language === lang && m.health < 50).length} weak
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {scoped.flatMap((f) => f.markets.map((m) => ({ ...m, film: f.title })))
                .filter((m) => m.language === lang)
                .map((m) => (
                  <div key={`${m.film}-${m.region}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
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
