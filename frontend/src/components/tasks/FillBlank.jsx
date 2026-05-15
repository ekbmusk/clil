import { useEffect, useRef } from 'react';

// answer shape: { text: string }
export default function FillBlank({ task, value, onChange, isDisabled }) {
  const inputRef = useRef(null);
  const template = task.prompt_template ?? '';
  // Split on the first ___ occurrence; surrounding text rendered around the input.
  const [before, after] = template.includes('___')
    ? [template.slice(0, template.indexOf('___')), template.slice(template.indexOf('___') + 3)]
    : [template, ''];

  useEffect(() => {
    if (!isDisabled) {
      inputRef.current?.focus();
    }
  }, [isDisabled, task.external_id]);

  const text = value?.text ?? '';

  return (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-wider text-ink-muted">Fill in the blank</p>

      <div className="rounded-2xl border border-border bg-surface-2 p-4 text-lg leading-relaxed text-ink">
        <span>{before}</span>
        <input
          ref={inputRef}
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          disabled={isDisabled}
          value={text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="mx-1 inline-block min-w-[120px] max-w-full rounded-md border-b-2 border-primary bg-transparent px-2 py-1 text-center font-semibold text-primary-soft outline-none transition-colors focus:border-primary-soft disabled:opacity-60"
          placeholder="…"
        />
        <span>{after}</span>
      </div>

      {task.language_tip && (
        <p className="rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-ink-muted">
          <span className="font-semibold text-primary-soft">Tip: </span>
          {task.language_tip}
        </p>
      )}
    </div>
  );
}

FillBlank.isValid = (value) => !!(value?.text && value.text.trim());
