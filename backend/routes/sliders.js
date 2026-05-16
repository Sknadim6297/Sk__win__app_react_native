const express = require('express');
const HomeSlider = require('../models/HomeSlider');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { normalizeMediaUrl } = require('../utils/publicUrl');

const router = express.Router();

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

const pickSliderFields = (body) => ({
  ...(body.image !== undefined ? { image: body.image } : {}),
  ...(body.link !== undefined ? { link: body.link } : {}),
  ...(body.active !== undefined ? { active: body.active } : {}),
  ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
});

// Public — image-only banners for home
router.get('/', async (req, res) => {
  try {
    const sliders = await HomeSlider.find({ active: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('image link sortOrder');

    res.json(
      sliders.map((s) => ({
        id: s._id,
        image: normalizeMediaUrl(s.image, req),
        link: s.link || '',
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sliders' });
  }
});

router.get('/admin/list', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const sliders = await HomeSlider.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(
      sliders.map((s) => ({
        ...s.toObject(),
        image: normalizeMediaUrl(s.image, req),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sliders' });
  }
});

router.post('/admin', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { image, link, active, sortOrder } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Banner image is required' });
    }
    const slider = await HomeSlider.create({
      image,
      link: link || '',
      active: active !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    res.status(201).json(slider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create slider' });
  }
});

router.put('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updates = pickSliderFields(req.body);
    const slider = await HomeSlider.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!slider) return res.status(404).json({ error: 'Slider not found' });
    res.json(slider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slider' });
  }
});

router.delete('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await HomeSlider.findByIdAndDelete(req.params.id);
    res.json({ message: 'Slider deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slider' });
  }
});

module.exports = router;
