import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const MAX_OPEN_MS = 12 * 3600 * 1000; // a session left open counts for at most 12 hours
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// The browser sends its own local date so "today" matches the employee's time zone
const dateOf = (v) => {
  if (DATE_RE.test(String(v || ''))) return String(v);
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Close sessions that were left open for more than 12 hours. Returns true if anything changed.
function closeStale(doc, now = Date.now()) {
  let changed = false;
  doc.sessions.forEach((s) => {
    if (!s.end && now - new Date(s.start).getTime() > MAX_OPEN_MS) {
      s.end = new Date(new Date(s.start).getTime() + MAX_OPEN_MS);
      changed = true;
    }
  });
  return changed;
}

const spanMs = (s, now = Date.now()) => {
  const start = new Date(s.start).getTime();
  const end = s.end ? new Date(s.end).getTime() : Math.min(now, start + MAX_OPEN_MS);
  return Math.max(0, end - start);
};

// { closedMs, runningSince } is what the Punch button needs
function stateOf(doc) {
  const sessions = doc?.sessions || [];
  const open = sessions.find((s) => !s.end);
  return {
    closedMs: sessions.filter((s) => s.end).reduce((a, s) => a + spanMs(s), 0),
    runningSince: open ? open.start : null,
  };
}

router.get('/today', async (req, res, next) => {
  try {
    const doc = await Attendance.findOne({ user: req.user._id, date: dateOf(req.query.date) });
    if (doc && closeStale(doc)) await doc.save();
    res.json(stateOf(doc));
  } catch (e) { next(e); }
});

// Punch in if nothing is running, punch out if a session is open
router.post('/punch', async (req, res, next) => {
  try {
    const date = dateOf(req.body?.date);
    let doc = await Attendance.findOne({ user: req.user._id, date });
    if (!doc) doc = new Attendance({ user: req.user._id, date, sessions: [] });
    closeStale(doc);
    const open = doc.sessions.find((s) => !s.end);
    if (open) open.end = new Date();
    else doc.sessions.push({ start: new Date() });
    await doc.save();
    res.json(stateOf(doc));
  } catch (e) { next(e); }
});

// Monthly report. Admin: every employee. Employee: only their own row.
router.get('/report', async (req, res, next) => {
  try {
    const now = new Date();
    const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = MONTH_RE.test(String(req.query.month || '')) ? String(req.query.month) : fallback;
    const isAdmin = req.user.role === 'admin';

    const users = isAdmin
      ? await User.find({ role: 'employee' }).select('name email').sort('name')
      : [req.user];
    const docs = await Attendance.find({
      user: { $in: users.map((u) => u._id) },
      date: { $gte: `${month}-01`, $lte: `${month}-31` },
    });

    const t = Date.now();
    const rows = users.map((u) => {
      const mine = docs.filter((d) => String(d.user) === String(u._id));
      const days = mine
        .map((d) => ({ date: d.date, ms: d.sessions.reduce((a, s) => a + spanMs(s, t), 0) }))
        .filter((d) => d.ms > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      const running = mine.some((d) => d.sessions.some((s) => !s.end && t - new Date(s.start).getTime() <= MAX_OPEN_MS));
      return {
        user: { _id: u._id, name: u.name, email: u.email },
        totalMs: days.reduce((a, d) => a + d.ms, 0),
        days,
        running,
      };
    });
    res.json({ month, rows });
  } catch (e) { next(e); }
});

export default router;