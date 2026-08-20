const fs = require('fs');
const path = require('path');

/**
 * Local cache for uploaded files. On Render (and most PaaS) the disk is
 * ephemeral — files in /tmp or the repo are wiped on every deploy.
 * Uploads are also stored in MongoDB (UploadedFile) so images survive redeploys.
 *
 * Optional: set UPLOADS_DIR to a Render persistent disk mount (e.g. /var/data/uploads).
 */
const uploadsDir =
  process.env.UPLOADS_DIR ||
  path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

module.exports = { uploadsDir };
