import { NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';

import { useUserStore } from '../store/userStore';

function Header() {
  const user = useUserStore((s) => s.user);
  const role = useUserStore((s) => s.role);
  const isTeacher = role === 'teacher';

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="container-app flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
            ⚛
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-ink">CLIL · Physics</p>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">
              {isTeacher ? 'Мұғалім' : 'Оқушы'}
            </p>
          </div>
        </div>
        {!isTeacher && user && (
          <div className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink">
            <span>🔥</span>
            <span className="font-mono font-semibold">{user.streak_count ?? 0}</span>
          </div>
        )}
      </div>
    </header>
  );
}

function BottomTabs({ tabs }) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
      <div className="container-app flex justify-around py-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs font-medium',
                isActive ? 'bg-primary/20 text-primary-soft' : 'text-ink-muted',
              )
            }
          >
            {t.icon && <span className="text-base leading-none">{t.icon}</span>}
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

const TEACHER_TABS = [
  { to: '/teacher/dashboard', label: 'Тақта' },
  { to: '/teacher/students', label: 'Оқушылар' },
  { to: '/teacher/attempts', label: 'Талпыныстар' },
  { to: '/teacher/lessons', label: 'Сабақтар' },
  { to: '/teacher/broadcast', label: 'Хабар' },
];

const STUDENT_TABS = [
  { to: '/', end: true, label: 'Сабақтар', icon: '📚' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
];

export default function AppShell() {
  const role = useUserStore((s) => s.role);
  const isTeacher = role === 'teacher';
  const location = useLocation();
  // Hide student tabs inside the lesson player so they don't fight with MainButton.
  const hideStudentTabs = location.pathname.startsWith('/lesson/');
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {isTeacher ? (
        <BottomTabs tabs={TEACHER_TABS} />
      ) : (
        !hideStudentTabs && <BottomTabs tabs={STUDENT_TABS} />
      )}
    </div>
  );
}
