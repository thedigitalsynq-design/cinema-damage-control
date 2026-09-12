import React from 'react';
import { GIcon } from './GIcon';
import type { CurrencyRates } from '../data/apiService';

interface WorldwideForexMatrixProps {
  currencyRates: CurrencyRates;
  domesticGrossCr?: number; // e.g. 100 Cr INR default
}

export const WorldwideForexMatrix: React.FC<WorldwideForexMatrixProps> = ({
  currencyRates,
  domesticGrossCr = 120, // baseline benchmark in Crores INR
}) => {
  const rates = currencyRates || {
    USD: 0.0119,
    EUR: 0.0108,
    GBP: 0.0091,
    AED: 0.0437,
    SGD: 0.0158,
    AUD: 0.0181,
    CAD: 0.0163,
    MYR: 0.0526,
  };

  // Convert ₹120 Cr INR into Foreign Currencies (1 Cr = 10,000,000 INR)
  const inrTotal = domesticGrossCr * 10000000;

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', territory: 'North America / ROW', rate: rates.USD, flag: '🇺🇸' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', territory: 'GCC / Middle East', rate: rates.AED, flag: '🇦🇪' },
    { code: 'GBP', name: 'British Pound', symbol: '£', territory: 'United Kingdom / Ireland', rate: rates.GBP, flag: '🇬🇧' },
    { code: 'EUR', name: 'Euro', symbol: '€', territory: 'Continental Europe', rate: rates.EUR, flag: '🇪🇺' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', territory: 'Australia / NZ', rate: rates.AUD, flag: '🇦🇺' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', territory: 'Singapore / SEA', rate: rates.SGD, flag: '🇸🇬' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', territory: 'Malaysia Circuit', rate: rates.MYR, flag: '🇲🇾' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <GIcon name="currency_exchange" size={18} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold tracking-tight text-white flex items-center gap-2">
              <span>Overseas Box Office Forex Matrix (Live Real-Time Rates)</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Open Exchange API
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Benchmark equivalent conversion for ₹{domesticGrossCr} Cr INR theatrical gross.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
          <span>Base: 1 INR</span>
          <span>·</span>
          <span>Precision: 4 Decimals</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {currencies.map((c) => {
          const foreignConverted = inrTotal * c.rate;
          const foreignMillion = (foreignConverted / 1000000).toFixed(2);
          const inrPerUnit = (1 / c.rate).toFixed(2);

          return (
            <div
              key={c.code}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px]">{c.flag}</span>
                <span className="font-mono text-[11px] font-semibold text-emerald-400">{c.code}</span>
              </div>

              <div className="mt-2">
                <div className="text-[10px] text-zinc-500 truncate" title={c.territory}>
                  {c.territory}
                </div>
                <div className="text-[15px] font-bold font-mono text-white mt-0.5">
                  {c.symbol}{foreignMillion}M
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  1 {c.code} = ₹{inrPerUnit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
