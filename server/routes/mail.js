import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { mailReady, sendMail, emailLayout } from '../utils/mailer.js';
import { runReminders } from '../utils/reminders.js';

const router = Router();
router.use(protect, adminOnly);

const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

router.get('/status', (req, res) => {
  res.json({
    configured: mailReady(),
    sender: process.env.MAIL_USER || '',
    appUrl: appUrl(),
    autoReminders: process.env.REMINDERS_AUTO === 'true' || !!process.env.VERCEL,
  });
});

// Sends a test message to the sender's own inbox (the admin's login email may not be a real address)
router.post('/test', async (req, res, next) => {
  try {
    if (!mailReady()) return res.status(400).json({ message: 'Email is not set up yet. Add MAIL_USER and MAIL_PASS to server/.env and restart the server.' });
    const to = process.env.MAIL_USER;
    const r = await sendMail({
      to,
      subject: 'TaskFlow test email',
      html: emailLayout({ heading: 'Email is working', intro: 'This is a test message from TaskFlow. Employees will now be emailed about their tasks.' }),
    });
    if (!r.sent) return res.status(502).json({ message: `Could not send: ${r.reason || 'unknown error'}` });
    res.json({ message: `Test email sent to ${to}.` });
  } catch (e) { next(e); }
});

router.post('/reminders', async (req, res, next) => {
  try { res.json(await runReminders()); } catch (e) { next(e); }
});

export default router;