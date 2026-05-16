import { useEffect, useState } from 'react';

import * as teacherApi from '../../api/teacher';
import Chip from '../../components/ui/Chip';

const TYPE_LABEL = {
  single_choice: 'Single choice',
  fill_blank: 'Fill blank',
  matching: 'Matching',
  classification: 'Classification',
  ordering: 'Ordering',
  graph_choice: 'Graph choice',
};

function StudentAnswer({ type, payload }) {
  if (!payload) return <p className="text-ink-muted">—</p>;
  if (type === 'single_choice' || type === 'graph_choice') {
    return (
      <p className="text-ink">
        Таңдалған индекс: <span className="font-mono">{payload.selected_index ?? '—'}</span>
      </p>
    );
  }
  if (type === 'fill_blank') {
    return <p className="text-ink">«{payload.text ?? '—'}»</p>;
  }
  if (type === 'matching') {
    return (
      <ul className="space-y-1 text-ink/90">
        {(payload.pairs ?? []).map((p, i) => (
          <li key={i} className="font-mono text-sm">
            [{p[0]} ↔ {p[1]}]
          </li>
        ))}
      </ul>
    );
  }
  if (type === 'classification') {
    return (
      <ul className="space-y-1 text-ink/90">
        {Object.entries(payload.mapping ?? {}).map(([k, v]) => (
          <li key={k}>
            <span className="font-semibold">{k}</span> → {String(v)}
          </li>
        ))}
      </ul>
    );
  }
  if (type === 'ordering') {
    return (
      <ol className="list-decimal space-y-1 pl-5 text-ink/90">
        {(payload.order ?? []).map((idx, i) => (
          <li key={i} className="font-mono text-sm">
            index {idx}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <pre className="overflow-auto text-xs text-ink/80">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

function CorrectValue({ value }) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return (
      <ol className="list-decimal space-y-1 pl-5 text-ink/90">
        {value.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    );
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return (
      <ul className="space-y-1 text-ink/90">
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

export default function AttemptDetail({ attemptId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);
    (async () => {
      try {
        const d = await teacherApi.attemptDetail(attemptId);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Қате');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (!attemptId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-slide-up max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl sm:mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted">
              Талпыныс
            </p>
            <h2 className="text-xl font-bold text-ink">
              {data?.lesson?.title ?? '—'}
            </h2>
            <p className="text-xs text-ink-muted">
              {data?.user?.name} · {data?.task?.external_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            ✕
          </button>
        </div>

        {loading && <p className="text-center text-ink-muted">Жүктелуде…</p>}
        {error && <p className="text-center text-danger">{error}</p>}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Chip tone={data.is_correct ? 'success' : 'danger'}>
                {data.is_correct ? 'Дұрыс' : 'Қате'}
              </Chip>
              <Chip>{TYPE_LABEL[data.task?.type] ?? data.task?.type}</Chip>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-ink-muted">
                Сұрақ
              </p>
              <p className="mt-1 text-ink/90">
                {data.task?.payload?.prompt
                  ?? data.task?.payload?.prompt_template
                  ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-ink-muted">
                Оқушының жауабы
              </p>
              <div className="mt-1">
                <StudentAnswer
                  type={data.task?.type}
                  payload={data.answer_payload}
                />
              </div>
            </div>

            {!data.is_correct && (
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-muted">
                  Дұрыс жауап
                </p>
                <div className="mt-1">
                  <CorrectValue value={data.correct_value} />
                </div>
              </div>
            )}

            {data.feedback && (
              <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-ink-muted">
                {data.feedback}
              </div>
            )}

            <p className="text-[11px] text-ink-faint">
              {data.created_at
                ? new Date(data.created_at).toLocaleString('kk-KZ')
                : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
