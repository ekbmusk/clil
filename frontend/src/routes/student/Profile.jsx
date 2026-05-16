import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import * as lessonsApi from '../../api/lessons';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { useUserStore } from '../../store/userStore';
import { useLessonStore } from '../../store/lessonStore';
import { mainButton, backButton } from '../../lib/telegram';

function Avatar({ user }) {
  const [failed, setFailed] = useState(false);
  const initial = (user?.first_name || user?.username || '?').trim().charAt(0).toUpperCase();
  const src = user?.id ? `/api/users/${user.id}/avatar` : null;

  if (!src || failed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-3xl font-bold text-primary-soft">
        {initial}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={user?.first_name || 'avatar'}
      onError={() => setFailed(true)}
      className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/30"
    />
  );
}

function StatTile({ icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center">
      <div className="text-xl">{icon}</div>
      <div className="mt-1 font-mono text-xl font-bold text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-faint">{sub}</div>}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const lessons = useLessonStore((s) => s.lessons);
  const setLessons = useLessonStore((s) => s.setLessons);
  const [loading, setLoading] = useState(lessons.length === 0);
  const [error, setError] = useState(null);

  useEffect(() => {
    mainButton.hide();
    backButton.hide();
    let cancelled = false;
    (async () => {
      try {
        const data = await lessonsApi.list();
        if (!cancelled) setLessons(data ?? []);
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Қате');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLessons]);

  const stats = useMemo(() => {
    const total = lessons.length;
    const withProgress = lessons.filter((l) => l.my_progress?.correct_count || l.my_progress?.completed_at);
    const completed = lessons.filter((l) => l.my_progress?.completed_at).length;
    const avgAccuracy = withProgress.length
      ? Math.round(
          (withProgress.reduce((s, l) => s + (l.my_progress?.accuracy ?? 0), 0) /
            withProgress.length) *
            100,
        )
      : 0;
    return { total, completed, avgAccuracy, started: withProgress.length };
  }, [lessons]);

  const inProgress = useMemo(
    () =>
      lessons
        .filter((l) => (l.my_progress?.correct_count || l.my_progress?.completed_at))
        .sort(
          (a, b) =>
            (b.my_progress?.accuracy ?? 0) - (a.my_progress?.accuracy ?? 0),
        ),
    [lessons],
  );

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Оқушы';
  const handle = user?.username ? `@${user.username}` : null;

  return (
    <div className="container-app space-y-4 py-4 pb-24">
      <Card className="flex items-center gap-4">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-ink">{displayName}</h1>
          {handle && <p className="truncate text-sm text-ink-muted">{handle}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip tone="primary">{user?.role === 'teacher' ? 'Мұғалім' : 'Оқушы'}</Chip>
            {user?.telegram_id && (
              <Chip>
                <span className="font-mono">ID {user.telegram_id}</span>
              </Chip>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon="🔥"
          value={user?.streak_count ?? 0}
          label="Стрик"
          sub="күн"
        />
        <StatTile
          icon="✅"
          value={stats.completed}
          label="Аяқталды"
          sub={`/ ${stats.total}`}
        />
        <StatTile
          icon="🎯"
          value={`${stats.avgAccuracy}%`}
          label="Дәлдік"
          sub={stats.started ? `${stats.started} сабақ` : '—'}
        />
      </div>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Менің прогресім
        </h2>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && inProgress.length === 0 && (
          <Card className="text-center">
            <p className="text-ink-muted">Әзірге сабақ басталмаған.</p>
            <div className="mt-3 flex justify-center">
              <Button size="sm" onClick={() => navigate('/')}>
                Сабақтарды ашу
              </Button>
            </div>
          </Card>
        )}

        {inProgress.map((lesson) => {
          const progress = lesson.my_progress || {};
          const accuracy = Math.round((progress.accuracy ?? 0) * 100);
          const done = !!progress.completed_at;
          return (
            <button
              key={lesson.external_id}
              type="button"
              onClick={() => navigate(`/lesson/${lesson.external_id}`)}
              className="block w-full rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2/40"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Chip tone="primary">{lesson.external_id}</Chip>
                  {done && <Chip tone="success">Дайын</Chip>}
                </div>
                <span className="font-mono text-xs font-semibold text-ink">{accuracy}%</span>
              </div>
              <p className="truncate text-sm font-semibold text-ink">{lesson.title}</p>
              <div className="mt-2">
                <ProgressBar
                  value={accuracy}
                  max={100}
                  tone={accuracy >= 70 ? 'success' : 'primary'}
                />
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
