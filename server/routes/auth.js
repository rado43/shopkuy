/** routes/auth.js — login admin & cek sesi. */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, required } = require('../auth');
const { wrap } = require('../helpers');

// POST /api/auth/login  { email, password } -> { token, user }
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email & password wajib diisi' });

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  res.json({ token: sign(user), user: { id: user.id, email: user.email } });
}));

// GET /api/auth/me -> { user }  (untuk memvalidasi token tersimpan)
router.get('/me', required, (req, res) => res.json({ user: req.user }));

module.exports = router;
