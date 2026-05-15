import { create } from 'zustand';

export const useLessonStore = create((set, get) => ({
  // List cache
  lessons: [],
  // Active lesson session
  currentLesson: null,
  currentTaskIndex: 0,
  // Map task_external_id -> { is_correct, correct_value, feedback, language_tip }
  attemptResults: {},

  setLessons(lessons) {
    set({ lessons });
  },

  setCurrentLesson(lesson) {
    set({
      currentLesson: lesson,
      currentTaskIndex: 0,
      attemptResults: {},
    });
  },

  setCurrentTaskIndex(idx) {
    set({ currentTaskIndex: idx });
  },

  goNext() {
    const { currentLesson, currentTaskIndex } = get();
    if (!currentLesson) return;
    const next = currentTaskIndex + 1;
    if (next < (currentLesson.tasks?.length ?? 0)) {
      set({ currentTaskIndex: next });
    }
  },

  recordResult(taskExternalId, result) {
    set((s) => ({
      attemptResults: { ...s.attemptResults, [taskExternalId]: result },
    }));
  },

  resetSession() {
    set({ currentLesson: null, currentTaskIndex: 0, attemptResults: {} });
  },
}));
