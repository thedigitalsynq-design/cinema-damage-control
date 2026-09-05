import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

type Tone = 'success' | 'info' | 'warn';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

type PushToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<PushToast>(() => {});

// eslint-disable-next-line react/only-export-components -- custom hook co-located with its provider by design
export function useToast(): PushToast {
  return useContext(ToastContext);
}

const toneStyles: Record<Tone, { icon: typeof Info; chip: string }> = {
  success: { icon: CheckCircle2, chip: 'text-[#30d158]' },
  info: { icon: Info, chip: 'text-[#64a8ff]' },
  warn: { icon: AlertTriangle, chip: 'text-[#ffb340]' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback<PushToast>((message, tone = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const { icon: Icon, chip } = toneStyles[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-auto max-w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-[#1c1c1e]/95 py-2.5 pl-3.5 pr-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
              >
                <Icon size={16} className={clsx('shrink-0', chip)} />
                <span className="text-[13px] font-medium leading-snug text-white">{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
