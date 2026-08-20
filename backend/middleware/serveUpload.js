const fs = require('fs');
const path = require('path');
const { uploadsDir } = require('../utils/uploadsDir');
const UploadedFile = require('../models/UploadedFile');

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

/**
 * Serve /uploads/:filename from disk, then MongoDB (rehydrate disk when found).
 * Survives Render redeploys where the filesystem is wiped.
 */
async function serveUpload(req, res, next) {
  try {
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename || !SAFE_NAME.test(filename)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    const doc = await UploadedFile.findOne({ filename }).lean();
    if (!doc?.data) {
      return res.status(404).json({ error: 'File not found' });
    }

    const buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data);
    try {
      fs.writeFileSync(filePath, buffer);
    } catch {
      // Disk may be read-only; still serve from memory
    }

    res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
}

module.exports = { serveUpload };
