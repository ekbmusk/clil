import { useEffect, useState } from 'react';

import * as teacherApi from '../../api/teacher';
import * as groupsApi from '../../api/groups';
import * as lessonsApi from '../../api/lessons';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import AttemptDetail from './AttemptDetail';

export default function Attempts() {
  const [filters, setFilters] = useState({ group_id: '', lesson_external_id: '' });
  const [groups, setGroups] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAttemptId, setOpenAttemptId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [g, l] = await Promise.all([groupsApi.list(), lessonsApi.list()]);
        setGroups(g ?? []);
        setLessons(l ?? []);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = {};
        if (filters.group_id) params.group_id = filters.group_id;
        if (filters.lesson_external_id) params.lesson_external_id = filters.lesson_external_id;
        const data = await teacherApi.attempts(params);
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
  }, [filters.group_id, filters.lesson_external_id]);

  return (
    <div className="container-app space-y-4 py-4 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-ink">Талпыныстар</h1>
        <p className="text-sm text-ink-muted">Соңғы тапсырмалар</p>
      </header>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-ink-muted">Топ</span>
            <select
              value={filters.group_id}
              onChange={(e) => setFilters((f) => ({ ...f, group_id: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
            >
              <option value="">Бәрі</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-ink-muted">Сабақ</span>
            <select
              value={filters.lesson_external_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, lesson_external_id: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
            >
              <option value="">Бәрі</option>
              {lessons.map((l) => (
                <option key={l.external_id} value={l.external_id}>
                  {l.external_id} · {l.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {loading && <p className="text-center text-ink-muted">Жүктелуде…</p>}
      {error && <p className="text-center text-danger">{error}</p>}

      <div className="space-y-2">
        {rows.map((a, i) => (
          <button
            type="button"
            key={a.id ?? i}
            onClick={() => a.id && setOpenAttemptId(a.id)}
            className="w-full text-left"
          >
            <Card className="py-3 transition-colors hover:bg-surface-2/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {a.user?.name ?? a.user?.telegram_id ?? '—'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {a.task?.external_id} · {a.task?.type ?? '—'}
                    {a.lesson?.title ? ` · ${a.lesson.title}` : ''}
                  </p>
                </div>
                <Chip tone={a.is_correct ? 'success' : 'danger'}>
                  {a.is_correct ? 'Дұрыс' : 'Қате'}
                </Chip>
              </div>
              {a.created_at && (
                <p className="mt-2 text-[11px] text-ink-faint">
                  {new Date(a.created_at).toLocaleString('kk-KZ')}
                </p>
              )}
            </Card>
          </button>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-center text-ink-muted">Талпыныстар жоқ.</p>
        )}
      </div>

      <AttemptDetail
        attemptId={openAttemptId}
        onClose={() => setOpenAttemptId(null)}
      />
    </div>
  );
}
