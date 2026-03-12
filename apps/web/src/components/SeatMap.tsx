import type { Tier } from '../lib/types';
import { formatCurrency } from '../lib/format';

type SeatMapProps = {
  tiers?: Tier[];
  quantities?: Record<number, number>;
  onSelectTier?: (tierId: number) => void;
};

const getTierByName = (tiers: Tier[] | undefined, name: string) =>
  tiers?.find((tier) => tier.name.toLowerCase() === name.toLowerCase());

const TierLabel = ({
  label,
  tier,
  selected
}: {
  label: string;
  tier?: Tier;
  selected?: number;
}) => (
  <div className="space-y-1 text-center text-xs text-slate-200">
    <div className="text-sm font-semibold text-white">{label}</div>
    <div className="text-slate-300">{tier ? formatCurrency(tier.price) : '—'}</div>
    <div className="text-slate-400">{tier ? `${tier.remainingQuantity} available` : 'Loading...'}</div>
    {selected && selected > 0 && (
      <div className="text-[11px] text-emerald-300">{selected} selected</div>
    )}
  </div>
);

const SeatMap = ({ tiers, quantities, onSelectTier }: SeatMapProps) => {
  const ga = getTierByName(tiers, 'GA');
  const frontRow = getTierByName(tiers, 'Front Row');
  const vip = getTierByName(tiers, 'VIP');

  return (
    <section className="rounded-[32px] border border-white/10 bg-ink-900/60 p-6 shadow-soft backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Venue layout</h2>
          <p className="text-sm text-slate-300">A simplified map to help choose your tier.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          Not to scale
        </div>
      </div>

      <div className="relative rounded-[28px] border border-white/10 bg-[#15161a] p-6">
        <div className="absolute inset-4 rounded-[24px] border border-white/20" />

        <div className="relative grid gap-6 lg:grid-cols-[1.4fr,0.35fr,0.6fr]">
          <button
            type="button"
            onClick={() => ga && onSelectTier?.(ga.id)}
            className={`relative min-h-[280px] rounded-[24px] border border-white/30 transition hover:border-white/60 ${
              ga && quantities?.[ga.id] ? 'ring-2 ring-emerald-400/70' : ''
            }`}
          >
            <div className="absolute inset-6 rounded-[20px] border border-white/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <TierLabel label="GA Floor" tier={ga} selected={ga ? quantities?.[ga.id] : 0} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => frontRow && onSelectTier?.(frontRow.id)}
            className={`relative min-h-[280px] rounded-[22px] border border-white/30 transition hover:border-white/60 ${
              frontRow && quantities?.[frontRow.id] ? 'ring-2 ring-emerald-400/70' : ''
            }`}
          >
            <div className="absolute inset-6 rounded-[18px] border border-white/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <TierLabel
                label="Front Row"
                tier={frontRow}
                selected={frontRow ? quantities?.[frontRow.id] : 0}
              />
            </div>
          </button>

          <div className="flex flex-col gap-6">
            <button
              type="button"
              onClick={() => vip && onSelectTier?.(vip.id)}
              className={`relative min-h-[120px] rounded-[20px] border border-white/30 transition hover:border-white/60 ${
                vip && quantities?.[vip.id] ? 'ring-2 ring-emerald-400/70' : ''
              }`}
            >
              <div className="absolute inset-5 rounded-[16px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <TierLabel label="VIP" tier={vip} selected={vip ? quantities?.[vip.id] : 0} />
              </div>
            </button>
            <div className="relative flex-1 rounded-[22px] border border-white/30">
              <div className="absolute inset-6 rounded-[18px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-slate-200">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">Stage</div>
                  <div className="text-slate-400">Production only</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeatMap;
