/**
 * Damage-control data layer — kept separate from UI so real box-office /
 * occupancy APIs can replace the modelled entries later.
 *
 * Data provenance (shown in UI, never hidden):
 * - TOXIC score is LIVE-measured from the RSS feed when the backend runs.
 * - Everything marked MODELLED is an illustrative estimate, not industry data.
 */
import type { Severity } from './types';

export type DamageBand = 'Stable' | 'Watch' | 'At Risk' | 'Critical';
export type MarketLevel = 'red' | 'amber' | 'green';
export type TrendDir = 'up' | 'down' | 'flat';

export interface DamageFactor {
  metric: string;
  delta: string;
}

export interface MarketHealth {
  region: string;
  language: string;
  health: number;
  revenue: string;
  occupancy: number;
  shows: number;
  velocity: string;
  sentiment: number;
  trend: TrendDir;
}

export interface RevenueExposure {
  expected: string;
  projected: string;
  atRisk: string;
  atRiskCr: number;
  producer: string;
  distributor: string;
  exhibitor: string;
  gross: string;
  net: string;
  share: string;
  atp: string;
  footfalls: string;
  occupancy: string;
}

export interface FootfallDiag {
  revenue: string;
  footfalls: string;
  atp: string;
  verdict: string;
  warning: boolean;
}

export interface Crisis {
  id: string;
  filmId: string;
  severity: Exclude<Severity, 'LOW'>;
  problem: string;
  markets: { name: string; level: MarketLevel }[];
  revenueAtRisk: string;
  trend: string;
  action: string;
}

export interface DamageAction {
  id: string;
  title: string;
  why: string;
  impact: string;
  urgency: 'NOW' | 'THIS WEEK' | 'MONITOR';
  confidence: number;
}

export interface TimelineStep {
  label: string;
  detail: string;
  state: 'done' | 'active' | 'upcoming';
}

export interface FilmDamage {
  id: string;
  title: string;
  language: string;
  genre: string;
  releaseDate: string;
  budget: string;
  status: string;
  /** false = live-measured score when backend runs; true = illustrative model */
  modelled: boolean;
  /** fallback/model score; TOXIC is overridden live from feed negativity */
  score: number;
  observed: DamageFactor[];
  inferred: DamageFactor[];
  inference: string;
  confidence: number;
  markets: MarketHealth[];
  revenue: RevenueExposure;
  footfall: FootfallDiag;
  crises: Crisis[];
  actions: DamageAction[];
  timeline: TimelineStep[];
  competition: { films: { name: string; velocity: string }[]; note: string };
}

import { damageBandFor as damageBand } from './algorithm';

export { damageBand };

export const bandStyles: Record<DamageBand, string> = {
  Critical: 'bg-[#ff453a]/15 text-[#ff6961]',
  'At Risk': 'bg-[#ff9f0a]/15 text-[#ffb340]',
  Watch: 'bg-[#ffd60a]/15 text-[#ffd60a]',
  Stable: 'bg-[#30d158]/15 text-[#30d158]',
};

