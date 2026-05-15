import { useEffect, useState } from 'react';

import * as lessonsApi from '../../api/lessons';
import * as teacherApi from '../../api/teacher';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';

const TASK_TYPES = [
  'single_choice',
  'fill_blank',
  'matching',
  'classification',
  'ordering',
];

function TaskFields({ task, onChange }) {
  const payload = task.payload ?? {};
  const set = (patch) => onChange({ ...task, payload: { ...payload, ...patch } });

  if (task.type === 'single_choice') {
    return (
      <div className="space-y-2 text-sm">
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="Prompt"
          value={payload.prompt ?? ''}
          onChange={(e) => set({ prompt: e.target.value })}
        />
        <div className="space-y-2">
          {(payload.options ?? ['', '', '', '']).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                checked={payload.correct_index === i}
                onChange={() => set({ correct_index: i })}
                className="accent-primary"
              />
              <input
                className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = (payload.options ?? ['', '', '', '']).slice();
                  next[i] = e.target.value;
                  set({ options: next });
                }}
              />
            </div>
          ))}
        </div>
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="feedback_right"
          value={payload.feedback_right ?? ''}
          onChange={(e) => set({ feedback_right: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="feedback_wrong"
          value={payload.feedback_wrong ?? ''}
          onChange={(e) => set({ feedback_wrong: e.target.value })}
        />
      </div>
    );
  }

  if (task.type === 'fill_blank') {
    return (
      <div className="space-y-2 text-sm">
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="Prompt template (use ___ for blank)"
          value={payload.prompt_template ?? ''}
          onChange={(e) => set({ prompt_template: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="correct_answers (comma-separated)"
          value={(payload.correct_answers ?? []).join(', ')}
          onChange={(e) =>
            set({
              correct_answers: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="feedback_right"
          value={payload.feedback_right ?? ''}
          onChange={(e) => set({ feedback_right: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
          placeholder="feedback_wrong"
          value={payload.feedback_wrong ?? ''}
          onChange={(e) => set({ feedback_wrong: e.target.value })}
        />
      </div>
    );
  }

  // For matching / classification / ordering, fall back to raw JSON editor —
  // keeps v1 functional without overbuilding.
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-ink-muted">JSON payload</p>
      <textarea
        rows={8}
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-ink"
        value={JSON.stringify(payload, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange({ ...task, payload: parsed });
          } catch {
            // ignore invalid JSON until they finish typing
          }
        }}
      />
    </div>
  );
}

export default function LessonEditor() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await lessonsApi.list();
        setLessons(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openLesson = async (externalId) => {
    const full = await lessonsApi.get(externalId);
    setActive(full);
  };

  const saveTask = async (task) => {
    setSaving(true);
    setStatus(null);
    try {
      if (task.id) {
        await teacherApi.patchTask(task.id, task);
      } else {
        await teacherApi.createTask({ ...task, lesson_id: active?.id });
      }
      setStatus('Сақталды');
    } catch (e) {
      setStatus(e.message ?? 'Қате');
    } finally {
      setSaving(false);
    }
  };

  const saveLesson = async () => {
    if (!active) return;
    setSaving(true);
    setStatus(null);
    try {
      await teacherApi.patchLesson(active.external_id, {
        title: active.title,
        topic: active.topic,
        intro: active.intro,
        physics_target: active.physics_target,
        language_target: active.language_target,
      });
      setStatus('Сақталды');
    } catch (e) {
      setStatus(e.message ?? 'Қате');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container-app py-8 text-center text-ink-muted">Жүктелуде…</div>;
  }

  if (active) {
    return (
      <div className="container-app space-y-4 py-4 pb-24">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActive(null)}
            className="text-sm text-ink-muted hover:text-ink"
          >
            ← Тізімге
          </button>
          {status && (
            <Chip tone={status === 'Сақталды' ? 'success' : 'danger'}>{status}</Chip>
          )}
        </div>

        <Card className="space-y-2 text-sm">
          <input
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-base font-bold text-ink"
            value={active.title ?? ''}
            onChange={(e) => setActive({ ...active, title: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
            placeholder="Topic"
            value={active.topic ?? ''}
            onChange={(e) => setActive({ ...active, topic: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
            placeholder="Intro"
            value={active.intro ?? ''}
            onChange={(e) => setActive({ ...active, intro: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
            placeholder="physics_target"
            value={active.physics_target ?? ''}
            onChange={(e) => setActive({ ...active, physics_target: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
            placeholder="language_target"
            value={active.language_target ?? ''}
            onChange={(e) => setActive({ ...active, language_target: e.target.value })}
          />
          <Button size="sm" disabled={saving} onClick={saveLesson}>
            Сабақты сақтау
          </Button>
        </Card>

        {(active.tasks ?? []).map((task, idx) => (
          <Card key={task.id ?? idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-ink-muted">
                {task.external_id ?? `task ${idx + 1}`}
              </p>
              <select
                value={task.type}
                onChange={(e) => {
                  const next = { ...task, type: e.target.value };
                  const tasks = active.tasks.slice();
                  tasks[idx] = next;
                  setActive({ ...active, tasks });
                }}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <TaskFields
              task={task}
              onChange={(next) => {
                const tasks = active.tasks.slice();
                tasks[idx] = next;
                setActive({ ...active, tasks });
              }}
            />
            <Button size="sm" disabled={saving} onClick={() => saveTask(task)}>
              Тапсырманы сақтау
            </Button>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="container-app space-y-3 py-4 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-ink">Сабақтар (редактор)</h1>
        <p className="text-sm text-ink-muted">Тізімнен сабақты таңда</p>
      </header>

      {lessons.map((l) => (
        <Card
          key={l.external_id}
          className="cursor-pointer hover:bg-surface-2/40"
          onClick={() => openLesson(l.external_id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-ink">{l.title}</p>
              <p className="text-xs text-ink-muted">
                {l.external_id} · {l.topic}
              </p>
            </div>
            <span className="text-ink-muted">›</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
