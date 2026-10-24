// Date helpers shared by the dashboard, notifications and search.
// Deadlines are compared as plain "YYYY-MM-DD" strings so time zones never shift a task to another day.
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export const dayOf = (t) => String(t.deadline).slice(0, 10);

// 'done' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'
export const bucket = (t) => {
  if (t.status === 'Completed') return 'done';
  const d = dayOf(t);
  if (d < addDays(0)) return 'overdue';
  if (d === addDays(0)) return 'today';
  if (d === addDays(1)) return 'tomorrow';
  if (d <= addDays(7)) return 'week';
  return 'later';
};

export const fmtDay = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });