import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { bucket, dayOf, fmtDay } from '../utils.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import PunchButton from '../components/PunchButton.jsx';

const BANNER_KEY = 'banner:quick-search';

function Stat({ icon, iconClass, label, value, valueClass = 'text-berry', foot, footClass = 'text-berry-dark', to }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-petal">
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-mute">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${iconClass}`}><Icon name={icon} size={20} /></span>
      </div>
      <p className={`mt-4 font-display text-4xl font-bold ${valueClass}`}>{value}</p>
      {to
        ? <Link to={to} className={`mt-1 inline-flex items-center gap-1 text-sm font-medium hover:underline ${footClass}`}>{foot} <Icon name="arrowRight" size={13} /></Link>
        : <p className={`mt-1 text-sm font-medium ${footClass}`}>{foot}</p>}
    </div>
  );
}

function FocusTile({ icon, label, value, tone = '' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-petal bg-white p-4">
      <span className={`text-mute ${tone}`}><Icon name={icon} size={22} /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">{label}</p>
        <p className={`font-display text-2xl font-bold leading-tight ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

function TaskRow({ t, isAdmin, onOpen }) {
  const overdue = bucket(t) === 'overdue';
  return (
    <button onClick={() => onOpen(t)} className="flex w-full items-center gap-3 rounded-2xl border border-petal bg-white px-4 py-3 text-left transition hover:bg-blush">
      {isAdmin && <Avatar name={t.assignedTo?.name || '?'} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{t.title}</span>
        <span className="block text-xs text-mute">{t.status}{isAdmin && t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ''}</span>
      </span>
      <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${overdue ? 'bg-red-50 text-red-500' : 'bg-blush text-mute'}`}>{fmtDay(dayOf(t))}</span>
      <span className="rounded-full bg-petal px-2.5 py-1 text-xs font-semibold text-berry-dark">{t.priority}</span>
    </button>
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
            <p className="text-sm text-berry-dark/80">Press Ctrl+K anywhere to find a task, check the bell for deadlines, and track your hours.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-soft !bg-white" onClick={() => window.dispatchEvent(new Event('open-search'))}>Try search</button>
            <button className="icon-btn" onClick={closeBanner} aria-label="Dismiss"><Icon name="close" size={16} /></button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Dashboard</h2>
          <p className="mt-1 text-mute">Welcome back, {user.name.split(' ')[0]}</p>
        </div>
        <PunchButton />
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="tasks" iconClass="bg-berry text-white" label="Active tasks" value={active.length}
          foot={newThisWeek ? `+${newThisWeek} added this week` : 'View all'} to="/tasks" />
        <Stat icon="alert" iconClass="bg-red-500 text-white" label="Overdue tasks" value={overdue.length}
          valueClass={overdue.length ? 'text-red-500' : 'text-emerald-500'}
          foot={overdue.length ? 'Needs attention' : 'All caught up'} footClass={overdue.length ? 'text-red-500' : 'text-emerald-500'} />
        {isAdmin
          ? <Stat icon="users" iconClass="bg-emerald-400 text-white" label="Team members" value={employees.length} valueClass="text-emerald-500"
              foot={`${active.length} open tasks`} footClass="text-emerald-600" />
          : <Stat icon="calendar" iconClass="bg-amber-400 text-white" label="Due this week" value={upcoming.length} valueClass="text-amber-500"
              foot={upcoming.length ? 'Plan your week' : 'Nothing due'} footClass="text-amber-600" />}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-petal">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-mute">Completed</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose text-berry-dark"><Icon name="check" size={20} /></span>
          </div>
          <p className="mt-4 font-display text-4xl font-bold text-berry">{percent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full bg-berry transition-all" style={{ width: `${percent}%` }} /></div>
          <p className="mt-1 text-sm font-medium text-berry-dark">{done} of {tasks.length} done</p>
        </div>
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'xl:grid-cols-3' : ''}`}>
        <section className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal ${isAdmin ? 'xl:col-span-2' : ''}`}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-3 font-display text-xl font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petal text-berry"><Icon name="sparkle" size={18} /></span>
              {user.name.split(' ')[0]}'s focus
            </h3>
            <Link to="/tasks" className="btn">Open tasks <Icon name="arrowRight" size={16} /></Link>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <FocusTile icon="clock" label="Due today" value={dueToday.length} />
            <FocusTile icon="alert" label="Overdue" value={overdue.length} tone={overdue.length ? 'text-red-500' : ''} />
            <FocusTile icon="calendar" label="This week" value={upcoming.length} />
            <FocusTile icon="tasks" label="Active" value={active.length} />
          </div>

          {overdue.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-500">Overdue</p>
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
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-petal">
            <h3 className="mb-5 flex items-center gap-3 font-display text-xl font-bold">
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