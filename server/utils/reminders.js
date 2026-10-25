import Task from '../models/Task.js';
import { notifyReminder } from './notify.js';

const iso = (d) => d.toISOString().slice(0, 10);

// Emails employees about tasks that are overdue, due today or due tomorrow.
// Each task gets at most one reminder per day (remindedOn = "YYYY-MM-DD:kind").
// Tasks that are In Review or Completed are skipped: the employee has already finished them.
export async function runReminders() {
  const now = new Date();
  const today = iso(now);
  const tomorrow = iso(new Date(now.getTime() + 864e5));
  const result = { sent: 0, skipped: 0, failed: 0 };

  const tasks = await Task.find({ status: { $in: ['Pending', 'In Progress'] } }).populate('assignedTo', 'name email');
  for (const task of tasks) {
    const due = iso(new Date(task.deadline)); // deadlines are stored as UTC dates
    const kind = due < today ? 'overdue' : due === today ? 'today' : due === tomorrow ? 'tomorrow' : null;
    if (!kind) continue;

    const key = `${today}:${kind}`;
    if (task.remindedOn === key) { result.skipped++; continue; }

    const r = await notifyReminder(task, kind);
    if (r?.sent) {
      await Task.updateOne({ _id: task._id }, { remindedOn: key }, { timestamps: false });
      result.sent++;
    } else if (r?.demo || r?.reason === 'No email address') {
      result.skipped++;
    } else {
      result.failed++;
    }
  }
  return result;
}