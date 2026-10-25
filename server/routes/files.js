import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + file.originalname.replace(/[^\w.\-]/g, '_')),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Only PDF files are allowed')),
});

const router = express.Router();

router.get('/', (req, res) => {
  const files = fs.readdirSync(uploadDir).map((name) => {
    const stat = fs.statSync(path.join(uploadDir, name));
    return { name, size: stat.size, uploadedAt: stat.mtime, url: `/uploads/${name}` };
  });
  files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  res.json(files);
});

router.post('/', upload.array('files', 10), (req, res) => {
  res.status(201).json({ uploaded: req.files.length });
});

router.delete('/:name', (req, res) => {
  const file = path.join(uploadDir, path.basename(req.params.name));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

export default router;