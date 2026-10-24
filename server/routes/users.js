import { Router } from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/employees', protect, adminOnly, async (req, res, next) => {
  try {
    res.json(await User.find({ role: 'employee' }).select('name email').sort('name'));
  } catch (e) { next(e); }
});

export default router;
