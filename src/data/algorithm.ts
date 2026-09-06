/**
 * The damage-control algorithm, stated plainly enough to audit:
 *
 *   MEASURE → SCORE → DIAGNOSE → RANK → PROJECT → ESCALATE
 *
 * Every number carries its derivation. Weights are published below, not
 * hidden. Anything labelled MODELLED elsewhere stays modelled; this engine
 * only combines measurements, model inputs, and your interventions.
 */

export interface DamageInput {
  negativity: number; // 0–100, negative share of tracked stories
  velocityPct: number; // day-over-day volume change
  reachMillions: number; // estimated audience exposure, millions
  weakMarkets: number; // markets with health < 50
  totalMarkets: number;
  activeLeaks: number; // pirated links still up
  pressureRisk: number; // interventions, negative = relief
  sampleSize: number; // stories measured (drives confidence)
}

export interface Contribution {
  factor: string;
  weight: string;
  value: string;
  points: number;
}

export interface DamageResult {
  score: number;
  band: 'Stable' | 'Watch' | 'At Risk' | 'Critical';
  contributions: Contribution[];
  capped: boolean;
  surcharge: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Published weights — change them here and every surface follows. */
export const SCORE_WEIGHTS = {
  negativity: 0.4,
  velocity: 0.3,
  reach: 0.12,
  markets: 0.1,
  leaks: 0.08,
} as const;

const pct = (w: number) => `${Math.round(w * 100)}%`;

export function damageBandFor(score: number): DamageResult['band'] {
  if (score >= 70) return 'Critical';
  if (score >= 45) return 'At Risk';
  if (score >= 20) return 'Watch';
  return 'Stable';
}

export function computeDamage(input: DamageInput): DamageResult {
  // Rising velocity is worse than fading volume: accelerating bad news gets
  // full weight, a dying story gets half.
  const velMag = clamp(Math.abs(input.velocityPct));
  const velWeighted = input.velocityPct >= 0 ? velMag : velMag * 0.5;
  const reachNorm = clamp(Math.round(Math.sqrt(Math.max(0, input.reachMillions) * 1e6) / 40));
  const marketNorm = input.totalMarkets > 0 ? Math.round((input.weakMarkets / input.totalMarkets) * 100) : 0;
  const leakNorm = clamp(input.activeLeaks * 12);

  const parts: Contribution[] = [
    { factor: 'Negativity', weight: pct(SCORE_WEIGHTS.negativity), value: `${Math.round(input.negativity)}% hostile`, points: input.negativity * SCORE_WEIGHTS.negativity },
    { factor: 'Velocity', weight: pct(SCORE_WEIGHTS.velocity), value: `${input.velocityPct >= 0 ? '+' : ''}${Math.round(input.velocityPct)}%`, points: velWeighted * SCORE_WEIGHTS.velocity },
    { factor: 'Reach', weight: pct(SCORE_WEIGHTS.reach), value: `~${input.reachMillions.toFixed(1)}M exposure`, points: reachNorm * SCORE_WEIGHTS.reach },
    { factor: 'Weak markets', weight: pct(SCORE_WEIGHTS.markets), value: `${input.weakMarkets}/${input.totalMarkets} unhealthy`, points: marketNorm * SCORE_WEIGHTS.markets },
    { factor: 'Active leaks', weight: pct(SCORE_WEIGHTS.leaks), value: `${input.activeLeaks} prints up`, points: leakNorm * SCORE_WEIGHTS.leaks },
  ];

  // Viral-hostility surcharge: widespread AND accelerating hostility compounds.
  const surcharge = input.negativity >= 50 && Math.abs(input.velocityPct) >= 30 ? 8 : 0;

  let score = clamp(Math.round(parts.reduce((s, p) => s + p.points, 0) + surcharge + input.pressureRisk));

  // Thin-sample cap: never cry Critical on a whisper of data.
  let capped = false;
  if (input.sampleSize < 10 && score > 50) {
    score = 50;
    capped = true;
  }

  return {
    score,
    band: damageBandFor(score),
    contributions: parts.map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 })),
    capped,
    surcharge,
  };
}

