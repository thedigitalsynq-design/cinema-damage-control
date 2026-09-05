import { clsx } from 'clsx';
import type { Severity } from '../../data/types';

export function StatusBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'xs' | 'sm' | 'md' }) {
  const colors: Record<Severity, string> = {
    CRITICAL: 'bg-[#ff453a]/15 text-[#ff6961]',
    HIGH: 'bg-[#ff9f0a]/15 text-[#ffb340]',
    MEDIUM: 'bg-[#ffd60a]/15 text-[#ffd60a]',
    LOW: 'bg-[#0a84ff]/15 text-[#64a8ff]',
  };
  const dots: Record<Severity, string> = {
    CRITICAL: 'bg-[#ff453a]',
    HIGH: 'bg-[#ff9f0a]',
    MEDIUM: 'bg-[#ffd60a]',
    LOW: 'bg-[#0a84ff]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold tracking-[-0.006em] capitalize',
        colors[severity],
        {
          'px-2 py-0.5 text-[11px]': size === 'xs',
          'px-2.5 py-1 text-[12px]': size === 'sm',
          'px-3 py-1.5 text-[13px]': size === 'md',
        }
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', dots[severity])} />
      {severity.toLowerCase()}
    </span>
  );
}

export function ConfidenceIndicator({ level, confidence }: { level: string; confidence?: number }) {
  const colors: Record<string, string> = {
    OBSERVED: 'text-[#30d158]',
    INFERRED: 'text-[#ffd60a]',
    ESTIMATED: 'text-[#64a8ff]',
    'AI-GENERATED': 'text-[#64a8ff]',
    UNVERIFIED: 'text-[#ffb340]',
  };

  return (
    <span className={clsx('text-[12px] font-medium tracking-[-0.006em]', colors[level] || 'text-war-text-muted')}>
      {level.toLowerCase().replace(/-/g, ' ')}{confidence !== undefined ? ` · ${confidence}%` : ''}
    </span>
  );
}

export function LiveIndicator({ critical = false }: { critical?: boolean }) {
  return (
    <span className="relative flex items-center gap-1.5 rounded-full bg-[#30d158]/12 px-2.5 py-1">
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          critical ? 'bg-[#ff453a] status-pulse-critical' : 'bg-[#30d158] status-pulse'
        )}
      />
      <span className="text-[11px] font-semibold tracking-[-0.006em] text-war-text-secondary">
        {critical ? 'Live' : 'Active'}
      </span>
    </span>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  trend,
  trendDirection = 'neutral',
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <div className={clsx('glass-panel apple-card-hover p-5', className)}>
      <div className="metric-label mb-1.5">{label}</div>
      <div className="metric-value number-transition">{value}</div>
      {(sublabel || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[12px] font-semibold',
                trendDirection === 'up' && 'bg-[#ff453a]/15 text-[#ff6961]',
                trendDirection === 'down' && 'bg-[#30d158]/15 text-[#30d158]',
                trendDirection === 'neutral' && 'bg-white/10 text-war-text-secondary'
              )}
            >
              {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '—'} {trend}
            </span>
          )}
          {sublabel && <span className="text-[12px] text-war-text-muted">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="section-title">{title}</h3>
      {action}
    </div>
  );
}
