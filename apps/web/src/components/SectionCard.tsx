import type { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const SectionCard = ({ title, description, action, children, className }: SectionCardProps) => (
  <section
    className={`space-y-4 rounded-[28px] border border-white/10 bg-ink-800/70 p-6 shadow-soft backdrop-blur ${
      className ?? ''
    }`}
  >
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description && <p className="text-sm text-slate-300">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default SectionCard;
