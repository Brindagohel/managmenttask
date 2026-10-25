import { Router } from 'express';
import Attachment from '../models/Attachment.js';
import Task from '../models/Task.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { notifyAssigned, notifyAssignedMany, notifyDeadlineChanged, notifyReviewRequested, notifyReviewResult } from '../utils/notify.js';

const router = Router();
router.use(protect);

const STATUSES = ['Pending', 'In Progress', 'In Review', 'Completed'];
const pick = (b) => ({
  title: b.title,
  description: b.description,
  priority: b.priority,
  deadline: b.deadline,
  assignedTo: b.assignedTo,
  repeat: b.repeat,
});
const POP = 'name email';
const populate = (q) => q.populate('assignedTo', POP);
const log = (task, text, user) => task.activity.push({ text, by: user.name });
const isMine = (task, user) => user.role === 'admin' || String(task.assignedTo?._id || task.assignedTo) === String(user._id);

// When a repeating task is approved, create the next one (same checklist, new deadline)
async function spawnNext(task, user) {
  if (!task.repeat || task.repeat === 'none' || task.spawned) return;
  const next = new Date(task.deadline);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  do {
    if (task.repeat === 'daily') next.setUTCDate(next.getUTCDate() + 1);
    else if (task.repeat === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
  } while (next < today);

  const copy = await Task.create({
    title: task.title,
    description: task.description,
    priority: task.priority,
    deadline: next,
    assignedTo: task.assignedTo._id || task.assignedTo,
    createdBy: task.createdBy,
    repeat: task.repeat,
    subtasks: task.subtasks.map((s) => ({ title: s.title, done: false })),
    activity: [{ text: `Created automatically (repeats ${task.repeat})`, by: 'System' }],
  });
  await Task.updateOne({ _id: task._id }, { spawned: true }, { timestamps: false });
  await notifyAssigned(await copy.populate('assignedTo', POP), user, { recurring: true });
}

// Admin sees all tasks, employees see only their own
router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
    res.json(await populate(Task.find(filter)).sort({ deadline: 1 }));
  } catch (e) { next(e); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const task = new Task({ ...pick(req.body), createdBy: req.user._id });
    log(task, 'Task created', req.user);
    await task.save();
    await task.populate('assignedTo', POP);
    await notifyAssigned(task, req.user);
    res.status(201).json(task);
  } catch (e) { next(e); }
});

// Used by the AI generator to save several reviewed tasks at once
router.post('/bulk', adminOnly, async (req, res, next) => {
  try {
    const list = Array.isArray(req.body.tasks) ? req.body.tasks : [];
    if (!list.length) return res.status(400).json({ message: 'No tasks to save' });
    const docs = await Task.insertMany(list.map((t) => ({
      ...pick(t),
      createdBy: req.user._id,
      activity: [{ text: 'Task created (AI generator)', by: req.user.name }],
    })));
    const populated = await populate(Task.find({ _id: { $in: docs.map((d) => d._id) } }));
    await notifyAssignedMany(populated, req.user);
    res.status(201).json({ count: docs.length });
  } catch (e) { next(e); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const next_ = pick(req.body);
    const oldDeadline = task.deadline;
    const changes = [];
    const assigneeChanged = !!next_.assignedTo && String(next_.assignedTo) !== String(task.assignedTo);
    const deadlineChanged = !!next_.deadline && new Date(next_.deadline).getTime() !== task.deadline.getTime();
    if (next_.title !== undefined && next_.title !== task.title) changes.push('title');
    if (next_.priority && next_.priority !== task.priority) changes.push(`priority to ${next_.priority}`);
    if (deadlineChanged) changes.push('deadline');
    if (assigneeChanged) changes.push('assignee');
    if (next_.repeat && next_.repeat !== task.repeat) changes.push(`repeat to ${next_.repeat}`);
    Object.entries(next_).forEach(([k, v]) => { if (v !== undefined) task[k] = v; });
    if (changes.length) log(task, `Updated ${changes.join(', ')}`, req.user);
    if (deadlineChanged) task.remindedOn = '';
    await task.save();
    await task.populate('assignedTo', POP);
    if (assigneeChanged) await notifyAssigned(task, req.user);
    else if (deadlineChanged) await notifyDeadlineChanged(task, oldDeadline, req.user);
    res.json(task);
  } catch (e) { next(e); }
});

