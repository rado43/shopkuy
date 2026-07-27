/** routes/products.js — CRUD produk + duplicate, publish/hide. */
const router = require('express').Router();
const db = require('../db');
const { required, optional } = require('../auth');
const { slugify, wrap } = require('../helpers');

const SELECT =
  `SELECT p.*, c.name AS category_name, c.slug AS category_slug
   FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

// Ambil nilai-nilai produk dari body request -> array untuk query.
function fields(b) {
  return {
    name: b.name || '',
    category_id: b.category_id ? +b.category_id : null,
    brand: b.brand || '',
    price: +b.price || 0,
    discount_price: b.discount_price === '' || b.discount_price == null ? null : +b.discount_price,
    description: b.description || '',
    stock: +b.stock || 0,
    sku: b.sku || '',
    sizes: JSON.stringify(Array.isArray(b.sizes) ? b.sizes : []),
    colors: JSON.stringify(Array.isArray(b.colors) ? b.colors : []),
    images: JSON.stringify(Array.isArray(b.images) ? b.images : []),
    tokopedia_url: b.tokopedia_url || '',
    shopee_url: b.shopee_url || '',
    whatsapp_number: b.whatsapp_number || '',
    featured: !!b.featured,
    best_seller: !!b.best_seller,
    new_arrival: !!b.new_arrival,
    published: b.published !== false && b.published !== 'false',
  };
}

// LIST — publik (hanya published). Bila admin (token valid), tampilkan semua + filter.
router.get('/', optional, wrap(async (req, res) => {
  const admin = !!req.user;
  const { category, search, sort, featured, best, arrival } = req.query;
  const where = [];
  const params = [];
  if (!admin) where.push('p.published = true');
  if (category && category !== 'all') { params.push(category); where.push(`c.slug = $${params.length}`); }
  if (search) { params.push('%' + String(search).toLowerCase() + '%'); where.push(`(lower(p.name) LIKE $${params.length} OR lower(p.brand) LIKE $${params.length})`); }
  if (featured === '1') where.push('p.featured = true');
  if (best === '1') where.push('p.best_seller = true');
  if (arrival === '1') where.push('p.new_arrival = true');

  let order = 'p.created_at DESC';
  if (sort === 'price-asc') order = 'COALESCE(p.discount_price, p.price) ASC';
  else if (sort === 'price-desc') order = 'COALESCE(p.discount_price, p.price) DESC';
  else if (sort === 'featured') order = 'p.featured DESC, p.created_at DESC';

  const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`;
  const { rows } = await db.query(sql, params);
  res.json(rows);
}));

// DETAIL by slug (publik)
router.get('/:slug', wrap(async (req, res) => {
  const { rows } = await db.query(`${SELECT} WHERE p.slug = $1`, [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json(rows[0]);
}));

// CREATE (admin)
router.post('/', required, wrap(async (req, res) => {
  const f = fields(req.body);
  if (!f.name) return res.status(400).json({ error: 'Nama produk wajib diisi' });
  const slug = (req.body.slug ? slugify(req.body.slug) : slugify(f.name)) || 'produk';
  // pastikan slug unik
  let finalSlug = slug, n = 1;
  while ((await db.query('SELECT 1 FROM products WHERE slug = $1', [finalSlug])).rowCount) {
    finalSlug = slug + '-' + (++n);
  }
  const { rows } = await db.query(
    `INSERT INTO products
     (name,slug,category_id,brand,price,discount_price,description,stock,sku,sizes,colors,images,tokopedia_url,shopee_url,whatsapp_number,featured,best_seller,new_arrival,published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [f.name, finalSlug, f.category_id, f.brand, f.price, f.discount_price, f.description, f.stock, f.sku,
     f.sizes, f.colors, f.images, f.tokopedia_url, f.shopee_url, f.whatsapp_number,
     f.featured, f.best_seller, f.new_arrival, f.published]
  );
  res.status(201).json(rows[0]);
}));

// UPDATE (admin)
router.put('/:id', required, wrap(async (req, res) => {
  const f = fields(req.body);
  const id = +req.params.id;
  // slug opsional: jika dikirim, jadikan unik (kecuali milik dirinya)
  let slugClause = '', params = [];
  const base = [f.name, f.category_id, f.brand, f.price, f.discount_price, f.description, f.stock, f.sku,
    f.sizes, f.colors, f.images, f.tokopedia_url, f.shopee_url, f.whatsapp_number,
    f.featured, f.best_seller, f.new_arrival, f.published];

  if (req.body.slug) {
    let slug = slugify(req.body.slug), finalSlug = slug, n = 1;
    while ((await db.query('SELECT 1 FROM products WHERE slug = $1 AND id <> $2', [finalSlug, id])).rowCount) {
      finalSlug = slug + '-' + (++n);
    }
    params = [...base, finalSlug, id];
    slugClause = `, slug = $${base.length + 1}`;
  } else {
    params = [...base, id];
  }
  const idParam = base.length + (req.body.slug ? 2 : 1);

  const { rows } = await db.query(
    `UPDATE products SET
       name=$1, category_id=$2, brand=$3, price=$4, discount_price=$5, description=$6, stock=$7, sku=$8,
       sizes=$9::jsonb, colors=$10::jsonb, images=$11::jsonb, tokopedia_url=$12, shopee_url=$13, whatsapp_number=$14,
       featured=$15, best_seller=$16, new_arrival=$17, published=$18 ${slugClause}
     WHERE id = $${idParam} RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json(rows[0]);
}));

// DELETE (admin)
router.delete('/:id', required, wrap(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [+req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json({ ok: true });
}));

// DUPLICATE (admin)
router.post('/:id/duplicate', required, wrap(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [+req.params.id]);
  const p = rows[0];
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  let slug = p.slug + '-copy', finalSlug = slug, n = 1;
  while ((await db.query('SELECT 1 FROM products WHERE slug = $1', [finalSlug])).rowCount) {
    finalSlug = slug + '-' + (++n);
  }
  const { rows: out } = await db.query(
    `INSERT INTO products
     (name,slug,category_id,brand,price,discount_price,description,stock,sku,sizes,colors,images,tokopedia_url,shopee_url,whatsapp_number,featured,best_seller,new_arrival,published)
     SELECT name||' (Copy)', $1, category_id, brand, price, discount_price, description, stock, sku, sizes, colors, images, tokopedia_url, shopee_url, whatsapp_number, featured, best_seller, new_arrival, false
     FROM products WHERE id = $2 RETURNING *`,
    [finalSlug, p.id]
  );
  res.status(201).json(out[0]);
}));

// PUBLISH / HIDE (admin) — { published: true|false }
router.patch('/:id/publish', required, wrap(async (req, res) => {
  const { rows } = await db.query(
    'UPDATE products SET published = $1 WHERE id = $2 RETURNING *',
    [!!req.body.published, +req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json(rows[0]);
}));

module.exports = router;
