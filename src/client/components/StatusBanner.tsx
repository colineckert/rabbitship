export type StatusTone = 'info' | 'success' | 'warning' | 'error';

type StatusBannerProps = {
  message: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  info: 'bg-blue-100 text-blue-900 border-blue-300',
  success: 'bg-green-100 text-green-900 border-green-300',
  warning: 'bg-amber-100 text-amber-900 border-amber-300',
  error: 'bg-red-100 text-red-900 border-red-300',
};

export function StatusBanner({ message, tone = 'info' }: StatusBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full max-w-xl px-4 py-3 border rounded text-center font-semibold ${toneClasses[tone]}`}
    >
      {message}
    </div>
  );
}
