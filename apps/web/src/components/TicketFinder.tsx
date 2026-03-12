import { useState } from 'react';
import type { Seat, Tier } from '../lib/types';
import SeatMap from './SeatMap';
import SectionList from './SectionList';

type TicketFinderProps = {
  tiers?: Tier[];
  seats?: Seat[];
  selectedSeatIds: number[];
  availabilityByTierId?: Record<number, number>;
  selectedByTierId?: Record<number, number>;
  focusedTierId?: number | null;
  interactionDisabled?: boolean;
  onSelectTier?: (tierId: number) => void;
  onToggleSeat?: (seatId: number) => void;
  isLoading?: boolean;
};

const TicketFinder = ({
  tiers,
  seats,
  selectedSeatIds,
  availabilityByTierId,
  selectedByTierId,
  focusedTierId,
  interactionDisabled,
  onSelectTier,
  onToggleSeat,
  isLoading
}: TicketFinderProps) => {
  const [view, setView] = useState<'section' | 'map'>('section');

  return (
    <section className="rounded-[32px] border border-white/10 bg-ink-900/60 p-6 shadow-soft backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="text-sm text-slate-300">
          Find Tickets By{' '}
          <span className="font-semibold text-white">
            {view === 'section' ? 'Section' : 'Seat Map'}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setView('section')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              view === 'section' ? 'bg-white text-ink-900' : 'text-slate-300 hover:text-white'
            }`}
          >
            Section
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              view === 'map' ? 'bg-white text-ink-900' : 'text-slate-300 hover:text-white'
            }`}
          >
            Seat Map
          </button>
        </div>
      </div>

      <div className="mt-6">
        {view === 'section' ? (
          <SectionList
            tiers={tiers}
            availabilityByTierId={availabilityByTierId}
            selectedByTierId={selectedByTierId}
            onSelectTier={(tierId) => {
              setView('map');
              onSelectTier?.(tierId);
            }}
          />
        ) : (
          <SeatMap
            tiers={tiers}
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            availabilityByTierId={availabilityByTierId}
            focusedTierId={focusedTierId}
            onSelectTier={onSelectTier}
            onToggleSeat={onToggleSeat}
            interactionDisabled={interactionDisabled}
            showHeader={false}
            isLoading={isLoading}
          />
        )}
      </div>
    </section>
  );
};

export default TicketFinder;
