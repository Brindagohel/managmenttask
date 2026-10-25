import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { bucket, dayOf, fmtDay, statusOptions, timeAgo } from '../utils.js';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';

// Side panel with everything about one task: checklist, comments and history.
export default function TaskDrawer({ task, isAdmin, onClose, onChange, onStatus }) {
  const [newItem, setNewItem] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { onChange(await fn()); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const subtasks = task.subtasks || [];
  const saveSubtasks = (list) => run(() => api(`/tasks/${task._id}/subtasks`, { method: 'PUT', body: { subtasks: list } }));
  const toggle = (i) => saveSubtasks(subtasks.map((s, j) => (j === i ? { ...s, done: !s.done } : s)));
  const remove = (i) => saveSubtasks(subtasks.filter((_, j) => j !== i));
  const addItem = (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    saveSubtasks([...subtasks, { title: newItem.trim(), done: false }]);
    setNewItem('');
  };
  const sendComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    run(() => api(`/tasks/${task._id}/comments`, { method: 'POST', body: { text: comment } }));
    setComment('');
  };

  const decide = (decision) => {
    run(() => api(`/tasks/${task._id}/review`, { method: 'POST', body: { decision, note } }));
    setNote('');
  };

  const done = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;
  const overdue = bucket(task) === 'overdue';
  const history = [...(task.activity || [])].reverse();

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-petal bg-white p-5">
          <div className="min-w-0">
            <h2 className={`text-xl font-bold leading-snug ${task.status === 'Completed' ? 'text-mute line-through' : ''}`}>{task.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${overdue ? 'bg-red-50 text-red-500' : 'bg-blush text-mute'}`}>
                <Icon name="calendar" size={13} /> {fmtDay(dayOf(task))}{overdue && ' · overdue'}
              </span>
              <span className="rounded-full bg-petal px-2.5 py-1 text-berry-dark">{task.priority}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
        </div>

        <div className="space-y-7 p-5">
          {task.description && <p className="whitespace-pre-line text-mute">{task.description}</p>}

          <div className="flex items-center gap-3">
            {isAdmin && task.assignedTo && (
              <div className="flex min-w-0 items-center gap-2"><Avatar name={task.assignedTo.name} /><span className="truncate text-sm font-medium">{task.assignedTo.name}</span></div>
            )}
            <select className="input !w-auto !py-1.5 !text-sm ml-auto" value={task.status} disabled={!isAdmin && task.status === 'Completed'} onChange={(e) => onStatus(task._id, e.target.value)} aria-label="Task status">
              {statusOptions(isAdmin, task.status).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {task.repeat && task.repeat !== 'none' && (
            <p className="flex items-center gap-2 rounded-xl bg-blush px-3 py-2 text-sm text-mute"><Icon name="repeat" size={15} /> Repeats {task.repeat}. The next one is created when this is approved.</p>
          )}

          {task.status === 'In Review' && (
            isAdmin ? (
              <div className="rounded-2xl border border-rose bg-petal/50 p-4">
                <p className="mb-2 font-semibold text-berry-dark">Waiting for your review</p>
                <textarea className="input mb-3" rows={2} placeholder="Feedback for the employee (optional, sent by email)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                <div className="flex gap-2">
                  <button className="btn flex-1" disabled={busy} onClick={() => decide('approve')}><Icon name="check" size={16} /> Approve</button>
                  <button className="btn btn-soft flex-1" disabled={busy} onClick={() => decide('reject')}>Request changes</button>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-petal/60 px-3 py-2 text-sm font-medium text-berry-dark">Sent to your manager for review. You will get an email with the result.</p>
            )
          )}

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold"><Icon name="list" size={17} /> Checklist</h3>
              {subtasks.length > 0 && <span className="text-sm font-semibold text-berry-dark">{done}/{subtasks.length}</span>}
            </div>
            {subtasks.length > 0 && <div className="mb-3 h-2 overflow-hidden rounded-full bg-petal"><div className="h-full rounded-full bg-berry transition-all" style={{ width: `${pct}%` }} /></div>}
            <ul className="space-y-1">
              {subtasks.map((s, i) => (
                <li key={s._id || i} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-blush">
                  <input type="checkbox" className="h-4 w-4 accent-[#d6578a]" checked={s.done} disabled={busy} onChange={() => toggle(i)} />
                  <span className={`flex-1 ${s.done ? 'text-mute line-through' : ''}`}>{s.title}</span>
                  <button className="icon-btn !p-1 opacity-0 group-hover:opacity-100" onClick={() => remove(i)} aria-label="Remove item"><Icon name="close" size={14} /></button>
                </li>
              ))}
            </ul>
            <form onSubmit={addItem} className="mt-2 flex gap-2">
              <input className="input !py-1.5" placeholder="Add a checklist item" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
              <button className="btn btn-soft !px-3" disabled={busy}><Icon name="plus" size={16} /></button>
            </form>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Icon name="message" size={17} /> Comments <span className="text-sm font-semibold text-mute">{(task.comments || []).length}</span></h3>
            <div className="space-y-3">
              {(task.comments || []).map((c, i) => (
                <div key={c._id || i} className="flex gap-3">
                  <Avatar name={c.name || '?'} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-blush px-4 py-2.5">
                    <p className="text-sm"><b>{c.name}</b> <span className="text-xs text-mute">· {timeAgo(c.createdAt)}</span></p>
                    <p className="whitespace-pre-line break-words">{c.text}</p>
                  </div>
                </div>
              ))}
              {!(task.comments || []).length && <p className="text-sm text-mute">No comments yet. Start the conversation.</p>}
            </div>
            <form onSubmit={sendComment} className="mt-3 flex gap-2">
              <input className="input" placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
              <button className="btn !px-3.5" disabled={busy || !comment.trim()} aria-label="Send comment"><Icon name="send" size={16} /></button>
            </form>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Icon name="clock" size={17} /> Activity</h3>
            <ol className="relative space-y-4 border-l-2 border-petal pl-5">
              {history.map((a, i) => (
                <li key={a._id || i} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-berry" />
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-mute">{a.by} · {timeAgo(a.at)}</p>
                </li>
              ))}
              {!history.length && <li className="text-sm text-mute">No activity recorded yet.</li>}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}