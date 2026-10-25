import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ymd } from '../utils.js';
import Icon from './Icon.jsx';

// Work-hours timer saved on the server (so the boss can see attendance reports).
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export default function PunchButton() {
  const [state, setState] = useState({ closedMs: 0, runningSince: null });
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/attendance/today?date=${ymd(new Date())}`).then(setState).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!state.runningSince) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.runningSince]);

  const toggle = async () => {
    setBusy(true); setError('');
    try { setState(await api('/attendance/punch', { method: 'POST', body: { date: ymd(new Date()) } })); setNow(Date.now()); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };

  const running = !!state.runningSince;
  const worked = state.closedMs + (running ? now - new Date(state.runningSince).getTime() : 0);

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-500">{error}</span>}
      {(running || worked > 0) && (
        <span className="hidden text-right text-xs text-mute sm:block">
          Today<br /><b className="font-semibold tabular-nums text-ink">{fmt(worked)}</b>
        </span>
      )}
      <button className={running ? 'btn btn-soft' : 'btn'} onClick={toggle} disabled={busy}>
        {running && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
        <Icon name="punch" size={16} /> {running ? 'Punch out' : 'Punch in'}
      </button>
    </div>
  );
}