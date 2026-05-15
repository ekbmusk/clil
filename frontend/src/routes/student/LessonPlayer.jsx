import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import * as lessonsApi from '../../api/lessons';
import * as attemptsApi from '../../api/attempts';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import ProgressBar from '../../components/ui/ProgressBar';
import FeedbackPanel from '../../components/ui/FeedbackPanel';
import TaskRenderer, { isAnswerValid } from '../../components/tasks/TaskRenderer';
import { useLessonStore } from '../../store/lessonStore';

function haptic(kind) {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(kind);
  } catch {
    /* ignore */
  }
}

export default function LessonPlayer() {
  const { externalId } = useParams();
  const navigate = useNavigate();

  const currentLesson = useLessonStore((s) => s.currentLesson);
  const setCurrentLesson = useLessonStore((s) => s.setCurrentLesson);
  const currentTaskIndex = useLessonStore((s) => s.currentTaskIndex);
  const goNext = useLessonStore((s) => s.goNext);
  const attemptResults = useLessonStore((s) => s.attemptResults);
  const recordResult = useLessonStore((s) => s.recordResult);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);

  // Load lesson
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await lessonsApi.get(externalId);
        if (cancelled) return;
        setCurrentLesson(data);
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Сабақты ашу мүмкін болмады');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [externalId, setCurrentLesson]);

  // Reset answer when task changes
  useEffect(() => {
    setAnswer(undefined);
  }, [currentTaskIndex, currentLesson?.external_id]);

  const tasks = currentLesson?.tasks ?? [];
  const task = tasks[currentTaskIndex];
  const result = task ? attemptResults[task.external_id] : null;
  const isLast = task && currentTaskIndex === tasks.length - 1;

  const canCheck = !!task && !result && !submitting && isAnswerValid(task, answer);

  const onSubmit = async () => {
    if (!task || result) return;
    setSubmitting(true);
    try {
      const r = await attemptsApi.submit(task.external_id, answer);
      recordResult(task.external_id, r);
      haptic(r.is_correct ? 'success' : 'error');
    } catch (e) {
      // Surface error inline; pretend not-correct so user can move on.
      const fallback = {
        is_correct: false,
        correct_value: null,
        feedback: e.message ?? 'Сервермен байланыс үзілді',
        language_tip: null,
      };
      recordResult(task.external_id, fallback);
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  };

  const onContinue = async () => {
    if (!isLast) {
      goNext();
      return;
    }
    // Finalize and show summary.
    try {
      const fin = await attemptsApi.finalizeLesson(currentLesson.external_id);
      setSummary(fin ?? buildLocalSummary());
    } catch {
      setSummary(buildLocalSummary());
    }
    haptic('success');
  };

  const buildLocalSummary = () => {
    const total = tasks.length;
    const correct = tasks.reduce(
      (acc, t) => acc + (attemptResults[t.external_id]?.is_correct ? 1 : 0),
      0,
    );
    return {
      total_count: total,
      correct_count: correct,
      accuracy: total ? correct / total : 0,
    };
  };

  if (loading) {
    return (
      <div className="container-app py-8 text-center text-ink-muted">Жүктелуде…</div>
    );
  }

  if (error || !currentLesson) {
    return (
      <div className="container-app py-8 text-center">
        <p className="text-danger">{error ?? 'Сабақ табылмады'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
          Артқа
        </Button>
      </div>
    );
  }

  // Summary screen
  if (summary) {
    const pct = Math.round((summary.accuracy ?? 0) * 100);
    return (
      <div className="container-app flex min-h-[80vh] flex-col items-center justify-center space-y-6 py-8 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-bold text-ink">Жарайсың!</h2>
        <p className="text-ink-muted">{currentLesson.title} аяқталды</p>
        <div className="w-full max-w-xs rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm uppercase tracking-wider text-ink-muted">Дәлдік</p>
          <p className="my-2 text-5xl font-bold text-primary-soft">{pct}%</p>
          <p className="text-sm text-ink-muted">
            {summary.correct_count} / {summary.total_count} дұрыс
          </p>
        </div>
        <Button size="lg" onClick={() => navigate('/')}>
          Сабақтарға қайту
        </Button>
      </div>
    );
  }

  // Active task screen
  return (
    <div className="container-app flex min-h-[calc(100vh-4rem)] flex-col py-4 pb-32">
      {/* Header / progress */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-ink-muted hover:text-ink"
          >
            ← Шығу
          </button>
          <span className="font-mono text-xs text-ink-muted">
            {currentTaskIndex + 1} / {tasks.length}
          </span>
        </div>
        <ProgressBar
          value={currentTaskIndex + (result ? 1 : 0)}
          max={tasks.length}
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {currentLesson.topic && <Chip tone="primary">{currentLesson.topic}</Chip>}
          {currentLesson.physics_target && (
            <Chip>⚛ {currentLesson.physics_target}</Chip>
          )}
          {currentLesson.language_target && (
            <Chip>🗣 {currentLesson.language_target}</Chip>
          )}
        </div>
      </div>

      {/* Task body */}
      <div className="flex-1 animate-fade-up">
        <TaskRenderer
          task={task}
          value={answer}
          onChange={setAnswer}
          isDisabled={!!result}
        />
      </div>

      {/* Feedback */}
      {result && (
        <div className="mt-4">
          <FeedbackPanel result={result} />
        </div>
      )}

      {/* Footer action */}
      <div className="sticky bottom-0 left-0 right-0 mt-6 -mx-4 border-t border-border bg-bg/95 px-4 pb-4 pt-3 backdrop-blur">
        {!result ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!canCheck}
            onClick={onSubmit}
          >
            {submitting ? 'Тексеру…' : 'Тексеру'}
          </Button>
        ) : (
          <Button
            size="lg"
            variant={result.is_correct ? 'success' : 'primary'}
            className="w-full"
            onClick={onContinue}
          >
            {isLast ? 'Қорытынды' : 'Жалғастыру'}
          </Button>
        )}
      </div>
    </div>
  );
}
