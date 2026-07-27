/** routes/testimonials.js — CRUD testimoni. */
const router = require('express').Router();
const db = require('../db');
const { required, optional } = require('../auth');
const { wrap } = require('../helpers');

router.get('/', optional, wrap(async (req, res) => {
  const admin = !!req.user;
  const { rows } = await db.query(
    `SELECT * FROM testimonials ${admin ? '' : 'WHERE active = true'} ORDER BY id DESC`
  );
  res.json(rows);
}));

router.post('/', required, wrap(async (req, res) => {
  const t = req.body || {};
  if (!t.name) return res.status(400).json({ error: 'Nama wajib diisi' });
  const { rows } = await db.query(
    'INSERT INTO testimonials (name, role, text, rating, active) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [t.name, t.role || '', t.text || '', +t.rating || 5, t.active !== false]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', required, wrap(async (req, res) => {
  const t = req.body || {};
  const { rows } = await db.query(
    'UPDATE testimonials SET name=$1, role=$2, text=$3, rating=$4, active=$5 WHERE id=$6 RETURNING *',
    [t.name || '', t.role || '', t.text || '', +t.rating || 5, t.active !== false, +req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Testimoni tidak ditemukan' });
  res.json(rows[0]);
}));

router.delete('/:id', required, wrap(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM testimonials WHERE id = $1', [+req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Testimoni tidak ditemukan' });
  res.json({ ok: true });
}));

module.exports = router;
