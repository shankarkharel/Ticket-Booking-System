import type { Tier } from '../lib/types';
import { formatCurrency } from '../lib/format';

type SectionListProps = {
  tiers?: Tier[];
  onSelectTier?: (tierId: number) => void;
};

const SectionList = ({ tiers, onSelectTier }: SectionListProps) => {
  const sorted = [...(tiers ?? [])].sort((a, b) => b.price - a.price);

  return (
    <div className="rounded-[24px] border border-white/10 bg-ink-900/40">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-sm text-slate-300">
        <span>{sorted.length} Results Found</span>
        <span className="text-slate-400">Price (High to Low)</span>
      </div>
      <div className="divide-y divide-white/10">
        {sorted.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onSelectTier?.(tier.id)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/5"
          >
            <div>
              <div className="text-sm font-semibold text-white">{tier.name}</div>
              <div className="text-xs text-emerald-300">{formatCurrency(tier.price)}</div>
            </div>
            <div className="text-xs text-slate-400">{tier.remainingQuantity} available</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SectionList;
