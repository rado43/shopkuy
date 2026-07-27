/** routes/banners.js — CRUD hero banner. */
const router = require('express').Router();
const db = require('../db');
const { required, optional } = require('../auth');
const { wrap } = require('../helpers');

// LIST (publik: hanya aktif; admin: semua)
router.get('/', optional, wrap(async (req, res) => {
  const admin = !!req.user;
  const { rows } = await db.query(
    `SELECT * FROM banners ${admin ? '' : 'WHERE active = true'} ORDER BY sort ASC, id ASC`
  );
  res.json(rows);
}));

router.post('/', required, wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await db.query(
    `INSERT INTO banners (title, subtitle, button_text, button_link, image_url, active, sort)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [b.title || '', b.subtitle || '', b.button_text || '', b.button_link || '', b.image_url || '', b.active !== false, +b.sort || 0]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', required, wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await db.query(
    `UPDATE banners SET title=$1, subtitle=$2, button_text=$3, button_link=$4, image_url=$5, active=$6, sort=$7
     WHERE id=$8 RETURNING *`,
    [b.title || '', b.subtitle || '', b.button_text || '', b.button_link || '', b.image_url || '', b.active !== false, +b.sort || 0, +req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Banner tidak ditemukan' });
  res.json(rows[0]);
}));

router.delete('/:id', required, wrap(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM banners WHERE id = $1', [+req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Banner tidak ditemukan' });
  res.json({ ok: true });
}));

module.exports = router;
