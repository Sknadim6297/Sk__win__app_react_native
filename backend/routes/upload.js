const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { getPublicBaseUrl } = require('../utils/publicUrl');

const router = express.Router();
const { uploadsDir } = require('../utils/uploadsDir');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeName = `img_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !ALLOWED.has(file.mimetype)) {
      return cb(new Error('Upload a JPG, PNG, WEBP or GIF image'));
    }
    cb(null, true);
  },
});

router.post('/', authMiddleware, (req, res) => {
  req.setTimeout(120000);
  res.setTimeout(120000);
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 4MB or smaller'
          : err.message || 'Upload failed';
      return res.status(400).json({ error: message, message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded', message: 'No file uploaded' });
    }

    const base = getPublicBaseUrl(req);
    const relativePath = `/uploads/${req.file.filename}`;
    const fileUrl = `${base}${relativePath}`;
    res.status(201).json({ url: fileUrl, path: relativePath, filename: req.file.filename });
  });
});

module.exports = router;
