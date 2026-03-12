import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { bookingSchema, type BookingForm } from '../lib/schemas';
import { createBooking, createHold, fetchSeats, fetchTiers, releaseHold } from '../lib/api';
import { SeatStatus, type BookingResponse, type Seat } from '../lib/types';
import SectionCard from '../components/SectionCard';
import OrderSummary, { type SelectedItem } from '../components/OrderSummary';
import Toast from '../components/Toast';
import CustomerFields from '../components/CustomerFields';
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

const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};

const Booking = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PayPal);
  const [paymentState, setPaymentState] = useState<PaymentState>(PaymentState.Idle);
  const [focusedTierId, setFocusedTierId] = useState<number | null>(null);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);

  const {
    data: tiers,
    isLoading: tiersLoading,
    error: tiersError,
    refetch: refetchTiers
  } = useQuery({
    queryKey: ['tiers'],
    queryFn: fetchTiers
  });

  const {
    data: seats,
    isLoading: seatsLoading,
    error: seatsError,
    refetch: refetchSeats
  } = useQuery({
    queryKey: ['seats'],
    queryFn: fetchSeats
  });

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', seatIds: [] }
  });

  const selectedSeatIds = useWatch({ control: form.control, name: 'seatIds' }) ?? [];

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldSecondsLeft(0);
      return undefined;
    }

    const tick = () => {
      const diff = holdExpiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setHoldToken(null);
        setHoldExpiresAt(null);
        form.setValue('seatIds', [], { shouldValidate: true });
        setToast({ type: 'error', message: 'Hold expired. Select seats again.' });
        refetchSeats();
        refetchTiers();
      } else {
        setHoldSecondsLeft(Math.ceil(diff / 1000));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, form, refetchSeats, refetchTiers]);

  const seatsById = useMemo(() => {
    const map = new Map<number, Seat>();
    (seats ?? []).forEach((seat) => map.set(seat.id, seat));
    return map;
  }, [seats]);

  const selectedSeats = useMemo(
    () => selectedSeatIds.map((id) => seatsById.get(id)).filter(Boolean) as Seat[],
    [selectedSeatIds, seatsById]
  );

  const tierNameById = useMemo(() => {
    const map = new Map<number, string>();
    (tiers ?? []).forEach((tier) => map.set(tier.id, tier.name));
    return map;
  }, [tiers]);

  const selectedSeatLines = useMemo(() => {
    if (selectedSeatIds.length === 0) {
      return [];
    }

    const grouped = selectedSeats.reduce<Record<string, string[]>>((acc, seat) => {
      const tierName = tierNameById.get(seat.tierId) ?? `Tier ${seat.tierId}`;
      if (!acc[tierName]) acc[tierName] = [];
      acc[tierName].push(seat.label);
      return acc;
    }, {});

    return Object.entries(grouped).map(([tierName, labels]) => `${tierName}: ${labels.join(', ')}`);
  }, [selectedSeatIds.length, selectedSeats, tierNameById]);

  useEffect(() => {
    if (!seats) return;
    const availableIds = new Set(
      seats.filter((seat) => seat.status === SeatStatus.AVAILABLE).map((seat) => seat.id)
    );
    const filtered = selectedSeatIds.filter((id) => availableIds.has(id));
    if (filtered.length !== selectedSeatIds.length && !holdToken) {
      form.setValue('seatIds', filtered, { shouldValidate: true });
      setToast({ type: 'error', message: 'Some seats are no longer available.' });
    }
  }, [seats, selectedSeatIds, form, holdToken]);

  const availabilityByTierId = useMemo(() => {
    const map: Record<number, number> = {};
    (seats ?? []).forEach((seat) => {
      if (seat.status === SeatStatus.AVAILABLE) {
        map[seat.tierId] = (map[seat.tierId] || 0) + 1;
      }
    });
    return map;
  }, [seats]);

  const selectedByTierId = useMemo(() => {
    const map: Record<number, number> = {};
    selectedSeats.forEach((seat) => {
      map[seat.tierId] = (map[seat.tierId] || 0) + 1;
    });
    return map;
  }, [selectedSeats]);

  const selectedItems = useMemo<SelectedItem[]>(() => {
    if (!tiers) return [];
    return tiers
      .filter((tier) => selectedByTierId[tier.id])
      .map((tier) => ({
        tier,
        quantity: selectedByTierId[tier.id] ?? 0,
        seats: selectedSeats.filter((seat) => seat.tierId === tier.id)
      }));
  }, [tiers, selectedByTierId, selectedSeats]);

  const totalAmount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity * item.tier.price, 0),
    [selectedItems]
  );

  const toggleSeat = (seatId: number) => {
    if (holdToken) return;
    const next = new Set(selectedSeatIds);
    if (next.has(seatId)) {
      next.delete(seatId);
    } else {
      next.add(seatId);
    }
    form.setValue('seatIds', Array.from(next), { shouldValidate: true });
  };

  const holdMutation = useMutation({
    mutationFn: (seatIds: number[]) => createHold({ seatIds }),
    onSuccess: (data) => {
      setHoldToken(data.holdToken);
      setHoldExpiresAt(new Date(data.expiresAt));
      setToast({ type: 'success', message: 'Seats held for 2 minutes. Complete payment.' });
      refetchSeats();
      refetchTiers();
    },
    onError: (err: Error) => {
      setToast({ type: 'error', message: err.message });
      refetchSeats();
    }
  });

  const bookingMutation = useMutation({
    mutationFn: (payload: { seatIds: number[]; holdToken: string; name: string; email: string }) =>
      createBooking(payload),
    onSuccess: (data) => {
      setLastBooking(data);
      setToast({ type: 'success', message: 'Booking confirmed. Seats locked in.' });
      setPaymentState(PaymentState.Idle);
      setHoldToken(null);
      setHoldExpiresAt(null);
      const currentName = form.getValues().name;
      const currentEmail = form.getValues().email;
      form.reset({ name: currentName, email: currentEmail, seatIds: [] });
      refetchTiers();
      refetchSeats();
    },
    onError: (err: Error) => {
      setToast({ type: 'error', message: err.message });
      setPaymentState(PaymentState.Idle);
      setHoldToken(null);
      setHoldExpiresAt(null);
      form.setValue('seatIds', [], { shouldValidate: true });
      refetchSeats();
      refetchTiers();
    }
  });

  const handleHold = () => {
    if (holdMutation.isPending || selectedSeatIds.length === 0) return;
    holdMutation.mutate(selectedSeatIds);
  };

  const handleReleaseHold = async () => {
    if (!holdToken) return;
    try {
      await releaseHold(holdToken);
      setHoldToken(null);
      setHoldExpiresAt(null);
      form.setValue('seatIds', [], { shouldValidate: true });
      setToast({ type: 'success', message: 'Hold released.' });
      refetchSeats();
      refetchTiers();
    } catch (error) {
      setToast({ type: 'error', message: 'Unable to release hold.' });
    }
  };

  const handleSubmit = (data: BookingForm) => {
    if (!holdToken) {
      setToast({ type: 'error', message: 'Hold seats before confirming payment.' });
      return;
    }
    bookingMutation.mutate({
      seatIds: data.seatIds,
      holdToken,
      name: data.name,
      email: data.email
    });
  };

  const handlePaymentSubmit = async (data: BookingForm) => {
    if (bookingMutation.isPending || paymentState !== PaymentState.Idle) return;
    if (!holdToken) return;
    if (paymentMethod === PaymentMethod.PayPal) {
      setPaymentState(PaymentState.Authorizing);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    setPaymentState(PaymentState.Confirming);
    handleSubmit(data);
  };

  const overallError = form.formState.errors.seatIds?.message;
  const canHold = selectedSeatIds.length > 0 && !holdToken;
  const canPay = holdToken && form.formState.isValid;
  const holdCtaLabel = holdMutation.isPending ? 'Holding seats...' : 'Hold seats (2 min)';

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
            Pick individual seats, hold them for two minutes, then complete payment to confirm.
          </p>
        </div>

        <TicketFinder
          tiers={tiers}
          seats={seats}
          selectedSeatIds={selectedSeatIds}
          availabilityByTierId={availabilityByTierId}
          selectedByTierId={selectedByTierId}
          focusedTierId={focusedTierId}
          onSelectTier={(tierId) => setFocusedTierId(tierId)}
          onToggleSeat={toggleSeat}
          interactionDisabled={Boolean(holdToken)}
          isLoading={tiersLoading || seatsLoading}
        />

        <form
          onSubmit={form.handleSubmit(handlePaymentSubmit)}
          className="grid gap-6 lg:grid-cols-[1.35fr,0.9fr]"
        >
          <SectionCard
            title="Seat selection"
            description="Tap seats in the map to add or remove them from your booking."
            action={
              <div className="flex items-center gap-3">
                {holdToken && (
                  <button
                    className="text-xs text-yellow-300 transition hover:text-yellow-200"
                    type="button"
                    onClick={handleReleaseHold}
                  >
                    Release hold
                  </button>
                )}
                <button
                  className="text-sm text-sage-300 transition hover:text-sage-500"
                  type="button"
                  onClick={() => {
                    refetchTiers();
                    refetchSeats();
                  }}
                >
                  Refresh availability
                </button>
              </div>
            }
          >
            {(tiersLoading || seatsLoading) && <p className="text-slate-300">Loading seats...</p>}
            {(tiersError || seatsError) && (
              <p className="text-rose-300">Unable to load seat availability.</p>
            )}

            {holdToken && holdExpiresAt && (
              <div className="mt-4 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
                Hold active. Complete checkout in{' '}
                <span className="font-semibold">{formatCountdown(holdSecondsLeft)}</span>.
              </div>
            )}

            {overallError && <p className="mt-3 text-sm text-rose-300">{overallError}</p>}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                Selected seats
              </div>
              {selectedSeatIds.length === 0 ? (
                <div className="mt-1 text-sm text-white">No seats selected yet.</div>
              ) : (
                <div className="mt-2 flex flex-col gap-1 text-sm text-white">
                  {selectedSeatLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            {!holdToken && (
              <>
                <button
                  type="button"
                  onClick={handleHold}
                  className="mt-4 w-full rounded-2xl bg-clay-500 px-6 py-3 text-base font-semibold text-ink-900 transition hover:bg-clay-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canHold || holdMutation.isPending}
                  title={!canHold ? 'Select seats in the map to enable hold.' : undefined}
                >
                  {holdCtaLabel}
                </button>

                {!canHold && (
                  <p className="mt-2 text-xs text-slate-400">
                    Select seats in the map above to enable the hold button.
                  </p>
                )}
                {holdMutation.isPending && (
                  <p className="mt-2 text-xs text-slate-400">Holding seats…</p>
                )}
              </>
            )}
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

            {holdToken && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    !canPay || bookingMutation.isPending || paymentState !== PaymentState.Idle
                  }
                  title={!canPay ? 'Enter name and email to enable payment.' : undefined}
                >
                  Proceed to payment
                </button>
                {!canPay && (
                  <p className="mt-2 text-xs text-slate-400">
                    Enter your name and email to enable payment.
                  </p>
                )}
                {paymentState !== PaymentState.Idle && (
                  <p className="mt-2 text-xs text-slate-400">Processing payment…</p>
                )}
              </div>
            )}
          </SectionCard>
        </form>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
};

export default Booking;
