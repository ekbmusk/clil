// Thin wrappers around window.Telegram.WebApp so screens don't have to do
// optional-chaining gymnastics. Every call is a no-op outside of Telegram.

function wa() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

let mbHandler = null;
let bbHandler = null;

export const mainButton = {
  set({ text, color, textColor, onClick, disabled = false }) {
    const w = wa();
    if (!w?.MainButton) return;
    try {
      if (mbHandler) {
        w.MainButton.offClick(mbHandler);
        mbHandler = null;
      }
      const params = { text };
      if (color) params.color = color;
      if (textColor) params.text_color = textColor;
      w.MainButton.setParams?.(params);
      if (disabled) {
        w.MainButton.disable?.();
      } else {
        w.MainButton.enable?.();
      }
      if (onClick) {
        mbHandler = onClick;
        w.MainButton.onClick(mbHandler);
      }
      w.MainButton.show();
    } catch {
      /* SDK older than required — ignore */
    }
  },

  hide() {
    const w = wa();
    if (!w?.MainButton) return;
    try {
      if (mbHandler) {
        w.MainButton.offClick(mbHandler);
        mbHandler = null;
      }
      w.MainButton.hide();
    } catch {
      /* ignore */
    }
  },
};

export const backButton = {
  show(onBack) {
    const w = wa();
    if (!w?.BackButton) return;
    try {
      if (bbHandler) {
        w.BackButton.offClick(bbHandler);
        bbHandler = null;
      }
      if (onBack) {
        bbHandler = onBack;
        w.BackButton.onClick(bbHandler);
      }
      w.BackButton.show();
    } catch {
      /* ignore */
    }
  },

  hide() {
    const w = wa();
    if (!w?.BackButton) return;
    try {
      if (bbHandler) {
        w.BackButton.offClick(bbHandler);
        bbHandler = null;
      }
      w.BackButton.hide();
    } catch {
      /* ignore */
    }
  },
};

export function confirm(text) {
  const w = wa();
  return new Promise((resolve) => {
    if (!w?.showConfirm) {
      resolve(window.confirm(text));
      return;
    }
    try {
      w.showConfirm(text, (ok) => resolve(!!ok));
    } catch {
      resolve(window.confirm(text));
    }
  });
}

export function applyTheme({ background = '#0F0F1A' } = {}) {
  const w = wa();
  if (!w) return;
  try {
    w.setHeaderColor?.(background);
    w.setBackgroundColor?.(background);
    w.setBottomBarColor?.(background);
  } catch {
    /* ignore */
  }
}

export function ready() {
  const w = wa();
  if (!w) return;
  try {
    w.ready?.();
    w.expand?.();
  } catch {
    /* ignore */
  }
}
