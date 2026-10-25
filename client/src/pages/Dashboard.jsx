
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { bucket, dayOf, fmtDay } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import PunchButton from '../components/PunchButton.jsx';

const BANNER_KEY = 'banner:quick-search';

const TONES = {
  aqua: 'bg-gradient-to-br from-[#b4f0fa] to-[#5fd6ee] text-[#06222a]',
  dark: 'bg-card text-ink ring-1 ring-petal',
  lavender: 'bg-berry text-onberry',
  lemon: 'bg-lemon text-[#26260a]',
};

function Stat({ icon, label, value, foot, to, tone = 'dark', valueClass = '', children }) {
  return (
    <div className={`flex flex-col justify-between rounded-3xl p-5 ${TONES[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10"><Icon name={icon} size={18} /></span>
      </div>
      <div>
        <p className={`mt-4 text-4xl font-bold ${valueClass}`}>{value}</p>
        {children}
        {to
          ? <Link to={to} className="mt-1 inline-flex items-center gap-1 text-sm font-medium opacity-80 hover:underline">{foot} <Icon name="arrowRight" size={13} /></Link>
          : <p className="mt-1 text-sm font-medium opacity-80">{foot}</p>}
      </div>
    </div>
  );
}

function FocusTile({ icon, label, value, tone = '' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-petal bg-blush p-4">
      <span className={`text-mute ${tone}`}><Icon name={icon} size={22} /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

function TaskRow({ t, isAdmin, onOpen }) {
  const overdue = bucket(t) === 'overdue';
  return (
    <button onClick={() => onOpen(t)} className="flex w-full items-center gap-3 rounded-2xl border border-petal bg-blush px-4 py-3 text-left transition hover:bg-petal">
      {isAdmin && <Avatar name={t.assignedTo?.name || '?'} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{t.title}</span>
        <span className="block text-xs text-mute">{t.status}{isAdmin && t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ''}</span>
      </span>
      <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${overdue ? 'bg-red-500/15 text-red-400' : 'bg-petal text-mute'}`}>{fmtDay(dayOf(t))}</span>
      <span className="rounded-full bg-petal px-2.5 py-1 text-xs font-semibold text-berry-dark">{t.priority}</span>
    </button>
  );
}

