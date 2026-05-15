import { useState } from 'react';
import clsx from 'clsx';

// answer shape: { mapping: { itemString: categoryString } }
export default function Classification({ task, value, onChange, isDisabled }) {
  const items = task.items ?? [];
  const categories = task.categories ?? [];
  const mapping = value?.mapping ?? {};

  const [activeItem, setActiveItem] = useState(null);

  const unplaced = items.filter((it) => !(it in mapping));
  const placedByCat = (cat) => items.filter((it) => mapping[it] === cat);

  const setMapping = (next) => onChange({ mapping: next });

  const tapItem = (item) => {
    if (isDisabled) return;
    setActiveItem(item === activeItem ? null : item);
  };

  const tapBucket = (cat) => {
    if (isDisabled || activeItem === null) return;
    setMapping({ ...mapping, [activeItem]: cat });
    setActiveItem(null);
  };

  const removeFromBucket = (item) => {
    if (isDisabled) return;
    const next = { ...mapping };
    delete next[item];
    setMapping(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-ink">{task.prompt}</p>

      {/* Item chips waiting to be classified */}
      <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-ink-muted">
          Сөздер · tap to select
        </p>
        {unplaced.length === 0 ? (
          <p className="text-xs text-ink-faint">Барлығы орналасты.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unplaced.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => tapItem(item)}
                disabled={isDisabled}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  activeItem === item
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-ink hover:bg-surface-2',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category buckets */}
      <div className="grid gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => tapBucket(cat)}
            disabled={isDisabled || activeItem === null}
            className={clsx(
              'min-h-[88px] rounded-2xl border-2 p-3 text-left transition-colors',
              activeItem !== null
                ? 'border-primary/60 bg-primary/5 cursor-pointer'
                : 'border-border bg-surface-2 cursor-default',
            )}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {cat}
            </p>
            <div className="flex flex-wrap gap-2">
              {placedByCat(cat).map((item) => (
                <span
                  key={item}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromBucket(item);
                  }}
                  className="rounded-full bg-primary/15 px-3 py-1 text-sm text-primary-soft"
                >
                  {item}
                  {!isDisabled && <span className="ml-1 text-ink-muted">×</span>}
                </span>
              ))}
              {placedByCat(cat).length === 0 && (
                <span className="text-xs text-ink-faint">бос</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

Classification.isValid = (value, task) => {
  const items = task?.items ?? [];
  const mapping = value?.mapping ?? {};
  return items.length > 0 && items.every((it) => it in mapping);
};
