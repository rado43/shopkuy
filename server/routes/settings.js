/** routes/settings.js — pengaturan toko (single row id=1). */
const router = require('express').Router();
const db = require('../db');
const { required } = require('../auth');
const { wrap } = require('../helpers');

// GET (publik) — dibutuhkan storefront untuk nama toko, WA, sosial, dll.
router.get('/', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
  res.json(rows[0] || {});
}));

// PUT (admin) — upsert baris tunggal.
router.put('/', required, wrap(async (req, res) => {
  const s = req.body || {};
  const { rows } = await db.query(
    `INSERT INTO settings (id, store_name, tagline, logo_url, favicon_url, whatsapp_number, instagram, facebook, tiktok, email, address, footer)
     VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET
       store_name=EXCLUDED.store_name, tagline=EXCLUDED.tagline, logo_url=EXCLUDED.logo_url, favicon_url=EXCLUDED.favicon_url,
       whatsapp_number=EXCLUDED.whatsapp_number, instagram=EXCLUDED.instagram, facebook=EXCLUDED.facebook, tiktok=EXCLUDED.tiktok,
       email=EXCLUDED.email, address=EXCLUDED.address, footer=EXCLUDED.footer
     RETURNING *`,
    [s.store_name || 'ShopKuy', s.tagline || '', s.logo_url || '', s.favicon_url || '',
     s.whatsapp_number || '', s.instagram || '', s.facebook || '', s.tiktok || '',
     s.email || '', s.address || '', s.footer || '']
  );
  res.json(rows[0]);
}));

module.exports = router;
