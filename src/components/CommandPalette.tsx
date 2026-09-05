import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Search,
  AlertTriangle,
  GitBranch,
  Users,
  Send,
  FileText,
  Film,
  Radio,
  X,
} from 'lucide-react';

const commands = [
  { id: 'search-incident', label: 'Search incident', icon: AlertTriangle, path: '/incidents', category: 'SEARCH' },
  { id: 'search-narrative', label: 'Search narrative', icon: GitBranch, path: '/narratives', category: 'SEARCH' },
  { id: 'search-influencer', label: 'Search influencer', icon: Users, path: '/influencers', category: 'SEARCH' },
  { id: 'open-response', label: 'Open Response Center', icon: Send, path: '/response', category: 'NAVIGATION' },
  { id: 'create-incident', label: 'Create incident', icon: AlertTriangle, path: '/incidents', category: 'ACTIONS' },
  { id: 'generate-brief', label: 'Generate brief', icon: FileText, path: '/reports', category: 'ACTIONS' },
  { id: 'export-report', label: 'Export report', icon: FileText, path: '/reports', category: 'ACTIONS' },
  { id: 'change-film', label: 'Change film', icon: Film, path: '/', category: 'NAVIGATION' },
  { id: 'view-alerts', label: 'View alerts', icon: Radio, path: '/signals', category: 'NAVIGATION' },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
      }
      if (open && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].path);
      onClose();
    }
  };

  const grouped = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, typeof commands>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[14vh] backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
      <motion.div
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/90 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-saturate-150"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
          <Search size={17} className="shrink-0 text-war-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Spotlight Search"
            className="flex-1 bg-transparent text-[17px] font-normal tracking-tight text-white placeholder:text-war-text-muted outline-none"
          />
          <button onClick={onClose} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-war-text-secondary transition hover:bg-white/20 hover:text-white">
            <X size={13} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-war-text-muted">{category.toLowerCase()}</span>
              </div>
              {items.map((cmd) => {
                const Icon = cmd.icon;
                const idx = filtered.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                      idx === selectedIndex ? 'bg-[#0a84ff] text-white' : 'text-war-text-secondary hover:bg-white/[0.06]'
                    )}
                    onClick={() => {
                      navigate(cmd.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Icon size={16} className={idx === selectedIndex ? 'text-white' : 'text-war-text-muted'} />
                    <span className="text-[14px] font-normal">{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-[14px] text-war-text-muted">No results found</div>
          )}
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
