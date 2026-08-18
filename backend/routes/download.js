const express = require('express');
const fs = require('fs');
const path = require('path');
const AppRelease = require('../models/AppRelease');

const router = express.Router();

const REPO_PUBLIC = path.join(__dirname, '..', '..', 'public');
const BACKEND_PUBLIC = path.join(__dirname, '..', 'public');
const DOWNLOAD_DIRS = [
  path.join(REPO_PUBLIC, 'downloads'),
  path.join(BACKEND_PUBLIC, 'downloads'),
  path.join(process.cwd(), 'public', 'downloads'),
];

const PUBLIC_ROOT = fs.existsSync(REPO_PUBLIC) ? REPO_PUBLIC : BACKEND_PUBLIC;
const DOWNLOADS_DIR = DOWNLOAD_DIRS.find((dir) => fs.existsSync(dir)) || path.join(REPO_PUBLIC, 'downloads');
const PAGE_PATH = path.join(PUBLIC_ROOT, 'download', 'index.html');

const DEFAULT_RELEASE = {
  version: '1.0.0',
  fileName: 'WAREZONE-v1.0.0.apk',
  title: 'WAREZONE Tournament',
  androidMin: 'Android 8.0 (API 26)+',
  releaseNotes:
    'WAREZONE — create & join tournaments, wallet top-up, live match updates, and prize distribution.',
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

function listApkFiles() {
  const found = [];
  for (const dir of DOWNLOAD_DIRS) {
    if (!fs.existsSync(dir)) continue;
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    names
      .filter((n) => n.toLowerCase().endsWith('.apk'))
      .forEach((name) => {
        const filePath = path.join(dir, name);
        try {
          const st = fs.statSync(filePath);
          if (st.isFile() && st.size > 1024) {
            found.push({ name, filePath, size: st.size, mtime: st.mtime });
          }
        } catch {
          /* skip */
        }
      });
  }
  found.sort((a, b) => b.mtime - a.mtime);
  return found;
}

function getApkStats(fileName) {
  const wanted = path.basename(String(fileName || DEFAULT_RELEASE.fileName));
  const all = listApkFiles();
  const match = all.find((f) => f.name === wanted) || all[0] || null;
  if (!match) {
    return { exists: false, sizeBytes: 0, sizeLabel: 'APK not uploaded yet', mtime: null, fileName: wanted };
  }
  return {
    exists: true,
    sizeBytes: match.size,
    sizeLabel: formatBytes(match.size),
    mtime: match.mtime,
    filePath: match.filePath,
    fileName: match.name,
  };
}

async function getOrCreateLatestRelease() {
  let release = await AppRelease.findOne({ isLatest: true }).sort({ publishedAt: -1 });
  if (!release) {
    release = await AppRelease.create(DEFAULT_RELEASE);
  }

  const stats = getApkStats(release.fileName);
  if (stats.exists && stats.fileName && stats.fileName !== release.fileName) {
    release.fileName = stats.fileName;
    await release.save().catch(() => {});
  }
  return release;
}

/**
 * GET /api/download/release — public release info for the website
 */
router.get('/release', async (req, res) => {
  try {
    const release = await getOrCreateLatestRelease();
    const stats = getApkStats(release.fileName);
    const fileName = stats.fileName || release.fileName;
    const updated = stats.mtime || release.publishedAt || release.updatedAt;

    res.json({
      success: true,
      release: {
        title: release.title || DEFAULT_RELEASE.title,
        version: release.version || DEFAULT_RELEASE.version,
        fileName,
        androidMin: release.androidMin || DEFAULT_RELEASE.androidMin,
        releaseNotes: release.releaseNotes || DEFAULT_RELEASE.releaseNotes,
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
        downloadUrl: `/downloads/${encodeURIComponent(fileName)}`,
        downloadLabel: `Download WAREZONE v${release.version || '1.0.0'}`,
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
