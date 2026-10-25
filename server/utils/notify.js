import User from '../models/User.js';
import { sendMail, emailLayout, esc, fmtDate } from './mailer.js';

// Every function expects a task whose assignedTo is populated with { name, email }.

export function notifyAssigned(task, by, { recurring = false } = {}) {
  const who = task.assignedTo;
  if (!who?.email) return { sent: false, reason: 'No email address' };
  return sendMail({
    to: who.email,
    subject: `New task assigned: ${task.title}`,
    html: emailLayout({
      heading: recurring ? 'Your recurring task is back' : 'You have a new task',
      intro: `Hi ${esc(who.name)}, ${recurring ? 'the next round of a repeating task has been scheduled for you.' : `<b>${esc(by?.name || 'Your manager')}</b> assigned a task to you.`}`,
      task,
      button: 'View my tasks',
    }),
  });
}

// One email per employee when several tasks are created at once (AI generator)
export async function notifyAssignedMany(tasks, by) {
  const groups = new Map();
  tasks.forEach((t) => {
    if (!t.assignedTo?.email) return;
    const key = String(t.assignedTo._id);
    if (!groups.has(key)) groups.set(key, { who: t.assignedTo, list: [] });
    groups.get(key).list.push(t);
  });
  for (const { who, list } of groups.values()) {
    const rows = list.map((t) => `<li style="margin:6px 0"><b>${esc(t.title)}</b> <span style="color:#8f7683">· due ${fmtDate(t.deadline)} · ${esc(t.priority)}</span></li>`).join('');
    await sendMail({
      to: who.email,
      subject: `${list.length} new tasks assigned to you`,
      html: emailLayout({
        heading: `${list.length} new tasks for you`,
        intro: `Hi ${esc(who.name)}, <b>${esc(by?.name || 'Your manager')}</b> assigned you these tasks:`,
        extra: `<ul style="padding-left:18px;color:#3b2230;font-size:14px">${rows}</ul>`,
        button: 'View my tasks',
      }),
    });
  }
}

export function notifyDeadlineChanged(task, oldDeadline, by) {
  const who = task.assignedTo;
  if (!who?.email) return { sent: false, reason: 'No email address' };
  return sendMail({
    to: who.email,
    subject: `Deadline changed: ${task.title}`,
    html: emailLayout({
      heading: 'A deadline was changed',
      intro: `Hi ${esc(who.name)}, <b>${esc(by?.name || 'Your manager')}</b> moved the deadline from <s>${fmtDate(oldDeadline)}</s> to <b>${fmtDate(task.deadline)}</b>.`,
      task,
      accent: '#f59e0b',
    }),
  });
}

// An employee finished a task -> tell every admin it is waiting for approval
export async function notifyReviewRequested(task) {
  const admins = await User.find({ role: 'admin' }).select('name email');
  return Promise.all(admins.map((a) => sendMail({
    to: a.email,
    subject: `Ready for review: ${task.title}`,
    html: emailLayout({
      heading: 'A task is ready for your review',
      intro: `Hi ${esc(a.name)}, <b>${esc(task.assignedTo?.name || 'An employee')}</b> finished a task and sent it for approval.`,
      task,
      button: 'Review it now',
      accent: '#8b5cf6',
    }),
  })));
}

export function notifyReviewResult(task, { approved, note, by }) {
  const who = task.assignedTo;
  if (!who?.email) return { sent: false, reason: 'No email address' };
  return sendMail({
    to: who.email,
    subject: approved ? `Approved: ${task.title}` : `Changes requested: ${task.title}`,
    html: emailLayout({
      heading: approved ? 'Your task was approved 🎉' : 'Changes were requested',
      intro: approved
        ? `Hi ${esc(who.name)}, <b>${esc(by?.name || 'Your manager')}</b> approved your work. Well done!`
        : `Hi ${esc(who.name)}, <b>${esc(by?.name || 'Your manager')}</b> sent this task back to you.`,
      task,
      extra: !approved && note ? `<p style="background:#fff7fa;border-left:4px solid #d6578a;padding:10px 14px;color:#3b2230;font-size:14px"><b>Feedback:</b> ${esc(note)}</p>` : '',
      accent: approved ? '#10b981' : '#d6578a',
    }),
  });
}

const REMINDER = {
  tomorrow: { subject: 'Due tomorrow', heading: 'A task is due tomorrow', accent: '#f59e0b' },
  today: { subject: 'Due today', heading: 'A task is due today', accent: '#d6578a' },
  overdue: { subject: 'Overdue', heading: 'A task is overdue', accent: '#ef4444' },
};

export function notifyReminder(task, kind) {
  const who = task.assignedTo;
  if (!who?.email) return { sent: false, reason: 'No email address' };
  const r = REMINDER[kind];
  return sendMail({
    to: who.email,
    subject: `${r.subject}: ${task.title}`,
    html: emailLayout({
      heading: r.heading,
      intro: `Hi ${esc(who.name)}, this is a friendly reminder about the task below.`,
      task,
      accent: r.accent,
    }),
  });
}