import clsx from 'clsx';

export default function ProgressBar({ value = 0, max = 100, tone = 'primary', className }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const toneClass =
    tone === 'success'
      ? 'bg-success'
      : tone === 'danger'
      ? 'bg-danger'
      : 'bg-primary';

  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div
        className={clsx('h-full rounded-full transition-all duration-300', toneClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
