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
const tournamentRoutes = require('./routes/tournaments');
const gamesRoutes = require('./routes/games');
const uploadRoutes = require('./routes/upload');
const tutorialRoutes = require('./routes/tutorials');
const notificationRoutes = require('./routes/notifications');
const configRoutes = require('./routes/config');
const sliderRoutes = require('./routes/sliders');
const supportRoutes = require('./routes/support');
const announcementRoutes = require('./routes/announcements');
const { initFcm } = require('./services/fcm');
const { runTournamentNotifier } = require('./services/tournamentNotifier');

const app = express();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sk-win';
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`${req.method} ${req.path} - Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const isDbReady = () => mongoose.connection.readyState === 1;

app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
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
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/sliders', sliderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/announcements', announcementRoutes);

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
}

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    await connectDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
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
