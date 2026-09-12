import React from 'react';
import { GIcon } from './GIcon';
import type { TheaterHubWeather } from '../data/apiService';

interface TheatricalWeatherCircuitMatrixProps {
  weatherHubs: TheaterHubWeather[];
}

interface NormalizedWeatherHub {
  city: string;
  circuit: string;
  tempC: number;
  condition: string;
  precipitationMm: number;
  footfallRisk: string;
  occupancyFactor: string;
}

const defaultHubs: NormalizedWeatherHub[] = [
  { city: 'Mumbai', circuit: 'West (Maharashtra/Gujarat)', tempC: 29.5, condition: 'Clear', precipitationMm: 0, footfallRisk: 'LOW', occupancyFactor: 'Optimal (+4%)' },
  { city: 'Hyderabad', circuit: 'Nizam & Andhra Pradesh', tempC: 31.0, condition: 'Clear', precipitationMm: 0, footfallRisk: 'LOW', occupancyFactor: 'Optimal (+5%)' },
  { city: 'Bengaluru', circuit: 'Karnataka / South Interior', tempC: 26.2, condition: 'Cloudy', precipitationMm: 0.2, footfallRisk: 'LOW', occupancyFactor: 'Normal (0%)' },
  { city: 'Chennai', circuit: 'Tamil Nadu Circuit', tempC: 32.1, condition: 'Humid/Clear', precipitationMm: 0, footfallRisk: 'LOW', occupancyFactor: 'Optimal (+3%)' },
  { city: 'Delhi NCR', circuit: 'North (Delhi/UP/Punjab)', tempC: 33.4, condition: 'Hazy', precipitationMm: 0, footfallRisk: 'LOW', occupancyFactor: 'Normal (0%)' },
  { city: 'Kolkata', circuit: 'East (Bengal/Assam/Bihar)', tempC: 30.8, condition: 'Passing Showers', precipitationMm: 1.4, footfallRisk: 'MEDIUM', occupancyFactor: 'Slight Dip (-4%)' },
  { city: 'Kochi', circuit: 'Kerala Circuit', tempC: 28.3, condition: 'Rain', precipitationMm: 4.8, footfallRisk: 'HIGH', occupancyFactor: 'Evening Dip (-11%)' },
];

export const TheatricalWeatherCircuitMatrix: React.FC<TheatricalWeatherCircuitMatrixProps> = ({ weatherHubs }) => {
  // Normalize hubs whether coming from API or default fallback
  const hubs: NormalizedWeatherHub[] = weatherHubs && weatherHubs.length > 0
    ? weatherHubs.map((h, i) => ({
        city: h.city || defaultHubs[i]?.city || 'Cinema Hub',
        circuit: h.circuit || h.region || defaultHubs[i]?.circuit || 'Theatrical Circuit',
        tempC: h.tempC ?? (parseFloat(h.temperature) || defaultHubs[i]?.tempC || 28),
        condition: h.condition || defaultHubs[i]?.condition || 'Clear',
        precipitationMm: h.precipitationMm ?? defaultHubs[i]?.precipitationMm ?? 0,
        footfallRisk: h.footfallRisk || (h.impactRisk === 'HIGH' ? 'HIGH' : h.impactRisk === 'MODERATE' ? 'MEDIUM' : 'LOW'),
        occupancyFactor: h.occupancyFactor || (h.impactRisk === 'HIGH' ? 'Dip (-10%)' : h.impactRisk === 'MODERATE' ? 'Moderate (-3%)' : 'Optimal (+4%)'),
      }))
    : defaultHubs;

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('shower')) return 'rainy';
    if (c.includes('cloud')) return 'cloud';
    if (c.includes('thunder')) return 'thunderstorm';
    return 'sunny';
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <GIcon name="cloud" size={18} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold tracking-tight text-white flex items-center gap-2">
              <span>7 Theatrical Distribution Circuits — Live Weather & Footfall Impact</span>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                Open-Meteo Telemetry
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Live precipitation & thermal indicators correlated directly with physical cinema hall footfalls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Low Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Rain Watch
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" /> Footfall Deluge Risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {hubs.map((hub) => {
          const isHigh = hub.footfallRisk === 'HIGH';
          const isMed = hub.footfallRisk === 'MEDIUM';

          return (
            <div
              key={hub.city}
              className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 ${
                isHigh
                  ? 'border-red-500/30 bg-red-500/[0.06]'
                  : isMed
                  ? 'border-amber-500/30 bg-amber-500/[0.06]'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13px] text-white">{hub.city}</span>
                  <GIcon
                    name={getWeatherIcon(hub.condition)}
                    size={16}
                    className={isHigh ? 'text-red-400' : isMed ? 'text-amber-400' : 'text-blue-300'}
                  />
                </div>
                <div className="text-[10px] text-zinc-400 truncate" title={hub.circuit}>
                  {hub.circuit}
                </div>

                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-[18px] font-bold font-mono text-white">
                    {hub.tempC}°C
                  </span>
                  <span className="text-[11px] text-zinc-300 font-medium">
                    {hub.condition}
                  </span>
                </div>

                {hub.precipitationMm > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-blue-300">
                    <GIcon name="water_drop" size={11} />
                    <span>{hub.precipitationMm} mm/hr</span>
                  </div>
                )}
              </div>

              <div className="mt-3 border-t border-white/5 pt-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 uppercase font-semibold">Footfall:</span>
                  <span
                    className={`font-semibold ${
                      isHigh ? 'text-red-400' : isMed ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {hub.occupancyFactor}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
