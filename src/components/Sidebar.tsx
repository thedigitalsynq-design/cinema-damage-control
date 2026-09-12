import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { api } from '../data/apiService';
import { useToast } from './Toaster';
import { PHASES, PHASE_ORDERS, usePhase } from './PhaseContext';
import { GIcon } from './GIcon';
import { FreePluginsModal } from './FreePluginsModal';
import { BoxOfficeTrackerModal } from './BoxOfficeTrackerModal';
import { useLiveDataContext } from '../context/LiveDataContext';

const navItems = [
  { path: '/', label: 'Damage Control', icon: 'dashboard' },
  { path: '/films', label: 'Films', icon: 'movie' },
  { path: '/signals', label: 'Live Signals', icon: 'radio' },
  { path: '/incidents', label: 'Incidents', icon: 'warning' },
  { path: '/leaks', label: 'Leaks', icon: 'shield' },
  { path: '/narratives', label: 'Narratives', icon: 'account_tree' },
  { path: '/social', label: 'Social', icon: 'share' },
  { path: '/media', label: 'Media', icon: 'newspaper' },
  { path: '/influencers', label: 'Influencers', icon: 'group' },
  { path: '/audience', label: 'Audience', icon: 'bar_chart' },
  { path: '/markets', label: 'Markets', icon: 'public' },
  { path: '/response', label: 'Actions', icon: 'send' },
  { path: '/recovery', label: 'Recovery', icon: 'trending_up' },
  { path: '/reports', label: 'Reports', icon: 'description' },
  { path: '/analyst', label: 'Analyst', icon: 'auto_awesome' },
];

