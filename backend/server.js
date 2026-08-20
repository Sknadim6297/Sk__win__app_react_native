require('dotenv').config({
  path: require('path').join(__dirname, '.env'),
  override: true,
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const walletRoutes = require('./routes/wallet');
const paymentRoutes = require('./routes/payments');
const tournamentRoutes = require('./routes/tournaments');
const tournamentManagementRoutes = require('./routes/tournamentManagement');
const gamesRoutes = require('./routes/games');
const uploadRoutes = require('./routes/upload');
const tutorialRoutes = require('./routes/tutorials');
const notificationRoutes = require('./routes/notifications');
const configRoutes = require('./routes/config');
const sliderRoutes = require('./routes/sliders');
const supportRoutes = require('./routes/support');
const announcementRoutes = require('./routes/announcements');
const {
  router: downloadApiRouter,
  PUBLIC_ROOT,
  PAGE_PATH,
  getApkStats,
} = require('./routes/download');
const AppRelease = require('./models/AppRelease');
const { initFcm } = require('./services/fcm');
const { runTournamentNotifier } = require('./services/tournamentNotifier');
const { processDuePayouts } = require('./services/winnerPayoutService');
const { startDailyAutoMatchJob } = require('./jobs/dailyAutoMatchJob');

const app = express();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sk-win';
const PORT = process.env.PORT || 5000;

// Render / reverse proxies: prefer explicit PUBLIC_BASE_URL, else platform URL
if (!process.env.PUBLIC_BASE_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.PUBLIC_BASE_URL = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
}

if (process.env.TRUST_PROXY === '1' || process.env.RENDER) {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Must allow custom headers used by the web/app client (ngrok interstitial bypass)
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning',
      'Ngrok-Skip-Browser-Warning',
      'Accept',
      'X-Requested-With',
    ],
  })
);

