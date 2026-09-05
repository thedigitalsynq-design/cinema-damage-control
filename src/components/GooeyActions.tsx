import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Plus, Search, Send, FileText } from 'lucide-react';
import { Liquid } from 'liquid-gooey';

/**
 * Floating quick-actions menu with a liquid-gooey effect.
 * The buttons share one goo filter, so they stretch, bridge and melt
 * into each other while flying open — icons stay crisp on top.
 * NOTE: item buttons must keep transparent backgrounds; the liquid
 * silhouette underneath is their visible surface.
 */
export function GooeyActions({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const actions = [
    {
      label: 'Search commands',
      icon: Search,
      x: 0,
      y: -84,
      delay: 0,
      run: () => {
        setOpen(false);
        onOpenCommandPalette();
      },
    },
    {
      label: 'Open Response Center',
      icon: Send,
      x: -60,
      y: -60,
      delay: 40,
      run: () => go('/response'),
    },
    {
      label: 'Export brief',
      icon: FileText,
      x: -84,
      y: 0,
      delay: 80,
      run: () => go('/reports'),
    },
  ];

  return (
    <>
      {/* Click-away backdrop while open */}
      {open && (
        <button
          aria-label="Close quick actions"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-40">
        <Liquid
          blur={10}
          contrast={18}
          fill="#0a84ff"
          shadow="0 8px 24px rgba(0,0,0,.45)"
          className="relative h-[210px] w-[210px]"
        >
          {/* Satellite actions — stacked on the FAB when closed, fanning out when open */}
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Liquid.Item
                key={a.label}
                x={open ? a.x : 0}
                y={open ? a.y : 0}
                transition="bouncy"
                delay={a.delay}
                className="absolute bottom-0 right-0"
              >
                <button
                  type="button"
                  title={a.label}
                  aria-label={a.label}
                  onClick={a.run}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-transparent text-white"
                >
                  <Icon size={19} />
                </button>
              </Liquid.Item>
            );
          })}

          {/* Main toggle — part of the same liquid mass */}
          <Liquid.Item x={0} y={0} transition="bouncy" className="absolute bottom-0 right-0">
            <button
              type="button"
              title={open ? 'Close quick actions' : 'Quick actions'}
              aria-label={open ? 'Close quick actions' : 'Quick actions'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-transparent text-white"
            >
              <Plus
                size={22}
                className={clsx('transition-transform duration-300', open && 'rotate-45')}
              />
            </button>
          </Liquid.Item>
        </Liquid>
      </div>
    </>
  );
}