// Change status. Employees cannot approve their own work: choosing "Completed" sends it for review instead.
router.patch('/:id/status', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!isMine(task, req.user)) return res.status(403).json({ message: 'This task is not assigned to you' });
    let { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const admin = req.user.role === 'admin';
    if (!admin && task.status === 'Completed') return res.status(403).json({ message: 'This task is already approved. Ask your manager to reopen it.' });
    if (!admin && status === 'Completed') status = 'In Review';

    const previous = task.status;
    let approvedNow = false, submitted = false;
    if (status !== previous) {
      if (status === 'In Review') { log(task, 'Submitted for review', req.user); submitted = !admin; }
      else if (status === 'Completed') { log(task, previous === 'In Review' ? 'Approved' : `Status changed from ${previous} to Completed`, req.user); approvedNow = true; }
      else log(task, `Status changed from ${previous} to ${status}`, req.user);
      task.status = status;
      task.completedAt = status === 'Completed' ? new Date() : null;
    }
    await task.save();
    await task.populate('assignedTo', POP);

    if (submitted) await notifyReviewRequested(task);
    if (approvedNow) {
      if (previous === 'In Review') await notifyReviewResult(task, { approved: true, by: req.user });
      await spawnNext(task, req.user);
    }
    res.json(task);
  } catch (e) { next(e); }
});

// Admin decision on a task that is "In Review"
router.post('/:id/review', adminOnly, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'In Review') return res.status(400).json({ message: 'This task is not waiting for review' });
    const approve = req.body.decision === 'approve';
    const note = String(req.body.note || '').trim().slice(0, 500);

    if (approve) {
      task.status = 'Completed';
      task.completedAt = new Date();
      log(task, 'Approved', req.user);
    } else {
      task.status = 'In Progress';
      task.completedAt = null;
      log(task, note ? `Changes requested: ${note}` : 'Changes requested', req.user);
      if (note) task.comments.push({ user: req.user._id, name: req.user.name, text: `Changes requested: ${note}` });
    }
    await task.save();
    await task.populate('assignedTo', POP);
    await notifyReviewResult(task, { approved: approve, note, by: req.user });
    if (approve) await spawnNext(task, req.user);
    res.json(task);
  } catch (e) { next(e); }
});

// Replace the checklist (admin or the assigned employee)
router.put('/:id/subtasks', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!isMine(task, req.user)) return res.status(403).json({ message: 'This task is not assigned to you' });
    const list = (Array.isArray(req.body.subtasks) ? req.body.subtasks : [])
      .filter((s) => s && String(s.title || '').trim())
      .slice(0, 50)
      .map((s) => ({ title: String(s.title).trim().slice(0, 200), done: !!s.done }));
    const before = task.subtasks.length;
    task.subtasks = list;
    if (list.length > before) log(task, `Added checklist item "${list[list.length - 1].title}"`, req.user);
    await task.save();
    res.json(await task.populate('assignedTo', POP));
  } catch (e) { next(e); }
});

// Add a comment (admin or the assigned employee)
router.post('/:id/comments', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!isMine(task, req.user)) return res.status(403).json({ message: 'This task is not assigned to you' });
    const text = String(req.body.text || '').trim().slice(0, 1000);
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    task.comments.push({ user: req.user._id, name: req.user.name, text });
    await task.save();
    res.status(201).json(await task.populate('assignedTo', POP));
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await Attachment.deleteMany({ task: task._id });
    res.json({ message: 'Task deleted' });
  } catch (e) { next(e); }
});

export default router;