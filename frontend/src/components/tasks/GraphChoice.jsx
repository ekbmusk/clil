import { useState } from 'react';
import clsx from 'clsx';

// answer shape: { selected_index: number }
// task.payload extra fields: image_url, image_description.
// image_url may be an absolute URL or a relative path served from
// /graphs/<file>.svg by Vercel (public/graphs/).
function resolveImage(src) {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  // Strip any leading slash so we don't accidentally double it.
  return '/' + src.replace(/^\/+/, '');
}

export default function GraphChoice({ task, value, onChange, isDisabled }) {
  const options = task.options ?? [];
  const selected = value?.selected_index;
  const imgSrc = resolveImage(task.image_url);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-ink">{task.prompt}</p>

      {imgSrc && !imgFailed ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-white/95 p-2">
          <img
            src={imgSrc}
            alt={task.image_description ?? 'Graph'}
            className="mx-auto block max-h-64 w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center text-sm text-ink-muted">
          📊 {task.image_description ?? 'График сипаттамасы жоқ'}
        </div>
      )}

      {task.language_tip && (
        <p className="rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-ink-muted">
          <span className="font-semibold text-primary-soft">Tip: </span>
          {task.language_tip}
        </p>
      )}

      <div className="space-y-2.5">
        {options.map((opt, idx) => {
          const isSelected = selected === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange({ selected_index: idx })}
              className={clsx(
                'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                'min-h-[56px] disabled:cursor-not-allowed',
                isSelected
                  ? 'border-primary bg-primary/10 text-ink'
                  : 'border-border bg-surface-2 text-ink hover:bg-surface-2/80',
              )}
            >
              <span
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  isSelected
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-ink-muted',
                )}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-[15px] leading-snug">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

GraphChoice.isValid = (value) =>
  value && typeof value.selected_index === 'number';
