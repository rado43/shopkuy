/** routes/upload.js — upload gambar produk/banner ke folder /uploads (di-mount sebagai volume). */
const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const multer = require('multer');
const { required } = require('../auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    cb(null, Date.now() + '-' + base + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

// POST /api/upload (field: "file" atau "files" untuk multiple) -> { urls: [...] }
router.post('/', required, upload.array('files', 8), (req, res) => {
  const files = req.files || [];
  const urls = files.map((f) => '/uploads/' + f.filename);
  res.json({ urls });
});

module.exports = router;
