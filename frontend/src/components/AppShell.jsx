import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import { useUserStore } from '../store/userStore';
import Avatar from './ui/Avatar';

function Header() {
  const user = useUserStore((s) => s.user);
  const role = useUserStore((s) => s.role);
  const navigate = useNavigate();
  const isTeacher = role === 'teacher';

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    (isTeacher ? 'Мұғалім' : 'Оқушы');

  const goProfile = () => {
    if (!isTeacher) navigate('/profile');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="container-app flex items-center justify-between py-3">
        <button
          type="button"
          onClick={goProfile}
          disabled={isTeacher}
          className={clsx(
            'flex min-w-0 items-center gap-2 rounded-xl py-1 pr-2 text-left',
            !isTeacher && 'hover:bg-surface-2/40 active:bg-surface-2/60',
          )}
          aria-label={isTeacher ? 'CLIL · Physics' : 'Профильге өту'}
        >
          {isTeacher ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
              ⚛
            </div>
          ) : (
            <Avatar user={user} size="sm" ring={false} />
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-ink">
              {isTeacher ? 'CLIL · Physics' : displayName}
            </p>
            <p className="truncate text-[10px] uppercase tracking-wider text-ink-muted">
              {isTeacher ? 'Мұғалім' : user?.username ? `@${user.username}` : 'Оқушы'}
            </p>
          </div>
        </button>
        {!isTeacher && user && (
          <button
            type="button"
            onClick={goProfile}
            className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink hover:bg-surface-2/80 active:bg-surface-2/60"
            aria-label="Стрик"
          >
            <span>🔥</span>
            <span className="font-mono font-semibold">{user.streak_count ?? 0}</span>
          </button>
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
