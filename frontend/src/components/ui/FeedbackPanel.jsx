import clsx from 'clsx';

function CorrectValue({ value }) {
  if (value === undefined || value === null) return null;
  // Array of strings → numbered list (ordering / matching).
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return (
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink/90">
        {value.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    );
  }
  // Object (classification: item → category).
  if (typeof value === 'object' && !Array.isArray(value)) {
    return (
      <ul className="mt-2 space-y-1 text-ink/90">
        {Object.entries(value).map(([k, v]) => (
          <li key={k}>
            <span className="font-semibold">{k}</span> → {String(v)}
          </li>
        ))}
      </ul>
    );
  }
  return <span className="font-mono text-ink">{String(value)}</span>;
}

export default function FeedbackPanel({ result }) {
  if (!result) return null;
  const isCorrect = !!result.is_correct;
  const showCorrect =
    !isCorrect && result.correct_value !== undefined && result.correct_value !== null;
  return (
    <div
      className={clsx(
        'animate-slide-up rounded-2xl border p-4 text-sm',
        isCorrect
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-danger/40 bg-danger/10 text-danger',
      )}
    >
      <p className="text-base font-bold">
        {isCorrect ? 'Дұрыс!' : 'Қате'}
      </p>
      {result.feedback && (
        <p className="mt-2 text-ink/90">{result.feedback}</p>
      )}
      {showCorrect && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-ink-muted">
            Дұрыс жауап
          </p>
          <CorrectValue value={result.correct_value} />
        </div>
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
