import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Cause and effect for the war room. Every intervention applies pressure
 * to the room's numbers (in display units); pressure decays ~10%/min so
 * the room settles unless you keep acting. Session-only by design —
 * persisted "fake progress" across reloads would be dishonest.
 */

export type RoomActionKind =
  | 'approve'
  | 'modify'
  | 'reject'
  | 'escalate'
  | 'plan'
  | 'takedown'
  | 'removed';

export interface Pressure {
  risk: number;
  velocity: number;
  sentiment: number;
}

const EFFECTS: Record<RoomActionKind, Pressure> = {
  approve: { risk: -4, velocity: -6, sentiment: -2 },
  modify: { risk: -1, velocity: -3, sentiment: -1 },
  reject: { risk: 3, velocity: 3, sentiment: 1 },
  escalate: { risk: -2, velocity: 1, sentiment: 0 },
  plan: { risk: -3, velocity: -2, sentiment: -1 },
  takedown: { risk: -2, velocity: -2, sentiment: 0 },
  removed: { risk: -3, velocity: -2, sentiment: -1 },
};

interface RoomContextValue {
  pressure: Pressure;
  apply: (kind: RoomActionKind) => void;
  reset: () => void;
}

const RoomContext = createContext<RoomContextValue>({
  pressure: { risk: 0, velocity: 0, sentiment: 0 },
  apply: () => {},
  reset: () => {},
});

// eslint-disable-next-line react/only-export-components -- custom hook co-located with its provider by design
export function useRoom(): RoomContextValue {
  return useContext(RoomContext);
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [pressure, setPressure] = useState<Pressure>({ risk: 0, velocity: 0, sentiment: 0 });

  const apply = (kind: RoomActionKind) => {
    const e = EFFECTS[kind];
    setPressure((p) => ({
      risk: Math.max(-30, Math.min(30, p.risk + e.risk)),
      velocity: Math.max(-40, Math.min(40, p.velocity + e.velocity)),
      sentiment: Math.max(-20, Math.min(20, p.sentiment + e.sentiment)),
    }));
  };

  const reset = useCallback(() => setPressure({ risk: 0, velocity: 0, sentiment: 0 }), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPressure((p) => {
        const decay = (v: number) => (Math.abs(v) < 0.3 ? 0 : Number((v * 0.9).toFixed(2)));
        const next = { risk: decay(p.risk), velocity: decay(p.velocity), sentiment: decay(p.sentiment) };
        return next.risk === p.risk && next.velocity === p.velocity && next.sentiment === p.sentiment ? p : next;
      });
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  return <RoomContext.Provider value={{ pressure, apply, reset }}>{children}</RoomContext.Provider>;
}
