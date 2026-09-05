import { useState, useEffect } from 'react';
import { Bell, Search, User, ChevronDown, Clock } from 'lucide-react';
import { LiveIndicator } from './ui/StatusBadge';
import { alerts } from '../data/mockData';

export function TopNav({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <header className="flex h-[52px] items-center justify-between border-b border-white/[0.08] bg-black/60 px-5 backdrop-blur-2xl backdrop-saturate-150">
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-white">Cinema Damage Control</span>
          <span className="text-[13px] font-normal text-war-text-muted">Project Veera</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <LiveIndicator critical />
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-normal tabular-nums text-war-text-secondary">05 Sep 2026 · {timeStr} IST</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenCommandPalette}
          className="flex h-8 w-64 items-center gap-2 rounded-full bg-white/[0.08] px-3.5 text-war-text-muted transition hover:bg-white/[0.12] hover:text-white active:scale-[0.98]"
        >
          <Search size={14} />
          <span className="text-[13px] font-normal">Search</span>
          <kbd className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-war-text-secondary">⌘K</kbd>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-war-text-secondary transition hover:bg-white/[0.12] hover:text-white active:scale-95"
          >
            <Bell size={15} />
            {unreadAlerts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff453a] px-1 text-[11px] font-semibold text-white ring-2 ring-black">
                {unreadAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl fade-in">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-semibold text-white">Notifications</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-war-text-secondary">{unreadAlerts} new</span>
              </div>
              <div className="max-h-80 overflow-y-auto pb-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`mx-2 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.06] ${
                      !alert.read ? 'bg-white/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {!alert.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0a84ff]" />
                      )}
                      <div className="flex-1">
                        <p className="text-[13px] leading-snug text-white">{alert.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold ${
                              alert.severity === 'CRITICAL'
                                ? 'text-[#ff453a]'
                                : alert.severity === 'HIGH'
                                ? 'text-[#ff9f0a]'
                                : 'text-[#ffd60a]'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-[11px] text-war-text-muted">{alert.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-war-text-muted transition hover:bg-white/[0.06] hover:text-white lg:flex">
          <Clock size={14} />
          <span className="text-[13px]">Activity</span>
        </div>

        <div className="flex h-8 items-center gap-2 rounded-full bg-white/[0.08] py-1 pl-1.5 pr-2.5 transition hover:bg-white/[0.12]">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#64a8ff] to-[#0a84ff]">
            <User size={13} className="text-white" />
          </div>
          <span className="text-[13px] font-medium text-white">Admin</span>
          <ChevronDown size={12} className="text-war-text-muted" />
        </div>
      </div>
    </header>
  );
}
