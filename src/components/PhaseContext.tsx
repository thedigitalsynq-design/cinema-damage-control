import { createContext, useContext, useEffect, useState } from 'react';

export type ReleasePhase = 'pre' | 'opening' | 'recovery';

export const PHASES: { id: ReleasePhase; label: string; short: string; doctrine: string }[] = [
  { id: 'pre', label: 'Pre-release', short: 'Pre', doctrine: 'Silence with readiness — buy options before you need them.' },
  { id: 'opening', label: 'Opening week', short: 'Opening', doctrine: 'Triage ruthlessly — the first 6 hours decide the weekend.' },
  { id: 'recovery', label: 'Recovery', short: 'Recovery', doctrine: 'Rebuild on schedule — controversy down by day 7.' },
];

/** Sidebar order per phase. First entry after '/' gets focus priority. */
export const PHASE_ORDERS: Record<ReleasePhase, string[]> = {
  pre: ['/', '/films', '/leaks', '/influencers', '/narratives', '/response', '/reports', '/analyst', '/markets', '/signals', '/incidents', '/social', '/media', '/audience', '/recovery'],
  opening: ['/', '/signals', '/incidents', '/films', '/markets', '/response', '/analyst', '/social', '/leaks', '/narratives', '/media', '/influencers', '/audience', '/recovery', '/reports'],
  recovery: ['/', '/recovery', '/films', '/markets', '/response', '/reports', '/analyst', '/audience', '/narratives', '/media', '/social', '/influencers', '/leaks', '/incidents', '/signals'],
};

export const READINESS_ITEMS = [
  { id: 'baseline', label: 'Baseline captured', detail: '7-day normal sentiment, velocity and reach recorded' },
  { id: 'takedowns', label: 'Takedowns pre-drafted', detail: 'DMCA notices ready for streaming, torrent and Telegram' },
  { id: 'approvals', label: 'Approvals matrix signed', detail: 'Who can approve a clarification vs. a leadership statement' },
  { id: 'callsheet', label: 'Influencer call sheet ready', detail: 'Top voices mapped with what each one cares about' },
  { id: 'drill', label: 'Mock drill completed', detail: 'Detection to approved response in under 90 minutes' },
];

const STORAGE_KEY = 'cdc-release-phase';

interface PhaseContextValue {
  phase: ReleasePhase;
  setPhase: (p: ReleasePhase) => void;
}

const PhaseContext = createContext<PhaseContextValue>({ phase: 'opening', setPhase: () => {} });

export function usePhase(): PhaseContextValue {
  return useContext(PhaseContext);
}

export function PhaseProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<ReleasePhase>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'pre' || saved === 'opening' || saved === 'recovery') return saved;
    } catch {
      /* private mode — fall through to default */
    }
    return 'opening';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, phase);
    } catch {
      /* ignore write failures */
    }
  }, [phase]);

  return <PhaseContext.Provider value={{ phase, setPhase }}>{children}</PhaseContext.Provider>;
}
