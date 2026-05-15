import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from './components/AppShell';
import Onboarding from './routes/Onboarding';
import LessonList from './routes/student/LessonList';
import LessonPlayer from './routes/student/LessonPlayer';
import Dashboard from './routes/teacher/Dashboard';
import Students from './routes/teacher/Students';
import Attempts from './routes/teacher/Attempts';
import LessonEditor from './routes/teacher/LessonEditor';
import Broadcast from './routes/teacher/Broadcast';
import { useUserStore } from './store/userStore';

function bootstrapTelegram() {
  const WebApp = window.Telegram?.WebApp;
  if (!WebApp) return;
  try {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor?.('#0F0F1A');
    WebApp.setBackgroundColor?.('#0F0F1A');
  } catch {
    /* ignore */
  }
}

function Splash({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-ink-muted">
      <div className="space-y-2 text-center">
        <div className="text-4xl">⚛</div>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}

export default function App() {
  const role = useUserStore((s) => s.role);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const isAuthenticating = useUserStore((s) => s.isAuthenticating);
  const authError = useUserStore((s) => s.authError);
  const authenticate = useUserStore((s) => s.authenticate);

  const [onboarded, setOnboarded] = useState(() => {
    try {
      return !!localStorage.getItem('clil_onboarding_completed');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    bootstrapTelegram();
    authenticate();
  }, [authenticate]);

  if (isAuthenticating || (!isAuthenticated && !authError)) {
    return <Splash>Кіру…</Splash>;
  }

  if (authError) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center space-y-2 text-center">
        <p className="text-xs uppercase tracking-wider text-ink-muted">кіру қатесі</p>
        <p className="text-lg font-semibold text-ink">{authError}</p>
        <p className="text-sm text-ink-muted">
          Қолданбаны Telegram арқылы аш — initData қажет.
        </p>
      </div>
    );
  }

  if (!onboarded && role !== 'teacher') {
    return (
      <Routes>
        <Route path="*" element={<Onboarding onDone={() => setOnboarded(true)} />} />
      </Routes>
    );
  }

  if (role === 'teacher') {
    return (
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="teacher">
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="attempts" element={<Attempts />} />
            <Route path="lessons" element={<LessonEditor />} />
            <Route path="broadcast" element={<Broadcast />} />
          </Route>
          <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LessonList />} />
        <Route path="lesson/:externalId" element={<LessonPlayer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
