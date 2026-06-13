const express          = require('express');
const router           = express.Router();
const InventoryItem    = require('../models/InventoryItem');
const InventoryRequest = require('../models/InventoryRequest');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/inventory/items?category=Santos
router.get('/items', protect, async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const items  = await InventoryItem.find(filter).sort({ itemId: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/items  — inventory_manager / super_admin
router.post('/items', protect, requireRole('inventory_manager', 'super_admin'), async (req, res) => {
  try {
    const item = await InventoryItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/requests
router.get('/requests', protect, async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const requests = await InventoryRequest.find(filter)
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/requests  — any logged in user
router.post('/requests', protect, async (req, res) => {
  try {
    const { requesterName, item, quantity, category } = req.body;
    const request = await InventoryRequest.create({
      requesterName, item, quantity, category,
      requestedBy: req.user.id
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/inventory/requests/:id  — inventory_manager / super_admin
router.patch('/requests/:id', protect, requireRole('inventory_manager', 'super_admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const request = await InventoryRequest.findByIdAndUpdate(
      req.params.id,
      { status, handledBy: req.user.id },
      { new: true }
    );
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
