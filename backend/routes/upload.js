const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { getPublicBaseUrl } = require('../utils/publicUrl');
const UploadedFile = require('../models/UploadedFile');

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
  upload.single('image')(req, res, async (err) => {
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

    try {
      // Persist in MongoDB so images survive Render redeploys (ephemeral disk).
      const buffer = fs.readFileSync(req.file.path);
      await UploadedFile.findOneAndUpdate(
        { filename: req.file.filename },
        {
          filename: req.file.filename,
          mimetype: req.file.mimetype || 'application/octet-stream',
          data: buffer,
          size: buffer.length,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (persistErr) {
      console.error('Upload Mongo persist failed:', persistErr);
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
      return res.status(500).json({
        error: 'Failed to save image',
        message: 'Failed to save image. Try again.',
      });
    }

    const base = getPublicBaseUrl(req);
    const relativePath = `/uploads/${req.file.filename}`;
    const fileUrl = `${base}${relativePath}`;
    res.status(201).json({ url: fileUrl, path: relativePath, filename: req.file.filename });
  });
});

module.exports = router;
