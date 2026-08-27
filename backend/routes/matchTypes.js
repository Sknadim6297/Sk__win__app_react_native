const express = require('express');
const MatchType = require('../models/MatchType');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { ensureDefaultMatchTypes } = require('../services/matchTypeService');

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

function normalizeBody(body = {}, { forUpdate = false, existing = null } = {}) {
  const name = String(body.name || '').trim();
  const active = body.active !== false && body.active !== 'false' && body.active !== 'off';

  // Admin UI only edits name + active. Keep internal flags on update; use safe defaults on create.
  if (forUpdate && existing) {
    return {
      name: name || existing.name,
      active,
      isTeamVsTeam: existing.isTeamVsTeam,
      hasKillRewards: existing.hasKillRewards,
      defaultSlots: existing.defaultSlots,
      sortOrder: existing.sortOrder,
    };
  }

  const lower = name.toLowerCase();
  const isTeamVsTeam =
    body.isTeamVsTeam != null
      ? Boolean(body.isTeamVsTeam)
      : /clash\s*squad|custom\s*match|team\s*vs/.test(lower);
  const hasKillRewards =
    body.hasKillRewards != null ? Boolean(body.hasKillRewards) : !isTeamVsTeam;

  return {
    name,
    active,
    isTeamVsTeam,
    hasKillRewards,
    defaultSlots: Math.max(1, Number(body.defaultSlots) || (isTeamVsTeam ? 2 : 48)),
    sortOrder: Number(body.sortOrder) || 0,
  };
}

router.get('/list', async (req, res) => {
  try {
    await ensureDefaultMatchTypes();
    const types = await MatchType.find({ active: true }).sort({ sortOrder: 1, name: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match types', message: error.message });
  }
});

/** Player formats are fixed business rules (not admin catalog). */
router.get('/player-formats', (_req, res) => {
  res.json([
    { key: 'solo', label: 'Solo', playersPerTeam: 1 },
    { key: 'duo', label: 'Duo', playersPerTeam: 2 },
    { key: 'squad', label: 'Squad', playersPerTeam: 4 },
  ]);
});

router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    await ensureDefaultMatchTypes();
    const types = await MatchType.find().sort({ sortOrder: 1, name: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match types', message: error.message });
  }
});

router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const data = normalizeBody(req.body);
    if (!data.name) {
      return res.status(400).json({ error: 'Match Type name is required' });
    }
    const dup = await MatchType.findOne({
      name: { $regex: new RegExp(`^${String(data.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\?\s+/g, '\\s+')}$`, 'i') },
    });
    if (dup) {
      return res.status(400).json({ error: 'A Match Type with this name already exists' });
    }
    const matchType = await MatchType.create(data);
    res.status(201).json({ message: 'Match Type created', matchType });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A Match Type with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create Match Type', message: error.message });
  }
});

router.put('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const existing = await MatchType.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Match Type not found' });
    }
    const data = normalizeBody(req.body, { forUpdate: true, existing });
    if (!data.name) {
      return res.status(400).json({ error: 'Match Type name is required' });
    }
    const matchType = await MatchType.findByIdAndUpdate(
      req.params.id,
      {
        name: data.name,
        active: data.active,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
    res.json({ message: 'Match Type updated', matchType });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A Match Type with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update Match Type', message: error.message });
  }
});

router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const matchType = await MatchType.findByIdAndDelete(req.params.id);
    if (!matchType) {
      return res.status(404).json({ error: 'Match Type not found' });
    }
    res.json({ message: 'Match Type deleted', matchType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Match Type', message: error.message });
  }
});

/** Soft-hide without deleting (optional activate/deactivate). */
router.post('/admin/:id/active', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const raw = req.body?.active;
    const active = raw === true || raw === 'true' || raw === 1 || raw === '1';
    const matchType = await MatchType.findByIdAndUpdate(
      req.params.id,
      { active, updatedAt: new Date() },
      { new: true }
    );
    if (!matchType) {
      return res.status(404).json({ error: 'Match Type not found' });
    }
    res.json({ message: active ? 'Match Type activated' : 'Match Type deactivated', matchType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Match Type status', message: error.message });
  }
});

module.exports = router;
