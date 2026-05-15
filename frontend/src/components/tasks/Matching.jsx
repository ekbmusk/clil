import { useState } from 'react';
import clsx from 'clsx';

// answer shape: { pairs: [[leftIdx, rightIdx], ...] }
export default function Matching({ task, value, onChange, isDisabled }) {
  const left = task.left_items ?? [];
  const right = task.right_items ?? [];
  const pairs = value?.pairs ?? [];

  const [activeLeft, setActiveLeft] = useState(null);

  const usedLeft = new Set(pairs.map((p) => p[0]));
  const usedRight = new Set(pairs.map((p) => p[1]));

  // Stable per-pair colors.
  const palette = [
    'border-primary text-primary-soft bg-primary/10',
    'border-success text-success bg-success/10',
    'border-warn text-warn bg-warn/10',
    'border-danger text-danger bg-danger/10',
    'border-primary-soft text-primary-soft bg-primary-soft/10',
  ];
  const pairColor = (idx) => palette[idx % palette.length];
  const leftPairIndex = (li) => pairs.findIndex((p) => p[0] === li);
  const rightPairIndex = (ri) => pairs.findIndex((p) => p[1] === ri);

  const setPairs = (next) => onChange({ pairs: next });

  const tapLeft = (i) => {
    if (isDisabled) return;
    if (usedLeft.has(i)) {
      // Unpair to allow re-matching.
      setPairs(pairs.filter((p) => p[0] !== i));
      setActiveLeft(null);
      return;
    }
    setActiveLeft(i === activeLeft ? null : i);
  };

  const tapRight = (j) => {
    if (isDisabled) return;
    if (usedRight.has(j)) {
      setPairs(pairs.filter((p) => p[1] !== j));
      return;
    }
    if (activeLeft === null) return;
    setPairs([...pairs, [activeLeft, j]]);
    setActiveLeft(null);
  };

  const reset = () => {
    if (isDisabled) return;
    setPairs([]);
    setActiveLeft(null);
  };

  const cellClass = (active, paired, pairIdx) =>
    clsx(
      'flex min-h-[48px] items-center rounded-2xl border px-3 py-2 text-left text-[14px] transition-colors',
      paired
        ? pairColor(pairIdx)
        : active
        ? 'border-primary bg-primary/10 text-ink'
        : 'border-border bg-surface-2 text-ink',
      isDisabled && 'opacity-90',
    );

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-ink">{task.prompt}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {left.map((item, i) => {
            const pi = leftPairIndex(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => tapLeft(i)}
                disabled={isDisabled}
                className={cellClass(activeLeft === i, pi !== -1, pi)}
              >
                {item}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {right.map((item, j) => {
            const pi = rightPairIndex(j);
            return (
              <button
                key={j}
                type="button"
                onClick={() => tapRight(j)}
                disabled={isDisabled || (activeLeft === null && pi === -1)}
                className={cellClass(false, pi !== -1, pi)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {!isDisabled && pairs.length > 0 && (
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Қайтадан бастау
        </button>
      )}
    </div>
  );
}

Matching.isValid = (value, task) => {
  const needed = (task?.left_items ?? []).length;
  return !!(value?.pairs && value.pairs.length === needed);
};
