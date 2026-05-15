import { useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';

// answer shape: { pairs: [[leftIdx, rightIdx], ...] }
export default function Matching({ task, value, onChange, isDisabled }) {
  const left = task.left_items ?? [];
  const right = task.right_items ?? [];
  const pairs = value?.pairs ?? [];

  const [activeLeft, setActiveLeft] = useState(null);

  const usedLeft = new Set(pairs.map((p) => p[0]));
  const usedRight = new Set(pairs.map((p) => p[1]));

  // Stable per-pair colors. Tailwind class + raw hex used for SVG strokes.
  const palette = [
    { cls: 'border-primary text-primary-soft bg-primary/10', stroke: '#6C63FF' },
    { cls: 'border-success text-success bg-success/10', stroke: '#22C55E' },
    { cls: 'border-warn text-warn bg-warn/10', stroke: '#F59E0B' },
    { cls: 'border-danger text-danger bg-danger/10', stroke: '#EF4444' },
    { cls: 'border-primary-soft text-primary-soft bg-primary-soft/10', stroke: '#A78BFA' },
  ];
  const pairColor = (idx) => palette[idx % palette.length].cls;
  const pairStroke = (idx) => palette[idx % palette.length].stroke;
  const leftPairIndex = (li) => pairs.findIndex((p) => p[0] === li);
  const rightPairIndex = (ri) => pairs.findIndex((p) => p[1] === ri);

  // Refs for drawing connecting lines.
  const containerRef = useRef(null);
  const leftRefs = useRef([]);
  const rightRefs = useRef([]);
  const [lines, setLines] = useState([]);

  useLayoutEffect(() => {
    const compute = () => {
      const root = containerRef.current;
      if (!root) return;
      const rootRect = root.getBoundingClientRect();
      const next = pairs.map(([li, ri], pi) => {
        const lEl = leftRefs.current[li];
        const rEl = rightRefs.current[ri];
        if (!lEl || !rEl) return null;
        const lr = lEl.getBoundingClientRect();
        const rr = rEl.getBoundingClientRect();
        return {
          key: `${li}-${ri}-${pi}`,
          x1: lr.right - rootRect.left,
          y1: lr.top + lr.height / 2 - rootRect.top,
          x2: rr.left - rootRect.left,
          y2: rr.top + rr.height / 2 - rootRect.top,
          stroke: pairStroke(pi),
        };
      }).filter(Boolean);
      setLines(next);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs, left.length, right.length]);

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

      <div ref={containerRef} className="relative">
        <div className="grid grid-cols-[1fr_56px_1fr] items-stretch gap-x-2 gap-y-2">
          <div className="col-start-1 space-y-2">
            {left.map((item, i) => {
              const pi = leftPairIndex(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => tapLeft(i)}
                  disabled={isDisabled}
                  ref={(el) => (leftRefs.current[i] = el)}
                  className={cellClass(activeLeft === i, pi !== -1, pi)}
                >
                  {item}
                </button>
              );
            })}
          </div>
          {/* Spacer column where the SVG lines render. */}
          <div aria-hidden className="col-start-2" />
          <div className="col-start-3 space-y-2">
            {right.map((item, j) => {
              const pi = rightPairIndex(j);
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => tapRight(j)}
                  disabled={isDisabled || (activeLeft === null && pi === -1)}
                  ref={(el) => (rightRefs.current[j] = el)}
                  className={cellClass(false, pi !== -1, pi)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connecting lines overlay. pointer-events:none so clicks pass through. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {lines.map((l) => (
            <line
              key={l.key}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={l.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}
        </svg>
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
