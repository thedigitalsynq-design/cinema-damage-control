import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { api } from '../data/apiService';
import { useToast } from './Toaster';
import {
  LayoutDashboard,
  Radio,
  AlertTriangle,
  GitBranch,
  Share2,
  Newspaper,
  Users,
  BarChart3,
  Send,
  TrendingUp,
  FileText,
  Settings,
  Database,
  Users2,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/signals', label: 'Live Signals', icon: Radio },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/narratives', label: 'Narratives', icon: GitBranch },
  { path: '/social', label: 'Social', icon: Share2 },
  { path: '/media', label: 'Media', icon: Newspaper },
  { path: '/influencers', label: 'Influencers', icon: Users },
  { path: '/audience', label: 'Audience', icon: BarChart3 },
  { path: '/response', label: 'Response', icon: Send },
  { path: '/recovery', label: 'Recovery', icon: TrendingUp },
  { path: '/reports', label: 'Reports', icon: FileText },
];

const bottomItems = [
  { label: 'System Status', icon: Activity },
  { label: 'Data Sources', icon: Database },
  { label: 'Team', icon: Users2 },
  { label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const handleTool = async (label: string) => {
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
      toast('5 Google News RSS feeds · cached for 5 minutes', 'info');
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
        'flex h-full flex-col border-r border-white/[0.08] bg-[#1c1c1e]/70 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#ff453a] to-[#c2251c] shadow-lg shadow-red-900/40">
              <span className="text-[13px] font-bold text-white">C</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-semibold tracking-tight text-white">Cinema</span>
              <span className="text-[11px] font-normal text-war-text-muted">Damage Control</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-full p-1.5 text-war-text-muted transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-1">
        {!collapsed && (
          <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">
            Intelligence
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'group relative flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-200 active:scale-[0.98]',
                collapsed ? 'justify-center' : '',
                active
                  ? 'text-white'
                  : 'text-war-text-secondary hover:bg-white/[0.06] hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-[10px] bg-[#0a84ff]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={clsx('relative shrink-0', active ? 'text-[#64a8ff]' : 'text-war-text-secondary group-hover:text-white')} />
              {!collapsed && (
                <span className="relative text-[13px] font-medium tracking-[-0.006em]">{item.label}</span>
              )}
              {active && !collapsed && (
                <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-[#0a84ff]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-2.5 py-2.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleTool(item.label)}
              disabled={checking && item.label === 'System Status'}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-war-text-muted transition hover:bg-white/[0.06] hover:text-white active:scale-[0.98] disabled:opacity-50',
                collapsed ? 'justify-center' : ''
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} strokeWidth={1.8} className="shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-normal">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
