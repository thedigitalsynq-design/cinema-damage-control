import { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { GIcon } from './GIcon';
import { useProject } from './ProjectContext';
import { useRoom } from './RoomState';
import { useToast } from './Toaster';
import { films, getResolvedFilmDamage } from '../data/damage';

export type ThreatVector = 'theatrical' | 'piracy' | 'boycott' | 'exhibitor';

interface VectorOption {
  id: ThreatVector;
  title: string;
  subtitle: string;
  icon: string;
  severity: string;
  metric: string;
  ritualName: string;
  ritualItems: {
    name: string;
    type: string;
    volume: string;
    desc: string;
  }[];
  recoveryPct: number;
  preservedRevenue: string;
}

const VECTOR_OPTIONS: VectorOption[] = [
  {
    id: 'theatrical',
    title: 'Theatrical Box Office Shock',
    subtitle: 'Multiplex walkouts & rapid advance booking drop',
    icon: 'theaters',
    severity: 'High Drop',
    metric: '-38% d-o-d',
    ritualName: 'Theatrical Velocity Restoration Ritual',
    ritualItems: [
      { name: 'EXHIBITOR REBATE', type: 'Subsidy Protocol', volume: '100ml / ₹4 Cr', desc: 'Instant 20% distributor margin offset for morning shows' },
      { name: 'FLASH BOGO ELIXIR', type: 'Ticketing Booster', volume: '50ml / BookMyShow', desc: 'Targeted buy-1-get-1 in vulnerable regional metros' },
      { name: 'FANS FIRST CUT', type: 'Content Serum', volume: '30ml / Social Drop', desc: 'Exclusive behind-the-scenes mass hero action sequence' },
    ],
    recoveryPct: 44,
    preservedRevenue: '₹14.2 Cr',
  },
  {
    id: 'piracy',
    title: 'Pre-Release HD Leak Breach',
    subtitle: 'Uncut sequence & camrip leak circulating on Telegram/X',
    icon: 'shield',
    severity: 'Critical Leak',
    metric: '8.4k links active',
    ritualName: 'Digital Copyright DMCA Killswitch',
    ritualItems: [
      { name: 'RADAR CEASE & DESIST', type: 'Legal Tonic', volume: 'High Court / John Doe', desc: 'Algorithmic hash takedown across 14 cloud cyberlockers' },
      { name: 'TELEGRAM CLUSTER PURGE', type: 'Channel Neutralizer', volume: 'Tier-1 API', desc: 'Automated token suspension of 28 pirated syndicates' },
      { name: 'THEATRE WATERMARK AUDIT', type: 'Forensic Tracer', volume: 'DCP Fingerprint', desc: 'Identifies originating projection room leak in 90 mins' },
    ],
    recoveryPct: 62,
    preservedRevenue: '₹22.5 Cr',
  },
  {
    id: 'boycott',
    title: 'Coordinated Boycott & Fandom Fire',
    subtitle: 'Polarized ideological hashtag campaign targeting lead cast',
    icon: 'local_fire_department',
    severity: 'Severe Social',
    metric: '-64% sentiment',
    ritualName: 'Narrative Counter-Firewall Ritual',
    ritualItems: [
      { name: 'NEUTRAL INFLUENCER SURGE', type: 'Organic Essence', volume: '40 Verified Voices', desc: 'Non-partisan cinema craft appreciation interviews' },
      { name: 'DIRECTOR PRESS EMBARGO', type: 'Clarification Balm', volume: 'Press Conf Briefing', desc: 'Contextual video addressing dialogue misinformation' },
      { name: 'COMMUNITY FANDOM BOOST', type: 'Grassroots Catalyst', volume: 'Mega Fan Clubs', desc: 'Coordinated celebration parades & charity ticket drives' },
    ],
    recoveryPct: 51,
    preservedRevenue: '₹18.8 Cr',
  },
  {
    id: 'exhibitor',
    title: 'Regional Exhibitor Settlement Revolt',
    subtitle: 'Single-screen theatre owners demanding MG guarantee renegotiation',
    icon: 'handshake',
    severity: 'Territorial Risk',
    metric: '4 key circuits',
    ritualName: 'Distributor Conciliation & Safety Protocol',
    ritualItems: [
      { name: 'TERRITORY RELIEF FUND', type: 'Financial Shield', volume: 'Nizam & Ceded Pack', desc: 'Dynamic cap on minimum guarantees with variable spillover' },
      { name: 'ADDITIONAL SHOW PERMIT', type: 'Midnight Waiver', volume: '4 AM Shows', desc: 'Special government clearance for early morning screenings' },
      { name: 'THEATRE PROMO SUBSIDY', type: 'Standee & Cutout Pack', volume: 'B&C Mass Circuits', desc: '100% reimbursed theatrical marketing display units' },
    ],
    recoveryPct: 39,
    preservedRevenue: '₹9.6 Cr',
  },
];

export function BlendedWorkflowEngine({ onDeployComplete }: { onDeployComplete?: () => void }) {
  const { project, setActiveId } = useProject();
  const { apply } = useRoom();
  const toast = useToast();

  const [selectedVector, setSelectedVector] = useState<ThreatVector>('piracy');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(2);

  const activeOption = VECTOR_OPTIONS.find((v) => v.id === selectedVector) || VECTOR_OPTIONS[0];

  // Resolve current film
  const currentFilmDamage = getResolvedFilmDamage(project.id) || films.find((f) => f.id === project.id) || films[0];

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setDeployed(true);
      apply('plan');
      apply('takedown');
      toast(
        `Damage Control Ritual deployed! ${activeOption.ritualName} active with +${activeOption.recoveryPct}% projected recovery.`,
        'success'
      );
      if (onDeployComplete) onDeployComplete();
    }, 1200);
  };

  return (
    <div className="relative mb-8 overflow-hidden rounded-[32px] p-1 sm:p-2">
      {/* Outer ambient glow backlight */}
      <div className="absolute -inset-1 rounded-[36px] blur-2xl opacity-50 transition-all duration-700 pointer-events-none bg-gradient-to-r from-[#ff7b29]/20 via-[#ff9f43]/15 to-[#ff5f56]/10" />

      {/* Main Container blending Vision Pro glass + Obsidian Step Pipeline */}
      <div className="relative rounded-[28px] border border-white/10 bg-black/80 backdrop-blur-3xl p-5 sm:p-8 text-white shadow-2xl">
        {/* Top Header with Workflow Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="window-dots">
              <span className="window-dot window-dot-red" />
              <span className="window-dot window-dot-yellow" />
              <span className="window-dot window-dot-green" />
            </div>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#ff9f43]">
              WAR ROOM DIAGNOSTIC PIPELINE
            </span>
            <span className="hidden sm:inline-block rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[10px] font-medium text-war-text-muted">
              Spatial Glass × Luminous Circuit Architecture
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#ff9f43]" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-300">Obsidian Studio Active</span>
          </div>
        </div>

        {/* 3-Step Connected Journey Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 relative">
          
          {/* ============================================================ */}
          {/* STEP 1: THE RADAR / FILM TRIAGE CARD */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 flex flex-col relative">
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveStep(1)}
              className={clsx(
                'blended-card flex-1 p-5 sm:p-6 cursor-pointer flex flex-col justify-between transition-all duration-300',
                activeStep === 1 ? 'circuit-active-border' : 'hover:border-white/20'
              )}
            >
              <div>
                {/* Window Chrome Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="window-dots">
                    <span className="window-dot window-dot-red" />
                    <span className="window-dot window-dot-yellow" />
                    <span className="window-dot window-dot-green" />
                  </div>
                  <span className="rounded-full bg-[#ff7b29]/15 border border-[#ff7b29]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#ff9f43] uppercase tracking-wider">
                    STEP 1
                  </span>
                </div>

                <h3 className="text-[20px] font-bold tracking-tight text-white mt-2">
                  The Threat Radar
                </h3>
                <p className="text-[13px] text-war-text-secondary mt-1">
                  Which cinematic release requires immediate crisis triage?
                </p>

                {/* Tactile Holographic Film Screen inspired by Image 1's pastel mesh tile & Image 2's organic dark shape */}
                <div className="relative my-4 overflow-hidden rounded-[20px] border border-white/10 p-4 bg-gradient-to-br from-white/[0.06] via-transparent to-[#ff7b29]/10">
                  {/* Subtle iridescent background shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#f472b6]/10 via-[#818cf8]/10 to-[#38bdf8]/10 opacity-70 pointer-events-none" />
                  
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-war-text-muted">Target Film</div>
                      <div className="text-[18px] font-bold text-white tracking-tight">{project.title}</div>
                      <div className="text-[11px] text-war-text-muted mt-0.5">{project.subtitle || 'Indian Cinema • Nationwide Release'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-war-text-muted">Damage Index</div>
                      <div className={clsx(
                        'text-[22px] font-extrabold tabular-nums tracking-tight',
                        (currentFilmDamage?.score || 64) > 60 ? 'text-[#ff6961]' : 'text-[#ffb340]'
                      )}>
                        {currentFilmDamage?.score || 64}<span className="text-[12px] font-normal text-war-text-muted">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* 3D Tactile Push Sphere / Status Knob from Image 1 */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full tactile-knob flex items-center justify-center text-black font-bold text-[10px] shadow">
                        ●
                      </div>
                      <span className="text-[11px] font-medium text-white">Continuous Live Telemetry</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#30d158]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] animate-pulse" />
                      ACTIVE FEED
                    </span>
                  </div>
                </div>

                {/* Quick film switch chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold tracking-wider text-war-text-muted uppercase">Quick Switch Released Films</span>
                  <div className="flex flex-wrap gap-1.5">
                    {films.slice(0, 4).map((f) => (
                      <button
                        key={f.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveId(f.id);
                          toast(`Focused on ${f.title}`, 'info');
                        }}
                        className={clsx(
                          'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                          project.id === f.id
                            ? 'bg-white text-black shadow font-bold'
                            : 'bg-white/[0.05] text-war-text-secondary hover:bg-white/[0.1] hover:text-white'
                        )}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-war-text-muted">
                <span>Signal verified via BookMyShow & X</span>
                <GIcon name="arrow_forward" size={14} className="text-[#ff9f43]" />
              </div>
            </motion.div>

            {/* Glowing Circuit Trace line connecting Step 1 to Step 2 (Desktop SVG) */}
            <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" className="overflow-visible">
                <line x1="0" y1="12" x2="24" y2="12" className="glowing-circuit-path" />
                <circle cx="24" cy="12" r="4" className="circuit-pulse-node" />
              </svg>
            </div>
          </div>

          {/* ============================================================ */}
          {/* STEP 2: THREAT VECTOR DIAGNOSTICS */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 flex flex-col relative">
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveStep(2)}
              className={clsx(
                'blended-card flex-1 p-5 sm:p-6 cursor-pointer flex flex-col justify-between transition-all duration-300',
                activeStep === 2 ? 'circuit-active-border' : 'hover:border-white/20'
              )}
            >
              <div>
                {/* Window Chrome Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="window-dots">
                    <span className="window-dot window-dot-red" />
                    <span className="window-dot window-dot-yellow" />
                    <span className="window-dot window-dot-green" />
                  </div>
                  <span className="rounded-full bg-[#ff7b29]/15 border border-[#ff7b29]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#ff9f43] uppercase tracking-wider">
                    STEP 2
                  </span>
                </div>

                <h3 className="text-[20px] font-bold tracking-tight text-white mt-2">
                  Select Threat Vector
                </h3>
                <p className="text-[13px] text-war-text-secondary mt-1 mb-4">
                  Identify the primary crisis transmission channel.
                </p>

                {/* Interactive Radio Options directly modeled after Image 2 (Oily / Dry / Balanced) */}
                <div className="space-y-2.5">
                  {VECTOR_OPTIONS.map((opt) => {
                    const isSelected = selectedVector === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVector(opt.id);
                          setActiveStep(2);
                        }}
                        className={clsx(
                          'relative flex items-center justify-between rounded-[18px] p-3.5 transition-all duration-200 cursor-pointer select-none',
                          isSelected
                            ? 'border border-[#ff7b29] bg-[#ff7b29]/[0.12] shadow-[0_0_20px_rgba(255,123,41,0.25)]'
                            : 'border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Radio circle */}
                          <div className={clsx(
                            'h-4 w-4 rounded-full border flex items-center justify-center transition-all',
                            isSelected ? 'border-[#ff7b29] bg-[#ff7b29]' : 'border-white/30 bg-transparent'
                          )}>
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                          </div>
                          <div>
                            <div className={clsx('text-[13px] font-semibold leading-tight', isSelected ? 'text-white' : 'text-war-text-secondary')}>
                              {opt.title}
                            </div>
                            <div className="text-[11px] text-war-text-muted line-clamp-1">{opt.subtitle}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          <span className={clsx(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums',
                            isSelected ? 'bg-[#ff7b29]/20 text-[#ff9f43]' : 'bg-white/5 text-war-text-muted'
                          )}>
                            {opt.metric}
                          </span>
                          <GIcon
                            name={opt.icon}
                            size={18}
                            className={isSelected ? 'text-[#ff9f43]' : 'text-war-text-muted'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-war-text-muted">
                <span>Diagnostics synced with territorial response</span>
                <GIcon name="tune" size={14} className="text-[#ff9f43]" />
              </div>
            </motion.div>

            {/* Glowing Circuit Trace line connecting Step 2 to Step 3 (Desktop SVG) */}
            <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" className="overflow-visible">
                <line x1="0" y1="12" x2="24" y2="12" className="glowing-circuit-path" />
                <circle cx="24" cy="12" r="4" className="circuit-pulse-node" />
              </svg>
            </div>
          </div>

          {/* ============================================================ */}
          {/* STEP 3: YOUR PERSONALIZED DAMAGE CONTROL RITUAL */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 flex flex-col relative">
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setActiveStep(3)}
              className={clsx(
                'blended-card flex-1 p-5 sm:p-6 cursor-pointer flex flex-col justify-between transition-all duration-300',
                activeStep === 3 ? 'circuit-active-border' : 'hover:border-white/20'
              )}
            >
              <div>
                {/* Window Chrome Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="window-dots">
                    <span className="window-dot window-dot-red" />
                    <span className="window-dot window-dot-yellow" />
                    <span className="window-dot window-dot-green" />
                  </div>
                  <span className="rounded-full bg-[#ff7b29]/15 border border-[#ff7b29]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#ff9f43] uppercase tracking-wider">
                    STEP 3
                  </span>
                </div>

                <h3 className="text-[20px] font-bold tracking-tight text-white mt-2">
                  Personalized Ritual
                </h3>
                <p className="text-[13px] text-war-text-secondary mt-1">
                  Synthesized for {project.title} based on your threat matrix.
                </p>

                {/* Tactile 3-Item Ritual Kit directly inspired by Image 2's Cleanser, Serum, Moisturizer */}
                <div className="my-4 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/40 p-4 space-y-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff9f43] flex items-center justify-between">
                    <span>{activeOption.ritualName}</span>
                    <span className="text-white tabular-nums font-semibold">+{activeOption.recoveryPct}% Recovery</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {activeOption.ritualItems.map((item, idx) => (
                      <div
                        key={item.name}
                        className="rounded-xl border border-white/[0.08] bg-black/40 p-2 text-center flex flex-col justify-between group hover:border-[#ff7b29]/50 transition-colors"
                      >
                        {/* Tactile Vial Bottle graphic visual */}
                        <div className="mx-auto my-1 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-inner">
                          <GIcon
                            name={idx === 0 ? 'sanitizer' : idx === 1 ? 'science' : 'auto_fix_high'}
                            size={18}
                            className="text-[#ff9f43]"
                          />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold tracking-tight text-white truncate">{item.name}</div>
                          <div className="text-[8px] text-[#ff9f43] font-medium">{item.volume}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Impact projection summary */}
                  <div className="rounded-xl bg-white/[0.03] p-2.5 text-[11px] text-war-text-secondary flex items-center justify-between border border-white/5">
                    <div>
                      <span className="text-war-text-muted">Preserved Box Office:</span>{' '}
                      <span className="font-bold text-[#30d158]">{activeOption.preservedRevenue}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#30d158] font-semibold">
                      <GIcon name="trending_up" size={13} />
                      <span>Validated</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Luxury Glowing CTA Button from Image 2 */}
              <div className="pt-2">
                <button
                  disabled={isDeploying || deployed}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeploy();
                  }}
                  className={clsx(
                    'w-full py-3 px-5 amber-ritual-button flex items-center justify-center gap-2 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed',
                    deployed ? 'bg-gradient-to-r from-[#30d158] to-[#24a143] text-black' : ''
                  )}
                >
                  {isDeploying ? (
                    <>
                      <GIcon name="refresh" size={16} className="animate-spin" />
                      <span>Synthesizing Countermeasures…</span>
                    </>
                  ) : deployed ? (
                    <>
                      <GIcon name="check_circle" size={16} className="text-black" />
                      <span>Ritual Protocol Active</span>
                    </>
                  ) : (
                    <>
                      <span>Deploy Damage Control Ritual</span>
                      <GIcon name="arrow_forward" size={16} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
