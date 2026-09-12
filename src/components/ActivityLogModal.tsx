import React, { useEffect, useState } from 'react';
import { History, X, Activity, RefreshCw, User, Database, Clock } from 'lucide-react';
import { subscribeActivityLogs } from '../lib/activityLog';
import type { ActivityLogEntry } from '../lib/activityLog';
import { useAuth } from './AuthContext';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isCloudConnected } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => setIsLoading(true), 0);
    const unsubscribe = subscribeActivityLogs((data) => {
      setLogs(data);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryBadges: Record<string, { bg: string; label: string }> = {
    COUNTERMEASURE: { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', label: 'Countermeasure' },
    TAKEDOWN: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'DMCA Takedown' },
    AI_CHAT: { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', label: 'AI Advisor' },
    PHASE_CHANGE: { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', label: 'Phase Shift' },
    SEARCH: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Search Grounding' },
    SYSTEM: { bg: 'bg-slate-800 border-slate-700 text-slate-300', label: 'System Action' },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-semibold text-white text-base">War Room Activity Log</h2>
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border flex items-center space-x-1 ${
                    isCloudConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>{isCloudConnected ? 'Firestore Synced' : 'Local Backup'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-time audit trail of executive decisions and AI interventions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-950/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
              <span>Connecting to Firestore audit trail...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <Activity className="w-8 h-8 mx-auto text-slate-600" />
              <p>No activity records logged yet. Try triggering a countermeasure or sending an AI prompt!</p>
            </div>
          ) : (
            logs.map((item, idx) => {
              const badge = categoryBadges[item.category] || categoryBadges.SYSTEM;
              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 bg-slate-900/90 border border-slate-800/80 rounded-xl space-y-1.5 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="font-semibold text-slate-200">{item.action}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {item.details && <p className="text-xs text-slate-400 pl-1">{item.details}</p>}

                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-1 font-mono">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{item.userEmail || 'Guest Analyst'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="text-slate-500">Showing last {logs.length} persisted records</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-xs font-medium"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
