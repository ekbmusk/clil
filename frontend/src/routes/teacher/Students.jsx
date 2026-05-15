import { useEffect, useState } from 'react';

import * as teacherApi from '../../api/teacher';
import Card from '../../components/ui/Card';

export default function Students() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await teacherApi.students();
        if (!cancelled) setRows(data ?? []);
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Қате');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="container-app py-8 text-center text-ink-muted">Жүктелуде…</div>;
  }
  if (error) {
    return <div className="container-app py-8 text-center text-danger">{error}</div>;
  }

  return (
    <div className="container-app space-y-3 py-4 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-ink">Оқушылар</h1>
        <p className="text-sm text-ink-muted">Барлығы: {rows.length}</p>
      </header>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-2">Аты</th>
              <th className="px-3 py-2">Streak</th>
              <th className="px-3 py-2">Сабақтар</th>
              <th className="px-3 py-2">Дәлдік</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => setActive(s)}
                className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-2/40"
              >
                <td className="px-3 py-2 text-ink">
                  {s.name ?? `#${s.id}`}
                </td>
                <td className="px-3 py-2 text-ink-muted">{s.streak ?? 0}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {s.completed_lessons ?? 0}
                </td>
                <td className="px-3 py-2 font-mono text-ink">
                  {Math.round((s.avg_accuracy ?? 0) * 100)}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-ink-muted">
                  Әзірге оқушылар жоқ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {active && (
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">
                {active.name ?? `#${active.id}`}
              </h2>
              <p className="text-xs text-ink-muted">Telegram ID: {active.telegram_id ?? '—'}</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="text-sm text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-ink-muted">Streak</p>
              <p className="text-xl font-bold text-ink">{active.streak ?? 0}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-ink-muted">Сабақ</p>
              <p className="text-xl font-bold text-ink">{active.completed_lessons ?? 0}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-ink-muted">Дәлдік</p>
              <p className="text-xl font-bold text-ink">
                {Math.round((active.avg_accuracy ?? 0) * 100)}%
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
