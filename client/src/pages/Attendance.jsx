import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { downloadCsv } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';

const hours = (ms) => `${Math.floor(ms / 3600000)}h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}m`;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const dayLabel = (s) => new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function Kpi({ label, value, sub, tone = 'text-berry' }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-petal">
      <p className="text-sm font-semibold uppercase tracking-wide text-mute">{label}</p>
      <p className={`mt-3 font-display text-4xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-mute">{sub}</p>
    </div>
  );
}

function DayList({ days }) {
  const max = Math.max(1, ...days.map((d) => d.ms));
  if (!days.length) return <p className="py-4 text-mute">No hours recorded this month.</p>;
  return (
    <div className="space-y-2">
      {days.map((d) => (
        <div key={d.date} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm text-mute">{dayLabel(d.date)}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full bg-berry" style={{ width: `${(d.ms / max) * 100}%` }} /></div>
          <b className="w-20 shrink-0 text-right text-sm tabular-nums">{hours(d.ms)}</b>
        </div>
      ))}
    </div>
  );
}

export default function Attendance({ isAdmin }) {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/attendance/report?month=${month}`)
      .then((r) => { setRows(r.rows); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  const shift = (n) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(monthKey(new Date(y, m - 1 + n, 1)));
    setSelected(null);
  };
  const title = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const stats = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.totalMs, 0);
    const present = rows.reduce((a, r) => a + r.days.length, 0);
    return { total, present, avgDay: present ? total / present : 0, online: rows.filter((r) => r.running).length, max: Math.max(1, ...rows.map((r) => r.totalMs)) };
  }, [rows]);

  const exportCsv = () => {
    if (isAdmin) {
      downloadCsv(`attendance-${month}.csv`, [
        ['Employee', 'Email', 'Days present', 'Total hours', 'Average hours per day'],
        ...rows.map((r) => [r.user.name, r.user.email, r.days.length, (r.totalMs / 3600000).toFixed(2), r.days.length ? (r.totalMs / r.days.length / 3600000).toFixed(2) : 0]),
      ]);
    } else {
      downloadCsv(`my-hours-${month}.csv`, [['Date', 'Hours'], ...(rows[0]?.days || []).map((d) => [d.date, (d.ms / 3600000).toFixed(2)])]);
    }
  };

  const mine = rows[0];
  const open = isAdmin ? rows.find((r) => r.user._id === selected) : null;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">{isAdmin ? 'Attendance' : 'My hours'}</h2>
          <p className="mt-1 text-mute">{isAdmin ? 'Hours your team punched in, month by month.' : 'Your punched-in hours, month by month.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-petal">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevronLeft" size={20} /></button>
            <span className="min-w-36 text-center font-semibold">{title}</span>
            <button className="icon-btn" onClick={() => shift(1)} disabled={month >= monthKey(new Date())} aria-label="Next month"><Icon name="chevronRight" size={20} /></button>
          </div>
          <button className="btn btn-soft" onClick={exportCsv}><Icon name="download" /> Export</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mb-4 text-mute">Loading…</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total hours" value={hours(stats.total)} sub={isAdmin ? 'All employees combined' : 'This month'} />
        <Kpi label={isAdmin ? 'Days worked (total)' : 'Days worked'} value={stats.present} sub="Days with punched-in time" tone="text-emerald-500" />
        <Kpi label="Average per day" value={stats.present ? hours(stats.avgDay) : '–'} sub="On days worked" tone="text-amber-500" />
        {isAdmin
          ? <Kpi label="Working now" value={stats.online} sub={`of ${rows.length} employees`} tone="text-emerald-500" />
          : <Kpi label="Top day" value={mine?.days.length ? hours(Math.max(...mine.days.map((d) => d.ms))) : '–'} sub="Longest day this month" tone="text-berry-dark" />}
      </div>

      {isAdmin ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal">
          <h3 className="mb-4 font-display text-xl font-bold">Team hours</h3>
          {!rows.length && <p className="text-mute">No employees yet.</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="text-xs font-bold uppercase tracking-wide text-mute">
                <tr><th className="pb-3">Employee</th><th className="pb-3">Days</th><th className="pb-3">Total</th><th className="pb-3">Avg / day</th><th className="w-52 pb-3">Hours</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user._id} onClick={() => setSelected(selected === r.user._id ? null : r.user._id)} className={`cursor-pointer border-t border-petal hover:bg-blush ${selected === r.user._id ? 'bg-blush' : ''}`}>
                    <td className="py-3"><span className="flex items-center gap-2"><Avatar name={r.user.name} /><span className="font-medium">{r.user.name}</span>{r.running && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">● online</span>}</span></td>
                    <td className="py-3">{r.days.length}</td>
                    <td className="py-3 font-semibold">{hours(r.totalMs)}</td>
                    <td className="py-3 text-mute">{r.days.length ? hours(r.totalMs / r.days.length) : '–'}</td>
                    <td className="py-3"><div className="h-2 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full bg-berry" style={{ width: `${(r.totalMs / stats.max) * 100}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {open && (
            <div className="mt-6 rounded-2xl border border-petal bg-blush/50 p-5">
              <h4 className="mb-3 font-display text-lg font-bold">{open.user.name}: daily hours</h4>
              <DayList days={open.days} />
            </div>
          )}
          {!open && rows.length > 0 && <p className="mt-4 text-sm text-mute">Click an employee to see their day-by-day hours.</p>}
        </section>
      ) : (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal">
          <h3 className="mb-4 font-display text-xl font-bold">Daily hours</h3>
          <DayList days={mine?.days || []} />
          <p className="mt-4 text-xs text-mute">Use Punch in / Punch out on the Dashboard. A session left open counts for at most 12 hours.</p>
        </section>
      )}
    </>
  );
}