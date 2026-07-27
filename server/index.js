/**
 * index.js — entry point server Express.
 * Menyajikan API (/api/*), file upload (/uploads), storefront (public/), dan admin (public/admin/).
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const { initDb, ensureAdmin, seedIfEmpty } = require('./db');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// --- API routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- File statis ---
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback: untuk path non-API & non-file, kirim storefront (SPA-friendly).
app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Terjadi kesalahan server' });
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await waitForDb();
    await initDb();
    await ensureAdmin();
    await seedIfEmpty();
    app.listen(PORT, () => console.log(`\n  ShopKuy berjalan di http://localhost:${PORT}\n  Admin: http://localhost:${PORT}/admin\n`));
  } catch (e) {
    console.error('Gagal start:', e);
    process.exit(1);
  }
})();

// Tunggu database siap (berguna saat docker-compose menyalakan db & app bersamaan).
async function waitForDb(retries = 20) {
  const { pool } = require('./db');
  for (let i = 0; i < retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { console.log(`[db] menunggu database... (${i + 1}/${retries})`); await new Promise((r) => setTimeout(r, 2000)); }
  }
  throw new Error('Database tidak dapat dihubungi');
}