export const films: FilmDamage[] = [
  {
    id: 'toxic',
    title: 'TOXIC',
    language: 'Kannada + 5 dubs',
    genre: 'Gangster Drama',
    releaseDate: '26 Aug 2026',
    budget: 'Undisclosed',
    status: 'In theatres · English cut added 4 Sep',
    modelled: false,
    score: 68,
    observed: [
      { metric: 'Occupancy', delta: '↓ 22% weekday vs opening weekend' },
      { metric: 'Shows', delta: '↓ 15% across AP/Telangana' },
      { metric: 'Sentiment', delta: '↓ 11 pts since Day 2' },
      { metric: 'Booking velocity', delta: '↓ 19% week-over-week' },
    ],
    inferred: [{ metric: 'Negative WOM', delta: 'probably the primary driver' }],
    inference: 'Weekend footfall was healthy, but weekday occupancy fell sharply in AP/Telangana as underperformance coverage took over the conversation.',
    confidence: 78,
    markets: [
      { region: 'AP / Telangana', language: 'Telugu', health: 38, revenue: '₹41 Cr', occupancy: 34, shows: 612, velocity: '-19%', sentiment: -34, trend: 'down' },
      { region: 'Karnataka', language: 'Kannada', health: 61, revenue: '₹58 Cr', occupancy: 47, shows: 840, velocity: '-6%', sentiment: -18, trend: 'flat' },
      { region: 'Tamil Nadu', language: 'Tamil', health: 66, revenue: '₹22 Cr', occupancy: 52, shows: 410, velocity: '+3%', sentiment: -9, trend: 'up' },
      { region: 'Kerala', language: 'Malayalam', health: 58, revenue: '₹14 Cr', occupancy: 49, shows: 288, velocity: '-2%', sentiment: -12, trend: 'flat' },
      { region: 'Mumbai', language: 'Hindi', health: 55, revenue: '₹31 Cr', occupancy: 44, shows: 520, velocity: '-8%', sentiment: -21, trend: 'down' },
      { region: 'Delhi NCR', language: 'Hindi', health: 49, revenue: '₹19 Cr', occupancy: 39, shows: 344, velocity: '-11%', sentiment: -26, trend: 'down' },
      { region: 'Overseas', language: 'Multi', health: 63, revenue: '$9.2M', occupancy: 51, shows: 390, velocity: '+5%', sentiment: -6, trend: 'up' },
    ],
    revenue: {
      expected: '₹420 Cr',
      projected: '₹310 Cr',
      atRisk: '₹110 Cr',
      atRiskCr: 110,
      producer: '₹48 Cr',
      distributor: '₹37 Cr',
      exhibitor: '₹25 Cr',
      gross: '₹322 Cr (8 days)',
      net: '₹262 Cr est.',
      share: '₹141 Cr est.',
      atp: '₹218',
      footfalls: '1.2 Cr est.',
      occupancy: '44% avg',
    },
    footfall: {
      revenue: '↑ softening',
      footfalls: '↓ declining',
      atp: '↑ elevated',
      verdict: 'Revenue is being cushioned by premium pricing while audience volume declines — treat as a warning, not stability.',
      warning: true,
    },
    crises: [
      {
        id: 'tox-weekday',
        filmId: 'toxic',
        severity: 'HIGH',
        problem: 'Weekday occupancy is 34% below forecast in Telugu markets.',
        markets: [
          { name: 'Hyderabad', level: 'red' },
          { name: 'Bengaluru', level: 'amber' },
          { name: 'Chennai', level: 'green' },
        ],
        revenueAtRisk: '₹8.4 Cr',
        trend: '+18% risk trajectory',
        action: 'Protect Hyderabad screens; shift weekday shows to evenings.',
      },
    ],
    actions: [
      { id: 'tox-a1', title: 'Protect Hyderabad screens', why: 'Occupancy 71% on retained shows vs 34% average — the market still converts.', impact: 'Protect ₹1.2 Cr projected revenue.', urgency: 'NOW', confidence: 82 },
      { id: 'tox-a2', title: 'Cut low-performing weekday mornings', why: 'Morning shows run under 20% occupancy across AP/Telangana.', impact: 'Save operating cost; revenue/show +8%.', urgency: 'THIS WEEK', confidence: 76 },
      { id: 'tox-a3', title: 'Push English-cut word of mouth', why: 'The shorter cut resets the conversation within 48 hours of release.', impact: 'Lift second-weekend sentiment 10+ pts.', urgency: 'NOW', confidence: 69 },
      { id: 'tox-a4', title: 'Do not discount tickets yet', why: 'ATP is holding; discounting now trains wait-for-OTT behaviour.', impact: 'Avoid ₹3–4 Cr ATP erosion.', urgency: 'MONITOR', confidence: 71 },
    ],
    timeline: [
      { label: 'Trailer + advance bookings', detail: 'Record advance interest; ₹31 Cr+ advance gross reported.', state: 'done' },
      { label: 'Opening day — Aug 26', detail: '₹140 Cr worldwide day one; sentiment strongly positive.', state: 'done' },
      { label: 'First reviews + WOM shift', detail: 'Mixed reception; underperformance narrative forms by Day 3.', state: 'done' },
      { label: 'Occupancy decline', detail: 'Weekday occupancy −22%; shows −15% in AP/Telangana.', state: 'active' },
      { label: 'English shorter cut — Sep 4', detail: 'Second opening; reception sets the final story.', state: 'active' },
      { label: 'Intervention window', detail: 'Protect screens, seed craft coverage, hold ATP.', state: 'upcoming' },
      { label: 'Recovery / OTT window', detail: 'Narrative must flip before ancillary deals lock.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Mirzapur: The Movie', velocity: '+18%' },
        { name: 'Gandhari', velocity: '-12%' },
        { name: 'TOXIC', velocity: '-21%' },
      ],
      note: 'Mirzapur appears to be taking evening shows in the same Hindi-belt target markets.',
    },
  },
  {
    id: 'mirzapur',
    title: 'Mirzapur: The Movie',
    language: 'Hindi',
    genre: 'Crime Action',
    releaseDate: '4 Sep 2026',
    budget: 'Undisclosed',
    status: 'In theatres',
    modelled: true,
    score: 34,
    observed: [
      { metric: 'Occupancy', delta: '↑ 12% over opening weekend' },
      { metric: 'Booking velocity', delta: '↑ 18% day-over-day' },
      { metric: 'Sentiment', delta: '↑ 9 pts since release' },
    ],
    inferred: [{ metric: 'Franchise pull', delta: 'likely driving repeat viewing' }],
    inference: 'Franchise audience converted strongly; evening shows in Hindi markets are the engine.',
    confidence: 71,
    markets: [
      { region: 'Mumbai', language: 'Hindi', health: 81, revenue: '₹24 Cr', occupancy: 62, shows: 480, velocity: '+18%', sentiment: 14, trend: 'up' },
      { region: 'Delhi NCR', language: 'Hindi', health: 74, revenue: '₹19 Cr', occupancy: 58, shows: 402, velocity: '+11%', sentiment: 9, trend: 'up' },
      { region: 'UP / Bihar', language: 'Hindi', health: 78, revenue: '₹16 Cr', occupancy: 64, shows: 350, velocity: '+14%', sentiment: 12, trend: 'up' },
    ],
    revenue: {
      expected: '₹90 Cr',
      projected: '₹104 Cr',
      atRisk: '₹0 Cr',
      atRiskCr: 0,
      producer: '—',
      distributor: '—',
      exhibitor: '—',
      gross: '₹61 Cr (4 days)',
      net: '₹50 Cr est.',
      share: '₹27 Cr est.',
      atp: '₹186',
      footfalls: '33 L est.',
      occupancy: '61% avg',
    },
    footfall: {
      revenue: '↑ growing',
      footfalls: '↑ growing',
      atp: '→ stable',
      verdict: 'Growth is volume-led — the healthy pattern. Hold show allocation.',
      warning: false,
    },
    crises: [],
    actions: [
      { id: 'mir-a1', title: 'Hold evening show allocation', why: 'Evenings run 70%+ occupancy in Hindi markets.', impact: 'Protect upside momentum.', urgency: 'THIS WEEK', confidence: 80 },
      { id: 'mir-a2', title: 'Expand UP/Bihar screens selectively', why: 'Highest occupancy (64%) with headroom.', impact: '+₹2–3 Cr incremental.', urgency: 'MONITOR', confidence: 66 },
    ],
    timeline: [
      { label: 'Release — Sep 4', detail: 'Day-and-date with Toxic English cut; franchise crowd converts.', state: 'done' },
      { label: 'Opening weekend', detail: 'Positive WOM; booking velocity +18%.', state: 'active' },
      { label: 'Weekday hold', detail: 'Watch for post-weekend decay.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Mirzapur: The Movie', velocity: '+18%' },
        { name: 'TOXIC (English cut)', velocity: '+4%' },
        { name: 'Gandhari', velocity: '-12%' },
      ],
      note: 'Best positioned of the Sep 4 corridor; risk is over-expansion, not demand.',
    },
  },
  {
    id: 'gandhari',
    title: 'Gandhari',
    language: 'Hindi',
    genre: 'Drama',
    releaseDate: '4 Sep 2026',
    budget: 'Undisclosed',
    status: 'In theatres',
    modelled: true,
    score: 71,
    observed: [
      { metric: 'Occupancy', delta: '↓ 18% below corridor average' },
      { metric: 'Sentiment', delta: '↓ mixed-to-negative reviews' },
      { metric: 'Shows', delta: '↓ 9% since Monday' },
    ],
    inferred: [{ metric: 'Counter-programming squeeze', delta: 'probably losing screens to two bigger titles' }],
    inference: 'A well-reviewed-actor film caught between two event releases; the issue is screens, not rejection.',
    confidence: 64,
    markets: [
      { region: 'Mumbai', language: 'Hindi', health: 52, revenue: '₹6 Cr', occupancy: 38, shows: 190, velocity: '-9%', sentiment: -14, trend: 'down' },
      { region: 'Delhi NCR', language: 'Hindi', health: 47, revenue: '₹4 Cr', occupancy: 35, shows: 150, velocity: '-12%', sentiment: -17, trend: 'down' },
    ],
    revenue: {
      expected: '₹35 Cr',
      projected: '₹21 Cr',
      atRisk: '₹14 Cr',
      atRiskCr: 14,
      producer: '₹7 Cr',
      distributor: '₹4 Cr',
      exhibitor: '₹3 Cr',
      gross: '₹9 Cr (4 days)',
      net: '₹7 Cr est.',
      share: '₹3.8 Cr est.',
      atp: '₹172',
      footfalls: '5.2 L est.',
      occupancy: '36% avg',
    },
    footfall: {
      revenue: '↓ declining',
      footfalls: '↓ declining',
      atp: '→ stable',
      verdict: 'Both levers fall together — demand problem compounded by screen loss.',
      warning: true,
    },
    crises: [
      {
        id: 'gan-squeeze',
        filmId: 'gandhari',
        severity: 'HIGH',
        problem: 'Losing screens to two bigger corridor titles; occupancy 36%.',
        markets: [
          { name: 'Mumbai', level: 'amber' },
          { name: 'Delhi NCR', level: 'red' },
        ],
        revenueAtRisk: '₹3.1 Cr',
        trend: '+9% risk trajectory',
        action: 'Consolidate to high-occupancy shows; concede weak slots.',
      },
    ],
    actions: [
      { id: 'gan-a1', title: 'Consolidate to evening shows', why: 'Evenings hold 48% vs 24% mornings.', impact: 'Revenue/show +11%.', urgency: 'NOW', confidence: 74 },
      { id: 'gan-a2', title: 'Seed performance-praise coverage', why: 'Reviews praise the lead; amplify that strand.', impact: 'Stabilise sentiment −14 → −6.', urgency: 'THIS WEEK', confidence: 62 },
    ],
    timeline: [
      { label: 'Release — Sep 4', detail: 'Quiet opening against two event films.', state: 'done' },
      { label: 'Screen squeeze', detail: 'Shows −9% as exhibitors favour bigger titles.', state: 'active' },
      { label: 'Consolidation window', detail: 'Protect high-occupancy slots this week.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Mirzapur: The Movie', velocity: '+18%' },
        { name: 'TOXIC (English cut)', velocity: '+4%' },
        { name: 'Gandhari', velocity: '-12%' },
      ],
      note: 'Direct screen competition in Hindi multiplexes; genre overlap is low, audience overlap is high.',
    },
  },
];

export const activeCrises: (Crisis & { filmTitle: string })[] = films.flatMap((f) =>
  f.crises.map((c) => ({ ...c, filmTitle: f.title }))
);

export function roomTotals() {
  const atRiskCr = films.reduce((s, f) => s + f.revenue.atRiskCr, 0);
  const critical = activeCrises.filter((c) => c.severity === 'CRITICAL').length;
  const attention = films.filter((f) => damageBand(liveScoreOf(f)) !== 'Stable').length;
  return {
    tracked: films.length,
    attention,
    critical,
    atRisk: `₹${atRiskCr.toFixed(1)} Cr`,
  };
}

/** Live override hook point: TOXIC score follows feed negativity when available. */
export function liveScoreOf(film: FilmDamage, liveNegPct?: number): number {
  if (!film.modelled && typeof liveNegPct === 'number') return Math.max(0, Math.min(100, Math.round(liveNegPct)));
  return film.score;
}
