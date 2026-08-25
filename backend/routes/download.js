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

const RELEASE = require('../../release.config.cjs');

const DEFAULT_RELEASE = {
  version: RELEASE.version,
  versionCode: Number(RELEASE.versionCode) || 1,
  fileName: RELEASE.fileName,
  title: RELEASE.title,
  androidMin: RELEASE.androidMin,
  releaseNotes: RELEASE.releaseNotes,
  externalDownloadUrl: RELEASE.externalDownloadUrl || '',
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

  const configured = getApkStats(DEFAULT_RELEASE.fileName);
  const newest = listApkFiles()[0];
  const stats = configured.exists
    ? configured
    : newest
      ? getApkStats(newest.name)
      : getApkStats(release.fileName);

  const nextFile = stats.fileName || DEFAULT_RELEASE.fileName;
  const versionMatch = String(nextFile).match(/v(\d+\.\d+\.\d+)/i);
  const nextVersion = versionMatch?.[1] || DEFAULT_RELEASE.version;
  const needsUpdate =
    release.fileName !== nextFile ||
    release.version !== nextVersion ||
    release.title !== DEFAULT_RELEASE.title ||
    release.releaseNotes !== DEFAULT_RELEASE.releaseNotes;

  if (needsUpdate) {
    release.fileName = nextFile;
    release.version = nextVersion;
    release.title = DEFAULT_RELEASE.title;
    release.androidMin = DEFAULT_RELEASE.androidMin;
    release.releaseNotes = DEFAULT_RELEASE.releaseNotes;
    release.isLatest = true;
    release.publishedAt = new Date();
    await release.save().catch(() => {});
  }
  return release;
}

function parseSemver(version) {
  const parts = String(version || '0')
    .trim()
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

/** True when `latest` is strictly newer than `current`. */
function isVersionNewer(latest, current) {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function requestOrigin(req) {
  const env =
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    '';
  if (env) {
    return String(env)
      .trim()
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  return host ? `${proto}://${host}` : '';
}

function websiteDownloadPageUrl(req) {
  const site = String(process.env.FRONTEND_URL || process.env.WEBSITE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (site) return `${site}/download`;
  const origin = requestOrigin(req);
  return origin ? `${origin}/download` : null;
}

function buildReleasePayload(req, release, stats) {
  const fileName = stats.fileName || release.fileName || DEFAULT_RELEASE.fileName;
  const version = release.version || DEFAULT_RELEASE.version;
  const updated = stats.mtime || release.publishedAt || release.updatedAt;
  const relativePath = `/downloads/${encodeURIComponent(fileName)}`;
  const origin = requestOrigin(req);
  const localAbsolute = origin ? `${origin}${relativePath}` : relativePath;
  const external = String(
    DEFAULT_RELEASE.externalDownloadUrl || RELEASE.externalDownloadUrl || ''
  ).trim();
  const downloadUrl =
    external && /^https?:\/\//i.test(external)
      ? external
      : stats.exists
        ? localAbsolute
        : localAbsolute;
  const apkExists = Boolean(stats.exists || (external && /^https?:\/\//i.test(external)));

  return {
    title: release.title || DEFAULT_RELEASE.title,
    version,
    versionCode: Number(DEFAULT_RELEASE.versionCode) || 1,
    fileName,
    androidMin: release.androidMin || DEFAULT_RELEASE.androidMin,
    releaseNotes: release.releaseNotes || DEFAULT_RELEASE.releaseNotes,
    downloadCount: release.downloadCount || 0,
    apkExists,
    sizeLabel: stats.exists ? stats.sizeLabel : external ? 'APK' : stats.sizeLabel,
    sizeBytes: stats.sizeBytes,
    lastUpdated: updated,
    lastUpdatedLabel: updated
      ? new Date(updated).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—',
    downloadUrl,
    downloadPath: relativePath,
    websiteDownloadUrl: websiteDownloadPageUrl(req),
    downloadLabel: `Download WAREZONE v${version}`,
    forceUpdate: false,
  };
}

/**
 * GET /api/download/release — public release info for the website
 */
router.get('/release', async (req, res) => {
  try {
    const release = await getOrCreateLatestRelease();
    const stats = getApkStats(release.fileName);
    res.json({
      success: true,
      release: buildReleasePayload(req, release, stats),
    });
  } catch (error) {
    console.error('[download] release info error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load release info' });
  }
});

/**
 * GET /api/download/check?current=1.0.0&versionCode=1
 * Soft update check for app / PWA — never force-blocks; client may dismiss.
 */
router.get('/check', async (req, res) => {
  try {
    const currentVersion = String(req.query.current || req.query.version || '').trim() || '0.0.0';
    const currentCodeRaw = req.query.versionCode ?? req.query.build;
    const currentCode =
      currentCodeRaw != null && String(currentCodeRaw).trim() !== ''
        ? parseInt(String(currentCodeRaw), 10)
        : null;

    const release = await getOrCreateLatestRelease();
    const stats = getApkStats(release.fileName);
    const latest = buildReleasePayload(req, release, stats);
    const latestCode = Number(latest.versionCode) || 1;

    const newerSemver = isVersionNewer(latest.version, currentVersion);
    const newerCode =
      currentCode != null && Number.isFinite(currentCode) ? latestCode > currentCode : false;
    // Semver equal but missing/older build number → still offer update (common on Android)
    const sameSemverOlderBuild =
      !newerSemver &&
      !isVersionNewer(currentVersion, latest.version) &&
      currentCode != null &&
      Number.isFinite(currentCode) &&
      latestCode > currentCode;

    const updateAvailable = newerSemver || newerCode || sameSemverOlderBuild;

    res.json({
      success: true,
      updateAvailable,
      forceUpdate: false,
      currentVersion,
      currentVersionCode: currentCode,
      latest,
    });
  } catch (error) {
    console.error('[download] check error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to check for updates' });
  }
});

module.exports = {
  router,
  PUBLIC_ROOT,
  DOWNLOADS_DIR,
  getOrCreateLatestRelease,
  getApkStats,
  formatBytes,
  isVersionNewer,
};
