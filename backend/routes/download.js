const express = require('express');
const fs = require('fs');
const path = require('path');
const AppRelease = require('../models/AppRelease');

const router = express.Router();

/** Project-root public folder (APKs + download page assets) */
const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'public');
const DOWNLOADS_DIR = path.join(PUBLIC_ROOT, 'downloads');
const PAGE_PATH = path.join(PUBLIC_ROOT, 'download', 'index.html');

const DEFAULT_RELEASE = {
  version: '1.0.0',
  fileName: 'WarZone-AMR-v1.0.0.apk',
  title: 'WarZone AMR Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'Initial release — create & join tournaments, wallet top-up, live match updates, and instant prize distribution.',
  isLatest: true,
  publishedAt: new Date(),
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getApkStats(fileName) {
  const filePath = path.join(DOWNLOADS_DIR, fileName);
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, sizeBytes: 0, sizeLabel: 'APK not uploaded yet', mtime: null };
    }
    const st = fs.statSync(filePath);
    return {
      exists: true,
      sizeBytes: st.size,
      sizeLabel: formatBytes(st.size),
      mtime: st.mtime,
      filePath,
    };
  } catch {
    return { exists: false, sizeBytes: 0, sizeLabel: '—', mtime: null };
  }
}

async function getOrCreateLatestRelease() {
  let release = await AppRelease.findOne({ isLatest: true }).sort({ publishedAt: -1 });
  if (!release) {
    release = await AppRelease.create(DEFAULT_RELEASE);
  }
  return release;
}

/**
 * GET /api/download/release — public release info for the page
 */
router.get('/release', async (req, res) => {
  try {
    const release = await getOrCreateLatestRelease();
    const stats = getApkStats(release.fileName);
    const updated = stats.mtime || release.publishedAt || release.updatedAt;

    res.json({
      success: true,
      release: {
        title: release.title,
        version: release.version,
        fileName: release.fileName,
        androidMin: release.androidMin,
        releaseNotes: release.releaseNotes,
        downloadCount: release.downloadCount || 0,
        apkExists: stats.exists,
        sizeLabel: stats.sizeLabel,
        sizeBytes: stats.sizeBytes,
        lastUpdated: updated,
        lastUpdatedLabel: updated
          ? new Date(updated).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—',
        downloadUrl: `/downloads/${encodeURIComponent(release.fileName)}`,
        downloadLabel: `Download WarZone AMR v${release.version}`,
      },
    });
  } catch (error) {
    console.error('[download] release info error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load release info' });
  }
});

module.exports = {
  router,
  PUBLIC_ROOT,
  DOWNLOADS_DIR,
  PAGE_PATH,
  getOrCreateLatestRelease,
  getApkStats,
  formatBytes,
};
