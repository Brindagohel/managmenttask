// Fills the database with demo employees and tasks so dashboards and charts look alive.
// Run once from the server folder:  node seed.js
// Safe to run again: it removes the previous demo data first. Your real users and tasks are not touched.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Task from './models/Task.js';
import Attendance from './models/Attendance.js';

const DOMAIN = '@demo.taskflow';
const day = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };
const ago = (n) => new Date(Date.now() - n * 864e5);

const PEOPLE = ['Aarav Mehta', 'Diya Patel', 'Rohan Shah', 'Isha Desai', 'Kabir Joshi'];

// [title, description, priority, status, deadlineOffsetDays, createdDaysAgo, completedDaysAgo, person, repeat?]
const TASKS = [
  ['Design landing page', 'New hero section and pricing block', 'High', 'In Progress', 2, 6, null, 0],
  ['Fix login bug on mobile', 'Keyboard hides the submit button on small phones', 'High', 'Completed', -2, 9, 3, 1],
  ['Prepare Q4 sales report', 'Revenue by region and product line', 'High', 'Pending', 5, 3, null, 2],
  ['Client onboarding call', 'Kick-off with the new enterprise client', 'Medium', 'Completed', -4, 10, 5, 3],
  ['Update API documentation', 'Document the new comments and checklist endpoints', 'Medium', 'In Progress', 3, 5, null, 4],
  ['Review pull requests', 'Backlog of 6 open PRs', 'Medium', 'Pending', -1, 7, null, 0],
  ['Set up staging server', 'Mirror production on a separate environment', 'High', 'Completed', -6, 14, 7, 1],
  ['Write onboarding emails', 'Three-step welcome sequence', 'Low', 'Pending', 6, 2, null, 2],
  ['Database backup automation', 'Nightly backups with 14-day retention', 'High', 'In Progress', 1, 4, null, 3],
  ['Customer feedback survey', 'Draft and send to the top 50 accounts', 'Low', 'Completed', -8, 15, 9, 4],
  ['Redesign invoice template', 'Add GST breakup and company logo', 'Medium', 'Completed', -3, 8, 4, 0],
  ['Competitor analysis', 'Compare features and pricing of 5 competitors', 'Medium', 'In Progress', 4, 6, null, 1],
  ['Team training session', 'Intro to the new project workflow', 'Low', 'Pending', 7, 1, null, 2],
  ['Optimise dashboard load time', 'Target under 2 seconds on 4G', 'High', 'Pending', 0, 3, null, 3],
  ['Monthly expense reconciliation', 'Match bank statements with ledger', 'Medium', 'Completed', -1, 5, 1, 4],
  ['Prepare investor deck', 'Update metrics for the board meeting', 'High', 'In Progress', 8, 4, null, 0],
  ['Fix email notification delay', 'Queue delays up to 10 minutes', 'Medium', 'Completed', -5, 11, 6, 1],
  ['Create social media calendar', 'Plan next month of posts', 'Low', 'Pending', 10, 1, null, 2],
  ['Security audit checklist', 'Review roles, tokens and password rules', 'High', 'Pending', -2, 8, null, 3],
  ['Vendor contract renewal', 'Negotiate terms for the hosting provider', 'Medium', 'In Progress', 12, 2, null, 4],
  ['Refactor task API', 'Split routes into controllers', 'Low', 'Completed', -10, 18, 12, 0],
  ['Launch referral campaign', 'Landing page, tracking and rewards', 'High', 'Pending', 14, 0, null, 1],
  ['Prepare monthly newsletter', 'Draft, proofread and schedule the newsletter', 'Medium', 'In Review', 1, 4, null, 2],
  ['Update pricing page copy', 'New plan names and feature list', 'High', 'In Review', 2, 3, null, 3],
  ['Weekly team report', 'Summarise progress for management', 'Medium', 'Pending', 3, 2, null, 4, 'weekly'],
  ['Daily stand-up notes', 'Share blockers and plan for the day', 'Low', 'In Progress', 0, 5, null, 0, 'daily'],
];

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

const old = await User.find({ email: { $regex: `${DOMAIN}$` } }).select('_id');
await Task.deleteMany({ assignedTo: { $in: old.map((u) => u._id) } });
await Attendance.deleteMany({ user: { $in: old.map((u) => u._id) } });
await User.deleteMany({ _id: { $in: old.map((u) => u._id) } });

const admin = await User.findOne({ role: 'admin' });
if (!admin) { console.error('No admin found. Start the server once first so the admin account is created.'); process.exit(1); }

const password = await bcrypt.hash('demo123', 10);
const people = await User.insertMany(PEOPLE.map((name) => ({
  name, email: `${name.split(' ')[0].toLowerCase()}${DOMAIN}`, password, role: 'employee',
})));

const docs = TASKS.map(([title, description, priority, status, due, created, doneAgo, who, repeat = 'none']) => {
  const p = people[who];
  const createdAt = ago(created);
  const t = {
    title, description, priority, status, repeat, spawned: false, remindedOn: '',
    deadline: day(due), assignedTo: p._id, createdBy: admin._id, createdAt, updatedAt: createdAt,
    completedAt: doneAgo !== null ? ago(doneAgo) : null,
    activity: [{ text: 'Task created', by: admin.name, at: createdAt }],
    subtasks: [],
    comments: [],
  };
  if (status !== 'Pending') t.activity.push({ text: 'Status changed from Pending to In Progress', by: p.name, at: ago(Math.max(created - 1, 0)) });
  if (status === 'In Review') {
    t.activity.push({ text: 'Submitted for review', by: p.name, at: ago(0.2) });
    t.comments = [{ user: p._id, name: p.name, text: 'Finished, please review when you get a moment.', createdAt: ago(0.2) }];
  }
  if (status === 'Completed') { t.activity.push({ text: 'Submitted for review', by: p.name, at: t.completedAt }); t.activity.push({ text: 'Approved', by: admin.name, at: t.completedAt }); }
  if (status === 'In Progress') {
    t.subtasks = [{ title: 'First draft', done: true }, { title: 'Internal review', done: false }, { title: 'Final changes', done: false }];
    t.comments = [{ user: p._id, name: p.name, text: 'Started working on this, will share an update tomorrow.', createdAt: ago(1) }];
  }
  return t;
});

await Task.collection.insertMany(docs.map((d) => ({ ...d, __v: 0 })));

// Attendance for the last 6 weeks (weekdays only), two sessions per day with a lunch break
const at = (daysBack, h, m) => { const d = new Date(); d.setDate(d.getDate() - daysBack); d.setHours(h, m, 0, 0); return d; };
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const attendance = [];
people.forEach((p, i) => {
  for (let back = 1; back <= 42; back++) {
    const day = at(back, 9, 0);
    if ([0, 6].includes(day.getDay())) continue;
    if ((back * 7 + i * 3) % 11 === 0) continue; // an occasional day off
    const jitter = ((back + i * 5) % 4) * 10;
    attendance.push({
      user: p._id, date: dateKey(day), createdAt: day, updatedAt: day, __v: 0,
      sessions: [
        { start: at(back, 9, jitter), end: at(back, 13, 0 + jitter) },
        { start: at(back, 14, 0), end: at(back, 17 + (i % 2), 30 - jitter) },
      ],
    });
  }
});
await Attendance.collection.insertMany(attendance);
console.log(`Demo data ready: ${people.length} employees (password: demo123), ${docs.length} tasks and ${attendance.length} attendance days.`);
console.log('Employee logins:', people.map((p) => p.email).join(', '));
await mongoose.disconnect();