const bottomItems = [
  { label: 'Box Office Tracker', icon: 'receipt_long' },
  { label: 'Free Plugins', icon: 'extension' },
  { label: 'System Status', icon: 'activity_zone' },
  { label: 'Data Sources', icon: 'database' },
  { label: 'Team', icon: 'group' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [boxOfficeOpen, setBoxOfficeOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { phase } = usePhase();
  const { liveIncidents, liveLeaks, liveSignals } = useLiveDataContext();

  const activeIncidentsCount = liveIncidents.filter((i) => i.status !== 'RESOLVED').length;
  const activeLeaksCount = liveLeaks.filter((l) => l.status === 'ACTIVE').length;
  const signalsCount = (liveSignals || []).length;

  // Sidebar order follows the release phase; the top 3 non-home items are the phase focus.
  const order = PHASE_ORDERS[phase];
  const orderedItems = [...navItems].sort(
    (a, b) => order.indexOf(a.path) - order.indexOf(b.path)
  );
  const focusPaths = new Set(order.filter((p) => p !== '/').slice(0, 3));

  const handleTool = async (label: string) => {
    if (label === 'Box Office Tracker') {
      setBoxOfficeOpen(true);
      return;
    }
    if (label === 'Free Plugins') {
      setPluginsOpen(true);
      return;
    }
    if (label === 'System Status') {
      if (checking) return;
      setChecking(true);
      // eslint-disable-next-line react/purity -- event handler timing, not render
      const started = performance.now();
      const online = await api.healthCheck();
      // eslint-disable-next-line react/purity -- event handler timing, not render
      const ms = Math.round(performance.now() - started);
      setChecking(false);
      toast(
        online ? `API online · responded in ${ms}ms` : 'API unreachable — running in Simulation mode',
        online ? 'success' : 'warn'
      );
      return;
    }
    if (label === 'Data Sources') {
      setPluginsOpen(true);
      return;
    }
    if (label === 'Team') {
      toast('Single-user build · signed in as Admin', 'info');
      return;
    }
    toast('Settings are not part of this build yet', 'info');
  };

  return (
    <aside
      className={clsx(
        'relative flex h-full flex-col rounded-[26px] border border-[var(--color-war-border-light)] bg-[var(--color-war-surface)] backdrop-blur-2xl backdrop-saturate-150 shadow-[var(--shadow-spatial-float)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--color-war-border-light)]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="window-dots mr-1">
              <span className="window-dot window-dot-red" />
              <span className="window-dot window-dot-yellow" />
              <span className="window-dot window-dot-green" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-bold tracking-tight text-[var(--color-war-text)] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#6366f1] shadow-[0_0_8px_#6366f1]" />
                Cinema
              </span>
              <span className="text-[10px] font-medium tracking-wide text-[var(--color-war-text-muted)] uppercase">Damage Control</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-full p-1.5 text-[var(--color-war-text-muted)] transition hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--color-war-text)] active:scale-95"
        >
          <GIcon name={collapsed ? 'chevron_right' : 'chevron_left'} size={17} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
        {!collapsed && (
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-war-text-muted)]">
            {phase === 'pre' ? 'Prepare' : phase === 'opening' ? 'Triage' : 'Recover'} · {PHASES.find((p) => p.id === phase)?.label}
          </p>
        )}
        {orderedItems.map((item) => {
          const active = location.pathname === item.path;
          const isFocus = focusPaths.has(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'group relative flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-all duration-200 active:scale-[0.98]',
                collapsed ? 'justify-center' : '',
                active
                  ? 'text-indigo-600 dark:text-white font-semibold'
                  : 'text-[var(--color-war-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-war-text)]'
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-[12px] bg-indigo-500/15 dark:bg-indigo-500/25 border border-indigo-500/20 shadow-sm"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}
              <GIcon
                name={item.icon}
                size={19}
                filled={active}
                className={clsx(
                  'relative transition-colors',
                  active ? 'text-indigo-600 dark:text-[#818cf8]' : 'text-[var(--color-war-text-muted)] group-hover:text-[var(--color-war-text)]'
                )}
              />
              {!collapsed && (
                <span className="relative text-[13px] tracking-[-0.006em] flex-1 truncate">{item.label}</span>
              )}
              {/* Dynamic live telemetry counters */}
              {!collapsed && item.path === '/incidents' && activeIncidentsCount > 0 && (
                <span className="relative ml-auto rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-500 dark:text-rose-400 border border-rose-500/20">
                  {activeIncidentsCount}
                </span>
              )}
              {!collapsed && item.path === '/leaks' && activeLeaksCount > 0 && (
                <span className="relative ml-auto rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-purple-500 dark:text-purple-400 border border-purple-500/20">
                  {activeLeaksCount}
                </span>
              )}
              {!collapsed && item.path === '/signals' && signalsCount > 0 && (
                <span className="relative ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                  {signalsCount}
                </span>
              )}
              {isFocus && !active && item.path !== '/incidents' && item.path !== '/leaks' && item.path !== '/signals' && (
                <span title="Phase focus" className="relative ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#10b981]" />
              )}
              {active && !collapsed && item.path !== '/incidents' && item.path !== '/leaks' && item.path !== '/signals' && (
                <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-[#818cf8]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-war-border-light)] px-2.5 py-2.5 space-y-0.5">
        {bottomItems.map((item) => {
          return (
            <button
              key={item.label}
              onClick={() => handleTool(item.label)}
              disabled={checking && item.label === 'System Status'}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left text-[var(--color-war-text-muted)] transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-war-text)] active:scale-[0.98] disabled:opacity-50',
                collapsed ? 'justify-center' : ''
              )}
              title={collapsed ? item.label : undefined}
            >
              <GIcon name={item.icon} size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-normal">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      <FreePluginsModal
        isOpen={pluginsOpen}
        onClose={() => setPluginsOpen(false)}
        onOpenBoxOfficeTracker={() => setBoxOfficeOpen(true)}
      />
      <BoxOfficeTrackerModal
        isOpen={boxOfficeOpen}
        onClose={() => setBoxOfficeOpen(false)}
      />
    </aside>
  );
}
