const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const {
  notifyUser,
  notifyUsers,
  notifyTournamentParticipants,
  buildEventKey,
  SCREENS,
} = require('../services/notificationService');

const router = express.Router();

async function requireAdmin(req, res) {
  const admin = await User.findById(req.userId);
  if (!admin) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return admin;
}

// Get notifications for current user (optional ?filter=)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = String(req.query.filter || 'all').toLowerCase();
    const query = { userId: req.userId };

    if (filter === 'unread') query.isRead = false;
    else if (filter === 'tournament') {
      query.type = { $in: ['tournament', 'tournament_update', 'tournament_reminder'] };
    } else if (filter === 'wallet') query.type = 'wallet';
    else if (filter === 'results' || filter === 'result') query.type = 'result';
    else if (filter === 'announcements' || filter === 'announcement') {
      query.type = { $in: ['announcement', 'system'] };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ notifications, filter });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications count
router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      isRead: false,
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark all notifications as read
router.put('/read/all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Admin: send push announcement
router.post('/admin/send', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const {
      title,
      message,
      target = 'all',
      userIds = [],
      tournamentId,
      screen,
    } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const deepLink = screen || SCREENS.ANNOUNCEMENTS;
    const eventBase = buildEventKey([
      'admin_announcement',
      Date.now(),
      String(title).slice(0, 40),
    ]);

    const payload = {
      title,
      message,
      type: 'announcement',
      tournamentId: tournamentId || undefined,
      eventKeyBase: eventBase,
      deepLink,
      data: {
        screen: deepLink,
        ...(tournamentId ? { tournamentId: String(tournamentId) } : {}),
      },
    };

    let results = [];
    if (target === 'tournament' && tournamentId) {
      results = await notifyTournamentParticipants(tournamentId, payload);
    } else if (target === 'users' && Array.isArray(userIds) && userIds.length) {
      results = await notifyUsers(userIds, payload);
    } else if (target === 'all') {
      const users = await User.find({
        role: { $ne: 'admin' },
        notificationsEnabled: { $ne: false },
      }).select('_id');
      results = await notifyUsers(
        users.map((u) => u._id),
        payload
      );
    } else {
      return res.status(400).json({
        error: 'Invalid target. Use all | users | tournament',
      });
    }

    const sent = results.filter((r) => r.ok).length;
    const duplicates = results.filter((r) => r.reason === 'DUPLICATE').length;
    res.json({
      message: 'Announcement queued',
      sent,
      duplicates,
      total: results.length,
    });
  } catch (error) {
    console.error('admin send notification:', error);
    res.status(500).json({ error: error.message || 'Failed to send notification' });
  }
});

// Mark a notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;
