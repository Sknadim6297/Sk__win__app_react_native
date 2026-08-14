require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
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

// Capture raw body for Cashfree webhook signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('/api/payments/cashfree/webhook')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/download', express.static(path.join(PUBLIC_ROOT, 'download')));

// Single brand logo (no copies) — used by download page favicon/OG/hero
const BRAND_LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo', 'ROUND_GAME_LOGO.png');
app.get(['/brand/logo.png', '/download/logo.png'], (req, res) => {
  res.sendFile(BRAND_LOGO_PATH, (err) => {
    if (err) {
      console.error('[brand] logo missing:', BRAND_LOGO_PATH, err.message);
      res.status(404).end();
    }
  });
});

const isDbReady = () => mongoose.connection.readyState === 1;

/** Homepage → download landing (share this URL with users) */
app.get('/', (req, res) => {
  res.redirect(302, '/download');
});

/** Modern APK landing page */
app.get(['/download', '/download/'], (req, res) => {
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
          { fileName },
          {
            $inc: { downloadCount: 1 },
            $setOnInsert: {
              version: '1.0.0',
              title: 'WarZone AMR Tournament',
              androidMin: 'Android 8.0 (API 26)+',
              releaseNotes: 'WarZone AMR Tournament release',
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

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(stats.sizeBytes));
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
app.use('/api/download', downloadApiRouter);

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

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
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
}

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    await connectDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`APK download page: http://localhost:${PORT}/download`);
      if (process.env.PUBLIC_BASE_URL) {
        console.log(`Public base URL (for uploads/images): ${process.env.PUBLIC_BASE_URL}`);
      } else {
        console.log(
          'Tip: set PUBLIC_BASE_URL=http://YOUR_LAN_IP:5000 in backend/.env so phone can load uploaded images'
        );
      }
      initFcm();

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
