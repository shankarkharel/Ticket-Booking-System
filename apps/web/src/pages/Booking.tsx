import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { bookingSchema, type BookingForm } from '../lib/schemas';
import { createBooking, fetchTiers } from '../lib/api';
import type { BookingResponse, Tier } from '../lib/types';
import SectionCard from '../components/SectionCard';
import TierCard from '../components/TierCard';
import OrderSummary, { type SelectedItem } from '../components/OrderSummary';
import Toast from '../components/Toast';
import CustomerFields from '../components/CustomerFields';
import TicketModal from '../components/TicketModal';
import TicketFinder from '../components/TicketFinder';

enum PaymentMethod {
  Card = 'card',
  PayPal = 'paypal'
}

enum PaymentState {
  Idle = 'idle',
  Authorizing = 'authorizing',
  Confirming = 'confirming'
}

const Booking = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingResponse | null>(null);
  const [activeTierId, setActiveTierId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PayPal);
  const [paymentState, setPaymentState] = useState<PaymentState>(PaymentState.Idle);

  const {
    data: tiers,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tiers'],
    queryFn: fetchTiers
  });

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
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

  const quantities = useWatch({ control: form.control, name: 'items' });
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
    mutationFn: (payload: {
      items: { tierId: number; quantity: number }[];
      name: string;
      email: string;
    }) => createBooking(payload),
    onSuccess: (data) => {
      setLastBooking(data);
      setToast({ type: 'success', message: 'Booking confirmed. Tickets locked in.' });
      setActiveTierId(null);
      setPaymentState(PaymentState.Idle);
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
      setPaymentState(PaymentState.Idle);
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

  const handlePaymentSubmit = async (data: BookingForm) => {
    if (mutation.isPending || paymentState !== PaymentState.Idle) return;
    if (paymentMethod === PaymentMethod.PayPal) {
      setPaymentState(PaymentState.Authorizing);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    setPaymentState(PaymentState.Confirming);
    handleSubmit(data);
  };

  const handleModalConfirm = () => {
    setActiveTierId(null);
    form.handleSubmit(handlePaymentSubmit)();
  };

  const overallError = form.formState.errors.items?.message;
  const activeTier = tiers?.find((tier) => tier.id === activeTierId);
  const activeIndex = activeTier
    ? (tiers?.findIndex((tier) => tier.id === activeTier.id) ?? -1)
    : -1;
  const activeQuantity = activeIndex >= 0 ? (quantities?.[activeIndex]?.quantity ?? 0) : 0;
  const canSubmit = selectedItems.length > 0 && form.formState.isValid;
  const primaryCtaLabel =
    paymentState === PaymentState.Authorizing
      ? 'Redirecting to PayPal...'
      : paymentState === PaymentState.Confirming || mutation.isPending
        ? 'Confirming payment...'
        : !canSubmit
          ? 'Select seats and enter details'
          : paymentMethod === PaymentMethod.PayPal
            ? 'Confirm payment with PayPal'
            : 'Confirm payment';

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            ← Back to event details
          </Link>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            Secure checkout
          </span>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-ink-900/60 p-6">
          <h1 className="text-3xl font-semibold text-white">Book tickets</h1>
          <p className="mt-2 text-sm text-slate-300">
            Choose your tiers, confirm payment, and receive your booking reference instantly.
          </p>
        </div>

        <TicketFinder
          tiers={tiers}
          quantities={quantitiesByTierId}
          onSelectTier={(tierId) => {
            setActiveTierId(tierId);
          }}
        />

        <form
          onSubmit={form.handleSubmit(handlePaymentSubmit)}
          className="grid gap-6 lg:grid-cols-[1.35fr,0.9fr]"
        >
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

            <div className="space-y-4">
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
                    onDecrement={() =>
                      form.setValue(`items.${index}.quantity`, Math.max(0, quantity - 1))
                    }
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
                disabled={!canSubmit || mutation.isPending || paymentState !== PaymentState.Idle}
              >
                {primaryCtaLabel}
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Order summary" description="Review your selection before confirming.">
            <OrderSummary
              selectedItems={selectedItems}
              totalAmount={totalAmount}
              lastBooking={lastBooking}
            />
            <div className="border-t border-white/10 pt-5">
              <CustomerFields register={form.register} errors={form.formState.errors} />
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Payment method
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.PayPal)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    paymentMethod === PaymentMethod.PayPal
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-white'
                      : 'border-white/10 text-slate-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-semibold text-white">PayPal (Mock)</div>
                  <div className="text-xs text-slate-400">Simulated PayPal authorization</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.Card)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    paymentMethod === PaymentMethod.Card
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-white'
                      : 'border-white/10 text-slate-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-semibold text-white">Card (Mock)</div>
                  <div className="text-xs text-slate-400">Instant confirmation</div>
                </button>
              </div>
            </div>
          </SectionCard>
        </form>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}

      {activeTier && (
        <TicketModal
          tier={activeTier}
          quantity={activeQuantity}
          onClose={() => setActiveTierId(null)}
          onQuantityChange={(value) => {
            if (activeIndex < 0) return;
            form.setValue(`items.${activeIndex}.quantity`, value);
          }}
          onConfirm={handleModalConfirm}
          isSubmitting={mutation.isPending}
        />
      )}
    </div>
  );
};

export default Booking;
