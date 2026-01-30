const express = require('express');
const Game = require('../models/Game');
const GameMode = require('../models/GameMode');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ====== ADMIN ENDPOINTS (MUST COME FIRST) ======

// Get all games (Admin)
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });
    res.json(games);
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
    res.status(201).json({ message: 'Game created successfully', game });
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

    res.json({ message: 'Game updated successfully', game });
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
    res.status(201).json({ message: 'Game mode created successfully', mode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create game mode', message: error.message });
  }
});

// Update game mode (Admin)
router.put('/modes/admin/:id', authMiddleware, async (req, res) => {
  try {
    const mode = await GameMode.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!mode) {
      return res.status(404).json({ error: 'Game mode not found' });
    }

    res.json({ message: 'Game mode updated successfully', mode });
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
    const games = await Game.find({ status: 'active' });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games', message: error.message });
  }
});

// Get popular games for home screen
router.get('/popular', async (req, res) => {
  try {
    const games = await Game.find({ status: 'active', isPopular: true });
    res.json(games);
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
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game', message: error.message });
  }
});

// Get game modes for a specific game
router.get('/:gameId/modes', async (req, res) => {
  try {
    const modes = await GameMode.find({ game: req.params.gameId, status: 'active' });
    res.json(modes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game modes', message: error.message });
  }
});

module.exports = router;
