import { Link } from 'react-router-dom';
import Hero from '../components/Hero';

const Home = () => (
  <div className="min-h-screen px-6 py-10">
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          TechKraft Live
        </span>
        <Link
          to="/book"
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-900"
        >
          Book tickets
        </Link>
      </div>

      <Hero />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-ink-900/60 p-6">
          <h3 className="text-lg font-semibold text-white">Event overview</h3>
          <p className="mt-2 text-sm text-slate-300">
            One-night showcase with tiered access. VIP offers premium lounge access, Front Row
            brings you closest to the stage, and GA keeps the energy open and flexible.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-ink-900/60 p-6">
          <h3 className="text-lg font-semibold text-white">What to expect</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            <li>Doors open 7:30 PM</li>
            <li>Showtime 9:00 PM</li>
            <li>Fast entry for VIP and Front Row</li>
          </ul>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-ink-900/60 p-6">
          <h3 className="text-lg font-semibold text-white">Secure booking</h3>
          <p className="mt-2 text-sm text-slate-300">
            Inventory is reserved with ACID transactions and idempotent requests. Payments are
            simulated and confirmations are sent instantly.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-ink-900/70 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Ready to reserve your seats?</h2>
          <p className="mt-2 text-sm text-slate-300">
            Continue to the booking flow to select tiers and confirm.
          </p>
        </div>
        <Link
          to="/book"
          className="rounded-full bg-clay-500 px-6 py-3 text-sm font-semibold text-ink-900"
        >
          Continue to booking
        </Link>
      </div>
    </div>
  </div>
);

export default Home;
