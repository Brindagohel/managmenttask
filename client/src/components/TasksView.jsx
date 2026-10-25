import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { STATUSES, statusOptions } from '../utils.js';
import TaskForm from './TaskForm.jsx';
import TaskDrawer from './TaskDrawer.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';

const DOT = { Pending: 'bg-berry', 'In Progress': 'bg-amber-400', 'In Review': 'bg-violet-400', Completed: 'bg-emerald-400' };
const STRIPE = { High: 'bg-berry', Medium: 'bg-amber-300', Low: 'bg-emerald-300' };
const isOverdue = (t) => t.status !== 'Completed' && new Date(t.deadline) < new Date(new Date().toDateString());

function Ring({ percent }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${percent}% completed`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#ffe4ee" strokeWidth="9" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="#d6578a" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 44 44)" />
      <text x="44" y="49" textAnchor="middle" fontSize="17" fontWeight="700" fill="#3b2230">{percent}%</text>
    </svg>
  );
}

function TaskCard({ t, isAdmin, onOpen, onEdit, onDelete, onStatus }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-petal bg-white p-4 pl-5 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${STRIPE[t.priority]}`} />
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-semibold leading-snug ${t.status === 'Completed' ? 'text-mute line-through' : ''}`}>
          <button type="button" className="text-left hover:text-berry-dark hover:underline" onClick={() => onOpen(t)}>{t.title}</button>
        </h3>
        {isAdmin && (
          <div className="-mr-1 -mt-1 flex shrink-0">
            <button className="icon-btn" onClick={() => onEdit(t)} aria-label="Edit task"><Icon name="edit" size={16} /></button>
            <button className="icon-btn" onClick={() => onDelete(t)} aria-label="Delete task"><Icon name="trash" size={16} /></button>
          </div>
        )}
      </div>
      {t.description && <p className="mt-1 line-clamp-2 text-sm text-mute">{t.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${isOverdue(t) ? 'bg-red-50 text-red-500' : 'bg-blush text-mute'}`}>
          <Icon name="calendar" size={13} />
          {new Date(t.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          {isOverdue(t) && ' · overdue'}
        </span>
        <span className="rounded-full bg-petal px-2.5 py-1 text-berry-dark">{t.priority}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {isAdmin && <Avatar name={t.assignedTo?.name || '?'} />}
        <select className="input !py-1.5 !text-sm" value={t.status} disabled={!isAdmin && t.status === 'Completed'} onChange={(e) => onStatus(t._id, e.target.value)} aria-label="Task status">
          {statusOptions(isAdmin, t.status).map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    </article>
  );
}

export default function TasksView({ isAdmin }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, task = edit
  const [openId, setOpenId] = useState(null); // task shown in the side drawer
  const [error, setError] = useState('');
  // search text can come from the top bar / notifications / dashboard via /tasks?q=...
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => { setQ(params.get('q') || ''); }, [params]);
  const [priority, setPriority] = useState('All');
  const [assignee, setAssignee] = useState('All');

  useEffect(() => {
    const calls = [api('/tasks')];
    if (isAdmin) calls.push(api('/users/employees'));
    Promise.all(calls).then(([t, e]) => { setTasks(t); if (e) setEmployees(e); }).catch((e) => setError(e.message));
  }, [isAdmin]);

  const replace = (u) => setTasks((ts) => ts.map((t) => (t._id === u._id ? u : t)));

  const save = async (form) => {
    if (editing._id) {
      replace(await api(`/tasks/${editing._id}`, { method: 'PUT', body: form }));
    } else {
      const created = await api('/tasks', { method: 'POST', body: form });
      setTasks((ts) => [...ts, created]);
    }
    setEditing(null);
  };

  const remove = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try { await api(`/tasks/${task._id}`, { method: 'DELETE' }); setTasks((ts) => ts.filter((t) => t._id !== task._id)); }
    catch (e) { setError(e.message); }
  };

  const changeStatus = async (id, status) => {
    try { replace(await api(`/tasks/${id}/status`, { method: 'PATCH', body: { status } })); }
    catch (e) { setError(e.message); }
  };

  const drawerTask = tasks.find((t) => t._id === openId);

  const visible = useMemo(() => tasks.filter((t) =>
    t.title.toLowerCase().includes(q.toLowerCase()) &&
    (priority === 'All' || t.priority === priority) &&
    (assignee === 'All' || t.assignedTo?._id === assignee)), [tasks, q, priority, assignee]);

  const done = tasks.filter((t) => t.status === 'Completed').length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const stats = [
    ['Total tasks', tasks.length, ''],
    ['In progress', tasks.filter((t) => t.status === 'In Progress').length, 'text-amber-500'],
    ['Overdue', tasks.filter(isOverdue).length, 'text-red-500'],
  ];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">{greeting}, {user.name.split(' ')[0]}</h2>
          <p className="mt-1 text-mute">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {isAdmin ? 'Here is where your team stands.' : 'Here is what is on your plate.'}</p>
        </div>
        {isAdmin && <button className="btn" onClick={() => setEditing({})}><Icon name="plus" /> New task</button>}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-petal sm:col-span-2 lg:col-span-1">
          <Ring percent={percent} />
          <div><p className="font-display text-lg font-bold">Completed</p><p className="text-sm text-mute">{done} of {tasks.length} tasks</p></div>
        </div>
        {stats.map(([label, n, color]) => (
          <div key={label} className="flex flex-col justify-center rounded-2xl bg-white p-5 shadow-sm ring-1 ring-petal">
            <p className="text-sm text-mute">{label}</p>
            <p className={`font-display text-4xl font-bold ${color}`}>{n}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute"><Icon name="search" size={16} /></span>
          <input className="input !pl-9" placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="All">All priorities</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
        {isAdmin && (
          <select className="input !w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter by employee">
            <option value="All">All employees</option>
            {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {!tasks.length && (
        <p className="mb-6 rounded-2xl border border-dashed border-rose bg-white p-8 text-center text-mute">
          {isAdmin ? 'No tasks yet. Click New task to assign the first one.' : 'Nothing assigned to you yet. Check back soon.'}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => {
          const col = visible.filter((t) => t.status === s);
          return (
            <section key={s} className="rounded-3xl bg-petal/50 p-3">
              <h3 className="mb-3 flex items-center gap-2 px-2 pt-1 font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} /> {s}
                <span className="ml-auto rounded-full bg-white px-2 text-sm text-mute">{col.length}</span>
              </h3>
              <div className="space-y-3">
                {col.map((t) => <TaskCard key={t._id} t={t} isAdmin={isAdmin} onOpen={(x) => setOpenId(x._id)} onEdit={setEditing} onDelete={remove} onStatus={changeStatus} />)}
                {!col.length && <p className="px-2 pb-3 text-sm text-mute">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>

      {drawerTask && <TaskDrawer task={drawerTask} isAdmin={isAdmin} onClose={() => setOpenId(null)} onChange={replace} onStatus={changeStatus} />}
      {editing && <TaskForm initial={editing._id ? editing : null} employees={employees} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}