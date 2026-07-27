/** seed.js — jalankan seed manual: `npm run seed` (di dalam container). */
require('dotenv').config();
const { initDb, ensureAdmin, seedIfEmpty, pool } = require('./db');

(async () => {
  await initDb();
  await ensureAdmin();
  await seedIfEmpty();
  await pool.end();
  console.log('Selesai.');
})().catch((e) => { console.error(e); process.exit(1); });
