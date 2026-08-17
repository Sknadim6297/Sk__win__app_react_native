const express = require('express');
const Map = require('../models/Map');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

async function requireAdmin(req, res) {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return null;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}

const DEFAULT_MAPS = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'Nexterra', 'Solara'];

async function ensureDefaultMaps() {
  const count = await Map.countDocuments();
  if (count > 0) return;
  await Map.insertMany(
    DEFAULT_MAPS.map((name, index) => ({
      name,
      active: true,
      sortOrder: index,
    }))
  );
}

// Public — active maps for tournament create / display
router.get('/list', async (req, res) => {
  try {
    await ensureDefaultMaps();
    const maps = await Map.find({ active: true }).sort({ sortOrder: 1, name: 1 });
    res.json(maps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maps', message: error.message });
  }
});

// Admin — all maps
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await ensureDefaultMaps();
    const maps = await Map.find().sort({ sortOrder: 1, name: 1 });
    res.json(maps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maps', message: error.message });
  }
});

router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Map name is required' });
    }
    const map = await Map.create({
      name,
      active: req.body.active !== false,
      sortOrder: Number(req.body.sortOrder) || 0,
    });
    res.status(201).json({ message: 'Map created', map });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A map with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create map', message: error.message });
  }
});

router.put('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const updates = { updatedAt: new Date() };
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.active !== undefined) updates.active = !!req.body.active;
    if (req.body.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder) || 0;

    if (updates.name === '') {
      return res.status(400).json({ error: 'Map name cannot be empty' });
    }

    const map = await Map.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!map) return res.status(404).json({ error: 'Map not found' });
    res.json({ message: 'Map updated', map });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A map with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update map', message: error.message });
  }
});

router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const map = await Map.findByIdAndDelete(req.params.id);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    res.json({ message: 'Map deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete map', message: error.message });
  }
});

module.exports = router;
