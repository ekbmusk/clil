import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import * as teacherApi from '../../api/teacher';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import ProgressBar from '../../components/ui/ProgressBar';
import AttemptDetail from './AttemptDetail';

const TYPE_ICON = {
  single_choice: '🔘',
  fill_blank: '✏️',
  matching: '🔗',
  classification: '📊',
  ordering: '🔢',
  graph_choice: '📈',
};

export default function StudentDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openAttemptId, setOpenAttemptId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const d = await teacherApi.studentProgress(userId);
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
  }, [userId]);

  if (loading) {
    return <div className="container-app py-8 text-center text-ink-muted">Жүктелуде…</div>;
  }
  if (error || !data) {
    return (
      <div className="container-app py-8 text-center">
        <p className="text-danger">{error ?? 'Оқушы табылмады'}</p>
        <button
          type="button"
          onClick={() => navigate('/teacher/students')}
          className="mt-4 text-sm text-ink-muted hover:text-ink"
        >
          ← Оқушыларға қайту
        </button>
      </div>
    );
  }

  const u = data.user;
  const lessons = data.lessons || [];
  const recent = data.recent_attempts || [];

  return (
    <div className="container-app space-y-4 py-4 pb-24">
      <button
        type="button"
        onClick={() => navigate('/teacher/students')}
        className="text-sm text-ink-muted hover:text-ink"
      >
        ← Оқушылар
      </button>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary-soft">
            {(u.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-ink">{u.name}</h1>
            <p className="text-xs text-ink-muted">
              {u.username ? `@${u.username} · ` : ''}TG: {u.telegram_id}
            </p>
          </div>
          <Chip tone="warn">🔥 {u.streak_count ?? 0}</Chip>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
          Сабақтар бойынша
        </h2>
        <div className="space-y-2">
          {lessons.length === 0 && (
            <Card className="text-center text-sm text-ink-muted">
              Сабақтар жоқ.
            </Card>
          )}
          {lessons.map((l) => {
            const pct = Math.round((l.accuracy ?? 0) * 100);
            const completed = !!l.completed_at;
            return (
              <Card key={l.external_id} className="py-3">
                <div className="flex items-center gap-3">
                  <Chip tone="primary">{l.external_id}</Chip>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{l.title}</p>
                    {l.topic && (
                      <p className="text-xs text-ink-muted">{l.topic}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-ink">
                      {l.correct_count}/{l.total_count || '—'}
                    </p>
                    <p className="text-xs text-ink-muted">{pct}%</p>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={pct}
                    max={100}
                    tone={completed ? 'success' : 'primary'}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wider text-ink-muted">
          Соңғы талпыныстар
        </h2>
        <div className="space-y-2">
          {recent.length === 0 && (
            <Card className="text-center text-sm text-ink-muted">
              Талпыныстар жоқ.
            </Card>
          )}
          {recent.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => setOpenAttemptId(a.id)}
              className="w-full text-left"
            >
              <Card className="py-3 transition-colors hover:bg-surface-2/40">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {TYPE_ICON[a.task?.type] ?? '•'}
                  </span>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-ink">
                      {a.task?.external_id} · {a.lesson?.title}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {new Date(a.created_at).toLocaleString('kk-KZ')}
                    </p>
                  </div>
                  <Chip tone={a.is_correct ? 'success' : 'danger'}>
                    {a.is_correct ? '✓' : '✗'}
                  </Chip>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </section>

      <AttemptDetail
        attemptId={openAttemptId}
        onClose={() => setOpenAttemptId(null)}
      />
    </div>
  );
}
