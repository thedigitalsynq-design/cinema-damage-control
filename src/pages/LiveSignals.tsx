import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { signals } from '../data/mockData';
import { ConfidenceIndicator } from '../components/ui/StatusBadge';
import { Stagger, StaggerItem } from '../components/motion';
import { useToast } from '../components/Toaster';

const typeLabels: Record<string, { color: string; bg: string; dot: string }> = {
  VIRAL_POST: { color: 'text-[#ff6961]', bg: 'bg-[#ff453a]/12', dot: 'bg-[#ff453a]' },
  NEWS_ALERT: { color: 'text-[#ffb340]', bg: 'bg-[#ff9f0a]/12', dot: 'bg-[#ff9f0a]' },
  INFLUENCER_SPIKE: { color: 'text-[#ffd60a]', bg: 'bg-[#ffd60a]/12', dot: 'bg-[#ffd60a]' },
  HASHTAG: { color: 'text-[#64a8ff]', bg: 'bg-[#0a84ff]/12', dot: 'bg-[#0a84ff]' },
  SENTIMENT_SHIFT: { color: 'text-[#ff6961]', bg: 'bg-[#ff453a]/12', dot: 'bg-[#ff453a]' },
  MISINFORMATION: { color: 'text-[#ffb340]', bg: 'bg-[#ff9f0a]/12', dot: 'bg-[#ff9f0a]' },
  AUDIENCE_SHIFT: { color: 'text-[#64a8ff]', bg: 'bg-[#0a84ff]/12', dot: 'bg-[#0a84ff]' },
};

export function LiveSignals() {
  const navigate = useNavigate();
  const toast = useToast();

  const investigate = () => {
    toast('Signal queued — opening incident queue', 'success');
    navigate('/incidents');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div>
            <p className="text-[13px] font-medium text-war-text-muted">Cinema Damage Control Room</p>
            <h1 className="apple-title mt-0.5">Live Signals</h1>
            <p className="apple-subhead mt-1">Real-time intelligence feed for Project Veera.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#ff453a]/12 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff453a] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff453a]" />
            </span>
            <span className="text-[12px] font-semibold text-[#ff6961]">{signals.length} active</span>
          </div>
        </div>

        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" delay={0.05}>
          {signals.map((signal, i) => {
            const typeStyle = typeLabels[signal.type] || typeLabels.VIRAL_POST;
            return (
              <StaggerItem
                key={signal.id}
                index={i}
                className="glass-panel apple-card-hover group p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', typeStyle.bg, typeStyle.color)}>
                    <span className={clsx('h-1.5 w-1.5 rounded-full', typeStyle.dot)} />
                    {signal.type.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="text-[12px] tabular-nums text-war-text-muted">{signal.time}</span>
                </div>

                <h3 className="mb-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-white">{signal.title}</h3>

                <div className="mb-4 flex items-center gap-1.5">
                  <span className="text-[12px] text-war-text-muted">Source</span>
                  <span className="text-[13px] font-medium text-war-text-secondary">{signal.source}</span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <div>
                    <div className="metric-label">Velocity</div>
                    <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-[#ff6961]">{signal.velocity}</div>
                  </div>
                  <div>
                    <div className="metric-label">Reach</div>
                    <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white">{signal.reach}</div>
                  </div>
                  <div>
                    <div className="metric-label">Confidence</div>
                    <div className="mt-0.5"><ConfidenceIndicator level={signal.confidenceLevel} confidence={signal.confidence} /></div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-war-text-muted">Sentiment</span>
                    <span
                      className={clsx(
                        'text-[12px] font-semibold capitalize',
                        signal.sentiment === 'NEGATIVE' && 'text-[#ff6961]',
                        signal.sentiment === 'POSITIVE' && 'text-[#30d158]',
                        signal.sentiment === 'NEUTRAL' && 'text-war-text-secondary'
                      )}
                    >
                      {signal.sentiment.toLowerCase()}
                    </span>
                  </div>
                  <button
                    onClick={investigate}
                    aria-label={`Investigate: ${signal.title.slice(0, 60)}`}
                    className="apple-button flex items-center gap-1 bg-[#0a84ff] px-3.5 py-1.5 text-[13px] text-white hover:bg-[#409cff]"
                  >
                    Investigate <ArrowUpRight size={13} />
                  </button>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
