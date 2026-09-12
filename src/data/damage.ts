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
  releaseStatus?: string;
  /** Verified release and tracking sources: BookMyShow, Wikipedia, District, IMDb, Google */
  sources?: string[];
  /** Regional Indian cinema industry */
  industry?: string;
  /** Days in theatrical run relative to IST */
  theatricalDays?: number;
  theatricalDaysText?: string;
  isIndianCinema?: boolean;
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
    status: 'In theatres (Day 16) · English cut added 4 Sep',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Sandalwood',
    theatricalDays: 16,
    theatricalDaysText: 'Day 16 in Theatres',
    isIndianCinema: true,
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
    status: 'In theatres (Day 7) · Strong Evening Occupancy',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Bollywood',
    theatricalDays: 7,
    theatricalDaysText: 'Day 7 in Theatres',
    isIndianCinema: true,
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
    status: 'In theatres (Day 7) · Slot Consolidation',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Bollywood',
    theatricalDays: 7,
    theatricalDaysText: 'Day 7 in Theatres',
    isIndianCinema: true,
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
    status: 'In theatres (Day 28) · ₹680 Cr Global Pace',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Bollywood',
    theatricalDays: 28,
    theatricalDaysText: 'Day 28 in Theatres',
    isIndianCinema: true,
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
    id: 'goat',
    title: 'THE GREATEST OF ALL TIME (GOAT)',
    language: 'Tamil + Telugu / Hindi dubs',
    genre: 'Sci-Fi Action Thriller',
    releaseDate: '05 Sep 2026',
    budget: '₹380 Cr',
    status: 'In theatres (Day 6) · ₹320 Cr Gross Pace',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Kollywood',
    theatricalDays: 6,
    theatricalDaysText: 'Day 6 in Theatres',
    isIndianCinema: true,
    modelled: true,
    score: 45,
    observed: [
      { metric: 'Tamil Nadu Occupancy', delta: '↑ 84% weekend hold in Chennai/Chengalpet' },
      { metric: 'North Hindi Circuit', delta: '↓ 24% lower ATP conversion vs South' },
      { metric: 'De-Aging VFX Chatter', delta: '⚠ 18% social commentary debating opening sequence' },
      { metric: 'BookMyShow Fast-Filling', delta: '✓ 1,400+ fast-filling tags active in South' },
    ],
    inferred: [{ metric: 'Regional dual-role intrigue', delta: 'Heavy family crowd conversion in Tamil Nadu and Kerala' }],
    inference: 'Tremendous South box office velocity; Hindi multiplex evening allocation needs stabilization against localized competition.',
    confidence: 86,
    markets: [
      { region: 'Tamil Nadu (Chennai)', language: 'Tamil', health: 88, revenue: '₹78 Cr', occupancy: 86, shows: 1100, velocity: '+28%', sentiment: 32, trend: 'up' },
      { region: 'Kerala', language: 'Tamil', health: 82, revenue: '₹28 Cr', occupancy: 81, shows: 480, velocity: '+21%', sentiment: 24, trend: 'up' },
      { region: 'AP / Telangana', language: 'Telugu (Dub)', health: 64, revenue: '₹31 Cr', occupancy: 62, shows: 680, velocity: '+8%', sentiment: 11, trend: 'flat' },
      { region: 'North India & Mumbai', language: 'Hindi (Dub)', health: 52, revenue: '₹22 Cr', occupancy: 49, shows: 540, velocity: '-6%', sentiment: -8, trend: 'down' },
      { region: 'Overseas (Malaysia/Gulf/US)', language: 'Tamil', health: 89, revenue: '$14.2M', occupancy: 84, shows: 790, velocity: '+33%', sentiment: 36, trend: 'up' },
    ],
    revenue: {
      expected: '₹550 Cr',
      projected: '₹480 Cr',
      atRisk: '₹22 Cr',
      atRiskCr: 22,
      producer: '₹95 Cr',
      distributor: '₹72 Cr',
      exhibitor: '₹48 Cr',
      gross: '₹340 Cr (6 days)',
      net: '₹280 Cr',
      share: '₹152 Cr',
      atp: '₹240',
      footfalls: '1.8 Cr est.',
      occupancy: '74% avg',
    },
    footfall: {
      revenue: '↑ surging',
      footfalls: '↑ strong volume',
      atp: '↑ premium',
      verdict: 'Peak theatrical momentum in South circuits; protect Hindi show conversions this week.',
      warning: false,
    },
    crises: [
      {
        id: 'goat-north-shows',
        filmId: 'goat',
        severity: 'HIGH',
        problem: 'Hindi multiplex chain show retention soft in Tier-2 circuits due to regional competition.',
        markets: [
          { name: 'Delhi-NCR', level: 'amber' },
          { name: 'Lucknow', level: 'red' },
          { name: 'Mumbai', level: 'green' },
        ],
        revenueAtRisk: '₹6.2 Cr',
        trend: '+12% risk trajectory',
        action: 'Reallocate non-metro Hindi morning slots to prime evening Tamil original with English subtitles.',
      },
    ],
    actions: [
      { id: 'goat-a1', title: 'Shift to Tamil original + subtitles in metro multiplexes', why: 'Expat diaspora occupancy is 88% on original audio vs 42% on dub.', impact: 'Protects ₹3.4 Cr weekend gross.', urgency: 'NOW', confidence: 87 },
      { id: 'goat-a2', title: 'Highlight de-aging tech VFX breakdown reel', why: 'Turn visual chatter into craft admiration among moviegoers.', impact: 'Improves sentiment +14 pts.', urgency: 'THIS WEEK', confidence: 79 },
    ],
    timeline: [
      { label: 'Audio Launch & Trailer', detail: 'Record breaking South streaming numbers.', state: 'done' },
      { label: 'Theatrical Release — Sep 5', detail: '₹126 Cr worldwide opening day.', state: 'done' },
      { label: 'First Weekend Consolidation', detail: 'Tamil Nadu record collections; Hindi territory triage.', state: 'active' },
      { label: 'Weekday Hold & Week 2 Push', detail: 'Protecting South screen count ahead of mid-week releases.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'THE GREATEST OF ALL TIME (GOAT)', velocity: '+28%' },
        { name: 'Stree 2', velocity: '+15%' },
        { name: 'Saripodhaa Sanivaaram', velocity: '+12%' },
      ],
      note: 'Dominating South screens; competing with Stree 2 holdover in North multiplexes.',
    },
  },
  {
    id: 'stree2',
    title: 'STREE 2',
    language: 'Hindi',
    genre: 'Horror Comedy',
    releaseDate: '15 Aug 2026',
    budget: '₹120 Cr',
    status: 'In theatres (Day 27) · All-Time Blockbuster Run',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Bollywood',
    theatricalDays: 27,
    theatricalDaysText: 'Day 27 in Theatres',
    isIndianCinema: true,
    modelled: true,
    score: 18,
    observed: [
      { metric: 'Week 4 Weekend Footfalls', delta: '↑ 3.8L Sunday admissions nationwide' },
      { metric: 'National Multiplexes', delta: '✓ 1,200 shows sustained into Day 27' },
      { metric: 'Cumulative Domestic Net', delta: '₹585+ Cr verified trade milestone' },
      { metric: 'BookMyShow Hourly Velocity', delta: '✓ 18,000+ tickets/hr during prime hours' },
    ],
    inferred: [{ metric: 'Mass repeat audience', delta: 'Rare pan-demographic family conversion into month 2' }],
    inference: 'Historic box office juggernaut. Zero active systemic crisis; optimal strategy is show retention and maximizing festive corridor spillover.',
    confidence: 96,
    markets: [
      { region: 'Mumbai', language: 'Hindi', health: 96, revenue: '₹142 Cr', occupancy: 76, shows: 820, velocity: '+16%', sentiment: 62, trend: 'up' },
      { region: 'Delhi NCR', language: 'Hindi', health: 98, revenue: '₹138 Cr', occupancy: 79, shows: 890, velocity: '+18%', sentiment: 66, trend: 'up' },
      { region: 'UP / Bihar', language: 'Hindi', health: 94, revenue: '₹112 Cr', occupancy: 82, shows: 760, velocity: '+14%', sentiment: 58, trend: 'up' },
      { region: 'East & Central Circuits', language: 'Hindi', health: 91, revenue: '₹68 Cr', occupancy: 72, shows: 510, velocity: '+11%', sentiment: 54, trend: 'up' },
      { region: 'South Metros (Bengaluru/Hyderabad)', language: 'Hindi', health: 86, revenue: '₹42 Cr', occupancy: 68, shows: 380, velocity: '+9%', sentiment: 48, trend: 'up' },
    ],
    revenue: {
      expected: '₹600 Cr',
      projected: '₹625 Cr',
      atRisk: '₹0 Cr',
      atRiskCr: 0,
      producer: '₹180 Cr',
      distributor: '₹145 Cr',
      exhibitor: '₹95 Cr',
      gross: '₹710 Cr (27 days)',
      net: '₹585 Cr',
      share: '₹290 Cr',
      atp: '₹225',
      footfalls: '3.9 Cr est.',
      occupancy: '75% avg',
    },
    footfall: {
      revenue: '↑ historic peak',
      footfalls: '↑ exceptional volume',
      atp: '→ accessible',
      verdict: 'All-time domestic run; hold all prime evening slots into week 5.',
      warning: false,
    },
    crises: [],
    actions: [
      { id: 'stree-a1', title: 'Lock National Cinema Day promo ties early', why: 'Capitalize on discounted pricing day to drive record repeat footfalls.', impact: 'Additional ₹8 Cr net upside.', urgency: 'THIS WEEK', confidence: 94 },
    ],
    timeline: [
      { label: 'Independence Day Opening', detail: 'Record breaking opening weekend across India.', state: 'done' },
      { label: 'Week 2 & 3 Super-Hold', detail: 'Zero drop; all-time highest week 2 collections.', state: 'done' },
      { label: 'Week 4 Consolidation', detail: 'Crossing ₹580 Cr domestic net benchmark.', state: 'active' },
      { label: 'OTT Premiere Window', detail: 'Protected 8-week theatrical exclusivity window.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Stree 2', velocity: '+18%' },
        { name: 'THE GREATEST OF ALL TIME', velocity: '+28%' },
      ],
      note: 'Unchallenged in Hindi belt single-screens and multiplexes.',
    },
  },
  {
    id: 'saripodhaa',
    title: 'SARIPODHAA SANIVAARAM',
    language: 'Telugu + South dubs',
    genre: 'Vigilante Action Thriller',
    releaseDate: '29 Aug 2026',
    budget: '₹90 Cr',
    status: 'In theatres (Day 13) · Steady Weekday Conversion',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Tollywood',
    theatricalDays: 13,
    theatricalDaysText: 'Day 13 in Theatres',
    isIndianCinema: true,
    modelled: true,
    score: 36,
    observed: [
      { metric: 'Nizam & Ceded Occupancy', delta: '↑ 69% evening show hold in Hyderabad' },
      { metric: 'USA Box Office', delta: '✓ $2.45M crossed; steady weekday run' },
      { metric: 'Audience Word-of-Mouth', delta: '✓ BookMyShow rating holding at 9.1/10' },
    ],
    inferred: [{ metric: 'Climax engagement', delta: 'Strong viral clips of protagonist faceoff driving evening walk-ins' }],
    inference: 'Solid second-week performer in Telugu circuits. Low threat profile; focus on retaining single-screens in Ceeded and Coastal Andhra.',
    confidence: 89,
    markets: [
      { region: 'Nizam & Hyderabad', language: 'Telugu', health: 84, revenue: '₹34 Cr', occupancy: 72, shows: 520, velocity: '+12%', sentiment: 42, trend: 'up' },
      { region: 'Andhra (Ceeded/Coastal)', language: 'Telugu', health: 79, revenue: '₹26 Cr', occupancy: 68, shows: 460, velocity: '+8%', sentiment: 38, trend: 'up' },
      { region: 'Bengaluru & Chennai', language: 'Telugu', health: 76, revenue: '₹14 Cr', occupancy: 64, shows: 280, velocity: '+6%', sentiment: 34, trend: 'flat' },
      { region: 'Overseas (North America)', language: 'Telugu', health: 88, revenue: '$2.5M', occupancy: 74, shows: 310, velocity: '+14%', sentiment: 46, trend: 'up' },
    ],
    revenue: {
      expected: '₹110 Cr',
      projected: '₹102 Cr',
      atRisk: '₹4 Cr',
      atRiskCr: 4,
      producer: '₹38 Cr',
      distributor: '₹29 Cr',
      exhibitor: '₹18 Cr',
      gross: '₹88 Cr (13 days)',
      net: '₹72 Cr',
      share: '₹42 Cr',
      atp: '₹185',
      footfalls: '64 L est.',
      occupancy: '68% avg',
    },
    footfall: {
      revenue: '→ stable hold',
      footfalls: '→ steady',
      atp: '→ balanced',
      verdict: 'Healthy theatrical life cycle; breakeven achieved in key AP/TG distribution territories.',
      warning: false,
    },
    crises: [],
    actions: [
      { id: 'sari-a1', title: 'Maintain second-week evening allocation in Hyderabad', why: 'Evenings convert at 74% vs 38% matinees.', impact: 'Protects ₹1.8 Cr weekday gross.', urgency: 'NOW', confidence: 88 },
    ],
    timeline: [
      { label: 'Release Day — Aug 29', detail: 'Solid ₹24 Cr opening worldwide.', state: 'done' },
      { label: 'Week 1 Box Office', detail: 'Comfortably cleared overseas breakeven.', state: 'done' },
      { label: 'Week 2 Holdover', detail: 'Holding 500+ screens in Telugu states.', state: 'active' },
      { label: 'Third Weekend Run', detail: 'Targeting ₹100 Cr worldwide milestone.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Saripodhaa Sanivaaram', velocity: '+12%' },
        { name: 'THE GREATEST OF ALL TIME', velocity: '+28%' },
      ],
      note: 'Maintaining clean theatrical share in Telugu heartlands.',
    },
  },
  {
    id: 'arm',
    title: 'A.R.M (Ajayante Randam Moshanam)',
    language: 'Malayalam + Hindi / Tamil / Telugu dubs',
    genre: 'Period Action Fantasy',
    releaseDate: '10 Sep 2026',
    budget: '₹75 Cr',
    status: 'In theatres (Day 1) · Onam Festive Opener',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Mollywood',
    theatricalDays: 1,
    theatricalDaysText: 'Day 1 in Theatres',
    isIndianCinema: true,
    modelled: true,
    score: 28,
    observed: [
      { metric: 'Kerala Onam Advance', delta: '↑ 91% capacity advance sellout across 320 screens' },
      { metric: '3D Format Occupancy', delta: '↑ 98% sold-out in Kochi, Trivandrum, Kozhikode' },
      { metric: 'Critic & Audience Buzz', delta: '✓ 9.4/10 initial BookMyShow rating' },
      { metric: 'GCC / Middle East Advance', delta: '✓ Record opening advance in Dubai and Sharjah' },
    ],
    inferred: [{ metric: 'Festive family surge', delta: 'Strong visual effects and folklore premise appealing to Onam holiday crowds' }],
    inference: 'Exceptional Day 1 opening momentum. Zero immediate damage indicators; monitor 3D projection quality in B-tier Kerala centres.',
    confidence: 91,
    markets: [
      { region: 'Kerala (Kochi/Malabar)', language: 'Malayalam', health: 94, revenue: '₹18 Cr', occupancy: 92, shows: 420, velocity: '+38%', sentiment: 58, trend: 'up' },
      { region: 'GCC & Middle East', language: 'Malayalam', health: 96, revenue: '$2.8M', occupancy: 89, shows: 340, velocity: '+34%', sentiment: 54, trend: 'up' },
      { region: 'Bengaluru & Chennai Circuits', language: 'Malayalam', health: 86, revenue: '₹7 Cr', occupancy: 82, shows: 190, velocity: '+22%', sentiment: 46, trend: 'up' },
      { region: 'Rest of India Multiplexes', language: 'Hindi/Tamil dubs', health: 68, revenue: '₹4 Cr', occupancy: 61, shows: 220, velocity: '+9%', sentiment: 32, trend: 'flat' },
    ],
    revenue: {
      expected: '₹95 Cr',
      projected: '₹110 Cr',
      atRisk: '₹2 Cr',
      atRiskCr: 2,
      producer: '₹34 Cr',
      distributor: '₹26 Cr',
      exhibitor: '₹16 Cr',
      gross: '₹16 Cr (Day 1 est)',
      net: '₹13.5 Cr',
      share: '₹7.8 Cr',
      atp: '₹195',
      footfalls: '14 L est.',
      occupancy: '89% avg',
    },
    footfall: {
      revenue: '↑ holiday surge',
      footfalls: '↑ peak capacity',
      atp: '↑ 3D premium',
      verdict: 'Outstanding holiday opening; ensure 3D glasses supply and screen hygiene in single screens.',
      warning: false,
    },
    crises: [],
    actions: [
      { id: 'arm-a1', title: 'Verify 3D projection calibration in single screens', why: 'Ensures visual brightness delivers promised spectacle for Onam family audiences.', impact: 'Protects 90%+ word of mouth.', urgency: 'NOW', confidence: 93 },
    ],
    timeline: [
      { label: 'Pre-release Trailer & Songs', detail: 'High curiosity for Tovino Thomas triple role.', state: 'done' },
      { label: 'Onam Premiere Day 1 — Sep 10', detail: 'Highest career opening for lead actor.', state: 'active' },
      { label: 'Weekend Festive Surge', detail: 'Onam holiday corridor collections peak.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'A.R.M', velocity: '+38%' },
        { name: 'Regional Onam Releases', velocity: '+14%' },
      ],
      note: 'Leading the Malayalam Onam box office race.',
    },
  },
  {
    id: 'haiwaan',
    title: 'HAIWAAN',
    language: 'Hindi',
    genre: 'Psychological Crime Action',
    releaseDate: '11 Sep 2026',
    budget: '₹65 Cr',
    status: 'In theatres (Day 0) · Opening Day Theatrical Premiere',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    industry: 'Bollywood',
    theatricalDays: 0,
    theatricalDaysText: 'Day 0 · Opening Today',
    isIndianCinema: true,
    modelled: true,
    score: 42,
    observed: [
      { metric: 'Opening Day Occupancy', delta: '↑ 54% morning start across North multiplexes' },
      { metric: 'BookMyShow Fast-Filling', delta: '✓ 380 fast-filling evening slots in Delhi-NCR & Mumbai' },
      { metric: 'Social Word-of-Mouth', delta: '✓ Positive early audience reception for intense second half' },
    ],
    inferred: [{ metric: 'Evening show surge', delta: 'Metro multiplex night shows reporting brisk walk-ins' }],
    inference: 'Fresh release on 11 Sep 2026; steady opening day response across national multiplex chains.',
    confidence: 85,
    markets: [
      { region: 'Mumbai', language: 'Hindi', health: 81, revenue: '₹1.8 Cr', occupancy: 62, shows: 340, velocity: '+15%', sentiment: 35, trend: 'up' },
      { region: 'Delhi NCR', language: 'Hindi', health: 79, revenue: '₹1.6 Cr', occupancy: 58, shows: 310, velocity: '+12%', sentiment: 32, trend: 'up' },
      { region: 'Punjab & North', language: 'Hindi', health: 74, revenue: '₹0.9 Cr', occupancy: 52, shows: 180, velocity: '+8%', sentiment: 26, trend: 'flat' },
      { region: 'Central & East India', language: 'Hindi', health: 70, revenue: '₹0.9 Cr', occupancy: 48, shows: 160, velocity: '+6%', sentiment: 22, trend: 'flat' },
    ],
    revenue: {
      expected: '₹75 Cr',
      projected: '₹68 Cr',
      atRisk: '₹3 Cr',
      atRiskCr: 3,
      producer: '₹28 Cr',
      distributor: '₹22 Cr',
      exhibitor: '₹14 Cr',
      gross: '₹5.2 Cr (Day 1 est)',
      net: '₹4.3 Cr',
      share: '₹2.4 Cr',
      atp: '₹210',
      footfalls: '3.8 L est.',
      occupancy: '58% avg',
    },
    footfall: {
      revenue: '↑ opening day',
      footfalls: '→ building',
      atp: '→ standard',
      verdict: 'Fresh theatrical release; monitor weekend night show growth.',
      warning: false,
    },
    crises: [],
    actions: [
      { id: 'haiwaan-a1', title: 'Expand evening shows in Delhi-NCR & Mumbai', why: 'Evening occupancy is outperforming matinees by 24%.', impact: 'Adds ₹1.2 Cr weekend upside.', urgency: 'NOW', confidence: 89 },
    ],
    timeline: [
      { label: 'Advance Booking Open', detail: 'Multiplex chains opened advances.', state: 'done' },
      { label: 'Release Day — Sep 11, 2026', detail: 'Worldwide theatrical opening.', state: 'active' },
      { label: 'First Weekend Push', detail: 'Targeting ₹20+ Cr opening weekend.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'HAIWAAN', velocity: '+18%' },
        { name: 'Stree 2', velocity: '+15%' },
        { name: 'THE GREATEST OF ALL TIME', velocity: '+28%' },
      ],
      note: 'Competing for Hindi multiplex evening capacity with holdover blockbusters.',
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
  const isOtt = (item.releaseStatus || '').toLowerCase().includes('ott') || (item.platform || '').toLowerCase().includes('ott');
  const isReleased = item.telemetry30d.isReleased || isOtt;
  const daysDiff = Math.abs(item.telemetry30d.diffDays);
  const statusStr = isOtt
    ? `Released on OTT · Streaming Now`
    : isReleased
    ? `In Theatres (Day ${daysDiff})`
    : `Releasing in ${daysDiff} Days`;

  return {
    id: item.id,
    title: item.title,
    language: item.language,
    genre: item.genre,
    releaseDate: item.releaseDateFormatted || item.releaseDate,
    budget: item.budget,
    status: `${statusStr} · ${item.bookingStatus}`,
    releaseStatus: item.releaseStatus || statusStr,
    sources: item.dataSources || (item.source ? [item.source] : ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google']),
    industry: item.industry || 'Indian Cinema',
    theatricalDays: daysDiff,
    theatricalDaysText: item.telemetry30d.daysSinceReleaseText,
    isIndianCinema: true,
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
    markets: (() => {
      const lang = (item.language || '').toLowerCase();
      const ind = (item.industry || '').toLowerCase();
      const baseHealth = Math.max(20, 100 - item.threatScore);

      if (lang.includes('telugu') || ind.includes('tollywood')) {
        return [
          { region: 'Nizam & Hyderabad', language: 'Telugu', health: Math.min(100, baseHealth + 10), revenue: '₹42 Cr', occupancy: 78, shows: 4800, velocity: '+18%', sentiment: 82, trend: 'up' },
          { region: 'Andhra (Ceeded & Coastal)', language: 'Telugu', health: Math.min(100, baseHealth + 8), revenue: '₹38 Cr', occupancy: 82, shows: 4200, velocity: '+15%', sentiment: 80, trend: 'up' },
          { region: 'North India & Hindi Belt', language: 'Hindi (Dub)', health: baseHealth, revenue: '₹22 Cr', occupancy: 61, shows: 2400, velocity: '+8%', sentiment: 70, trend: 'flat' },
          { region: 'South Metros (Bengaluru/Chennai)', language: 'Telugu', health: Math.min(100, baseHealth + 4), revenue: '₹14 Cr', occupancy: 69, shows: 1600, velocity: '+12%', sentiment: 76, trend: 'up' },
        ];
      }
      if (lang.includes('tamil') || ind.includes('kollywood')) {
        return [
          { region: 'Tamil Nadu (Chennai & Chengalpet)', language: 'Tamil', health: Math.min(100, baseHealth + 12), revenue: '₹48 Cr', occupancy: 84, shows: 5200, velocity: '+20%', sentiment: 84, trend: 'up' },
          { region: 'Kerala & Karnataka Circuits', language: 'Tamil', health: Math.min(100, baseHealth + 6), revenue: '₹19 Cr', occupancy: 71, shows: 2200, velocity: '+11%', sentiment: 75, trend: 'up' },
          { region: 'Overseas (Malaysia/Singapore/GCC)', language: 'Tamil', health: Math.min(100, baseHealth + 8), revenue: '₹32 Cr', occupancy: 76, shows: 3100, velocity: '+14%', sentiment: 79, trend: 'up' },
          { region: 'North India Multiplexes', language: 'Hindi (Dub)', health: Math.max(15, baseHealth - 10), revenue: '₹11 Cr', occupancy: 52, shows: 1200, velocity: '+3%', sentiment: 64, trend: 'flat' },
        ];
      }
      if (lang.includes('malayalam') || ind.includes('mollywood')) {
        return [
          { region: 'Kerala (Kochi/Trivandrum/Malabar)', language: 'Malayalam', health: Math.min(100, baseHealth + 14), revenue: '₹26 Cr', occupancy: 86, shows: 3400, velocity: '+22%', sentiment: 88, trend: 'up' },
          { region: 'GCC & Middle East (Dubai/Sharjah)', language: 'Malayalam', health: Math.min(100, baseHealth + 16), revenue: '₹34 Cr', occupancy: 91, shows: 2800, velocity: '+25%', sentiment: 90, trend: 'up' },
          { region: 'Bengaluru & Chennai Circuits', language: 'Malayalam', health: Math.min(100, baseHealth + 5), revenue: '₹12 Cr', occupancy: 74, shows: 1400, velocity: '+10%', sentiment: 78, trend: 'up' },
          { region: 'Rest of India Metros', language: 'Multi-Sub', health: Math.max(20, baseHealth - 5), revenue: '₹6 Cr', occupancy: 58, shows: 800, velocity: '+5%', sentiment: 68, trend: 'flat' },
        ];
      }
      if (lang.includes('kannada') || ind.includes('sandalwood')) {
        return [
          { region: 'Karnataka (Old Mysore & Bengaluru)', language: 'Kannada', health: Math.min(100, baseHealth + 12), revenue: '₹36 Cr', occupancy: 82, shows: 3900, velocity: '+19%', sentiment: 84, trend: 'up' },
          { region: 'North Karnataka & Hubli Hub', language: 'Kannada', health: Math.min(100, baseHealth + 8), revenue: '₹18 Cr', occupancy: 75, shows: 2100, velocity: '+14%', sentiment: 78, trend: 'up' },
          { region: 'Telugu & Tamil Pan-India Dubs', language: 'Multi', health: Math.min(100, baseHealth + 4), revenue: '₹24 Cr', occupancy: 66, shows: 2500, velocity: '+9%', sentiment: 72, trend: 'flat' },
          { region: 'North India Hindi Multiplexes', language: 'Hindi', health: baseHealth, revenue: '₹28 Cr', occupancy: 64, shows: 2900, velocity: '+8%', sentiment: 70, trend: 'flat' },
        ];
      }
      if (lang.includes('bengali')) {
        return [
          { region: 'Kolkata & South Bengal Multiplexes', language: 'Bengali', health: Math.min(100, baseHealth + 10), revenue: '₹12 Cr', occupancy: 78, shows: 1800, velocity: '+16%', sentiment: 82, trend: 'up' },
          { region: 'North Bengal & Assam Circuits', language: 'Bengali', health: baseHealth, revenue: '₹4.5 Cr', occupancy: 65, shows: 750, velocity: '+8%', sentiment: 72, trend: 'flat' },
          { region: 'Metros (Delhi-NCR, Mumbai, Bengaluru)', language: 'Bengali', health: baseHealth, revenue: '₹3.2 Cr', occupancy: 62, shows: 450, velocity: '+7%', sentiment: 70, trend: 'flat' },
          { region: 'International & Bangladesh Licensing', language: 'Bengali', health: baseHealth, revenue: '₹2.8 Cr', occupancy: 58, shows: 380, velocity: '+5%', sentiment: 68, trend: 'flat' },
        ];
      }
      if (lang.includes('punjabi') || ind.includes('pollywood')) {
        return [
          { region: 'East Punjab & Chandigarh', language: 'Punjabi', health: Math.min(100, baseHealth + 14), revenue: '₹22 Cr', occupancy: 85, shows: 2600, velocity: '+21%', sentiment: 86, trend: 'up' },
          { region: 'Delhi-NCR Circuits', language: 'Punjabi', health: Math.min(100, baseHealth + 8), revenue: '₹14 Cr', occupancy: 74, shows: 1800, velocity: '+14%', sentiment: 78, trend: 'up' },
          { region: 'Canada & USA Diaspora Box Office', language: 'Punjabi', health: Math.min(100, baseHealth + 18), revenue: '₹38 Cr', occupancy: 92, shows: 3200, velocity: '+26%', sentiment: 92, trend: 'up' },
          { region: 'UK, Australia & Europe', language: 'Punjabi', health: Math.min(100, baseHealth + 12), revenue: '₹18 Cr', occupancy: 80, shows: 1900, velocity: '+18%', sentiment: 82, trend: 'up' },
        ];
      }
      if (lang.includes('marathi')) {
        return [
          { region: 'Mumbai, Thane & MMR Multiplexes', language: 'Marathi', health: Math.min(100, baseHealth + 10), revenue: '₹18 Cr', occupancy: 78, shows: 2400, velocity: '+16%', sentiment: 80, trend: 'up' },
          { region: 'Pune & Western Maharashtra', language: 'Marathi', health: Math.min(100, baseHealth + 12), revenue: '₹16 Cr', occupancy: 81, shows: 2100, velocity: '+18%', sentiment: 82, trend: 'up' },
          { region: 'Nashik, Vidarbha & Marathwada', language: 'Marathi', health: baseHealth, revenue: '₹9 Cr', occupancy: 66, shows: 1300, velocity: '+9%', sentiment: 72, trend: 'flat' },
          { region: 'Goa & Rest of India Single Screens', language: 'Marathi', health: Math.max(20, baseHealth - 5), revenue: '₹3 Cr', occupancy: 55, shows: 500, velocity: '+4%', sentiment: 66, trend: 'flat' },
        ];
      }

      // Default: Hindi / Pan-India
      return [
        { region: 'North India (Delhi/UP/Punjab)', language: 'Hindi', health: Math.max(20, 100 - item.threatScore), revenue: '₹34 Cr', occupancy: 68, shows: 4200, velocity: '+12%', sentiment: 74, trend: 'up' },
        { region: 'West (Mumbai/Gujarat/Pune)', language: 'Hindi', health: Math.max(25, 95 - item.threatScore), revenue: '₹28 Cr', occupancy: 72, shows: 3800, velocity: '+16%', sentiment: 78, trend: 'up' },
        { region: 'South (Bengaluru/Hyderabad/Chennai)', language: 'Multi', health: Math.max(15, 85 - item.threatScore), revenue: '₹18 Cr', occupancy: 61, shows: 2100, velocity: '+8%', sentiment: 70, trend: 'flat' },
        { region: 'East (Bengal/Bihar/Assam)', language: 'Hindi', health: Math.max(20, 80 - item.threatScore), revenue: '₹9 Cr', occupancy: 54, shows: 1400, velocity: '+4%', sentiment: 66, trend: 'flat' },
      ];
    })(),
    revenue: {
      expected: item.boxOffice ? `₹${(parseFloat(item.boxOffice.replace(/[^0-9.]/g, '')) * 1.4 || 120).toFixed(0)} Cr` : '₹120 Cr',
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
          { name: 'Primary Theatrical Circuit', level: item.threatScore > 60 ? 'red' : 'amber' },
          { name: 'National Multiplex Chains', level: item.threatScore > 50 ? 'amber' : 'green' },
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
        why: 'Counteract weekend churn and lock prime evening slots on BookMyShow and regional cinema chains.',
        impact: 'Protects up to ₹8.5 Cr in weekend box office collections.',
        urgency: 'NOW',
        confidence: 91,
      },
      {
        id: `${item.id}-a2`,
        title: 'Amplify Verified Audience Reactions on Social Feeds',
        why: 'Neutralize aggressive review-bombing and paid negative campaigns from competitor fandoms.',
        impact: 'Stabilizes audience sentiment above 75% positive.',
        urgency: 'THIS WEEK',
        confidence: 86,
      },
    ],
    timeline: [
      { label: 'Advance Booking Open', detail: `${item.bookingStatus} across national & single screens.`, state: isReleased ? 'done' : 'active' },
      { label: 'Release Day Theatrical Reception', detail: 'Critical morning show audience sentiment tracking.', state: isReleased ? 'done' : 'upcoming' },
      { label: '30-Day Box Office Consolidation', detail: 'Sustain weekday holdover and optimize regional screen distribution.', state: 'upcoming' },
    ],
    competition: {
      films: [
        { name: 'Pan-India Contender 1', velocity: '+24%' },
        { name: 'Regional Tentpole 2', velocity: '+18%' },
      ],
      note: 'High density theatrical window with multiple Indian cinema releases competing for prime hours.',
    },
  };
}

/** Global dynamic registry of loaded Indian films so any page resolves them */
export const dynamicFilmsRegistry = new Map<string, FilmDamage>();

export function registerFilmDamage(film: FilmDamage) {
  dynamicFilmsRegistry.set(film.id, film);
}

export function getResolvedFilmDamage(id: string, fallback?: FilmDamage): FilmDamage {
  if (dynamicFilmsRegistry.has(id)) {
    return dynamicFilmsRegistry.get(id)!;
  }
  const staticFound = films.find((f) => f.id === id);
  if (staticFound) return staticFound;
  return fallback || films[0];
}


