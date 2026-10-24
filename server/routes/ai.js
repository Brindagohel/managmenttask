import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.post('/generate', protect, adminOnly, async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ message: 'AI is not configured (no GEMINI_API_KEY). Add tasks manually instead.' });

  const description = (req.body.description || '').trim();
  if (description.length < 10) return res.status(400).json({ message: 'Please describe the project in a bit more detail' });

  const prompt = `You are a project manager. Break this project into 5-8 clear, actionable tasks.
Respond ONLY with a JSON array. Each item: {"title": string (max 80 chars), "description": string (1-2 sentences), "priority": "Low" | "Medium" | "High"}.
Project: ${description}`;

  // Stop waiting after 40 seconds so the button never hangs forever
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'AI request failed');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed.tasks || [];
    const tasks = list
      .filter((t) => t.title)
      .map((t) => ({
        title: String(t.title).slice(0, 120),
        description: String(t.description || ''),
        priority: ['Low', 'Medium', 'High'].includes(t.priority) ? t.priority : 'Medium',
      }));
    if (!tasks.length) throw new Error('AI returned no tasks');
    res.json({ tasks });
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? 'AI took too long to respond. Try again, use a different GEMINI_MODEL, or add tasks manually.'
      : `AI generation failed: ${e.message}. You can add tasks manually.`;
    res.status(502).json({ message: msg });
  } finally {
    clearTimeout(timer);
  }
});

export default router;