import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';

import * as lessonsApi from '../../api/lessons';
import * as attemptsApi from '../../api/attempts';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import ProgressBar from '../../components/ui/ProgressBar';
import FeedbackPanel from '../../components/ui/FeedbackPanel';
import TaskRenderer, { isAnswerValid } from '../../components/tasks/TaskRenderer';
import { useLessonStore } from '../../store/lessonStore';
import { useUserStore } from '../../store/userStore';
import {
  mainButton,
  backButton,
  confirm as tgConfirm,
  isTelegramWebApp,
} from '../../lib/telegram';

const HAS_NATIVE_BUTTONS = isTelegramWebApp();

function haptic(kind) {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(kind);
  } catch {
    /* ignore */
  }
}

const TASK_TYPE_ICONS = {
  single_choice: '🔘',
  fill_blank: '✏️',
  matching: '🔗',
  classification: '📊',
  ordering: '🔢',
};

function summaryHeadline(accuracy, isReplay) {
  if (accuracy >= 1) return { emoji: '🎯', text: 'Керемет!' };
  if (accuracy >= 0.7) return { emoji: '💪', text: 'Жарайсың!' };
  if (isReplay)
    return { emoji: '🔁', text: 'Қайталау пайдалы — алға қарай!' };
  return { emoji: '📚', text: 'Бастамасы жақсы. Қателерді қайталайық.' };
}

function fireConfetti(level) {
  // level: 'full' | 'half' | 'none'
  if (level === 'none') return;
  const opts = level === 'full'
    ? { particleCount: 140, spread: 90, origin: { y: 0.6 }, scalar: 1.1 }
    : { particleCount: 60, spread: 55, origin: { y: 0.6 }, scalar: 0.9 };
  try {
    confetti(opts);
    if (level === 'full') {
      setTimeout(() => confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.7 } }), 180);
      setTimeout(() => confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.7 } }), 360);
    }
  } catch {
    /* canvas-confetti is best-effort */
  }
}

