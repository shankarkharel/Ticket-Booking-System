import { useMemo } from 'react';
import { SeatStatus, type Seat, type Tier } from '../lib/types';
import { formatCurrency } from '../lib/format';

type SeatMapProps = {
  tiers?: Tier[];
  seats?: Seat[];
  selectedSeatIds: number[];
  availabilityByTierId?: Record<number, number>;
  focusedTierId?: number | null;
  interactionDisabled?: boolean;
  onSelectTier?: (tierId: number) => void;
  onToggleSeat?: (seatId: number) => void;
  showHeader?: boolean;
  isLoading?: boolean;
};

const getTierByName = (tiers: Tier[] | undefined, name: string) =>
  tiers?.find((tier) => tier.name.toLowerCase() === name.toLowerCase());

const groupByRow = (seats: Seat[]) => {
  const map = new Map<string, Seat[]>();
  seats.forEach((seat) => {
    const current = map.get(seat.row) ?? [];
    current.push(seat);
    map.set(seat.row, current);
  });
  Array.from(map.values()).forEach((rowSeats) => rowSeats.sort((a, b) => a.number - b.number));
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
};

const SeatButton = ({
  seat,
  selected,
  onToggle,
  interactionDisabled
}: {
  seat: Seat;
  selected: boolean;
  onToggle?: (seatId: number) => void;
  interactionDisabled?: boolean;
}) => {
  const isAvailable = seat.status === SeatStatus.AVAILABLE;
  const isHeld = seat.status === SeatStatus.HELD;
  const isBooked = seat.status === SeatStatus.BOOKED;
  const disabled = interactionDisabled || (!isAvailable && !selected);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle?.(seat.id)}
      className={`flex h-7 w-7 items-center justify-center rounded-md border-2 text-[10px] font-semibold transition sm:h-8 sm:w-8 ${
        selected
          ? 'border-yellow-400/80 bg-yellow-400/30 text-ink-900'
          : isHeld
            ? 'border-sky-400/80 bg-sky-400/25 text-slate-900'
            : isBooked
              ? 'border-red-500/70 bg-red-500/30 text-white'
              : 'border-emerald-400/80 bg-emerald-400/20 text-white hover:border-emerald-300'
      }`}
      aria-pressed={selected}
    >
      {seat.number}
    </button>
  );
};

const TierHeader = ({
  tier,
  available,
  selected
}: {
  tier?: Tier;
  available?: number;
  selected?: number;
}) => (
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm font-semibold text-white">{tier?.name ?? '—'}</div>
      <div className="text-xs text-slate-300">{tier ? formatCurrency(tier.price) : '—'}</div>
    </div>
    <div className="text-right text-xs text-slate-400">
      <div>{typeof available === 'number' ? `${available} available` : 'Loading...'}</div>
      {selected && selected > 0 && (
        <div className="text-[11px] text-emerald-300">{selected} selected</div>
      )}
    </div>
  </div>
);

const SeatSection = ({
  tier,
  seats,
  selectedSeatIds,
  availabilityByTierId,
  focusedTierId,
  onSelectTier,
  onToggleSeat,
  interactionDisabled
}: {
  tier?: Tier;
  seats: Seat[];
  selectedSeatIds: number[];
  availabilityByTierId?: Record<number, number>;
  focusedTierId?: number | null;
  onSelectTier?: (tierId: number) => void;
  onToggleSeat?: (seatId: number) => void;
  interactionDisabled?: boolean;
}) => {
  if (!tier) return null;
  const rows = groupByRow(seats);
  const selected = selectedSeatIds.filter((id) => seats.some((seat) => seat.id === id)).length;
  const available = availabilityByTierId?.[tier.id];
  const isFocused = focusedTierId === tier.id;

  return (
    <div
      className={`rounded-[22px] border border-white/20 bg-[#13151b] p-4 transition ${
        isFocused ? 'ring-2 ring-emerald-400/70' : ''
      }`}
      onClick={() => onSelectTier?.(tier.id)}
      role="presentation"
    >
      <TierHeader tier={tier} available={available} selected={selected} />
      <div className="mt-4 space-y-2">
        {rows.map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="flex items-center gap-2">
            <span className="w-4 text-xs text-slate-500">{rowLabel}</span>
            <div className="flex flex-wrap gap-2">
              {rowSeats.map((seat) => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  selected={selectedSeatIds.includes(seat.id)}
                  onToggle={onToggleSeat}
                  interactionDisabled={interactionDisabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SeatMap = ({
  tiers,
  seats,
  selectedSeatIds,
  availabilityByTierId,
  focusedTierId,
  interactionDisabled,
  onSelectTier,
  onToggleSeat,
  showHeader = true,
  isLoading
}: SeatMapProps) => {
  const ga = getTierByName(tiers, 'GA');
  const frontRow = getTierByName(tiers, 'Front Row');
  const vip = getTierByName(tiers, 'VIP');

  const seatsByTier = useMemo(() => {
    const map: Record<number, Seat[]> = {};
    (seats ?? []).forEach((seat) => {
      map[seat.tierId] = map[seat.tierId] || [];
      map[seat.tierId].push(seat);
    });
    return map;
  }, [seats]);

  return (
    <section
      className={`space-y-4 ${showHeader ? 'rounded-[32px] border border-white/10 bg-ink-900/60 p-6 shadow-soft backdrop-blur' : ''}`}
    >
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Seat map</h2>
            <p className="text-sm text-slate-300">Tap seats to select individual chairs.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            Not to scale
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-300">Loading seat map...</p>}

      <div className="relative rounded-[28px] border border-white/10 bg-[#15161a] p-6">
        <div className="absolute inset-4 rounded-[24px] border border-white/20" />

        <div className="relative grid gap-6 lg:grid-cols-[1.35fr,0.55fr,0.65fr]">
          <SeatSection
            tier={ga}
            seats={ga ? (seatsByTier[ga.id] ?? []) : []}
            selectedSeatIds={selectedSeatIds}
            availabilityByTierId={availabilityByTierId}
            focusedTierId={focusedTierId}
            onSelectTier={onSelectTier}
            onToggleSeat={onToggleSeat}
            interactionDisabled={interactionDisabled}
          />

          <SeatSection
            tier={frontRow}
            seats={frontRow ? (seatsByTier[frontRow.id] ?? []) : []}
            selectedSeatIds={selectedSeatIds}
            availabilityByTierId={availabilityByTierId}
            focusedTierId={focusedTierId}
            onSelectTier={onSelectTier}
            onToggleSeat={onToggleSeat}
            interactionDisabled={interactionDisabled}
          />

          <div className="flex flex-col gap-6">
            <SeatSection
              tier={vip}
              seats={vip ? (seatsByTier[vip.id] ?? []) : []}
              selectedSeatIds={selectedSeatIds}
              availabilityByTierId={availabilityByTierId}
              focusedTierId={focusedTierId}
              onSelectTier={onSelectTier}
              onToggleSeat={onToggleSeat}
              interactionDisabled={interactionDisabled}
            />
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

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-emerald-400/80 bg-emerald-400/20" />
          Available
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-yellow-400/80 bg-yellow-400/30" />
          Selected
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-sky-400/80 bg-sky-400/25" />
          Held
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-red-500/70 bg-red-500/30" />
          Booked
        </div>
      </div>
    </section>
  );
};

export default SeatMap;
