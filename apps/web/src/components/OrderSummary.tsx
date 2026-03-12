import type { BookingResponse, Tier } from '../lib/types';
import { formatCurrency } from '../lib/format';

export type SelectedItem = {
  tier: Tier;
  quantity: number;
};

type OrderSummaryProps = {
  selectedItems: SelectedItem[];
  totalAmount: number;
  lastBooking: BookingResponse | null;
};

const OrderSummary = ({ selectedItems, totalAmount, lastBooking }: OrderSummaryProps) => (
  <div className="flex flex-col gap-4">
    <div className="space-y-3">
      {selectedItems.length === 0 && <p className="text-sm text-slate-300">No tickets selected yet.</p>}
      {selectedItems.map((item) => (
        <div key={item.tier.id} className="flex items-center justify-between text-sm">
          <span>{item.tier.name}</span>
          <span>
            {item.quantity} × {formatCurrency(item.tier.price)}
          </span>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between border-t border-white/10 pt-4 text-lg font-semibold">
      <span>Total</span>
      <span>{formatCurrency(totalAmount)}</span>
    </div>

    {lastBooking && (
      <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-4 text-sm">
        <div className="text-xs uppercase tracking-[0.2em] text-sage-300">Last booking</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-200">Reference</span>
          <span className="font-semibold text-white">{lastBooking.bookingReference}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-200">Status</span>
          <span
            className={`font-semibold ${
              lastBooking.status === 'CONFIRMED' ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {lastBooking.status}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-200">Total paid</span>
          <span className="font-semibold text-white">{formatCurrency(lastBooking.totalAmount)}</span>
        </div>
      </div>
    )}

    <div className="rounded-2xl border border-white/10 bg-ink-700/40 p-4 text-xs text-slate-300">
      Inventory is reserved inside a database transaction with conditional updates. If stock changes mid-request,
      the booking is rejected and inventory stays consistent.
    </div>
  </div>
);

export default OrderSummary;
