import type { UseFormRegister } from 'react-hook-form';
import type { Tier } from '../lib/types';
import type { BookingForm } from '../lib/schemas';
import { formatCurrency } from '../lib/format';

type TierCardProps = {
  tier: Tier;
  index: number;
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  register: UseFormRegister<BookingForm>;
};

const tierCopy: Record<string, string> = {
  VIP: 'Backstage lounge, priority entry, premium bar access.',
  'Front Row': 'Stage-front energy with dedicated merch pickup.',
  GA: 'Classic GA access with fast entry lanes.'
};

const TierCard = ({ tier, index, quantity, onDecrement, onIncrement, register }: TierCardProps) => {
  const soldOut = tier.remainingQuantity === 0;
  const percentLeft = Math.max(0, Math.round((tier.remainingQuantity / tier.totalQuantity) * 100));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-700/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
            {soldOut ? 'Sold out' : `${tier.remainingQuantity} left`}
          </span>
        </div>
        <p className="text-sm text-slate-300">{tierCopy[tier.name] ?? 'Premium access for the night.'}</p>
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-clay-400">{formatCurrency(tier.price)}</div>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-sage-500" style={{ width: `${percentLeft}%` }} />
          </div>
          <span className="text-xs text-slate-400">{percentLeft}% remaining</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="h-10 w-10 rounded-full border border-white/20 text-lg transition hover:border-white/50 disabled:opacity-40"
          onClick={onDecrement}
          disabled={quantity === 0}
        >
          -
        </button>
        <input
          type="number"
          min={0}
          max={tier.remainingQuantity}
          className="w-16 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-center text-white"
          {...register(`items.${index}.quantity`, {
            setValueAs: (value) => {
              const parsed = Number(value);
              return Number.isNaN(parsed) ? 0 : parsed;
            }
          })}
          disabled={soldOut}
        />
        <button
          type="button"
          className="h-10 w-10 rounded-full border border-white/20 text-lg transition hover:border-white/50 disabled:opacity-40"
          onClick={onIncrement}
          disabled={soldOut || quantity >= tier.remainingQuantity}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default TierCard;
