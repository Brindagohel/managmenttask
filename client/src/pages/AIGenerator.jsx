import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function AIGenerator() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState([]); // each: {title, description, priority, selected}
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api('/users/employees').then(setEmployees).catch((e) => setError(e.message)); }, []);

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const { tasks } = await api('/ai/generate', { method: 'POST', body: { description } });
      setRows(tasks.map((t) => ({ ...t, selected: true })));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const update = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const chosen = rows.filter((r) => r.selected && r.title.trim());
    if (!chosen.length) return setError('Select at least one task with a title');
    if (!assignedTo || !deadline) return setError('Choose an employee and a deadline for these tasks');
    setBusy(true); setError('');
    try {
      await api('/tasks/bulk', { method: 'POST', body: { tasks: chosen.map(({ selected, ...t }) => ({ ...t, assignedTo, deadline })) } });
      navigate('/');
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="mb-2 text-2xl font-bold">AI task generator</h2>
      <p className="mb-6 text-mute">Describe a project and get a suggested task list. Review and edit before saving. If AI is unavailable, add rows by hand.</p>

      <textarea className="input mb-3" rows={4} placeholder="Example: Launch a mobile-friendly website for a local bakery with online ordering" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="mb-6 flex gap-2">
        <button className="btn" onClick={generate} disabled={busy || description.trim().length < 10}>{busy ? 'Working…' : 'Generate tasks'}</button>
        <button className="btn btn-soft" onClick={() => setRows([...rows, { title: '', description: '', priority: 'Medium', selected: true }])}>Add task manually</button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-petal bg-white p-4">
              <input type="checkbox" className="mt-3 accent-[#d6578a]" checked={r.selected} onChange={(e) => update(i, { selected: e.target.checked })} aria-label="Include task" />
              <div className="min-w-0 flex-1 space-y-2">
                <input className="input font-semibold" placeholder="Task title" value={r.title} onChange={(e) => update(i, { title: e.target.value })} />
                <textarea className="input" rows={2} placeholder="Description" value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
                <select className="input !w-auto" value={r.priority} onChange={(e) => update(i, { priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <button className="self-start text-mute hover:text-berry" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} aria-label="Remove task">✕</button>
            </div>
          ))}

          <div className="grid gap-3 rounded-2xl bg-petal p-4 sm:grid-cols-2">
            <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Assign all to…</option>
              {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <button className="btn w-full" onClick={save} disabled={busy}>Save selected tasks</button>
        </div>
      )}
    </div>
  );
}
