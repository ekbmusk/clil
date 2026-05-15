import clsx from 'clsx';

export default function Card({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag
      className={clsx(
        'rounded-2xl bg-surface border border-border p-4 shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
