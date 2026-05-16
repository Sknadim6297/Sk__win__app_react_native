const express = require('express');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_ANNOUNCEMENTS = [
  {
    title: '🏆 Tournaments Are Back! 🎮',
    category: 'ANNOUNCEMENT',
    description: 'Join daily Free Fire tournaments and win exciting prizes. Check the tournament tab for live events.',
    sortOrder: 1,
  },
  {
    title: '🚨 Important: Verify Your Profile',
    category: 'ANNOUNCEMENT',
    description: 'Complete your profile verification to unlock withdrawals and premium tournaments.',
    sortOrder: 2,
  },
];

async function ensureAnnouncements() {
  const count = await Announcement.countDocuments();
  if (count === 0) {
    await Announcement.insertMany(DEFAULT_ANNOUNCEMENTS);
  }
}

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    res.status(500).json({ error: 'Authorization failed' });
  }
};

const formatItem = (item) => ({
  id: item._id,
  title: item.title,
  category: item.category || 'ANNOUNCEMENT',
  description: item.description || '',
  externalLink: item.externalLink || '',
  isActive: item.isActive !== false,
  sortOrder: item.sortOrder ?? 0,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

router.get('/', async (req, res) => {
  try {
    await ensureAnnouncements();
    const items = await Announcement.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(100);
    res.json(items.map(formatItem));
  } catch {
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

router.get('/admin/list', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await ensureAnnouncements();
    const items = await Announcement.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(items.map(formatItem));
  } catch {
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

router.post('/admin', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { title, category, description, externalLink, isActive, sortOrder } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const item = await Announcement.create({
      title: title.trim(),
      category: (category || 'ANNOUNCEMENT').trim().toUpperCase(),
      description: (description || '').trim(),
      externalLink: (externalLink || '').trim(),
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    res.status(201).json(formatItem(item));
  } catch {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.put('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.category !== undefined) updates.category = String(req.body.category).trim().toUpperCase();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.externalLink !== undefined) updates.externalLink = String(req.body.externalLink).trim();
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder) || 0;

    const item = await Announcement.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!item) return res.status(404).json({ error: 'Announcement not found' });
    res.json(formatItem(item));
  } catch {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Announcement.findById(req.params.id);
    if (!item || !item.isActive) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json(formatItem(item));
  } catch {
    res.status(500).json({ error: 'Failed to load announcement' });
  }
});

module.exports = router;
