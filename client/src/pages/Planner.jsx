import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { addDays, dayOf, diffDays, ymd } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';

const PRIORITY_BG = { High: 'bg-berry', Medium: 'bg-amber-300', Low: 'bg-emerald-300' };
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SPAN = 28; // days shown in the timeline

function Calendar({ tasks, isAdmin, onOpen, onReschedule }) {
  const [overDay, setOverDay] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = ymd(new Date());

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const total = Math.ceil((lead + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - lead + 1));
  }, [month]);

  const byDay = useMemo(() => {
    const m = {};
    tasks.forEach((t) => { (m[dayOf(t)] ||= []).push(t); });
    return m;
  }, [tasks]);

  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-petal md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-bold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevronLeft" size={20} /></button>
          <button className="btn btn-soft !px-3 !py-1.5 text-sm" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevronRight" size={20} /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-7 gap-1.5 pb-1.5 text-center text-xs font-bold uppercase tracking-wide text-mute">
            {WEEK.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === month.getMonth();
              const list = byDay[key] || [];
              return (
                <div
                  key={key}
                  onDragOver={isAdmin ? (e) => { e.preventDefault(); setOverDay(key); } : undefined}
                  onDragLeave={isAdmin ? () => setOverDay((k) => (k === key ? null : k)) : undefined}
                  onDrop={isAdmin ? (e) => { e.preventDefault(); setOverDay(null); onReschedule(e.dataTransfer.getData('text/plain'), key); } : undefined}
                  className={`min-h-28 rounded-2xl border p-1.5 transition ${overDay === key ? 'border-berry bg-petal ring-2 ring-berry/50' : key === today ? 'border-berry bg-petal/40' : 'border-petal'} ${inMonth ? 'bg-white' : 'bg-blush/60 opacity-60'}`}
                >
                  <p className={`mb-1 text-right text-xs font-semibold ${key === today ? 'text-berry-dark' : 'text-mute'}`}>{d.getDate()}</p>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((t) => (
                      <button key={t._id} onClick={() => onOpen(t)} title={`${t.title}${isAdmin && t.assignedTo ? ` · ${t.assignedTo.name}` : ''}`}
                        draggable={isAdmin && t.status !== 'Completed'}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', t._id); e.dataTransfer.effectAllowed = 'move'; }}
                        className={`flex w-full items-center gap-1.5 truncate rounded-lg bg-blush px-1.5 py-1 text-left text-xs font-medium hover:bg-petal ${t.status === 'Completed' ? 'text-mute line-through' : ''}`}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_BG[t.priority]}`} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                    {list.length > 3 && <p className="px-1 text-xs font-semibold text-berry-dark">+{list.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-4 flex flex-wrap gap-4 text-xs text-mute">
        {Object.entries(PRIORITY_BG).map(([p, c]) => <span key={p} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{p}</span>)}
        {isAdmin && <span className="font-semibold text-berry-dark">Drag a task to another day to reschedule it. The employee gets an email.</span>}
      </p>
    </div>
  );
}

function Timeline({ tasks, isAdmin, onOpen }) {
  const [offset, setOffset] = useState(-7); // window starts a week before today
  const start = addDays(offset);
  const days = Array.from({ length: SPAN }, (_, i) => addDays(offset + i));
  const todayIdx = diffDays(start, ymd(new Date()));

  const rows = useMemo(() => tasks.map((t) => {
    const end = dayOf(t);
    let begin = t.createdAt ? ymd(new Date(t.createdAt)) : end;
    if (begin > end) begin = end;
    return { t, s: diffDays(start, begin), e: diffDays(start, end) };
  }).filter((r) => r.e >= 0 && r.s < SPAN).sort((a, b) => a.e - b.e), [tasks, start]);

  const monthLabel = (d, i) => (i === 0 || d.endsWith('-01') ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }) : '');

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-petal md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-bold">Timeline <span className="text-sm font-semibold text-mute">· created → deadline</span></h3>
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => setOffset(offset - 14)} aria-label="Earlier"><Icon name="chevronLeft" size={20} /></button>
          <button className="btn btn-soft !px-3 !py-1.5 text-sm" onClick={() => setOffset(-7)}>Today</button>
          <button className="icon-btn" onClick={() => setOffset(offset + 14)} aria-label="Later"><Icon name="chevronRight" size={20} /></button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex">
            <div className="w-52 shrink-0" />
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}>
              {days.map((d, i) => (
                <div key={d} className={`border-l border-petal pb-1 text-center text-[11px] ${d === ymd(new Date()) ? 'font-bold text-berry-dark' : 'text-mute'}`}>
                  <div className="h-4 text-[10px] font-bold uppercase">{monthLabel(d, i)}</div>
                  {Number(d.slice(8))}
                </div>
              ))}
            </div>
          </div>

          {rows.map(({ t, s, e }) => (
            <div key={t._id} className="flex items-center border-t border-petal">
              <button onClick={() => onOpen(t)} className="flex w-52 shrink-0 items-center gap-2 py-2 pr-3 text-left hover:text-berry-dark">
                {isAdmin && <Avatar name={t.assignedTo?.name || '?'} size="h-6 w-6" />}
                <span className={`truncate text-sm font-medium ${t.status === 'Completed' ? 'text-mute line-through' : ''}`}>{t.title}</span>
              </button>
              <div className="relative grid flex-1 py-2" style={{ gridTemplateColumns: `repeat(${SPAN}, minmax(0, 1fr))` }}>
                {todayIdx >= 0 && todayIdx < SPAN && <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-berry/60" style={{ left: `${((todayIdx + 0.5) / SPAN) * 100}%` }} />}
                <button
                  onClick={() => onOpen(t)}
                  title={`${t.title} · ${t.status}`}
                  className={`h-5 rounded-full ${PRIORITY_BG[t.priority]} ${t.status === 'Completed' ? 'opacity-40' : ''} ${t.status === 'In Progress' ? 'ring-2 ring-berry/30' : ''}`}
                  style={{ gridColumn: `${Math.max(s, 0) + 1} / ${Math.min(e, SPAN - 1) + 2}`, gridRow: 1 }}
                />
              </div>
            </div>
          ))}

          {!rows.length && <p className="border-t border-petal py-8 text-center text-mute">No tasks fall in this date range. Use the arrows to look around.</p>}
        </div>
      </div>
      <p className="mt-4 flex flex-wrap gap-4 text-xs text-mute">
        {Object.entries(PRIORITY_BG).map(([p, c]) => <span key={p} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{p}</span>)}
        <span>Faded = completed</span><span className="font-semibold text-berry-dark">| Vertical line = today</span>
      </p>
    </div>
  );
}

export default function Planner({ isAdmin }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('calendar');
  const [error, setError] = useState('');

  useEffect(() => { api('/tasks').then(setTasks).catch((e) => setError(e.message)); }, []);
  const open = (t) => navigate(`/tasks?q=${encodeURIComponent(t.title)}`);

  // drag a task onto another day (admin): saves the new deadline and emails the employee
  const reschedule = async (id, day) => {
    const task = tasks.find((t) => t._id === id);
    if (!task || task.deadline.slice(0, 10) === day) return;
    setError('');
    setTasks((ts) => ts.map((t) => (t._id === id ? { ...t, deadline: `${day}T00:00:00.000Z` } : t))); // instant feedback
    try {
      const saved = await api(`/tasks/${id}`, { method: 'PUT', body: { deadline: day } });
      setTasks((ts) => ts.map((t) => (t._id === id ? saved : t)));
    } catch (e) {
      setError(e.message);
      setTasks((ts) => ts.map((t) => (t._id === id ? task : t)));
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Planner</h2>
          <p className="mt-1 text-mute">See every deadline on a calendar, or plan the work on a timeline.</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-petal">
          {[['calendar', 'Calendar'], ['timeline', 'Timeline']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 transition ${tab === k ? 'bg-petal text-berry-dark' : 'text-mute hover:text-ink'}`}>{label}</button>
          ))}
        </div>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {tab === 'calendar' ? <Calendar tasks={tasks} isAdmin={isAdmin} onOpen={open} onReschedule={reschedule} /> : <Timeline tasks={tasks} isAdmin={isAdmin} onOpen={open} />}
    </>
  );
}