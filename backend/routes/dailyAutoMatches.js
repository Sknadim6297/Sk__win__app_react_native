const express = require('express');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const service = require('../services/dailyAutoMatchService');

const router = express.Router();

async function requireAdmin(req, res) {
  const admin = await User.findById(req.userId);
  if (!admin) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return null;
  }
  if (admin.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return admin;
}

function sendError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error('daily-auto-matches:', error);
  res.status(status).json({ error: error.message || 'Request failed' });
}

router.get('/admin/list', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const items = await service.listAutoMatches({
      includeDeleted: req.query.includeDeleted === '1',
    });
    res.json(items);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/admin/:id/tournaments', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const data = await service.listGeneratedTournaments(req.params.id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const item = await service.getAutoMatch(req.params.id);
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/admin', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const item = await service.createAutoMatch(req.body, req.userId);
    res.status(201).json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const item = await service.updateAutoMatch(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/admin/:id/activate', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const item = await service.setActive(req.params.id, true);
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/admin/:id/deactivate', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const item = await service.setActive(req.params.id, false);
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/admin/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const item = await service.duplicateAutoMatch(req.params.id, req.userId);
    res.status(201).json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/admin/:id/generate-today', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const result = await service.generateToday(req.params.id, {
      createdBy: req.userId,
      allowInactive: true,
    });
    if (result.skipped) {
      return res.status(404).json({ error: 'Daily Auto Match not found' });
    }
    if (result.alreadyExists) {
      return res.json({
        created: false,
        alreadyExists: true,
        message: "Today's match already exists.",
        tournament: result.tournament,
      });
    }
    res.status(201).json({
      created: true,
      alreadyExists: false,
      message: "Today's match generated successfully.",
      tournament: result.tournament,
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const result = await service.softDeleteAutoMatch(req.params.id);
    res.json({
      ...result,
      message: 'Daily Auto Match removed. Existing generated tournaments were not deleted.',
    });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
