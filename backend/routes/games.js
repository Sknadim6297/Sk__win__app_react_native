const express = require('express');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const Tournament = require('../models/Tournament');
const { authMiddleware } = require('../middleware/auth');
const { normalizeMediaUrl } = require('../utils/publicUrl');
const { sortBySortOrder } = require('../utils/sortBySortOrder');

function withNormalizedImage(doc, req) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.image) {
    obj.image = normalizeMediaUrl(obj.image, req);
  }
  const order = Number(obj.sortOrder);
  obj.sortOrder = Number.isFinite(order) ? order : 0;
  return obj;
}

/** Green badge on mode cards: upcoming matches only (not draft / live / completed). */
const UPCOMING_MATCH_STATUSES = ['upcoming', 'incoming'];

function upcomingMatchFilter(idField, ids) {
  return {
    [idField]: { $in: ids },
    $or: [
      { lifecycleStatus: { $in: UPCOMING_MATCH_STATUSES } },
      {
        $and: [
          {
            $or: [
              { lifecycleStatus: { $exists: false } },
              { lifecycleStatus: null },
            ],
          },
          { status: { $in: UPCOMING_MATCH_STATUSES } },
        ],
      },
    ],
  };
}

async function countTournamentsByGame(gameIds) {
  if (!gameIds.length) return new Map();
  const rows = await Tournament.aggregate([
    { $match: upcomingMatchFilter('game', gameIds) },
    { $group: { _id: '$game', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

async function countTournamentsByMode(modeIds) {
  if (!modeIds.length) return new Map();
  const rows = await Tournament.aggregate([
    { $match: upcomingMatchFilter('gameMode', modeIds) },
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

function parseSortOrder(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseStatus(value, fallback = 'active') {
  if (value === true || value === 'true' || value === 'active') return 'active';
  if (value === false || value === 'false' || value === 'inactive') return 'inactive';
  if (value === 'active' || value === 'inactive') return value;
  return fallback;
}

// Get all games (Admin)
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find().lean();
    res.json(sortBySortOrder(games).map((g) => withNormalizedImage(g, req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// Create a new game (Admin)
router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    const { name, image, rating, players, description, isPopular, sortOrder, status } = req.body;

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
      sortOrder: parseSortOrder(sortOrder, 0),
      status: parseStatus(status, 'active'),
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
    const updates = { updatedAt: new Date() };
    const {
      name,
      image,
      rating,
      players,
      description,
      isPopular,
      sortOrder,
      status,
    } = req.body;

    if (name !== undefined) updates.name = name;
    if (image !== undefined) updates.image = image;
    if (rating !== undefined) updates.rating = rating;
    if (players !== undefined) updates.players = players;
    if (description !== undefined) updates.description = description;
    if (isPopular !== undefined) {
      updates.isPopular = isPopular === true || isPopular === 'true';
    }
    if (sortOrder !== undefined) updates.sortOrder = parseSortOrder(sortOrder, 0);
    if (status !== undefined) updates.status = parseStatus(status);

    const game = await Game.findByIdAndUpdate(req.params.id, updates, { new: true });

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

// All modes for a game (Admin, includes inactive)
router.get('/admin/:gameId/modes', authMiddleware, async (req, res) => {
  try {
    const modes = await GameMode.find({ game: req.params.gameId }).lean();
    res.json(sortBySortOrder(modes).map((m) => withNormalizedImage(m, req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game modes', message: error.message });
  }
});

// Create game mode (Admin)
router.post('/modes/admin/create', authMiddleware, async (req, res) => {
  try {
    const { gameId, name, description, image, sortOrder, status } = req.body;

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
      sortOrder: parseSortOrder(sortOrder, 0),
      status: parseStatus(status, 'active'),
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
    const { name, description, image, status, sortOrder } = req.body;
    const updates = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image !== undefined) updates.image = image;
    if (status !== undefined) updates.status = parseStatus(status);
    if (sortOrder !== undefined) updates.sortOrder = parseSortOrder(sortOrder, 0);

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
    const games = await Game.find({ status: 'active' }).lean();
    const sorted = sortBySortOrder(games);
    const countMap = await countTournamentsByGame(sorted.map((g) => g._id));
    res.json(sorted.map((g) => withTournamentCount(g, countMap, '_id', req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// Get popular games for home screen (admin: isPopular + active)
router.get('/popular', async (req, res) => {
  try {
    const games = await Game.find({ status: 'active', isPopular: true }).lean();
    const sorted = sortBySortOrder(games);
    const countMap = await countTournamentsByGame(sorted.map((g) => g._id));
    res.json(sorted.map((g) => withTournamentCount(g, countMap, '_id', req)));
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
    const modes = await GameMode.find({ game: req.params.gameId, status: 'active' }).lean();
    const sorted = sortBySortOrder(modes);
    const countMap = await countTournamentsByMode(sorted.map((m) => m._id));
    res.json(sorted.map((m) => withTournamentCount(m, countMap, '_id', req)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game modes', message: error.message });
  }
});

module.exports = router;
