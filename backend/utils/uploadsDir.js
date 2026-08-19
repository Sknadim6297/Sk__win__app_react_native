const fs = require('fs');
const path = require('path');

const uploadsDir = process.env.RENDER
  ? path.join('/tmp', 'sk-win-uploads')
  : path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

module.exports = { uploadsDir };
