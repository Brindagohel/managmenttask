

import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);import 'dotenv/config';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, ai: !!process.env.GEMINI_API_KEY }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message || 'Server error' });
});

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

mongoose
  .connect(process.env.MONGO_URI)
  .then(seedAdmin)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000)))
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
