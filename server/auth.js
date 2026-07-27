/**
 * auth.js — JWT helpers + middleware.
 *  - sign(user)     : buat token (berlaku 7 hari)
 *  - required       : middleware yang menolak request tanpa token valid (untuk endpoint admin)
 *  - optional       : middleware yang mengisi req.user bila ada token valid, tapi tidak menolak
 */
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'ubah-secret-ini-di-produksi';

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
}

function getToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function required(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Tidak terotorisasi' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token tidak valid / kedaluwarsa' });
  }
}

function optional(req, res, next) {
  const token = getToken(req);
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch (e) { /* abaikan */ }
  }
  next();
}

module.exports = { sign, required, optional, SECRET };
