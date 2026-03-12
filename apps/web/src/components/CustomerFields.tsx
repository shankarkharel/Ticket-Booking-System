import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { BookingForm } from '../lib/schemas';

type CustomerFieldsProps = {
  register: UseFormRegister<BookingForm>;
  errors: FieldErrors<BookingForm>;
};

const CustomerFields = ({ register, errors }: CustomerFieldsProps) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Name</label>
      <input
        className="w-full rounded-2xl border border-white/10 bg-ink-900/40 px-4 py-3 text-white placeholder:text-slate-500"
        placeholder="Alex Johnson"
        {...register('name')}
      />
      {errors.name && <p className="text-xs text-rose-300">{errors.name.message}</p>}
    </div>
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</label>
      <input
        type="email"
        className="w-full rounded-2xl border border-white/10 bg-ink-900/40 px-4 py-3 text-white placeholder:text-slate-500"
        placeholder="alex@email.com"
        {...register('email')}
      />
      {errors.email && <p className="text-xs text-rose-300">{errors.email.message}</p>}
    </div>
  </div>
);

export default CustomerFields;
