import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { addDays, bucket, dayOf, downloadCsv, ymd } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';

const STATUS_COLOR = { Pending: '#d6578a', 'In Progress': '#fbbf24', 'In Review': '#a78bfa', Completed: '#34d399' };
const PRIORITY_COLOR = { High: '#d6578a', Medium: '#fcd34d', Low: '#6ee7b7' };
const doneDay = (t) => ymd(new Date(t.completedAt || t.updatedAt));

function Kpi({ label, value, sub, tone = 'text-berry' }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-petal">
      <p className="text-sm font-semibold uppercase tracking-wide text-mute">{label}</p>
      <p className={`mt-3 font-display text-4xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-mute">{sub}</p>
    </div>
  );
}

function Donut({ data, total }) {
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Tasks by status">
        <circle cx="75" cy="75" r={r} fill="none" stroke="#ffe4ee" strokeWidth="18" />
        {total > 0 && data.map(([label, n]) => {
          const len = (n / total) * c;
          const el = <circle key={label} cx="75" cy="75" r={r} fill="none" stroke={STATUS_COLOR[label]} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 75 75)" />;
          acc += len;
          return el;
        })}
        <text x="75" y="73" textAnchor="middle" fontSize="28" fontWeight="700" fill="#3b2230">{total}</text>
        <text x="75" y="92" textAnchor="middle" fontSize="12" fill="#8f7683">tasks</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {data.map(([label, n]) => (
          <li key={label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR[label] }} />
            <span className="w-24">{label}</span><b>{n}</b>
            <span className="text-mute">{total ? Math.round((n / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bars({ data, color, max }) {
  return (
    <div className="space-y-3">
      {data.map(([label, n]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{n}</b></div>
          <div className="h-3 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full transition-all" style={{ width: `${max ? (n / max) * 100 : 0}%`, background: color[label] }} /></div>
        </div>
      ))}
    </div>
  );
}

function Trend({ points }) {
  const max = Math.max(1, ...points.map((p) => p.n));
  const H = 120;
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: H + 24 }}>
        {points.map((p) => (
          <div key={p.day} className="flex flex-1 flex-col items-center justify-end" title={`${p.day}: ${p.n} completed`}>
            <span className="mb-1 text-[10px] font-semibold text-berry-dark">{p.n || ''}</span>
            <div className="w-full rounded-t-lg bg-berry transition-all" style={{ height: Math.max(p.n ? 6 : 2, (p.n / max) * H), opacity: p.n ? 1 : 0.2 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[10px] text-mute">
        {points.map((p, i) => <span key={p.day} className="flex-1">{i % 2 === 0 ? Number(p.day.slice(8)) : ''}</span>)}
      </div>
    </div>
  );
}

export default function Reports() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/tasks'), api('/users/employees')])
      .then(([t, e]) => { setTasks(t); setEmployees(e); })
      .catch((e) => setError(e.message));
  }, []);

  const m = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'Completed');
    const overdue = tasks.filter((t) => bucket(t) === 'overdue');
    const onTime = done.filter((t) => doneDay(t) <= dayOf(t));
    const avgDays = done.length
      ? done.reduce((a, t) => a + Math.max(0, (new Date(t.completedAt || t.updatedAt) - new Date(t.createdAt)) / 864e5), 0) / done.length
      : 0;
    const trend = Array.from({ length: 14 }, (_, i) => {
      const day = addDays(i - 13);
      return { day, n: done.filter((t) => doneDay(t) === day).length };
    });
    const people = employees.map((e) => {
      const mine = tasks.filter((t) => t.assignedTo?._id === e._id);
      const d = mine.filter((t) => t.status === 'Completed').length;
      return { ...e, total: mine.length, done: d, overdue: mine.filter((t) => bucket(t) === 'overdue').length, rate: mine.length ? Math.round((d / mine.length) * 100) : 0 };
    }).sort((a, b) => b.rate - a.rate || b.done - a.done);
    return { done, overdue, onTime, avgDays, trend, people };
  }, [tasks, employees]);

  const status = ['Pending', 'In Progress', 'In Review', 'Completed'].map((s) => [s, tasks.filter((t) => t.status === s).length]);
  const priority = ['High', 'Medium', 'Low'].map((p) => [p, tasks.filter((t) => t.priority === p).length]);
  const rate = tasks.length ? Math.round((m.done.length / tasks.length) * 100) : 0;
  const onTimeRate = m.done.length ? Math.round((m.onTime.length / m.done.length) * 100) : 0;

  const exportReport = () => downloadCsv(`team-report-${ymd(new Date())}.csv`, [
    ['Employee', 'Email', 'Assigned', 'Completed', 'Overdue', 'Completion rate %'],
    ...m.people.map((p) => [p.name, p.email, p.total, p.done, p.overdue, p.rate]),
    [],
    ['Overall', '', tasks.length, m.done.length, m.overdue.length, rate],
  ]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Reports</h2>
          <p className="mt-1 text-mute">How the team is performing, at a glance.</p>
        </div>
        <button className="btn" onClick={exportReport}><Icon name="download" /> Export report</button>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Completion rate" value={`${rate}%`} sub={`${m.done.length} of ${tasks.length} tasks done`} />
        <Kpi label="On-time delivery" value={m.done.length ? `${onTimeRate}%` : '–'} sub="Finished on or before the deadline" tone="text-emerald-500" />
        <Kpi label="Overdue now" value={m.overdue.length} sub={m.overdue.length ? 'Need attention' : 'Nothing late'} tone={m.overdue.length ? 'text-red-500' : 'text-emerald-500'} />
        <Kpi label="Avg. time to finish" value={m.done.length ? `${m.avgDays.toFixed(1)} d` : '–'} sub="From creation to completion" tone="text-amber-500" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal"><h3 className="mb-4 font-display text-xl font-bold">By status</h3><Donut data={status} total={tasks.length} /></section>
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal"><h3 className="mb-4 font-display text-xl font-bold">By priority</h3><Bars data={priority} color={PRIORITY_COLOR} max={Math.max(1, ...priority.map((p) => p[1]))} /></section>
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal"><h3 className="mb-4 font-display text-xl font-bold">Completed, last 14 days</h3><Trend points={m.trend} /></section>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal">
        <h3 className="mb-4 font-display text-xl font-bold">Team performance</h3>
        {!m.people.length && <p className="text-mute">No employees yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="text-xs font-bold uppercase tracking-wide text-mute">
              <tr><th className="pb-3">#</th><th className="pb-3">Employee</th><th className="pb-3">Assigned</th><th className="pb-3">Done</th><th className="pb-3">Overdue</th><th className="w-48 pb-3">Completion</th></tr>
            </thead>
            <tbody>
              {m.people.map((p, i) => (
                <tr key={p._id} className="border-t border-petal">
                  <td className="py-3 font-semibold text-mute">{i === 0 && p.done > 0 ? '🏆' : i + 1}</td>
                  <td className="py-3"><span className="flex items-center gap-2"><Avatar name={p.name} /><span className="font-medium">{p.name}</span></span></td>
                  <td className="py-3">{p.total}</td>
                  <td className="py-3 font-semibold text-emerald-600">{p.done}</td>
                  <td className={`py-3 font-semibold ${p.overdue ? 'text-red-500' : 'text-mute'}`}>{p.overdue}</td>
                  <td className="py-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full bg-berry" style={{ width: `${p.rate}%` }} /></div><b className="w-10 text-right text-sm">{p.rate}%</b></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}