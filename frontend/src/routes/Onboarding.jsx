import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();

  const finish = () => {
    try {
      localStorage.setItem('clil_onboarding_completed', '1');
    } catch {
      /* ignore */
    }
    if (onDone) onDone();
    else navigate('/');
  };

  return (
    <div className="container-app flex min-h-screen flex-col items-center justify-center space-y-6 py-8 text-center">
      <div className="text-6xl">⚛️</div>
      <h1 className="text-3xl font-bold text-ink">CLIL · Physics</h1>
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-surface p-5 text-left">
          <p className="text-lg font-semibold text-ink">
            Сен физиканы ағылшын тілінде үйренесің
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Қысқа тапсырмалар арқылы — Duolingo стилінде.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-left">
          <p className="text-lg font-semibold text-ink">
            Бір рет — бір тапсырма
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Әр жауап үшін бірден кері байланыс аласың.
          </p>
        </div>
      </div>
      <Button size="lg" className="w-full max-w-xs" onClick={finish}>
        Бастау
      </Button>
    </div>
  );
}
