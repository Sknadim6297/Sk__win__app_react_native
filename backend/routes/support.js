const express = require('express');
const SupportCategory = require('../models/SupportCategory');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_CATEGORIES = [
  { name: 'LONEWOLF', sortOrder: 1 },
  { name: 'PAYMENT', sortOrder: 2 },
  { name: 'TOURNAMENT', sortOrder: 3 },
  { name: 'ACCOUNT', sortOrder: 4 },
  { name: 'OTHER', sortOrder: 5 },
];

async function ensureCategories() {
  const count = await SupportCategory.countDocuments();
  if (count === 0) {
    await SupportCategory.insertMany(DEFAULT_CATEGORIES);
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

const formatTicket = (ticket) => ({
  id: ticket._id,
  ticketCode: ticket.ticketCode,
  category: ticket.category,
  message: ticket.message,
  status: ticket.status,
  adminNote: ticket.adminNote || '',
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  user: ticket.userId?.username
    ? { username: ticket.userId.username, email: ticket.userId.email }
    : undefined,
});

// --- Public / user ---
router.get('/categories', async (req, res) => {
  try {
    await ensureCategories();
    const categories = await SupportCategory.find({ isActive: true }).sort({
      sortOrder: 1,
      name: 1,
    });
    res.json(categories.map((c) => ({ id: c._id, name: c.name })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

router.get('/my-tickets', authMiddleware, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(tickets.map(formatTicket));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

router.post('/tickets', authMiddleware, async (req, res) => {
  try {
    const { category, message } = req.body;
    if (!category?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Category and message are required' });
    }

    await ensureCategories();
    const catExists = await SupportCategory.findOne({
      name: category.trim().toUpperCase(),
      isActive: true,
    });
    if (!catExists) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const ticket = await SupportTicket.create({
      userId: req.userId,
      category: category.trim().toUpperCase(),
      message: message.trim(),
      status: 'open',
    });

    res.status(201).json({ message: 'Ticket created', ticket: formatTicket(ticket) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// --- Admin ---
router.get('/admin/categories', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await ensureCategories();
    const categories = await SupportCategory.find().sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

router.post('/admin/categories', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, isActive, sortOrder } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Category name required' });
    }
    const category = await SupportCategory.create({
      name: name.trim().toUpperCase(),
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/admin/categories/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim().toUpperCase();
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder) || 0;

    const category = await SupportCategory.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/admin/categories/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await SupportCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.get('/admin/tickets', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(tickets.map(formatTicket));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

router.put('/admin/tickets/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (adminNote !== undefined) updates.adminNote = adminNote;

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, updates, { new: true }).populate(
      'userId',
      'username email'
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket updated', ticket: formatTicket(ticket) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