// Weekly chart: tasks created in each of the last 8 weeks, split by status
function WeeklyChart({ tasks }) {
  const now = Date.now();
  const WEEK = 7 * 864e5;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = now - (8 - i) * WEEK;
    const end = now - (7 - i) * WEEK;
    const inWeek = tasks.filter((t) => {
      const c = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      return c >= start && c < end;
    });
    const planned = inWeek.filter((t) => t.status === 'Pending').length;
    const progress = inWeek.filter((t) => t.status === 'In Progress' || t.status === 'In Review').length;
    const done = inWeek.filter((t) => t.status === 'Completed').length;
    return { planned, progress, done, total: planned + progress + done };
  });
  const max = Math.max(1, ...weeks.map((w) => w.total));

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {weeks.map((w, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
            {w.total === 0 ? (
              <div className="h-1.5 w-full max-w-[44px] rounded-full bg-petal" />
            ) : (
              <div className="flex w-full max-w-[44px] flex-col-reverse overflow-hidden rounded-xl" style={{ height: `${(w.total / max) * 100}%` }}>
                <div className="bg-aqua" style={{ flex: `${w.done} 1 0` }} />
                <div className="bg-lemon" style={{ flex: `${w.progress} 1 0` }} />
                <div className="bg-berry" style={{ flex: `${w.planned} 1 0` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {weeks.map((_, i) => <span key={i} className="flex-1 text-center text-xs text-mute">W{i + 1}</span>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-mute">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-berry" /> Planned</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-lemon" /> In progress</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-aqua" /> Completed</span>
      </div>
    </div>
  );
}

export default function Dashboard({ isAdmin }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [showBanner, setShowBanner] = useState(() => localStorage.getItem(BANNER_KEY) !== 'closed');

  useEffect(() => {
    const calls = [api('/tasks')];
    if (isAdmin) calls.push(api('/users/employees'));
    Promise.all(calls).then(([t, e]) => { setTasks(t); if (e) setEmployees(e); }).catch((e) => setError(e.message));
  }, [isAdmin]);

  const closeBanner = () => { localStorage.setItem(BANNER_KEY, 'closed'); setShowBanner(false); };
  const openTask = (t) => navigate(`/tasks?q=${encodeURIComponent(t.title)}`);

  const active = tasks.filter((t) => t.status !== 'Completed');
  const overdue = tasks.filter((t) => bucket(t) === 'overdue');
  const dueToday = tasks.filter((t) => bucket(t) === 'today');
  const upcoming = tasks.filter((t) => ['today', 'tomorrow', 'week'].includes(bucket(t))).sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
  const done = tasks.length - active.length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const weekAgo = Date.now() - 7 * 864e5;
  const newThisWeek = tasks.filter((t) => t.createdAt && new Date(t.createdAt).getTime() > weekAgo).length;

  // team workload (admin): open tasks per employee
  const load = employees.map((e) => ({ ...e, n: active.filter((t) => t.assignedTo?._id === e._id).length }));
  const maxLoad = Math.max(1, ...load.map((l) => l.n));

  return (
    <>
      {showBanner && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose bg-petal/60 px-5 py-3">
          <div>
            <p className="font-semibold text-berry-dark">New: Quick search, alerts &amp; Punch in</p>
            <p className="text-sm text-mute">Press Ctrl+K anywhere to find a task, check the bell for deadlines, and track your hours.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-soft" onClick={() => window.dispatchEvent(new Event('open-search'))}>Try search</button>
            <button className="icon-btn" onClick={closeBanner} aria-label="Dismiss"><Icon name="close" size={16} /></button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Dashboard</h2>
          <p className="mt-1 text-mute">Accomplish your projects with clarity and speed, {user.name.split(' ')[0]}.</p>
        </div>
        <PunchButton />
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-400">{error}</p>}

      {/* Analytics + colored stat tiles */}
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <section className="relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-petal xl:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-berry/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold text-mute">Analytics</p>
            <p className="mt-1 text-6xl font-bold">{percent}%</p>
            <p className="mb-6 mt-1 text-sm text-mute">Weekly trend of tasks across all workstreams</p>
            <WeeklyChart tasks={tasks} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <Stat tone="aqua" icon="tasks" label="Active tasks" value={active.length}
            foot={newThisWeek ? `+${newThisWeek} this week` : 'View all'} to="/tasks" />
          <Stat tone="dark" icon="alert" label="Overdue" value={overdue.length}
           valueClass={overdue.length ? 'text-red-400' : 'text-aqua'} 
            foot={overdue.length ? 'Needs attention' : 'All caught up'} />
          {isAdmin
            ? <Stat tone="lavender" icon="users" label="Team members" value={employees.length} foot={`${active.length} open tasks`} />
            : <Stat tone="lavender" icon="calendar" label="Due this week" value={upcoming.length} foot={upcoming.length ? 'Plan your week' : 'Nothing due'} />}
          <Stat tone="lemon" icon="check" label="Completed" value={`${percent}%`} foot={`${done} of ${tasks.length} done`}>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-black/60 transition-all" style={{ width: `${percent}%` }} /></div>
          </Stat>
        </div>
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'xl:grid-cols-3' : ''}`}>
        <section className={`rounded-3xl bg-card p-6 ring-1 ring-petal ${isAdmin ? 'xl:col-span-2' : ''}`}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-3 text-xl font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petal text-berry"><Icon name="sparkle" size={18} /></span>
              {user.name.split(' ')[0]}'s focus
            </h3>
            <Link to="/tasks" className="btn">Open tasks <Icon name="arrowRight" size={16} /></Link>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <FocusTile icon="clock" label="Due today" value={dueToday.length} />
            <FocusTile icon="alert" label="Overdue" value={overdue.length} tone={overdue.length ? 'text-red-400' : ''} />
            <FocusTile icon="calendar" label="This week" value={upcoming.length} />
            <FocusTile icon="tasks" label="Active" value={active.length} />
          </div>

          {overdue.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-400">Overdue</p>
              <div className="space-y-2">{overdue.slice(0, 5).map((t) => <TaskRow key={t._id} t={t} isAdmin={isAdmin} onOpen={openTask} />)}</div>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-mute">Upcoming week</p>
            {!upcoming.length && <p className="text-sm text-mute">No tasks due in the next 7 days</p>}
          </div>
          {upcoming.length
            ? <div className="space-y-2">{upcoming.slice(0, 6).map((t) => <TaskRow key={t._id} t={t} isAdmin={isAdmin} onOpen={openTask} />)}</div>
            : <p className="rounded-2xl border border-dashed border-rose bg-blush px-4 py-3 text-mute">Nothing scheduled for the next 7 days. Overdue work is listed under Overdue.</p>}
        </section>

        {isAdmin && (
          <section className="rounded-3xl bg-card p-6 ring-1 ring-petal">
            <h3 className="mb-5 flex items-center gap-3 text-xl font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petal text-berry"><Icon name="users" size={18} /></span>
              Team workload
            </h3>
            {!load.length && <p className="text-mute">No employees yet. Ask your team to sign up on the login page.</p>}
            <div className="space-y-4">
              {load.map((l) => (
                <div key={l._id}>
                  <div className="mb-1 flex items-center gap-2">
                    <Avatar name={l.name} />
                    <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
                    <span className="text-sm font-semibold text-berry-dark">{l.n} open</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full bg-berry transition-all" style={{ width: `${(l.n / maxLoad) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}