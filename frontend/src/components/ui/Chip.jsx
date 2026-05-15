import clsx from 'clsx';

export default function Chip({ children, tone = 'default', className }) {
  const tones = {
    default: 'bg-surface-2 text-ink-muted',
    primary: 'bg-primary/15 text-primary-soft',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/15 text-danger',
    warn: 'bg-warn/15 text-warn',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone] ?? tones.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
