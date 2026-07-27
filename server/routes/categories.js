/** routes/categories.js — CRUD kategori. */
const router = require('express').Router();
const db = require('../db');
const { required, optional } = require('../auth');
const { slugify, wrap } = require('../helpers');

// LIST (publik: hanya published + jumlah produk; admin: semua)
router.get('/', optional, wrap(async (req, res) => {
  const admin = !!req.user;
  const { rows } = await db.query(
    `SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.published = true) AS product_count
     FROM categories c ${admin ? '' : 'WHERE c.published = true'} ORDER BY c.sort ASC, c.name ASC`
  );
  res.json(rows);
}));

// CREATE
router.post('/', required, wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  let slug = req.body.slug ? slugify(req.body.slug) : slugify(name), finalSlug = slug, n = 1;
  while ((await db.query('SELECT 1 FROM categories WHERE slug = $1', [finalSlug])).rowCount) finalSlug = slug + '-' + (++n);
  const { rows } = await db.query(
    'INSERT INTO categories (name, slug, published, sort) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, finalSlug, req.body.published !== false, +req.body.sort || 0]
  );
  res.status(201).json(rows[0]);
}));

// UPDATE
router.put('/:id', required, wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  const { rows } = await db.query(
    'UPDATE categories SET name=$1, published=$2, sort=$3 WHERE id=$4 RETURNING *',
    [name, req.body.published !== false, +req.body.sort || 0, +req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json(rows[0]);
}));

// DELETE
router.delete('/:id', required, wrap(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [+req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json({ ok: true });
}));

module.exports = router;