/**
 * Asymmetric easing for the displayed score: bad news lands instantly,
 * relief settles slowly. Standard risk-console behavior.
 */
export function smoothScore(prev: number, next: number): number {
  if (next >= prev) return next;
  return Math.round((prev + (next - prev) * 0.35) * 10) / 10;
}

export interface Diagnosis {
  observed: { metric: string; delta: string }[];
  inferred: string;
  confidence: number;
  confidenceNote: string;
}

export function diagnose(input: DamageInput): Diagnosis {
  const observed = [
    { metric: 'Negativity', delta: `${Math.round(input.negativity)}% of coverage` },
    { metric: 'Velocity', delta: `${input.velocityPct >= 0 ? '+' : ''}${Math.round(input.velocityPct)}% day-over-day` },
    { metric: 'Weak markets', delta: `${input.weakMarkets} of ${input.totalMarkets}` },
  ];
  const top: 'negativity' | 'velocity' | 'reach' | 'markets' =
    input.negativity >= 50 ? 'negativity'
    : Math.abs(input.velocityPct) >= 30 ? 'velocity'
    : input.weakMarkets > 0 ? 'markets' : 'reach';
  const inferred =
    top === 'negativity' ? 'Hostile share leads — content response outranks distribution moves.'
    : top === 'velocity' ? 'Acceleration leads — the story is spreading faster than it is being answered.'
    : top === 'markets' ? 'Geography leads — protect converting markets before chasing weak ones.'
    : 'Exposure leads — contain reach (takedowns, screens) before messaging.';
  const n = input.sampleSize;
  const confidence = n >= 100 ? 80 : n >= 30 ? 70 : n >= 10 ? 60 : 45;
  return {
    observed,
    inferred,
    confidence,
    confidenceNote: n >= 30 ? `Measured across ${n} stories.` : `Only ${n} stories — treat as approximate.`,
  };
}

export interface RankedAction<T> {
  action: T;
  rankScore: number;
  reason: string;
}

const URGENCY_WEIGHT: Record<string, number> = { NOW: 3, 'THIS WEEK': 2, MONITOR: 1 };

export function rankActions<T extends { id: string; urgency: string; confidence: number; title: string }>(
  actions: T[]
): RankedAction<T>[] {
  return actions
    .map((action) => {
      const uw = URGENCY_WEIGHT[action.urgency] ?? 1;
      return {
        action,
        rankScore: uw * action.confidence,
        reason: `${action.urgency} × ${action.confidence}% confidence`,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

export interface Projection {
  doNothing: number;
  showOpt: number;
  combined: number;
  protected: number;
}

/** 72-hour loss model. Growth compounds convexly with velocity; each path trims it. */
export function projectLoss(exposureCr: number, velocityPct: number): Projection {
  const g = Math.min(2, Math.pow(Math.max(0, velocityPct) / 100, 1.15));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const doNothing = exposureCr * (1 + g);
  const showOpt = exposureCr * (1 + g * 0.65);
  const combined = exposureCr * (1 + g * 0.4);
  return { doNothing: r1(doNothing), showOpt: r1(showOpt), combined: r1(combined), protected: r1(doNothing - combined) };
}

export interface Escalation {
  level: 'CRITICAL' | 'ELEVATED' | 'WATCH' | 'CALM';
  protocol: string;
}

export function escalationFor(score: number, velocityPct: number): Escalation {
  if (score >= 70) return { level: 'CRITICAL', protocol: 'C-Suite war room, hourly reviews, all approvals on standby.' };
  if (score >= 45 || velocityPct > 40)
    return { level: 'ELEVATED', protocol: 'Daily reviews, pre-approved responses armed, spokesperson briefed.' };
  if (score >= 20) return { level: 'WATCH', protocol: 'Monitor cadence, readiness checklist green.' };
  return { level: 'CALM', protocol: 'Routine monitoring.' };
}
