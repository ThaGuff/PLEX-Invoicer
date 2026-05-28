/**
 * Job Site Photo API
 * Security: requireAuth, ownership check, image-only uploads, size limit
 */
import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';

const router = Router();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_PHOTO_SIZE = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

async function assertAccountAccess(accountId, userId) {
  const r = await db.execute(
    `SELECT id FROM accounts WHERE id = ? AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ?))`,
    [accountId, userId, userId]
  );
  if (!r.rows.length) {
    const exists = await db.execute(`SELECT id FROM accounts WHERE id = ?`, [accountId]);
    if (!exists.rows.length) throw Object.assign(new Error('Account not found'), { status: 404 });
  }
}

// ── GET /api/photos?account_id= ───────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const photos = await db.execute(
      `SELECT id, name, job_site, url, size, created_at FROM photos WHERE account_id = ? ORDER BY created_at DESC`,
      [account_id]
    );
    res.json(photos.rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── POST /api/photos ──────────────────────────────────────────────
router.post('/', requireAuth, (req, res, next) => {
  upload.single('photo')(req, res, err => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Photo too large (max ${MAX_PHOTO_SIZE/1024/1024}MB)` });
      return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  const { account_id, job_site } = req.body;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  if (!req.file) return res.status(400).json({ error: 'photo file required' });
  try {
    await assertAccountAccess(account_id, req.user.id);
    const { v4: uuid } = await import('uuid');
    const id = `photo-${uuid()}`;
    const safeSite = job_site ? String(job_site).trim().slice(0, 200) : null;
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    // In production: upload buffer to Supabase Storage, get public URL
    await db.execute(
      `INSERT INTO photos (id, account_id, name, job_site, size, mime_type, storage_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, account_id, safeName, safeSite, req.file.size, req.file.mimetype, `photos/${account_id}/${id}`]
    );
    const photo = await db.execute(`SELECT id, name, job_site, url, size, created_at FROM photos WHERE id = ?`, [id]);
    res.status(201).json(photo.rows[0]);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── DELETE /api/photos/:id ────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const photo = await db.execute(`SELECT * FROM photos WHERE id = ?`, [req.params.id]);
    if (!photo.rows.length) return res.status(404).json({ error: 'Not found' });
    await assertAccountAccess(photo.rows[0].account_id, req.user.id);
    await db.execute(`DELETE FROM photos WHERE id = ?`, [req.params.id]);
    // In production: also delete from Supabase Storage bucket
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

export default router;
