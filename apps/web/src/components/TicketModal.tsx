import { useEffect } from 'react';
import type { Tier } from '../lib/types';
import { formatCurrency } from '../lib/format';

type TicketModalProps = {
  tier?: Tier;
  quantity: number;
  onClose: () => void;
  onQuantityChange: (quantity: number) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

const tierDescriptions: Record<string, string> = {
  VIP: 'Premium access near the stage with lounge service.',
  'Front Row': 'Closest seated view with expedited entry.',
  GA: 'General admission floor access with open standing.'
};

const TicketModal = ({
  tier,
  quantity,
  onClose,
  onQuantityChange,
  onConfirm,
  isSubmitting
}: TicketModalProps) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!tier) return null;

  const soldOut = tier.remainingQuantity === 0;
  const maxQuantity = tier.remainingQuantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-8 text-ink-900 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Select Ticket Type</h2>
            <p className="mt-2 text-sm text-slate-500">{tier.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 px-3 py-2 text-xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          {tierDescriptions[tier.name] ?? 'Ticket type details for this area.'}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                {tier.name}
              </div>
              <div className="mt-2 text-2xl font-semibold text-emerald-600">
                {formatCurrency(tier.price)}
              </div>
              <div className="text-sm text-slate-500">
                {soldOut ? 'Sold out' : `${tier.remainingQuantity} available`}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-slate-300 text-lg text-slate-600 disabled:opacity-40"
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0}
              >
                -
              </button>
              <div className="text-2xl font-semibold text-ink-900">{quantity}</div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-slate-300 text-lg text-slate-600 disabled:opacity-40"
                onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
                disabled={soldOut || quantity >= maxQuantity}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <button type="button" className="text-sm font-semibold text-slate-600" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onConfirm}
            disabled={isSubmitting || quantity === 0}
          >
            {isSubmitting ? 'Processing...' : `Confirm ${quantity || 0} seats`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
