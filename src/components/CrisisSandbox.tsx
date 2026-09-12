import { GIcon } from './GIcon';
import { useRoom } from './RoomState';
import { useToast } from './Toaster';
import { useLiveDataContext } from '../context/LiveDataContext';

export type ScenarioId = 'baseline' | 'leak' | 'boycott' | 'embargo';

export function CrisisSandbox({
  activeScenario,
  onSelectScenario,
  onOpenCountermeasure,
}: {
  activeScenario: ScenarioId;
  onSelectScenario: (s: ScenarioId) => void;
  onOpenCountermeasure: () => void;
}) {
  const { apply, reset } = useRoom();
  const toast = useToast();
  const { setScenario, simulationSpeedMs, setSimulationSpeed } = useLiveDataContext();

  const scenarios: { id: ScenarioId; title: string; desc: string; icon: string; badge: string; color: string }[] = [
    {
      id: 'baseline',
      title: 'Live Telemetry',
      desc: 'Real Google News RSS + Wikipedia audience curve',
      icon: 'radio',
      badge: 'PRODUCTION LIVE',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'leak',
      title: 'Simulate Piracy Leak',
      desc: 'Climax HD video circulating on Telegram',
      icon: 'videocam_off',
      badge: 'CRITICAL LEAK',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    {
      id: 'boycott',
      title: 'Simulate Boycott Swarm',
      desc: 'Synthetic review-bombing & boycott hashtag',
      icon: 'trending_down',
      badge: 'COORDINATED SMEAR',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'embargo',
      title: 'Simulate Screen Friction',
      desc: 'Exhibitor revenue parity dispute in South circuits',
      icon: 'storefront',
      badge: 'EXHIBITOR RISK',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
  ];

  const handleSelect = (s: ScenarioId) => {
    onSelectScenario(s);
    setScenario(s);
    if (s === 'baseline') {
      reset();
      toast('Restored baseline live telemetry & authentic feeds', 'info');
    } else if (s === 'leak') {
      apply('escalate');
      toast('🚨 Scenario Injected: Climax leak active on 14 Telegram channels. Piracy threat index surged.', 'warn');
    } else if (s === 'boycott') {
      apply('escalate');
      toast('⚡ Scenario Injected: Coordinated 1-star bot swarm detected. Negative sentiment +32%.', 'warn');
    } else if (s === 'embargo') {
      apply('escalate');
      toast('⚠ Scenario Injected: 320 screens holding back advance sales. Circuit health dropped to 42%.', 'warn');
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12141c]/90 p-3.5 shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <GIcon name="science" size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tracking-wider text-white uppercase">Studio Stress-Test Sandbox</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">EXECUTIVE DRILLS</span>
            </div>
            <p className="text-[11.5px] text-zinc-400">Inject simulated crisis vectors to test studio response protocols in real time.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSimulationSpeed(2000)}
              className={`rounded-md px-2 py-1 font-medium transition ${
                (simulationSpeedMs || 2000) === 2000
                  ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Real-time 2-second telemetry ticks"
            >
              1x Realtime (2s)
            </button>
            <button
              type="button"
              onClick={() => setSimulationSpeed(1000)}
              className={`rounded-md px-2 py-1 font-medium transition ${
                simulationSpeedMs === 1000
                  ? 'bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Fast-forward stress simulation"
            >
              ⚡ 2x Speed (1s)
            </button>
          </div>

          <button
            onClick={onOpenCountermeasure}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95"
          >
            <GIcon name="bolt" size={14} />
            Deploy Countermeasure
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {scenarios.map((sc) => {
          const isActive = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => handleSelect(sc.id)}
              className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                isActive
                  ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${sc.color}`}>
                <GIcon name={sc.icon} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[12.5px] font-semibold ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                    {sc.title}
                  </span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400">{sc.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
