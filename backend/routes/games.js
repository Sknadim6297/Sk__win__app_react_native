const express = require('express');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const Tournament = require('../models/Tournament');
const { authMiddleware } = require('../middleware/auth');
const { normalizeMediaUrl } = require('../utils/publicUrl');

function withNormalizedImage(doc, req) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.image) {
    obj.image = normalizeMediaUrl(obj.image, req);
  }
  return obj;
}

/** Green badge on mode cards: live matches only (never draft / upcoming / completed). */
const LIVE_MATCH_STATUSES = ['ongoing', 'live'];

function liveMatchFilter(idField, ids) {
  return {
    [idField]: { $in: ids },
    $and: [
      {
        $or: [
          { status: { $in: LIVE_MATCH_STATUSES } },
          { lifecycleStatus: { $in: LIVE_MATCH_STATUSES } },
        ],
      },
      { status: { $nin: ['draft', 'upcoming', 'incoming', 'completed', 'result_published', 'cancelled'] } },
      {
        $or: [
          { lifecycleStatus: { $exists: false } },
          { lifecycleStatus: { $in: LIVE_MATCH_STATUSES } },
        ],
      },
    ],
  };
}

async function countTournamentsByGame(gameIds) {
  if (!gameIds.length) return new Map();
  const rows = await Tournament.aggregate([
    { $match: liveMatchFilter('game', gameIds) },
    { $group: { _id: '$game', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

async function countTournamentsByMode(modeIds) {
  if (!modeIds.length) return new Map();
  const rows = await Tournament.aggregate([
    { $match: liveMatchFilter('gameMode', modeIds) },
    { $group: { _id: '$gameMode', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

function withTournamentCount(doc, countMap, idField = '_id', req) {
  const obj = withNormalizedImage(doc, req);
  const key = String(obj[idField] || obj.id);
  return { ...obj, tournamentCount: countMap.get(key) || 0 };
}

const router = express.Router();

// ====== ADMIN ENDPOINTS (MUST COME FIRST) ======

// Get all games (Admin)
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });
    res.json(games.map((g) => withNormalizedImage(g, req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// Create a new game (Admin)
router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    const { name, image, rating, players, description, isPopular } = req.body;

    if (!name || !image) {
      return res.status(400).json({ error: 'Game name and image are required' });
    }

    const game = new Game({
      name,
      image,
      rating: rating || 4.5,
      players: players || '0',
      description,
      isPopular: isPopular || false,
    });

    await game.save();
    res.status(201).json({ message: 'Game created successfully', game: withNormalizedImage(game, req) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Game with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create game', message: error.message });
  }
});

// Update game (Admin)
router.put('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ message: 'Game updated successfully', game: withNormalizedImage(game, req) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update game', message: error.message });
  }
});

// Delete game (Admin)
router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Delete associated game modes
    await GameMode.deleteMany({ game: req.params.id });

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game', message: error.message });
  }
});

// Create game mode (Admin)
router.post('/modes/admin/create', authMiddleware, async (req, res) => {
  try {
    const { gameId, name, description, image } = req.body;

    if (!gameId || !name) {
      return res.status(400).json({ error: 'Game ID and mode name are required' });
    }

    // Verify game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const mode = new GameMode({
      game: gameId,
      name,
      description,
      image,
    });

    await mode.save();
    res.status(201).json({ message: 'Game mode created successfully', mode: withNormalizedImage(mode, req) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create game mode', message: error.message });
  }
});

// Update game mode (Admin)
router.put('/modes/admin/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, image, status } = req.body;
    const updates = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image !== undefined) updates.image = image;
    if (status !== undefined) updates.status = status;

    const mode = await GameMode.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!mode) {
      return res.status(404).json({ error: 'Game mode not found' });
    }

    res.json({ message: 'Game mode updated successfully', mode: withNormalizedImage(mode, req) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update game mode', message: error.message });
  }
});

// Delete game mode (Admin)
router.delete('/modes/admin/:id', authMiddleware, async (req, res) => {
  try {
    const mode = await GameMode.findByIdAndDelete(req.params.id);

    if (!mode) {
      return res.status(404).json({ error: 'Game mode not found' });
    }

    res.json({ message: 'Game mode deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game mode', message: error.message });
  }
});

// ====== PUBLIC GAMES ENDPOINTS (AFTER ADMIN ROUTES) ======

// Get all games
router.get('/list', async (req, res) => {
  try {
    const games = await Game.find({ status: 'active' }).sort({ createdAt: -1 });
    const countMap = await countTournamentsByGame(games.map((g) => g._id));
    res.json(games.map((g) => withTournamentCount(g, countMap, '_id', req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// Get popular games for home screen (admin: isPopular + active)
router.get('/popular', async (req, res) => {
  try {
    const games = await Game.find({ status: 'active', isPopular: true }).sort({ createdAt: -1 });
    const countMap = await countTournamentsByGame(games.map((g) => g._id));
    res.json(games.map((g) => withTournamentCount(g, countMap, '_id', req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular games', message: error.message });
  }
});

// Get game details
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(withNormalizedImage(game, req));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game', message: error.message });
  }
});

// Get game modes for a specific game
router.get('/:gameId/modes', async (req, res) => {
  try {
    const modes = await GameMode.find({ game: req.params.gameId, status: 'active' }).sort({
      createdAt: -1,
    });
    const countMap = await countTournamentsByMode(modes.map((m) => m._id));
    res.json(modes.map((m) => withTournamentCount(m, countMap, '_id', req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game modes', message: error.message });
  }
});

module.exports = router;
