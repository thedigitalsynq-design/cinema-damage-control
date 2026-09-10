import { useMemo } from 'react';
import type { DailyTelemetryItem } from '../data/apiService';

interface ThirtyDaySparklineProps {
  data: DailyTelemetryItem[];
  color?: string;
  height?: number;
  showLabels?: boolean;
}

export function ThirtyDaySparkline({
  data,
  color = '#0a84ff',
  height = 42,
  showLabels = false,
}: ThirtyDaySparklineProps) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxViews = Math.max(...data.map((d) => d.views), 100);
    const minViews = Math.min(...data.map((d) => d.views), 0);
    const range = maxViews - minViews || 1;

    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = height - ((d.views - minViews) / range) * (height - 8) - 4;
      return { x, y, ...d };
    });
  }, [data, height]);

  if (points.length < 2) return null;

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L 100 ${height} L 0 ${height} Z`;

  // Find release day index (offset close to 0)
  const currentDayPoint = points[points.length - 1];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        className="w-full overflow-visible"
        preserveAspectRatio="none"
        aria-label="30-day demand and threat trend"
      >
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* 30-day base area fill */}
        <path d={areaD} fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, '')})`} />

        {/* Demand trend line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest / current day pulse point */}
        {currentDayPoint && (
          <circle
            cx={currentDayPoint.x}
            cy={currentDayPoint.y}
            r="2.5"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>

      {showLabels && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-war-text-muted">
          <span>-30 Days</span>
          <span className="text-[#64a8ff]">30-Day Velocity Curve</span>
          <span>Today</span>
        </div>
      )}
    </div>
  );
}
