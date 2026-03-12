const Hero = () => (
  <header className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-ink-800/80 via-ink-800/60 to-ink-700/80 p-8 shadow-soft">
    <div className="flex flex-col gap-5">
      <span className="uppercase tracking-[0.4em] text-xs text-sage-300">Global Ticketing</span>
      <div className="space-y-3">
        <h1 className="font-display text-4xl text-white sm:text-5xl">TechKraft Live: One Night Only</h1>
        <p className="max-w-2xl text-base text-slate-300">
          Reserve tickets across VIP, Front Row, and General Admission. Inventory is synchronized in real time
          with transaction-level safeguards.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-slate-200">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
          Fri · 9:00 PM
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Kathmandu Arena</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
          Prices in USD
        </span>
      </div>
    </div>
  </header>
);

export default Hero;
