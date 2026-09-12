import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { GIcon } from './GIcon';
import { useProject } from './ProjectContext';
import { useToast } from './Toaster';

export interface TelemetryPoint {
  timestamp: Date;
  threatIndex: number; // 0 - 100
  hostileVelocity: number; // 0 - 100
  viralitySpread: number; // 0 - 100
  mitigationDampening: number; // 0 - 100
  eventLabel?: string;
}

interface StreamConfig {
  id: 'threatIndex' | 'hostileVelocity' | 'viralitySpread' | 'mitigationDampening';
  label: string;
  color: string;
  gradientId: string;
  active: boolean;
  unit: string;
}

export function D3ThreatTelemetryChart({
  currentRisk = 68,
  liveStoryCount = 42,
}: {
  currentRisk?: number;
  liveStoryCount?: number;
}) {
  const { project } = useProject();
  const toast = useToast();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Time Range Selection
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('6h');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [activeStreams, setActiveStreams] = useState<Record<string, boolean>>({
    threatIndex: true,
    hostileVelocity: true,
    viralitySpread: true,
    mitigationDampening: true,
  });

  // Hover state for interactive scrubber
  const [hoverData, setHoverData] = useState<{
    point: TelemetryPoint | null;
    x: number;
    y: number;
    visible: boolean;
  }>({
    point: null,
    x: 0,
    y: 0,
    visible: false,
  });

  // Base Data Generation based on selected project and risk
  const generateInitialData = useCallback((range: '1h' | '6h' | '24h' | '7d'): TelemetryPoint[] => {
    const pointsCount = range === '1h' ? 30 : range === '6h' ? 48 : range === '24h' ? 60 : 70;
    const now = Date.now();
    const durationMs =
      range === '1h' ? 60 * 60 * 1000 :
      range === '6h' ? 6 * 60 * 60 * 1000 :
      range === '24h' ? 24 * 60 * 60 * 1000 :
      7 * 24 * 60 * 60 * 1000;

    const step = durationMs / pointsCount;
    const points: TelemetryPoint[] = [];

    // Deterministic seed based on project title and range
    let seed = 0;
    for (let i = 0; i < project.title.length; i++) {
      seed = (seed << 5) - seed + project.title.charCodeAt(i);
    }
    const pseudoRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const targetRisk = currentRisk;

    for (let i = 0; i < pointsCount; i++) {
      const t = new Date(now - durationMs + i * step);
      const progress = i / pointsCount; // 0 to 1

      // Create realistic crisis progression curve with spikes
      const wave1 = Math.sin(progress * Math.PI * 3.5) * 16;
      const wave2 = Math.cos(progress * Math.PI * 6.2) * 8;
      const noise = (pseudoRand() - 0.5) * 12;

      // Escalation ramp towards current risk level
      const ramp = 35 + (targetRisk - 35) * Math.pow(progress, 0.85);
      const threat = Math.max(10, Math.min(98, Math.round(ramp + wave1 + wave2 + noise)));

      const velNoise = (pseudoRand() - 0.5) * 18;
      const velocity = Math.max(8, Math.min(96, Math.round(threat * 0.85 + wave2 * 1.5 + velNoise)));

      const virality = Math.max(5, Math.min(99, Math.round(velocity * 0.92 + wave1 * 0.8 + (pseudoRand() - 0.5) * 10)));

      // Mitigation effect rises as threat rises (countermeasures deployed)
      const mitigation = Math.max(0, Math.min(88, Math.round(threat > 55 ? (threat - 45) * 1.4 + (pseudoRand() * 10) : 15 + pseudoRand() * 15)));

      let eventLabel: string | undefined = undefined;
      if (i === Math.floor(pointsCount * 0.42)) {
        eventLabel = 'Controversy Narrative Triggered';
      } else if (i === Math.floor(pointsCount * 0.76)) {
        eventLabel = 'Peak Influencer Amplification';
      } else if (i === pointsCount - 1) {
        eventLabel = 'Live Telemetry Pulse';
      }

      points.push({
        timestamp: t,
        threatIndex: threat,
        hostileVelocity: velocity,
        viralitySpread: virality,
        mitigationDampening: mitigation,
        eventLabel,
      });
    }

    // Ensure the very last point matches live stats
    if (points.length > 0) {
      points[points.length - 1].threatIndex = targetRisk;
    }

    return points;
  }, [project.title, currentRisk]);

  const [data, setData] = useState<TelemetryPoint[]>(() => generateInitialData(timeRange));
  const [prevKey, setPrevKey] = useState(() => `${project.title}-${timeRange}`);
  const currentKey = `${project.title}-${timeRange}`;

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setData(generateInitialData(timeRange));
  }

  // Real-time live streaming effect: append new tick every 3 seconds if isLiveStreaming is on
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setData((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const now = new Date();

        // Calculate natural drift from currentRisk
        const drift = (Math.random() - 0.48) * 4;
        const newThreat = Math.max(12, Math.min(98, Math.round(last.threatIndex + drift)));
        const newVel = Math.max(10, Math.min(96, Math.round(last.hostileVelocity + (Math.random() - 0.5) * 5)));
        const newVir = Math.max(8, Math.min(99, Math.round(last.viralitySpread + (Math.random() - 0.49) * 4.5)));
        const newMit = Math.max(5, Math.min(90, Math.round(last.mitigationDampening + (newThreat > 65 ? 1.2 : -0.8))));

        const newPoint: TelemetryPoint = {
          timestamp: now,
          threatIndex: newThreat,
          hostileVelocity: newVel,
          viralitySpread: newVir,
          mitigationDampening: newMit,
        };

        // Slide window by dropping first point and appending new point
        return [...prev.slice(1), newPoint];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Stream Definitions
  const streams: StreamConfig[] = useMemo(
    () => [
      {
        id: 'threatIndex',
        label: 'Threat Index',
        color: '#ef4444', // Red / Crimson
        gradientId: 'threatGrad',
        active: activeStreams.threatIndex,
        unit: 'pts',
      },
      {
        id: 'hostileVelocity',
        label: 'Hostile Velocity',
        color: '#f59e0b', // Amber
        gradientId: 'velGrad',
        active: activeStreams.hostileVelocity,
        unit: '%/h',
      },
      {
        id: 'viralitySpread',
        label: 'Virality Spread',
        color: '#06b6d4', // Cyan
        gradientId: 'virGrad',
        active: activeStreams.viralitySpread,
        unit: 'k/min',
      },
      {
        id: 'mitigationDampening',
        label: 'Suppression Effect',
        color: '#10b981', // Emerald
        gradientId: 'mitGrad',
        active: activeStreams.mitigationDampening,
        unit: 'dB',
      },
    ],
    [activeStreams]
  );

  const toggleStream = (id: string) => {
    setActiveStreams((prev) => {
      // Don't allow deselecting all
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[id] && activeCount <= 1) return prev;
      return { ...prev, [id]: !prev[id] };
    });
  };

  // D3 Chart Rendering with ResizeObserver
  const renderChart = useCallback(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const { width: containerWidth } = container.getBoundingClientRect();

    const width = Math.max(320, containerWidth);
    const height = 340;
    const margin = { top: 24, right: 36, bottom: 40, left: 44 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Clear previous elements
    svg.selectAll('*').remove();

    // Defs: Gradients & Glow Filters
    const defs = svg.append('defs');

    // Subtle drop shadow filter for lines
    const filter = defs.append('filter').attr('id', 'd3-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feDropShadow').attr('dx', '0').attr('dy', '3').attr('stdDeviation', '4').attr('flood-color', '#ef4444').attr('flood-opacity', '0.25');

    // Area Gradients
    const addGradient = (id: string, color: string, startOpacity: number) => {
      const grad = defs.append('linearGradient').attr('id', id).attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', startOpacity);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
    };

    addGradient('threatGrad', '#ef4444', 0.28);
    addGradient('velGrad', '#f59e0b', 0.16);
    addGradient('virGrad', '#06b6d4', 0.14);
    addGradient('mitGrad', '#10b981', 0.15);

    // Clip path
    defs
      .append('clipPath')
      .attr('id', 'chart-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xExtent = d3.extent(data, (d) => d.timestamp) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const yScale = d3.scaleLinear().domain([0, 100]).nice().range([innerHeight, 0]);

    // Gridlines (Y axis)
    const yAxisGrid = d3
      .axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid grid-y')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.06)')
      .attr('stroke-dasharray', '3,3');

    g.select('.grid-y .domain').remove();

    // Critical Threshold Reference Line (70%)
    const thresholdY = yScale(70);
    const thresholdGroup = g.append('g').attr('class', 'critical-threshold');

    thresholdGroup
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', thresholdY)
      .attr('y2', thresholdY)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.65);

    thresholdGroup
      .append('rect')
      .attr('x', innerWidth - 148)
      .attr('y', thresholdY - 10)
      .attr('width', 144)
      .attr('height', 20)
      .attr('rx', 4)
      .attr('fill', 'rgba(239, 68, 68, 0.15)')
      .attr('stroke', 'rgba(239, 68, 68, 0.35)')
      .attr('stroke-width', 1);

    thresholdGroup
      .append('text')
      .attr('x', innerWidth - 76)
      .attr('y', thresholdY + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fca5a5')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.04em')
      .text('CRITICAL THRESHOLD (70)');

    // D3 Line & Area Generators
    const lineGenerator = (key: 'threatIndex' | 'hostileVelocity' | 'viralitySpread' | 'mitigationDampening') =>
      d3
        .line<TelemetryPoint>()
        .curve(d3.curveMonotoneX)
        .x((d) => xScale(d.timestamp))
        .y((d) => yScale(d[key]));

    const areaGenerator = (key: 'threatIndex' | 'hostileVelocity' | 'viralitySpread' | 'mitigationDampening') =>
      d3
        .area<TelemetryPoint>()
        .curve(d3.curveMonotoneX)
        .x((d) => xScale(d.timestamp))
        .y0(innerHeight)
        .y1((d) => yScale(d[key]));

    const chartBody = g.append('g').attr('clip-path', 'url(#chart-clip)');

    // 1. Draw Areas first
    streams.forEach((stream) => {
      if (!stream.active) return;
      chartBody
        .append('path')
        .datum(data)
        .attr('fill', `url(#${stream.gradientId})`)
        .attr('d', areaGenerator(stream.id));
    });

    // 2. Draw Lines
    streams.forEach((stream) => {
      if (!stream.active) return;
      const path = chartBody
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', stream.color)
        .attr('stroke-width', stream.id === 'threatIndex' ? 2.6 : 1.8)
        .attr('d', lineGenerator(stream.id));

      if (stream.id === 'mitigationDampening') {
        path.attr('stroke-dasharray', '5,4');
      }
      if (stream.id === 'threatIndex') {
        path.attr('filter', 'url(#d3-glow)');
      }
    });

    // 3. Peak Spike Marker / Event Labels
    data.forEach((d) => {
      if (d.eventLabel && activeStreams.threatIndex) {
        const px = xScale(d.timestamp);
        const py = yScale(d.threatIndex);

        const eventG = chartBody.append('g').attr('class', 'event-marker');

        eventG
          .append('line')
          .attr('x1', px)
          .attr('x2', px)
          .attr('y1', py)
          .attr('y2', py - 18)
          .attr('stroke', 'rgba(255, 255, 255, 0.4)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');

        eventG
          .append('circle')
          .attr('cx', px)
          .attr('cy', py)
          .attr('r', 4.5)
          .attr('fill', '#ef4444')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        eventG
          .append('rect')
          .attr('x', Math.min(px - 60, innerWidth - 130))
          .attr('y', py - 36)
          .attr('width', 120)
          .attr('height', 16)
          .attr('rx', 4)
          .attr('fill', 'rgba(15, 23, 42, 0.85)')
          .attr('stroke', 'rgba(255, 255, 255, 0.15)');

        eventG
          .append('text')
          .attr('x', Math.min(px, innerWidth - 70))
          .attr('y', py - 24)
          .attr('text-anchor', 'middle')
          .attr('fill', '#cbd5e1')
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .text(d.eventLabel);
      }
    });

    // 4. Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(4, Math.floor(innerWidth / 90)))
      .tickFormat((d) => {
        const date = d as Date;
        if (timeRange === '7d') {
          return d3.timeFormat('%b %d')(date);
        }
        return d3.timeFormat('%H:%M')(date);
      });

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}`);

    const xAxisGroup = g
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.12)');
    xAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');
    xAxisGroup.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.1)');

    const yAxisGroup = g.append('g').attr('class', 'axis axis-y').call(yAxis);

    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');
    yAxisGroup.selectAll('.tick line').remove();

    // 5. Interactive Scrubber Overlay
    const focusGroup = g.append('g').attr('class', 'focus-indicators').style('display', 'none');

    // Vertical tracking crosshair
    const verticalCrosshair = focusGroup
      .append('line')
      .attr('class', 'crosshair-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(255, 255, 255, 0.4)')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3,3');

    // Point indicators for active series
    const activeStreamConfigs = streams.filter((s) => s.active);
    const circles = activeStreamConfigs.map((stream) =>
      focusGroup
        .append('circle')
        .attr('class', `focus-dot-${stream.id}`)
        .attr('r', 5)
        .attr('fill', stream.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
    );

    // Bisector for finding closest data point
    const bisectDate = d3.bisector<TelemetryPoint, Date>((d) => d.timestamp).left;

    // Invisible mouse tracking overlay rect
    g.append('rect')
      .attr('class', 'overlay-tracker')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', function (event) {
        const [pointerX] = d3.pointer(event, this);
        const mouseDate = xScale.invert(pointerX);
        const index = bisectDate(data, mouseDate, 1);
        const d0 = data[index - 1];
        const d1 = data[index];
        let closestPoint = d0;

        if (d0 && d1) {
          closestPoint =
            mouseDate.getTime() - d0.timestamp.getTime() > d1.timestamp.getTime() - mouseDate.getTime() ? d1 : d0;
        } else if (d1) {
          closestPoint = d1;
        }

        if (!closestPoint) return;

        const cx = xScale(closestPoint.timestamp);

        focusGroup.style('display', null);
        verticalCrosshair.attr('x1', cx).attr('x2', cx);

        activeStreamConfigs.forEach((stream, i) => {
          const cy = yScale(closestPoint[stream.id]);
          circles[i].attr('cx', cx).attr('cy', cy);
        });

        // Compute screen coordinates for floating React Tooltip
        const bounds = container.getBoundingClientRect();
        const tooltipX = Math.max(10, Math.min(cx + margin.left + 14, bounds.width - 275));
        const tooltipY = Math.max(10, Math.min(bounds.height - 180, yScale(closestPoint.threatIndex) + margin.top - 20));

        setHoverData({
          point: closestPoint,
          x: tooltipX,
          y: tooltipY,
          visible: true,
        });
      })
      .on('mouseleave', function () {
        focusGroup.style('display', 'none');
        setHoverData((prev) => ({ ...prev, visible: false }));
      });
  }, [data, streams, activeStreams, timeRange]);

  // Redraw on data change and container resize
  useEffect(() => {
    renderChart();

    const handleResize = () => {
      renderChart();
    };

    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [renderChart]);

  // Export current telemetry as JSON snapshot
  const exportTelemetry = () => {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.toLowerCase().replace(/\s+/g, '-')}-threat-telemetry.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Telemetry data stream exported successfully', 'success');
    } catch {
      toast('Failed to export telemetry', 'warn');
    }
  };

  const lastPoint = data[data.length - 1];

  return (
    <div
      ref={containerRef}
      className="relative rounded-[22px] border border-white/10 bg-[#0c0e15] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-red-400">
              D3.js Real-time Telemetry Stream
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              Interpolated Bezier Spline
            </span>
          </div>
          <h3 className="text-[20px] font-bold tracking-tight text-white">Threat Vector Velocity & Propagation Curve</h3>
        </div>

        {/* Action Controls: Live Toggle, Time Range, Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Streaming Toggle */}
          <button
            onClick={() => {
              const next = !isLiveStreaming;
              setIsLiveStreaming(next);
              toast(next ? 'Live telemetry pulse streaming enabled (3s cadence)' : 'Telemetry stream paused', 'info');
            }}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition ${
              isLiveStreaming
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            {isLiveStreaming ? 'LIVE TICKING' : 'PAUSED'}
          </button>

          {/* Time Range Horizon */}
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-[12px]">
            {(['1h', '6h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  timeRange === r ? 'bg-white/20 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={exportTelemetry}
            title="Export Telemetry JSON"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <GIcon name="file_download" size={15} />
          </button>
        </div>
      </div>

      {/* Interactive Stream Legend & Filter Chips */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mr-1">Active Streams:</span>
          {streams.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleStream(s.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${
                s.active
                  ? 'border-white/20 bg-white/10 text-white shadow-sm'
                  : 'border-white/5 bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.active ? s.color : '#52525b' }} />
              {s.label}
              {s.active && lastPoint && (
                <span className="font-mono text-[11px] tabular-nums text-zinc-300">
                  {lastPoint[s.id]}
                  {s.unit}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 border-b-2 border-dashed border-[#10b981]" />
            Dampening Interventions
          </span>
          <span className="text-zinc-500">·</span>
          <span>{liveStoryCount} tracked signals in current model</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative mt-4">
        <svg ref={svgRef} className="w-full select-none overflow-visible" />

        {/* High-Fidelity D3 Interactive Scrubber Tooltip */}
        {hoverData.visible && hoverData.point && (
          <div
            style={{
              left: `${hoverData.x}px`,
              top: `${hoverData.y}px`,
            }}
            className="pointer-events-none absolute z-30 w-64 rounded-xl border border-white/15 bg-[#161922]/95 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-75"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-semibold text-zinc-400">
                {hoverData.point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  hoverData.point.threatIndex >= 70
                    ? 'bg-red-500/20 text-red-400'
                    : hoverData.point.threatIndex >= 45
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {hoverData.point.threatIndex >= 70 ? 'CRITICAL LEVEL' : hoverData.point.threatIndex >= 45 ? 'ELEVATED' : 'NOMINAL'}
              </span>
            </div>

            <div className="mt-2 space-y-1.5 text-[12px]">
              {streams.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-zinc-300">{s.label}</span>
                  </div>
                  <span className="font-mono font-bold tabular-nums text-white">
                    {hoverData.point ? hoverData.point[s.id] : 0} {s.unit}
                  </span>
                </div>
              ))}
            </div>

            {hoverData.point.eventLabel && (
              <div className="mt-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300">
                ⚠ {hoverData.point.eventLabel}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Insights Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between border-t border-white/5 pt-3 text-[11px] text-zinc-500">
        <div>
          Hover across the timeline for precision cursor telemetry · D3.js v7 Monotone Spline Interpolator
        </div>
        <div className="flex items-center gap-2">
          <span>Current Threat:</span>
          <strong className="text-red-400 font-bold tabular-nums">{lastPoint?.threatIndex ?? currentRisk} / 100</strong>
        </div>
      </div>
    </div>
  );
}
