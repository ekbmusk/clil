import clsx from 'clsx';

// answer shape: { selected_index: number }
export default function SingleChoice({ task, value, onChange, isDisabled }) {
  const options = task.options ?? [];
  const selected = value?.selected_index;

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-ink">{task.prompt}</p>

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

// Helper used by the player to decide if the answer is submittable.
SingleChoice.isValid = (value) =>
  value && typeof value.selected_index === 'number';
