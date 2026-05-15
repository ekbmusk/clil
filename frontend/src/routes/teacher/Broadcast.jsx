import { useEffect, useState } from 'react';

import * as groupsApi from '../../api/groups';
import * as teacherApi from '../../api/teacher';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';

export default function Broadcast() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await groupsApi.list();
        setGroups(data ?? []);
      } catch {
        setGroups([]);
      }
    })();
  }, []);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      await teacherApi.broadcast({
        group_ids: [...selected],
        message: message.trim(),
      });
      setStatus({ tone: 'success', text: 'Жіберілді' });
      setMessage('');
      setSelected(new Set());
    } catch (e) {
      setStatus({ tone: 'danger', text: e.message ?? 'Қате' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container-app space-y-4 py-4 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-ink">Хабар тарату</h1>
        <p className="text-sm text-ink-muted">Топтарды таңдап, хабар жібер</p>
      </header>

      <Card className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Топтар</p>
        {groups.length === 0 ? (
          <p className="text-sm text-ink-muted">Топтар жоқ.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const on = selected.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? 'bg-primary text-white'
                      : 'bg-surface-2 text-ink hover:bg-surface-2/80'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-xs uppercase tracking-wider text-ink-muted">Хабар</p>
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Хабарламаны жаз…"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-ink"
        />
      </Card>

      <div className="flex items-center justify-between">
        {status ? <Chip tone={status.tone}>{status.text}</Chip> : <span />}
        <Button
          size="lg"
          disabled={sending || !message.trim()}
          onClick={send}
        >
          {sending ? 'Жіберілуде…' : 'Жіберу'}
        </Button>
      </div>
    </div>
  );
}
