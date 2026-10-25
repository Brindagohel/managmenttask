import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';
import attendance from './routes/attendance.js';
import mailRoutes from './routes/mail.js';
import attachmentRoutes from './routes/attachments.js';
import { runReminders } from './utils/reminders.js';

// Local-only network fix (not needed on Vercel)
if (!process.env.VERCEL) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'boss@example.com').toLowerCase();
  if (await User.findOne({ email })) return;
  await User.create({
    name: process.env.ADMIN_NAME || 'Boss',
    email,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
    role: 'admin',
  });
  console.log(`Admin created: ${email}`);
}

// Connect once and reuse the connection between requests
let connecting;
function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .then(seedAdmin)
      .catch((e) => { connecting = null; throw e; });
  }
  return connecting;
}

app.use(async (req, res, next) => {
  try { await connectDb(); next(); }
  catch (e) { res.status(500).json({ message: `Database connection failed: ${e.message}` }); }
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/attendance', attendance);
app.use('/api/mail', mailRoutes);
app.use('/api/attachments', attachmentRoutes);

// Daily reminder emails. Vercel Cron calls this (see vercel.json) and sends  Authorization: Bearer <CRON_SECRET>
app.get('/api/cron/reminders', async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ message: 'Unauthorized' });
    res.json(await runReminders());
  } catch (e) { next(e); }
});
app.get('/api/health', (req, res) => res.json({ ok: true, ai: !!process.env.GEMINI_API_KEY }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message || 'Server error' });
});

// Run a normal server locally; on Vercel the app is exported instead
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  connectDb()
    .then(() => {
      app.listen(port, () => console.log('API running on port', port));
      // Optional local reminders: set REMINDERS_AUTO=true in .env (each task gets at most one reminder per day)
      if (process.env.REMINDERS_AUTO === 'true') {
        setTimeout(() => runReminders().catch(console.error), 30_000);
        setInterval(() => runReminders().catch(console.error), 6 * 3600 * 1000);
      }
    })
    .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
}

export default app;