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

// Local-only network fix (not needed on Vercel)
if (!process.env.VERCEL) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
}

const app = express();
app.use(cors());
app.use(express.json());

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
app.get('/api/health', (req, res) => res.json({ ok: true, ai: !!process.env.GEMINI_API_KEY }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message || 'Server error' });
});

// Run a normal server locally; on Vercel the app is exported instead
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  connectDb()
    .then(() => app.listen(port, () => console.log('API running on port', port)))
    .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
}

export default app;