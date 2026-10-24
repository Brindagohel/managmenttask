import { Router } from 'express';
import Task from '../models/Task.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const pick = (b) => ({
  title: b.title,
  description: b.description,
  priority: b.priority,
  deadline: b.deadline,
  assignedTo: b.assignedTo,
});
const populate = (q) => q.populate('assignedTo', 'name email').sort({ deadline: 1 });

// Admin sees all tasks, employees see only their own
router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
    res.json(await populate(Task.find(filter)));
  } catch (e) { next(e); }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const task = await Task.create({ ...pick(req.body), createdBy: req.user._id });
    res.status(201).json(await task.populate('assignedTo', 'name email'));
  } catch (e) { next(e); }
});

// Used by the AI generator to save several reviewed tasks at once
router.post('/bulk', adminOnly, async (req, res, next) => {
  try {
    const list = Array.isArray(req.body.tasks) ? req.body.tasks : [];
    if (!list.length) return res.status(400).json({ message: 'No tasks to save' });
    const docs = await Task.insertMany(list.map((t) => ({ ...pick(t), createdBy: req.user._id })));
    res.status(201).json({ count: docs.length });
  } catch (e) { next(e); }
});

router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(await task.populate('assignedTo', 'name email'));
  } catch (e) { next(e); }
});

// Employees may only change the status of their own tasks
router.patch('/:id/status', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role !== 'admin' && String(task.assignedTo) !== String(req.user._id))
      return res.status(403).json({ message: 'This task is not assigned to you' });
    task.status = req.body.status;
    await task.save();
    res.json(await task.populate('assignedTo', 'name email'));
  } catch (e) { next(e); }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (e) { next(e); }
});

export default router;
