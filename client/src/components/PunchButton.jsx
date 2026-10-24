import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { ymd } from '../utils.js';
import Icon from './Icon.jsx';

// Simple work-hours timer. Stored in this browser (localStorage), one record per user per day.
const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export default function PunchButton() {
  const { user } = useAuth();
  const key = `punch:${user.id}`;
  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(key));
      if (s && s.date === ymd(new Date())) return s;
    } catch { /* ignore */ }
    return { date: ymd(new Date()), total: 0, start: null };
  };
  const [state, setState] = useState(load);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!state.start) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.start]);

  const save = (next) => {
    setState(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const toggle = () =>
    state.start
      ? save({ ...state, total: state.total + (Date.now() - state.start), start: null })
      : save({ ...state, start: Date.now() });

  const worked = state.total + (state.start ? now - state.start : 0);
  const running = !!state.start;

  return (
    <div className="flex items-center gap-3">
      {(running || worked > 0) && (
        <span className="hidden text-right text-xs text-mute sm:block">
          Today<br /><b className="font-semibold tabular-nums text-ink">{fmt(worked)}</b>
        </span>
      )}
      <button className={running ? 'btn btn-soft' : 'btn'} onClick={toggle}>
        {running && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
        <Icon name="punch" size={16} /> {running ? 'Punch out' : 'Punch in'}
      </button>
    </div>
  );
}