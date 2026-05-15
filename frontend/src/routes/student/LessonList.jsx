import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import * as lessonsApi from '../../api/lessons';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { useLessonStore } from '../../store/lessonStore';
import { mainButton, backButton } from '../../lib/telegram';

export default function LessonList() {
  const navigate = useNavigate();
  const setLessons = useLessonStore((s) => s.setLessons);
  const lessons = useLessonStore((s) => s.lessons);
  const [loading, setLoading] = useState(lessons.length === 0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Make sure stale player buttons don't leak onto the list screen.
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

  return (
    <div className="container-app space-y-4 py-4 pb-24">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-ink">Сабақтар</h1>
        <p className="text-sm text-ink-muted">Физиканы ағылшын тілінде үйрен</p>
      </header>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && lessons.length === 0 && (
        <Card className="text-center">
          <p className="text-ink-muted">Әзірге сабақтар жоқ.</p>
        </Card>
      )}

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const progress = lesson.my_progress || {};
          const accuracy = Math.round((progress.accuracy ?? 0) * 100);
          const started = !!progress.correct_count || progress.completed_at;
          return (
            <Card key={lesson.external_id} className="animate-fade-up">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Chip tone="primary">Сабақ {lesson.external_id}</Chip>
                {lesson.topic && <Chip>{lesson.topic}</Chip>}
              </div>

              <h2 className="text-lg font-bold text-ink">{lesson.title}</h2>
              {lesson.intro && (
                <p className="mt-1 text-sm text-ink-muted line-clamp-2">{lesson.intro}</p>
              )}

              <div className="mt-3 space-y-2 text-xs text-ink-muted">
                {lesson.physics_target && (
                  <p>
                    <span className="font-semibold text-ink/80">Physics:</span>{' '}
                    {lesson.physics_target}
                  </p>
                )}
                {lesson.language_target && (
                  <p>
                    <span className="font-semibold text-ink/80">Language:</span>{' '}
                    {lesson.language_target}
                  </p>
                )}
              </div>

              {started && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Дәлдік</span>
                    <span className="font-mono font-semibold text-ink">{accuracy}%</span>
                  </div>
                  <ProgressBar value={accuracy} max={100} tone={accuracy >= 70 ? 'success' : 'primary'} />
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  size="md"
                  onClick={() => navigate(`/lesson/${lesson.external_id}`)}
                >
                  {started ? 'Жалғастыру' : 'Бастау'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
