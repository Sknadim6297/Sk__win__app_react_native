require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const walletRoutes = require('./routes/wallet');
const tournamentRoutes = require('./routes/tournaments');
const gamesRoutes = require('./routes/games');
const uploadRoutes = require('./routes/upload');
const tutorialRoutes = require('./routes/tutorials');

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Custom middleware to log requests
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`${req.method} ${req.path} - Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sk-win', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.log('MongoDB connection error:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tutorials', tutorialRoutes);

// Catch-all for API routes that don't exist
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
