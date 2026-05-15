import clsx from 'clsx';

export default function FeedbackPanel({ result }) {
  if (!result) return null;
  const isCorrect = !!result.is_correct;
  return (
    <div
      className={clsx(
        'animate-slide-up rounded-2xl border p-4 text-sm',
        isCorrect
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-danger/40 bg-danger/10 text-danger',
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-base font-bold">
          {isCorrect ? 'Дұрыс!' : 'Қате'}
        </p>
        {!isCorrect && result.correct_value !== undefined && result.correct_value !== null && (
          <p className="text-xs text-ink-muted">
            Дұрысы:{' '}
            <span className="font-mono text-ink">
              {typeof result.correct_value === 'object'
                ? JSON.stringify(result.correct_value)
                : String(result.correct_value)}
            </span>
          </p>
        )}
      </div>
      {result.feedback && (
        <p className="mt-2 text-ink/90">{result.feedback}</p>
      )}
      {result.language_tip && (
        <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-ink-muted">
          <span className="mr-1 font-semibold text-primary-soft">Tip:</span>
          {result.language_tip}
        </div>
      )}
    </div>
  );
}
