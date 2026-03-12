import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, type BookingForm } from './lib/schemas';
import { createBooking, fetchTiers } from './lib/api';
import type { BookingResponse, Tier } from './lib/types';
import SectionCard from './components/SectionCard';
import Hero from './components/Hero';
import TierCard from './components/TierCard';
import OrderSummary, { type SelectedItem } from './components/OrderSummary';
import Toast from './components/Toast';
import SeatMap from './components/SeatMap';
import CustomerFields from './components/CustomerFields';

export default function App() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingResponse | null>(null);

  const { data: tiers, isLoading, error, refetch } = useQuery({
    queryKey: ['tiers'],
    queryFn: fetchTiers
  });

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { name: '', email: '', items: [] }
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
  const quantitiesByTierId = useMemo(() => {
    const map: Record<number, number> = {};
    quantities?.forEach((item) => {
      if (item?.tierId) {
        map[item.tierId] = item.quantity;
      }
    });
    return map;
  }, [quantities]);

  const mutation = useMutation({
    mutationFn: (payload: { items: { tierId: number; quantity: number }[]; name: string; email: string }) =>
      createBooking(payload),
    onSuccess: (data) => {
      setLastBooking(data);
      setToast({ type: 'success', message: 'Booking confirmed. Tickets locked in.' });
      const currentItems = form.getValues().items;
      const currentName = form.getValues().name;
      const currentEmail = form.getValues().email;
      form.reset({
        name: currentName,
        email: currentEmail,
        items: currentItems.map((item) => ({ ...item, quantity: 0 }))
      });
      refetch();
    },
    onError: (err: Error) => {
      setToast({ type: 'error', message: err.message });
    }
  });

  const selectedItems = useMemo<SelectedItem[]>(() => {
    if (!tiers || !quantities) return [];
    return quantities
      .map((item, index) => ({
        tier: tiers[index] as Tier,
        quantity: item.quantity
      }))
      .filter((item) => item.quantity > 0);
  }, [quantities, tiers]);

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.tier.price, 0);
  }, [selectedItems]);

  const handleSubmit = (data: BookingForm) => {
    const items = data.items.filter((item) => item.quantity > 0);
    mutation.mutate({ items, name: data.name, email: data.email });
  };

  const overallError = form.formState.errors.items?.message;

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Hero />
        <SeatMap
          tiers={tiers}
          quantities={quantitiesByTierId}
          onSelectTier={(tierId) => {
            const index = tiers?.findIndex((tier) => tier.id === tierId) ?? -1;
            if (index < 0 || !tiers) return;
            const current = form.getValues(`items.${index}.quantity`) ?? 0;
            form.setValue(
              `items.${index}.quantity`,
              Math.min(tiers[index].remainingQuantity, current + 1)
            );
          }}
        />

        <main className="grid gap-6 lg:grid-cols-[1.35fr,0.9fr]">
          <SectionCard
            title="Choose your tickets"
            description="Select quantities by tier. Inventory updates instantly after booking."
            action={
              <button
                className="text-sm text-sage-300 transition hover:text-sage-500"
                type="button"
                onClick={() => refetch()}
              >
                Refresh availability
              </button>
            }
          >
            {isLoading && <p className="text-slate-300">Loading tiers...</p>}
            {error && <p className="text-rose-300">Unable to load tiers.</p>}

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <CustomerFields register={form.register} errors={form.formState.errors} />

              {fields.map((field, index) => {
                const tier = tiers?.[index];
                if (!tier) return null;
                const quantity = quantities?.[index]?.quantity ?? 0;

                return (
                  <TierCard
                    key={field.id}
                    tier={tier}
                    index={index}
                    quantity={quantity}
                    register={form.register}
                    onDecrement={() => form.setValue(`items.${index}.quantity`, Math.max(0, quantity - 1))}
                    onIncrement={() =>
                      form.setValue(
                        `items.${index}.quantity`,
                        Math.min(tier.remainingQuantity, quantity + 1)
                      )
                    }
                  />
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
          </SectionCard>

          <SectionCard title="Order summary" description="Review your selection before confirming.">
            <OrderSummary selectedItems={selectedItems} totalAmount={totalAmount} lastBooking={lastBooking} />
          </SectionCard>
        </main>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}
