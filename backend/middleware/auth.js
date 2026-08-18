const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('_id role status authVersion');
    if (!user) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Best-effort JWT invalidation for admin sessions after password reset.
    // Older tokens won't have `v`, so we keep them valid until the next admin login.
    if (user.role === 'admin' && decoded.v !== undefined && decoded.v !== user.authVersion) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    req.userId = user._id;
    req.role = user.role;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authMiddleware, verifyToken: authMiddleware };
