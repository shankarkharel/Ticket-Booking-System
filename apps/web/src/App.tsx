import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Tier = {
  id: number;
  name: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
};

type BookingItem = {
  tierId: number;
  quantity: number;
  unitPrice: number;
};

type BookingResponse = {
  id: number;
  bookingReference: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  items: BookingItem[];
  totalAmount: number;
  idempotent: boolean;
};

const bookingSchema = z
  .object({
    items: z.array(
      z.object({
        tierId: z.number(),
        quantity: z.number().int().min(0)
      })
    )
  })
  .refine((value) => value.items.some((item) => item.quantity > 0), {
    message: 'Select at least one ticket to continue.',
    path: ['items']
  });

type BookingForm = z.infer<typeof bookingSchema>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const fetchTiers = async (): Promise<Tier[]> => {
  const response = await fetch(`${API_URL}/tiers`);
  if (!response.ok) {
    throw new Error('Failed to load tiers.');
  }
  return response.json();
};

const createBooking = async (items: { tierId: number; quantity: number }[]) => {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID()
    },
    body: JSON.stringify({ items })
  });

  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const message = body?.error || 'Booking failed. Please try again.';
    throw new Error(message);
  }

  return body as BookingResponse;
};

export default function App() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingResponse | null>(null);

  const { data: tiers, isLoading, error, refetch } = useQuery({
    queryKey: ['tiers'],
    queryFn: fetchTiers
  });

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { items: [] }
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (tiers) {
      replace(
        tiers.map((tier) => ({
          tierId: tier.id,
          quantity: 0
        }))
      );
    }
  }, [tiers, replace]);

  const quantities = form.watch('items');

  const mutation = useMutation({
    mutationFn: (items: { tierId: number; quantity: number }[]) => createBooking(items),
    onSuccess: (data) => {
      setLastBooking(data);
      setToast({ type: 'success', message: 'Booking confirmed. Tickets locked in.' });
      const currentItems = form.getValues().items;
      form.reset({ items: currentItems.map((item) => ({ ...item, quantity: 0 })) });
      refetch();
    },
    onError: (err: Error) => {
      setToast({ type: 'error', message: err.message });
    }
  });

  const selectedItems = useMemo(() => {
    if (!tiers || !quantities) return [];
    return quantities
      .map((item, index) => ({
        ...item,
        tier: tiers[index]
      }))
      .filter((item) => item.quantity > 0);
  }, [quantities, tiers]);

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.tier.price, 0);
  }, [selectedItems]);

  const handleSubmit = (data: BookingForm) => {
    const items = data.items.filter((item) => item.quantity > 0);
    mutation.mutate(items);
  };

  const overallError = form.formState.errors.items?.message;

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <span className="uppercase tracking-[0.3em] text-xs text-sage-300">Live Event Access</span>
          <h1 className="font-display text-4xl text-white sm:text-5xl">TechKraft Live: One Night Only</h1>
          <p className="max-w-2xl text-base text-slate-300">
            Reserve tickets across VIP, Front Row, and General Admission. Inventory is tracked in real time
            with strict concurrency control.
          </p>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
          <section className="space-y-4 rounded-3xl bg-ink-800/70 p-6 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Choose your tickets</h2>
              <button
                className="text-sm text-sage-300 transition hover:text-sage-500"
                type="button"
                onClick={() => refetch()}
              >
                Refresh availability
              </button>
            </div>

            {isLoading && <p className="text-slate-300">Loading tiers...</p>}
            {error && <p className="text-rose-300">Unable to load tiers.</p>}

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {fields.map((field, index) => {
                const tier = tiers?.[index];
                if (!tier) return null;
                const quantity = quantities?.[index]?.quantity ?? 0;
                const soldOut = tier.remainingQuantity === 0;

                return (
                  <div
                    key={field.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-700/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                          {soldOut ? 'Sold out' : `${tier.remainingQuantity} left`}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">
                        {tier.name === 'VIP'
                          ? 'Backstage lounge, priority entry, premium bar.'
                          : tier.name === 'Front Row'
                            ? 'Stage-front energy with dedicated merch pickup.'
                            : 'Classic GA access with great sightlines.'}
                      </p>
                      <div className="text-lg font-semibold text-clay-400">{formatCurrency(tier.price)}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="h-10 w-10 rounded-full border border-white/20 text-lg transition hover:border-white/50"
                        onClick={() =>
                          form.setValue(`items.${index}.quantity`, Math.max(0, quantity - 1))
                        }
                        disabled={quantity === 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={tier.remainingQuantity}
                        className="w-16 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-center text-white"
                        {...form.register(`items.${index}.quantity`, {
                          setValueAs: (value) => {
                            const parsed = Number(value);
                            return Number.isNaN(parsed) ? 0 : parsed;
                          }
                        })}
                        disabled={soldOut}
                      />
                      <button
                        type="button"
                        className="h-10 w-10 rounded-full border border-white/20 text-lg transition hover:border-white/50"
                        onClick={() =>
                          form.setValue(
                            `items.${index}.quantity`,
                            Math.min(tier.remainingQuantity, quantity + 1)
                          )
                        }
                        disabled={soldOut || quantity >= tier.remainingQuantity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {overallError && <p className="text-sm text-rose-300">{overallError}</p>}

              <button
                type="submit"
                className="w-full rounded-2xl bg-clay-500 px-6 py-3 text-base font-semibold text-ink-900 transition hover:bg-clay-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Booking...' : 'Book tickets'}
              </button>
            </form>
          </section>

          <aside className="flex flex-col gap-4 rounded-3xl bg-ink-800/70 p-6 shadow-soft backdrop-blur">
            <div>
              <h2 className="text-xl font-semibold">Order summary</h2>
              <p className="text-sm text-slate-300">Review your selection before confirming.</p>
            </div>

            <div className="space-y-3">
              {selectedItems.length === 0 && (
                <p className="text-sm text-slate-300">No tickets selected yet.</p>
              )}
              {selectedItems.map((item) => (
                <div key={item.tierId} className="flex items-center justify-between text-sm">
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
              Inventory is reserved inside a database transaction with conditional updates. If stock changes
              mid-request, the booking is rejected and inventory stays consistent.
            </div>
          </aside>
        </main>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-2xl px-4 py-3 text-sm shadow-soft ${
            toast.type === 'success'
              ? 'bg-emerald-400 text-ink-900'
              : 'bg-rose-400 text-ink-900'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
