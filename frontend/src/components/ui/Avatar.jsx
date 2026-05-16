import { useEffect, useState } from 'react';
import clsx from 'clsx';

const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-3xl',
};

function initialFor(user) {
  return (user?.first_name || user?.username || '?').trim().charAt(0).toUpperCase();
}

function candidatesFor(user) {
  const list = [];
  // 1. Telegram-provided URL stored on the user row — works as a public <img src>.
  if (user?.photo_url) list.push(user.photo_url);
  // 2. Backend proxy (redirects to photo_url, or fetches via BOT_TOKEN).
  if (user?.id) list.push(`/api/users/${user.id}/avatar`);
  return list;
}

export default function Avatar({ user, size = 'md', className, ring = true }) {
  const sources = candidatesFor(user);
  const [idx, setIdx] = useState(0);

  // Reset on user change so a re-login retries from the top.
  useEffect(() => {
    setIdx(0);
  }, [user?.id, user?.photo_url]);

  const sizeClass = SIZES[size] ?? SIZES.md;
  const ringClass = ring ? 'ring-2 ring-primary/30' : '';

  if (idx >= sources.length) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-full bg-primary/20 font-bold text-primary-soft',
          sizeClass,
          ringClass,
          className,
        )}
      >
        {initialFor(user)}
      </div>
    );
  }

  return (
    <img
      key={sources[idx]}
      src={sources[idx]}
      alt={user?.first_name || 'avatar'}
      onError={() => setIdx((i) => i + 1)}
      className={clsx('rounded-full object-cover', sizeClass, ringClass, className)}
    />
  );
}
