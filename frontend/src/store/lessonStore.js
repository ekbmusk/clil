import { create } from 'zustand';

export const useLessonStore = create((set, get) => ({
  // List cache
  lessons: [],
  // Active lesson session
  currentLesson: null,
  currentTaskIndex: 0,
  // Map task_external_id -> { is_correct, correct_value, feedback, language_tip }
  attemptResults: {},
  // When set, the player only iterates over these task external_ids (retry mode).
  replayQueue: null,

  setLessons(lessons) {
    set({ lessons });
  },

  setCurrentLesson(lesson) {
    set({
      currentLesson: lesson,
      currentTaskIndex: 0,
      attemptResults: {},
      replayQueue: null,
    });
  },

  setCurrentTaskIndex(idx) {
    set({ currentTaskIndex: idx });
  },

  goNext() {
    const { currentLesson, currentTaskIndex, replayQueue } = get();
    if (!currentLesson) return;
    const total = replayQueue
      ? replayQueue.length
      : currentLesson.tasks?.length ?? 0;
    const next = currentTaskIndex + 1;
    if (next < total) {
      set({ currentTaskIndex: next });
    }
  },

  recordResult(taskExternalId, result) {
    set((s) => ({
      attemptResults: { ...s.attemptResults, [taskExternalId]: result },
    }));
  },

  startReplay(ids) {
    // Strip prior results for these tasks so the player treats them as fresh.
    set((s) => {
      const next = { ...s.attemptResults };
      ids.forEach((id) => {
        delete next[id];
      });
      return {
        replayQueue: ids,
        currentTaskIndex: 0,
        attemptResults: next,
      };
    });
  },

  resetSession() {
    set({
      currentLesson: null,
      currentTaskIndex: 0,
      attemptResults: {},
      replayQueue: null,
    });
  },
}));
