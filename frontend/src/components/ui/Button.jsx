import clsx from 'clsx';

const VARIANTS = {
  primary:
    'bg-primary text-white hover:bg-primary-soft active:bg-primary-dim disabled:bg-surface-2 disabled:text-ink-faint',
  ghost:
    'bg-surface-2 text-ink hover:bg-surface-2/80 active:bg-surface-2/60 disabled:text-ink-faint',
  danger:
    'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 disabled:bg-surface-2 disabled:text-ink-faint',
  success:
    'bg-success text-white hover:bg-success/90 active:bg-success/80 disabled:bg-surface-2 disabled:text-ink-faint',
  outline:
    'border border-border bg-transparent text-ink hover:bg-surface-2/40 disabled:text-ink-faint',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...rest
}) {
  const sizing =
    size === 'sm'
      ? 'h-10 px-4 text-sm rounded-xl'
      : size === 'lg'
      ? 'h-14 px-6 text-base rounded-2xl'
      : 'h-12 px-5 text-[15px] rounded-2xl';

  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 select-none disabled:cursor-not-allowed',
        sizing,
        VARIANTS[variant] ?? VARIANTS.primary,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
