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

// whole days between two "YYYY-MM-DD" strings (b - a)
export const diffDays = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

// "5 min ago", "2 days ago" ...
export const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// Downloads rows (array of arrays) as a CSV file that opens in Excel
export const downloadCsv = (filename, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const STATUSES = ['Pending', 'In Progress', 'In Review', 'Completed'];

// Employees cannot pick "Completed" themselves: finished work goes to "In Review" and the boss approves it
export const statusOptions = (isAdmin, current) =>
  isAdmin ? STATUSES : STATUSES.filter((x) => x !== 'Completed' || current === 'Completed');