app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`${req.method} ${req.path} - Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

app.use((req, res, next) => {
  const type = String(req.headers['content-type'] || '');
  if (type.includes('multipart/form-data')) return next();
  express.json({ limit: '2mb' })(req, res, next);
});
const { uploadsDir } = require('./utils/uploadsDir');
const { serveUpload } = require('./middleware/serveUpload');
// Disk cache first (express.static), then MongoDB fallback for post-deploy survival
app.use('/uploads', express.static(uploadsDir));
app.get('/uploads/:filename', serveUpload);

const WEBSITE_DIST = path.join(__dirname, '..', 'website', 'dist');
const WEBSITE_INDEX = path.join(WEBSITE_DIST, 'index.html');
/** Marketing site is deployed separately (sk-win-web). Set SERVE_WEBSITE=true to host it from the API. */
const SERVE_WEBSITE = String(process.env.SERVE_WEBSITE || '').toLowerCase() === 'true';
const isWebsiteReady = () => SERVE_WEBSITE && fs.existsSync(WEBSITE_INDEX);
const frontendUrl = () =>
  String(process.env.FRONTEND_URL || process.env.WEBSITE_URL || '').replace(/\/$/, '');

if (!isWebsiteReady()) {
  app.use('/download', express.static(path.join(PUBLIC_ROOT, 'download')));
}

// Single brand logo (no copies) — used by download page favicon/OG/hero
const BRAND_LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo', 'WAREZONE_LOGO.png');
app.get(['/brand/logo.png', '/download/logo.png'], (req, res) => {
  res.sendFile(BRAND_LOGO_PATH, (err) => {
    if (err) {
      console.error('[brand] logo missing:', BRAND_LOGO_PATH, err.message);
      res.status(404).end();
    }
  });
});

const isDbReady = () => mongoose.connection.readyState === 1;

/** Homepage → marketing website when SERVE_WEBSITE=true; else redirect to frontend static site */
app.get('/', (req, res, next) => {
  if (isWebsiteReady()) return next();
  const site = frontendUrl();
  if (site) return res.redirect(302, site);
  res.redirect(302, '/download');
});

/** Legacy APK landing — redirects to frontend /download when FRONTEND_URL is set */
app.get(['/download', '/download/'], (req, res, next) => {
  if (isWebsiteReady()) return next();
  const site = frontendUrl();
  if (site) return res.redirect(302, `${site}/download`);
  res.sendFile(PAGE_PATH, (err) => {
    if (err) {
      console.error('[download] page missing:', PAGE_PATH, err.message);
      res.status(500).send('Download page is not available.');
    }
  });
});

/**
 * Serve APK and increment download counter first.
 * GET /downloads/WAREZONE-v1.0.0.apk
 */
app.get('/downloads/:fileName', async (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName || '');
    if (!fileName.toLowerCase().endsWith('.apk')) {
      return res.status(400).json({ success: false, message: 'Invalid file' });
    }

    const stats = getApkStats(fileName);
    if (!stats.exists || !stats.filePath) {
      return res.status(404).json({
        success: false,
        message: `APK not found. Place the file at public/downloads/${fileName}`,
      });
    }

    if (isDbReady()) {
      try {
        await AppRelease.findOneAndUpdate(
          { fileName: stats.fileName || fileName },
          {
            $inc: { downloadCount: 1 },
            $setOnInsert: {
              version: '1.0.0',
              title: 'WAREZONE Tournament',
              androidMin: 'Android 8.0 (API 26)+',
              releaseNotes: 'WAREZONE Tournament release',
              isLatest: false,
              publishedAt: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (e) {
        console.warn('[download] counter update failed:', e.message);
      }
    }

    const outName = stats.fileName || fileName;
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);
    res.setHeader('Content-Length', String(stats.sizeBytes));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.sendFile(stats.filePath);
  } catch (error) {
    console.error('[download] serve error:', error.message);
    return res.status(500).json({ success: false, message: 'Download failed' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/download')) {
    return next();
  }
  if (!isDbReady()) {
    return res.status(503).json({
      error: 'Database is not connected',
      message:
        'Start MongoDB locally (mongodb://127.0.0.1:27017) or set MONGODB_URI in backend/.env to MongoDB Atlas.',
    });
  }
  next();
});

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'OK' : 'DEGRADED',
    database: dbStatus,
    mongoUri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/tournament-management', tournamentManagementRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/maps', require('./routes/maps'));
app.use('/api/upload', uploadRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/sliders', sliderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/daily-auto-matches', require('./routes/dailyAutoMatches'));
app.use('/api/download', downloadApiRouter);

const ADMIN_WEB_ROOT = path.join(__dirname, 'admin-web');
app.use('/admin', express.static(ADMIN_WEB_ROOT, {
  index: 'index.html',
  extensions: ['html'],
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
  },
}));
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(ADMIN_WEB_ROOT, 'index.html'));
});

/** Google OAuth browser callback — opens the app via custom URI scheme (APK / dev build). */
function googleReversedScheme(clientId) {
  const id = String(clientId || '').trim();
  if (!id.endsWith('.apps.googleusercontent.com')) return '';
  return `com.googleusercontent.apps.${id.replace('.apps.googleusercontent.com', '')}`;
}

app.get('/api/oauthredirect', (req, res) => {
  const nativeScheme =
    googleReversedScheme(process.env.GOOGLE_ANDROID_CLIENT_ID) ||
    googleReversedScheme(process.env.GOOGLE_IOS_CLIENT_ID) ||
    'com.googleusercontent.apps.188535028372-vgg0o270r97e3qtg21ilpt0m6dj1t37j';
  const qs = new URLSearchParams(req.query).toString();
  const nativeLink = `${nativeScheme}:/oauthredirect${qs ? `?${qs}` : ''}`;
  const appLink = `warezone://oauthredirect${qs ? `?${qs}` : ''}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Returning to WAREZONE</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
    a{color:#22c55e;font-weight:600}
  </style>
  <script>
    (function () {
      var targets = [${JSON.stringify(nativeLink)}, ${JSON.stringify(appLink)}];
      var i = 0;
      function next() {
        if (i >= targets.length) return;
        window.location.href = targets[i++];
        setTimeout(next, 700);
      }
      next();
    })();
  </script>
</head>
<body>
  <div>
    <h1>Returning to WAREZONE…</h1>
    <p>If the app does not open, <a href="${nativeLink}">tap here to continue</a>.</p>
  </div>
</body>
</html>`);
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

if (SERVE_WEBSITE && fs.existsSync(WEBSITE_INDEX)) {
  app.use(
    express.static(WEBSITE_DIST, {
      index: false,
      fallthrough: true,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (String(filePath).endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    })
  );
  app.get('*', (req, res, next) => {
    if (!isWebsiteReady()) return next();
    if (req.method !== 'GET') return next();
    const p = req.path || '';
    if (
      p.startsWith('/api') ||
      p.startsWith('/admin') ||
      p.startsWith('/uploads') ||
      p.startsWith('/downloads') ||
      p.startsWith('/brand')
    ) {
      return next();
    }
    res.sendFile(WEBSITE_INDEX);
  });
}

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'File is too large. Use a smaller image.' });
  }
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log('MongoDB connected:', mongoose.connection.host);
  console.log('Database:', mongoose.connection.name);

  // Align Team indexes (BR allows many teams without side A/B)
  try {
    const Team = require('./models/Team');
    await Team.syncIndexes();
  } catch (idxErr) {
    console.warn('Team.syncIndexes warning:', idxErr.message);
  }

  try {
    const Tournament = require('./models/Tournament');
    const DailyAutoMatch = require('./models/DailyAutoMatch');
    await Tournament.syncIndexes();
    await DailyAutoMatch.syncIndexes();
  } catch (idxErr) {
    console.warn('DailyAutoMatch/Tournament.syncIndexes warning:', idxErr.message);
  }
}

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    await connectDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Admin panel: http://localhost:${PORT}/admin`);
      const site = frontendUrl();
      console.log(
        isWebsiteReady()
          ? `WAREZONE website (bundled): http://localhost:${PORT}/`
          : site
            ? `WAREZONE website (frontend): ${site}`
            : 'WAREZONE website: deploy website/ to sk-win-web (or set FRONTEND_URL + SERVE_WEBSITE=true)'
      );
      console.log(`APK download page: http://localhost:${PORT}/download`);
      if (process.env.PUBLIC_BASE_URL) {
        console.log(`Public base URL (for uploads/images): ${process.env.PUBLIC_BASE_URL}`);
      } else {
        console.log(
          'Tip: set PUBLIC_BASE_URL=http://YOUR_LAN_IP:5000 in backend/.env so phone can load uploaded images'
        );
      }
      const paymentsOn = String(process.env.PAYMENT_ENABLED || '').trim().toLowerCase();
      const zapOn = String(process.env.ZAPUPI_ENABLED || '').trim().toLowerCase();
      const gatewayLive = paymentsOn === 'true' && zapOn === 'true';
      console.log(
        gatewayLive
          ? 'Payments: ZapUPI ON'
          : 'Payments: OFF (testing coins — Add Money credits wallet directly)'
      );
      initFcm();
      startDailyAutoMatchJob();

      cron.schedule('* * * * *', async () => {
        if (!isDbReady()) return;
        try {
          await runTournamentNotifier();
        } catch (error) {
          console.error('Tournament notifier error:', error.message);
        }
        try {
          const payoutResult = await processDuePayouts();
          if (payoutResult.processed > 0) {
            console.log(`[Payouts] Auto-credited ${payoutResult.processed} due payout(s)`);
          }
        } catch (error) {
          console.error('Due payout processor error:', error.message);
        }
      });
    });
  } catch (err) {
    console.error('\n❌ MongoDB connection failed:', err.message);
    console.error('\nFix options:');
    console.error('  1) Install MongoDB Community & start the service, OR');
    console.error('  2) Use Docker: docker run -d -p 27017:27017 --name sk-mongo mongo:7');
    console.error('  3) Use MongoDB Atlas (free) and set MONGODB_URI in backend/.env');
    console.error('     Example: mongodb+srv://user:pass@cluster.mongodb.net/sk-win\n');
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

startServer();
