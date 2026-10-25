import { useState } from 'react';

// Modal form used for both creating and editing a task.
export default function TaskForm({ initial, employees, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    priority: initial?.priority || 'Medium',
    deadline: initial?.deadline ? initial.deadline.slice(0, 10) : '',
    assignedTo: initial?.assignedTo?._id || '',
    repeat: initial?.repeat || 'none',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await onSave(form); } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold">{initial ? 'Edit task' : 'New task'}</h2>
        <label className="block">Title<input className="input mt-1" value={form.title} onChange={set('title')} required /></label>
        <label className="block">Description<textarea className="input mt-1" rows={3} value={form.description} onChange={set('description')} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">Priority
            <select className="input mt-1" value={form.priority} onChange={set('priority')}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </label>
          <label className="block">Deadline<input type="date" className="input mt-1" value={form.deadline} onChange={set('deadline')} required /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">Assign to
            <select className="input mt-1" value={form.assignedTo} onChange={set('assignedTo')} required>
              <option value="">Choose an employee</option>
              {employees.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
            </select>
          </label>
          <label className="block">Repeat
            <select className="input mt-1" value={form.repeat} onChange={set('repeat')}>
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </label>
        </div>
        {form.repeat !== 'none' && <p className="rounded-xl bg-blush p-3 text-sm text-mute">When this task is approved, the next one is created automatically with a new deadline.</p>}
        {!employees.length && <p className="text-sm text-mute">No employees yet. Ask your team to sign up on the login page first.</p>}
        <p className="text-sm text-mute">The employee gets an email when you save.</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save task'}</button>
        </div>
      </form>
    </div>
  );
}