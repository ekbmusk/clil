import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import * as teacherApi from '../../api/teacher';
import Card from '../../components/ui/Card';

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await teacherApi.stats();
        if (!cancelled) setStats(s);
      } catch (e) {
        if (!cancelled) setError(e.message ?? 'Қате');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="container-app py-8 text-center text-ink-muted">Жүктелуде…</div>;
  }
  if (error) {
    return (
      <div className="container-app py-8 text-center text-danger">{error}</div>
    );
  }

  const perLesson = (stats?.per_lesson ?? []).map((row) => ({
    name: row.external_id ?? row.title ?? '?',
    accuracy: Math.round((row.avg_accuracy ?? 0) * 100),
  }));

  return (
    <div className="container-app space-y-4 py-4 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-ink">Бақылау тақтасы</h1>
        <p className="text-sm text-ink-muted">Жалпы көрсеткіштер</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Оқушылар" value={stats?.total_students ?? 0} />
        <Kpi label="Сабақтар" value={stats?.total_lessons ?? 0} />
        <Kpi label="Талпыныстар" value={stats?.total_attempts ?? 0} />
        <Kpi
          label="Орташа дәлдік"
          value={`${Math.round((stats?.avg_accuracy ?? 0) * 100)}%`}
        />
      </div>

      <Card>
        <h2 className="mb-2 text-base font-bold text-ink">Сабақтар бойынша дәлдік</h2>
        {perLesson.length === 0 ? (
          <p className="text-sm text-ink-muted">Әзірге мәлімет жоқ.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perLesson} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: '#1A1A2E',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="accuracy" fill="#6C63FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
