import { Router } from 'express';
import Task from '../models/Task.js';
import Attachment from '../models/Attachment.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB (Vercel rejects requests above ~4.5 MB)
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const canAccess = (task, user) =>
  user.role === 'admin' || String(task.assignedTo) === String(user._id);

// List files on a task (no file data, just details)
router.get('/task/:taskId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId).select('assignedTo');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!canAccess(task, req.user)) return res.status(403).json({ message: 'This task is not assigned to you' });
    const files = await Attachment.find({ task: task._id }).select('-data').sort({ createdAt: -1 });
    res.json(files);
  } catch (e) { next(e); }
});

// Upload: body = { name, type, data } where data is base64
router.post('/task/:taskId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId).select('assignedTo');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!canAccess(task, req.user)) return res.status(403).json({ message: 'This task is not assigned to you' });

    const name = String(req.body.name || '').trim().slice(0, 200);
    const mime = String(req.body.type || '');
    if (!name || !req.body.data) return res.status(400).json({ message: 'No file received' });
    if (!ALLOWED.has(mime)) return res.status(400).json({ message: 'This file type is not allowed (PDF, images, Word, Excel or text only)' });

    const buffer = Buffer.from(String(req.body.data), 'base64');
    if (!buffer.length) return res.status(400).json({ message: 'File is empty' });
    if (buffer.length > MAX_BYTES) return res.status(400).json({ message: 'File is too large (3 MB maximum)' });

    const file = await Attachment.create({
      task: task._id,
      name,
      mime,
      size: buffer.length,
      data: buffer,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
    });
    await Task.updateOne({ _id: task._id }, { $push: { activity: { text: `Attached file "${name}"`, by: req.user.name } } }, { timestamps: false });
    const { data, ...meta } = file.toObject();
    res.status(201).json(meta);
  } catch (e) { next(e); }
});

// Download
router.get('/:id/download', async (req, res, next) => {
  try {
    const file = await Attachment.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    const task = await Task.findById(file.task).select('assignedTo');
    if (!task || !canAccess(task, req.user)) return res.status(403).json({ message: 'Not allowed' });
    res.set('Content-Type', file.mime);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.send(file.data);
  } catch (e) { next(e); }
});

// Delete (admin or whoever uploaded it)
router.delete('/:id', async (req, res, next) => {
  try {
    const file = await Attachment.findById(req.params.id).select('-data');
    if (!file) return res.status(404).json({ message: 'File not found' });
    const task = await Task.findById(file.task).select('assignedTo');
    const mine = String(file.uploadedBy) === String(req.user._id);
    if (!task || !canAccess(task, req.user) || (req.user.role !== 'admin' && !mine)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await file.deleteOne();
    res.json({ message: 'File deleted' });
  } catch (e) { next(e); }
});

export default router;