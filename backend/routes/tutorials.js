const express = require('express');
const TutorialVideo = require('../models/TutorialVideo');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ensureAdmin = async (req, res) => {
  const admin = await User.findById(req.userId);
  if (!admin) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (admin.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can manage tutorials' });
    return null;
  }
  return admin;
};

// Public: list active tutorials
router.get('/', async (req, res) => {
  try {
    const tutorials = await TutorialVideo.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Admin: list all tutorials
router.get('/admin/list', authMiddleware, async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const tutorials = await TutorialVideo.find()
      .sort({ order: 1, createdAt: -1 });
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Admin: create tutorial
router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const { title, description, videoLink, thumbnail, order, isActive } = req.body;

    if (!title || !videoLink || !thumbnail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tutorial = new TutorialVideo({
      title,
      description: description || '',
      videoLink,
      thumbnail,
      order: Number(order) || 0,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.userId,
      updatedAt: new Date(),
    });

    await tutorial.save();

    res.status(201).json({ message: 'Tutorial created', tutorial });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tutorial' });
  }
});

// Admin: update tutorial
router.put('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    const tutorial = await TutorialVideo.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    res.json({ message: 'Tutorial updated', tutorial });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tutorial' });
  }
});

// Admin: delete tutorial
router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const tutorial = await TutorialVideo.findByIdAndDelete(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    res.json({ message: 'Tutorial deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tutorial' });
  }
});

module.exports = router;
