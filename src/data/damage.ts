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
  {
    id: 'war2',
    title: 'WAR 2',
    language: 'Hindi + Telugu / Tamil dubs',
    genre: 'Spy Action Thriller',
    releaseDate: '14 Aug 2026',
    budget: '₹320 Cr',
    status: 'Pre-release · Advance bookings opening',
    modelled: true,
    score: 48,
    observed: [
      { metric: 'Advance Bookings', delta: '↑ 34% velocity in Mumbai/Delhi' },
      { metric: 'Telugu Screen Parity', delta: '⚠ Friction with local single-screens' },
      { metric: 'Runtime Rumors', delta: '↓ Speculative 3h 18m narrative circulating' },
    ],
    inferred: [{ metric: 'Regional dual-star tension', delta: 'Fan clubs clashing over screen time distribution' }],
    inference: 'Tremendous baseline interest, but cross-market screen disputes in AP/Telangana threaten opening day single-screen penetration.',
    confidence: 84,
    markets: [
      { region: 'Mumbai', language: 'Hindi', health: 88, revenue: '₹65 Cr', occupancy: 78, shows: 850, velocity: '+28%', sentiment: 24, trend: 'up' },
      { region: 'Delhi NCR', language: 'Hindi', health: 84, revenue: '₹54 Cr', occupancy: 72, shows: 720, velocity: '+22%', sentiment: 18, trend: 'up' },
      { region: 'AP / Telangana', language: 'Telugu', health: 51, revenue: '₹58 Cr', occupancy: 62, shows: 890, velocity: '-8%', sentiment: -12, trend: 'down' },
      { region: 'Karnataka', language: 'Kannada/Hindi', health: 76, revenue: '₹28 Cr', occupancy: 68, shows: 410, velocity: '+14%', sentiment: 12, trend: 'up' },
      { region: 'Overseas', language: 'Multi', health: 82, revenue: '$14.5M', occupancy: 74, shows: 620, velocity: '+19%', sentiment: 16, trend: 'up' },
    ],
    revenue: {
      expected: '₹750 Cr',
      projected: '₹680 Cr',
      atRisk: '₹34 Cr',
      atRiskCr: 34,
      producer: '₹140 Cr',
      distributor: '₹110 Cr',
      exhibitor: '₹70 Cr',
      gross: '₹120 Cr (Adv est)',
      net: '₹98 Cr',
      share: '₹55 Cr',
      atp: '₹285',
      footfalls: '2.1 Cr est.',
      occupancy: '72% forecast',
    },
    footfall: {
      revenue: '↑ surging',
      footfalls: '↑ strong',
      atp: '↑ premium',
      verdict: 'Heavy initial demand; monitor South single-screen conversion before Day 1.',
      warning: false,
    },
    crises: [
      {
        id: 'war2-screen-parity',
        filmId: 'war2',
        severity: 'HIGH',
        problem: 'Exhibitor screen dispute over Telugu version 2D vs IMAX sharing with regional releases.',
        markets: [
          { name: 'Hyderabad', level: 'amber' },
          { name: 'Vijayawada', level: 'red' },
          { name: 'Vizag', level: 'amber' },
        ],
        revenueAtRisk: '₹18.5 Cr',
        trend: '+14% friction',
        action: 'Direct distributor summit with regional multiplex chains; guarantee 6-show minimums.',
      },
    ],
    actions: [
      { id: 'war-a1', title: 'Lock South distributor revenue parity agreement', why: 'Eliminates boycott threats from local exhibitor associations.', impact: 'Unlocks 320 single screens in AP/TG.', urgency: 'NOW', confidence: 88 },
      { id: 'war-a2', title: 'Clarify official censor runtime (2h 46m)', why: 'Dispel fatigue narrative claiming film is over 3 hours.', impact: 'Prevents family audience hesitation.', urgency: 'THIS WEEK', confidence: 91 },
    ],
    timeline: [
      { label: 'Teaser drop', detail: '145M cross-platform views in 24h.', state: 'done' },
      { label: 'Advance bookings launch', detail: 'Record breaking early velocity in North metros.', state: 'active' },
      { label: 'Exhibitor parity lock', detail: 'Resolving South territory screen allocations.', state: 'active' },
      { label: 'Premiere day — Aug 14', detail: 'Simultaneous 5-language global rollout.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'WAR 2', velocity: '+28%' },
        { name: 'Regional Tentpole', velocity: '+12%' },
      ],
      note: 'Clear solo window in Hindi belt; battleground is South multiplex show counts.',
    },
  },
  {
    id: 'pushpa2',
    title: 'PUSHPA 2: The Rule',
    language: 'Telugu + Hindi + South Dubs',
    genre: 'Mass Action Drama',
    releaseDate: '06 Dec 2026',
    budget: '₹400 Cr',
    status: 'Theatrical Campaign · High-stakes Security',
    modelled: true,
    score: 62,
    observed: [
      { metric: 'Piracy Alerts', delta: '⚠ 14 unauthorized Telegram channel leaks detected' },
      { metric: 'Mass Belt Occupancy', delta: '↑ 89% advance sold-out in AP/TG & North mass circuits' },
      { metric: 'Boycott Hashtag Swarm', delta: '↓ 38,000 synthetic bot posts flagged' },
    ],
    inferred: [{ metric: 'Coordinated smear campaign', delta: 'Bot clusters targeting lead actor in Central circuits' }],
    inference: 'Massive theatrical momentum, but aggressive piracy attempts and coordinated review-bombing require active automated interdiction.',
    confidence: 89,
    markets: [
      { region: 'AP / Telangana', language: 'Telugu', health: 86, revenue: '₹140 Cr', occupancy: 91, shows: 1450, velocity: '+42%', sentiment: 38, trend: 'up' },
      { region: 'Hindi Belt', language: 'Hindi', health: 82, revenue: '₹115 Cr', occupancy: 84, shows: 1300, velocity: '+36%', sentiment: 29, trend: 'up' },
      { region: 'Karnataka', language: 'Kannada/Telugu', health: 74, revenue: '₹45 Cr', occupancy: 76, shows: 520, velocity: '+18%', sentiment: 21, trend: 'up' },
      { region: 'Tamil Nadu', language: 'Tamil', health: 68, revenue: '₹34 Cr', occupancy: 69, shows: 480, velocity: '+11%', sentiment: 14, trend: 'flat' },
      { region: 'Overseas', language: 'Multi', health: 84, revenue: '$18.2M', occupancy: 82, shows: 780, velocity: '+31%', sentiment: 28, trend: 'up' },
    ],
    revenue: {
      expected: '₹1,050 Cr',
      projected: '₹940 Cr',
      atRisk: '₹58 Cr',
      atRiskCr: 58,
      producer: '₹190 Cr',
      distributor: '₹155 Cr',
      exhibitor: '₹95 Cr',
      gross: '₹450 Cr (Opening Weekend est)',
      net: '₹375 Cr',
      share: '₹210 Cr',
      atp: '₹265',
      footfalls: '3.4 Cr est.',
      occupancy: '82% avg',
    },
    footfall: {
      revenue: '↑ record-breaking',
      footfalls: '↑ capacity',
      atp: '↑ premium',
      verdict: 'Peak theatrical phenomenon; key threat is pre-interval piracy leaking on social platforms.',
      warning: true,
    },
    crises: [
      {
        id: 'pushpa2-piracy-climax',
        filmId: 'pushpa2',
        severity: 'CRITICAL',
        problem: 'Climax battle video clip leaked on Telegram & X from overseas preview show.',
        markets: [
          { name: 'Hyderabad', level: 'red' },
          { name: 'Bangalore', level: 'amber' },
          { name: 'Mumbai', level: 'amber' },
        ],
        revenueAtRisk: '₹28 Cr',
        trend: '+45% viral velocity',
        action: 'Deploy automated DMCA takedown bot network; issue exhibitor watermark forensic audit.',
      },
    ],
    actions: [
      { id: 'p2-a1', title: 'Issue instant Telegram & Meta DMCA injunction', why: 'Prevents clip from migrating to mainstream algorithmic feeds.', impact: 'Preserves estimated ₹14 Cr opening weekend gross.', urgency: 'NOW', confidence: 93 },
      { id: 'p2-a2', title: 'Release official high-res promotional stills', why: 'Starves unauthorized grainy leaks of organic search impressions.', impact: 'Suppresses pirate search trends by 65%.', urgency: 'NOW', confidence: 85 },
    ],
    timeline: [
      { label: 'Trailer milestone', detail: '200M views across 6 languages.', state: 'done' },
      { label: 'Early overseas premiere', detail: 'Climax clip leak detected and contained.', state: 'active' },
      { label: 'Day-1 global release', detail: '8,500 screens worldwide.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'PUSHPA 2: The Rule', velocity: '+42%' },
        { name: 'Hollywood Tentpole', velocity: '-15%' },
      ],
      note: 'Dominating 85%+ screen share across national multiplex chains.',
    },
  },
  {
    id: 'kantara',
    title: 'KANTARA: Chapter 1',
    language: 'Kannada + Pan-India 6 dubs',
    genre: 'Mythological Action Folklore',
    releaseDate: '02 Oct 2026',
    budget: '₹160 Cr',
    status: 'Post-production · Teaser Campaign',
    modelled: true,
    score: 26,
    observed: [
      { metric: 'Organic Reception', delta: '↑ 94% positive sentiment across India' },
      { metric: 'Cultural Sentiment', delta: '✓ Ritual authenticity praised by coastal communities' },
      { metric: 'Booking Velocity', delta: '↑ +38% watch-list adds' },
    ],
    inferred: [{ metric: 'Word-of-mouth momentum', delta: 'Exceptional anticipation in Hindi, Telugu, and Kannada belts' }],
    inference: 'Rare universal cultural alignment; minimal active controversy. Focus on preserving folklore authenticity and distributor screen locking.',
    confidence: 91,
    markets: [
      { region: 'Karnataka', language: 'Kannada', health: 96, revenue: '₹92 Cr', occupancy: 88, shows: 740, velocity: '+34%', sentiment: 54, trend: 'up' },
      { region: 'Hindi Belt', language: 'Hindi', health: 89, revenue: '₹84 Cr', occupancy: 79, shows: 980, velocity: '+29%', sentiment: 48, trend: 'up' },
      { region: 'AP / Telangana', language: 'Telugu', health: 87, revenue: '₹55 Cr', occupancy: 81, shows: 620, velocity: '+24%', sentiment: 42, trend: 'up' },
      { region: 'Kerala', language: 'Malayalam', health: 91, revenue: '₹32 Cr', occupancy: 85, shows: 380, velocity: '+31%', sentiment: 50, trend: 'up' },
    ],
    revenue: {
      expected: '₹520 Cr',
      projected: '₹510 Cr',
      atRisk: '₹8 Cr',
      atRiskCr: 8,
      producer: '₹85 Cr',
      distributor: '₹68 Cr',
      exhibitor: '₹42 Cr',
      gross: '₹140 Cr (Pre-booking est)',
      net: '₹115 Cr',
      share: '₹62 Cr',
      atp: '₹210',
      footfalls: '2.5 Cr est.',
      occupancy: '81% avg',
    },
    footfall: {
      revenue: '↑ exceptional',
      footfalls: '↑ expanding',
      atp: '→ accessible',
      verdict: 'Healthy organic volume demand with zero synthetic inflation. Maintain authentic PR tone.',
      warning: false,
    },
    crises: [],
    actions: [
      { id: 'kan-a1', title: 'Lock premium IMAX screens early', why: 'Visual folklore format converts exceptionally on massive screens.', impact: '+₹6 Cr premium format ATP lift.', urgency: 'THIS WEEK', confidence: 89 },
    ],
    timeline: [
      { label: 'First look teaser', detail: 'National acclaim; organic trending.', state: 'done' },
      { label: 'Audio launch campaign', detail: 'Tribal score release planned.', state: 'active' },
      { label: 'Gandhi Jayanti release', detail: 'Solo festive corridor.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'KANTARA: Chapter 1', velocity: '+34%' },
      ],
      note: 'Solo release window on Gandhi Jayanti; no direct competition.',
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

import type { LatestFilmItem } from './apiService';

/** Generates a complete FilmDamage profile from a dynamic 30-day latest Indian film */
export function createFilmDamageFromLatest(item: LatestFilmItem): FilmDamage {
  const isReleased = item.telemetry30d.isReleased;
  const daysDiff = Math.abs(item.telemetry30d.diffDays);
  const statusStr = isReleased ? `In Theatres (Day ${daysDiff})` : `Releasing in ${daysDiff} Days`;

  return {
    id: item.id,
    title: item.title,
    language: item.language,
    genre: item.genre,
    releaseDate: item.releaseDateFormatted || item.releaseDate,
    budget: item.budget,
    status: `${statusStr} · ${item.bookingStatus}`,
    modelled: false,
    score: item.threatScore,
    observed: [
      { metric: 'BookMyShow Signal', delta: item.bookingStatus },
      { metric: '30-Day Search Curiosity', delta: `${(item.telemetry30d.total30dViews / 1000).toFixed(1)}k queries` },
      { metric: 'Theatrical Window Status', delta: item.telemetry30d.daysSinceReleaseText },
      { metric: 'Box Office Pace', delta: item.boxOffice },
    ],
    inferred: [
      { metric: 'Multiplex Word of Mouth', delta: item.threatScore > 50 ? 'Volatile' : 'Positive retention' },
      { metric: 'Regional Threat Velocity', delta: item.threatScore > 65 ? '+18% / 12h' : '+4% / 24h' },
    ],
    inference: `${item.title} is actively tracked within the 30-day Indian theatrical release window. Current BookMyShow activity indicates ${item.bookingStatus}. Threat index stands at ${item.threatScore}/100.`,
    confidence: 88,
    markets: [
      { region: 'North India (Delhi/UP/Punjab)', language: 'Hindi', health: Math.max(20, 100 - item.threatScore), revenue: '₹34 Cr', occupancy: 68, shows: 4200, velocity: '+12%', sentiment: 74, trend: 'up' },
      { region: 'West (Mumbai/Gujarat/Pune)', language: 'Hindi', health: Math.max(25, 95 - item.threatScore), revenue: '₹28 Cr', occupancy: 72, shows: 3800, velocity: '+16%', sentiment: 78, trend: 'up' },
      { region: 'South (Bengaluru/Hyderabad/Chennai)', language: 'Multi', health: Math.max(15, 85 - item.threatScore), revenue: '₹18 Cr', occupancy: 61, shows: 2100, velocity: '+8%', sentiment: 70, trend: 'flat' },
      { region: 'East (Bengal/Bihar/Assam)', language: 'Hindi', health: Math.max(20, 80 - item.threatScore), revenue: '₹9 Cr', occupancy: 54, shows: 1400, velocity: '+4%', sentiment: 66, trend: 'flat' },
    ],
    revenue: {
      expected: '₹120 Cr',
      projected: item.boxOffice || '₹95 Cr',
      atRisk: `₹${((item.threatScore / 100) * 45).toFixed(1)} Cr`,
      atRiskCr: Number(((item.threatScore / 100) * 45).toFixed(1)),
      producer: '₹48 Cr',
      distributor: '₹32 Cr',
      exhibitor: '₹15 Cr',
      gross: item.boxOffice || '₹85 Cr',
      net: '₹71 Cr',
      share: '₹35.5 Cr',
      atp: '₹285',
      footfalls: '2.8M',
      occupancy: '64%',
    },
    footfall: {
      revenue: item.boxOffice || '₹85 Cr',
      footfalls: '2.8M',
      atp: '₹285',
      verdict: item.threatScore > 60 ? 'Vulnerable to weekday drop' : 'Healthy weekend-to-weekday retention',
      warning: item.threatScore > 60,
    },
    crises: [
      {
        id: `${item.id}-c1`,
        filmId: item.id,
        severity: item.threatScore > 70 ? 'CRITICAL' : item.threatScore > 45 ? 'HIGH' : 'MEDIUM',
        problem: `${item.title}: Active theatrical release tracking & social narrative monitoring in the 30-day window.`,
        markets: [
          { name: 'North India', level: item.threatScore > 60 ? 'red' : 'amber' },
          { name: 'West & Mumbai', level: item.threatScore > 50 ? 'amber' : 'green' },
        ],
        revenueAtRisk: `₹${((item.threatScore / 100) * 30).toFixed(1)} Cr`,
        trend: item.threatScore > 50 ? '+14% / 24h' : 'Stable',
        action: 'Deploy positive talent testimonials & monitor BookMyShow fast-filling indicators.',
      },
    ],
    actions: [
      {
        id: `${item.id}-a1`,
        title: 'Calibrate Theatrical Show Allocations with Exhibitors',
        why: 'Counteract weekend churn and lock prime evening slots on BookMyShow and PVR Inox chains.',
        impact: 'Protects up to ₹8.5 Cr in second-weekend collections.',
        urgency: 'NOW',
        confidence: 91,
      },
      {
        id: `${item.id}-a2`,
        title: 'Amplify Verified Audience Reactions on YouTube & Instagram',
        why: 'Neutralize aggressive review-bombing and paid negative campaigns from competitor fandoms.',
        impact: 'Stabilizes audience sentiment above 72% positive.',
        urgency: 'THIS WEEK',
        confidence: 86,
      },
    ],
    timeline: [
      { label: 'Advance Booking Open', detail: `${item.bookingStatus} across national multiplexes.`, state: isReleased ? 'done' : 'active' },
      { label: 'Release Day Theatrical Reception', detail: 'Critical morning show audience sentiment tracking.', state: isReleased ? 'done' : 'upcoming' },
      { label: '30-Day Box Office Consolidation', detail: 'Sustain weekday holdover and optimize regional screen distribution.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Mirzapur: The Movie', velocity: '+28%' },
        { name: 'Haiwaan', velocity: '+22%' },
      ],
      note: 'High density theatrical window with multiple Pan-India tentpoles competing for multiplex prime hours.',
    },
  };
}

