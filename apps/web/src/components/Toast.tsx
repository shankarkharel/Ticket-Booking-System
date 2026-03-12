type ToastProps = {
  type: 'success' | 'error';
  message: string;
};

const Toast = ({ type, message }: ToastProps) => (
  <div
    className={`fixed bottom-6 right-6 rounded-2xl px-4 py-3 text-sm shadow-soft ${
      type === 'success' ? 'bg-emerald-400 text-ink-900' : 'bg-rose-400 text-ink-900'
    }`}
    role="status"
  >
    {message}
  </div>
);

export default Toast;