export default function LessonPlayer() {
  const { externalId } = useParams();
  const navigate = useNavigate();

  const lessons = useLessonStore((s) => s.lessons);
  const currentLesson = useLessonStore((s) => s.currentLesson);
  const setCurrentLesson = useLessonStore((s) => s.setCurrentLesson);
  const currentTaskIndex = useLessonStore((s) => s.currentTaskIndex);
  const goNext = useLessonStore((s) => s.goNext);
  const attemptResults = useLessonStore((s) => s.attemptResults);
  const recordResult = useLessonStore((s) => s.recordResult);
  const replayQueue = useLessonStore((s) => s.replayQueue);
  const startReplay = useLessonStore((s) => s.startReplay);

  const setUser = useUserStore((s) => s.setUser);
  const user = useUserStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [streakDelta, setStreakDelta] = useState(0);
  const wasReplayRef = useRef(false);

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

  // BackButton with exit confirmation. Only active while inside the player
  // (not summary). On summary we let MainButton drive the next action.
  useEffect(() => {
    if (summary) {
      backButton.hide();
      return undefined;
    }
    const onBack = async () => {
      const ok = await tgConfirm('Сабақтан шығасың ба? Прогресс сақталады.');
      if (ok) navigate('/');
    };
    backButton.show(onBack);
    return () => backButton.hide();
  }, [summary, navigate]);

  // The active task list — full lesson, or just the replay subset.
  const activeTasks = useMemo(() => {
    const all = currentLesson?.tasks ?? [];
    if (!replayQueue) return all;
    const byId = new Map(all.map((t) => [t.external_id, t]));
    return replayQueue.map((id) => byId.get(id)).filter(Boolean);
  }, [currentLesson, replayQueue]);

  const task = activeTasks[currentTaskIndex];
  const result = task ? attemptResults[task.external_id] : null;
  const isLast = task && currentTaskIndex === activeTasks.length - 1;
  const canCheck = !!task && !result && !submitting && isAnswerValid(task, answer);

  const onSubmit = async () => {
    if (!task || result) return;
    setSubmitting(true);
    try {
      const r = await attemptsApi.submit(task.external_id, answer);
      recordResult(task.external_id, r);
      haptic(r.is_correct ? 'success' : 'error');
    } catch (e) {
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
    wasReplayRef.current = !!replayQueue;
    try {
      const fin = await attemptsApi.finalizeLesson(currentLesson.external_id);
      const next = fin ?? buildLocalSummary();
      setSummary(next);
      // Streak toast if it went up vs. cached user.
      const oldStreak = user?.streak_count ?? 0;
      const newStreak = fin?.streak_count ?? oldStreak;
      if (newStreak > oldStreak) {
        setStreakDelta(newStreak - oldStreak);
        if (user) setUser({ ...user, streak_count: newStreak });
        setTimeout(() => setStreakDelta(0), 2200);
      }
      // Confetti based on accuracy of the WHOLE lesson (fin.accuracy).
      const acc = next.accuracy ?? 0;
      fireConfetti(acc >= 1 ? 'full' : acc >= 0.7 ? 'half' : 'none');
    } catch {
      setSummary(buildLocalSummary());
    }
    haptic('success');
  };

  const buildLocalSummary = () => {
    const all = currentLesson?.tasks ?? [];
    const total = all.length;
    const correct = all.reduce(
      (acc, t) => acc + (attemptResults[t.external_id]?.is_correct ? 1 : 0),
      0,
    );
    return {
      total_count: total,
      correct_count: correct,
      accuracy: total ? correct / total : 0,
    };
  };

  const replayWrong = () => {
    const all = currentLesson?.tasks ?? [];
    const wrongIds = all
      .filter((t) => attemptResults[t.external_id]?.is_correct === false)
      .map((t) => t.external_id);
    if (wrongIds.length === 0) return;
    setSummary(null);
    startReplay(wrongIds);
    setAnswer(undefined);
  };

  const goToNextLesson = () => {
    const all = lessons ?? [];
    const idx = all.findIndex((l) => l.external_id === currentLesson?.external_id);
    if (idx >= 0 && idx + 1 < all.length) {
      const next = all[idx + 1];
      navigate(`/lesson/${next.external_id}`);
    } else {
      navigate('/');
    }
  };

  // MainButton wiring — re-set on every relevant state change.
  useEffect(() => {
    if (summary) {
      const all = currentLesson?.tasks ?? [];
      const wrongCount = all.filter(
        (t) => attemptResults[t.external_id]?.is_correct === false,
      ).length;
      const idx = lessons.findIndex(
        (l) => l.external_id === currentLesson?.external_id,
      );
      const hasNextLesson = idx >= 0 && idx + 1 < lessons.length;
      if (wrongCount > 0 && !wasReplayRef.current) {
        mainButton.set({
          text: `Қателерді қайталау (${wrongCount})`,
          color: '#6C63FF',
          textColor: '#FFFFFF',
          onClick: replayWrong,
        });
      } else if (hasNextLesson) {
        mainButton.set({
          text: 'Келесі сабақ',
          color: '#22C55E',
          textColor: '#FFFFFF',
          onClick: goToNextLesson,
        });
      } else {
        mainButton.set({
          text: 'Сабақтарға қайту',
          color: '#6C63FF',
          textColor: '#FFFFFF',
          onClick: () => navigate('/'),
        });
      }
      return () => mainButton.hide();
    }

    if (!task) {
      mainButton.hide();
      return undefined;
    }
    if (!result) {
      mainButton.set({
        text: submitting ? 'Тексеру…' : 'Тексеру',
        color: '#6C63FF',
        textColor: '#FFFFFF',
        disabled: !canCheck,
        onClick: onSubmit,
      });
    } else {
      mainButton.set({
        text: isLast ? 'Қорытынды' : 'Жалғастыру',
        color: result.is_correct ? '#22C55E' : '#6C63FF',
        textColor: '#FFFFFF',
        onClick: onContinue,
      });
    }
    return () => mainButton.hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, task, result, canCheck, isLast, submitting, attemptResults]);

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
    const headline = summaryHeadline(summary.accuracy ?? 0, wasReplayRef.current);
    const all = currentLesson.tasks ?? [];
    const wrongCount = all.filter(
      (t) => attemptResults[t.external_id]?.is_correct === false,
    ).length;
    const idx = lessons.findIndex(
      (l) => l.external_id === currentLesson.external_id,
    );
    const hasNextLesson = idx >= 0 && idx + 1 < lessons.length;
    const showReplay = wrongCount > 0 && !wasReplayRef.current;

    return (
      <div
        className={
          'container-app flex min-h-[80vh] flex-col items-stretch space-y-6 py-6 ' +
          (HAS_NATIVE_BUTTONS ? 'pb-8' : 'pb-32')
        }
      >
        <div className="text-center">
          <div className="text-5xl">{headline.emoji}</div>
          <h2 className="mt-2 text-2xl font-bold text-ink">{headline.text}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {currentLesson.title} аяқталды
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Дәлдік</p>
          <p className="my-2 text-5xl font-bold text-primary-soft">{pct}%</p>
          <p className="text-sm text-ink-muted">
            {summary.correct_count} / {summary.total_count} дұрыс
          </p>
        </div>

        {/* Per-task breakdown */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-ink-muted">
            Тапсырмалар
          </p>
          <ul className="space-y-2">
            {all.map((t, i) => {
              const r = attemptResults[t.external_id];
              const ok = r?.is_correct === true;
              const wrong = r?.is_correct === false;
              const promptText =
                (t.payload?.prompt || t.payload?.prompt_template || '')
                  .slice(0, 48) || `Тапсырма ${i + 1}`;
              return (
                <li
                  key={t.external_id}
                  className="flex items-center gap-3 rounded-xl bg-surface-2/40 px-3 py-2 text-sm"
                >
                  <span className="w-5 font-mono text-xs text-ink-muted">
                    {i + 1}
                  </span>
                  <span className="text-base">
                    {TASK_TYPE_ICONS[t.type] ?? '•'}
                  </span>
                  <span className="flex-1 truncate text-ink/90">
                    {promptText}
                  </span>
                  <span
                    className={
                      ok
                        ? 'text-success'
                        : wrong
                          ? 'text-danger'
                          : 'text-ink-muted'
                    }
                  >
                    {ok ? '✓' : wrong ? '✗' : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {!HAS_NATIVE_BUTTONS && (
          <div className="sticky bottom-0 -mx-4 mt-auto space-y-2 border-t border-border bg-bg/95 px-4 pb-4 pt-3 backdrop-blur">
            {showReplay ? (
              <Button
                size="lg"
                className="w-full"
                onClick={replayWrong}
              >
                Қателерді қайталау ({wrongCount})
              </Button>
            ) : hasNextLesson ? (
              <Button
                size="lg"
                variant="success"
                className="w-full"
                onClick={goToNextLesson}
              >
                Келесі сабақ →
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Сабақтарға қайту
              </Button>
            )}
            <Button
              size="md"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Сабақтар тізімі
            </Button>
          </div>
        )}

        {/* Streak +1 toast */}
        {streakDelta > 0 && (
          <div className="pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2 animate-slide-up rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn shadow-lg">
            🔥 +{streakDelta} streak
          </div>
        )}
      </div>
    );
  }

  // Active task screen
  const totalActive = activeTasks.length;
  return (
    <div
      className={
        'container-app flex min-h-[calc(100vh-4rem)] flex-col py-4 ' +
        (HAS_NATIVE_BUTTONS ? 'pb-8' : 'pb-32')
      }
    >
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
            {currentTaskIndex + 1} / {totalActive}
            {replayQueue && (
              <span className="ml-2 rounded-full bg-warn/20 px-2 py-0.5 text-warn">
                қайталау
              </span>
            )}
          </span>
        </div>
        <ProgressBar
          value={currentTaskIndex + (result ? 1 : 0)}
          max={totalActive}
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

      {/* Footer action — hidden when Telegram's native MainButton is rendering
          its own one. Outside Telegram (regular browser preview) we keep
          this inline button so the flow stays usable. */}
      {!HAS_NATIVE_BUTTONS && (
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
      )}
    </div>
  );
}
