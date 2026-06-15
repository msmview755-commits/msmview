const express          = require('express');
const router           = express.Router();
const InventoryItem    = require('../models/InventoryItem');
const InventoryRequest = require('../models/InventoryRequest');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/inventory/items?category=Santos
// Members only see their group; manager/admins see any/all
router.get('/items', protect, async (req, res) => {
  try {
    const { role, group } = req.user;
    let filter = {};

    if (role === 'inventory_manager' || role === 'super_admin') {
      // Managers can filter by category or see all
      if (req.query.category) filter.category = req.query.category;
    } else {
      // Members are locked to their group
      filter.category = group || 'Santos';
    }

    const items = await InventoryItem.find(filter).sort({ itemId: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/items — any logged-in user can add items
// Members can only add to their own group; managers/admins can add to any
router.post('/items', protect, async (req, res) => {
  try {
    const { role, group } = req.user;
    const { name, quantity, category } = req.body;

    // Enforce group for members
    let itemCategory = category;
    if (role !== 'inventory_manager' && role !== 'super_admin') {
      itemCategory = group || 'Santos';
    }

    // Auto-generate itemId
    const count = await InventoryItem.countDocuments({ category: itemCategory });
    const prefix = itemCategory === 'AV/IT' ? 'AVIT' : itemCategory.toUpperCase();
    const itemId = `${prefix}-${String(count + 1).padStart(3, '0')}`;

    const item = await InventoryItem.create({
      itemId,
      name,
      quantity: Number(quantity) || 0,
      category: itemCategory,
      addedBy: req.user.id
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/requests
// Members see only their group's requests; managers/admins see any/all
router.get('/requests', protect, async (req, res) => {
  try {
    const { role, group } = req.user;
    let filter = {};

    if (role === 'inventory_manager' || role === 'super_admin') {
      if (req.query.category) filter.category = req.query.category;
    } else {
      filter.category = group || 'Santos';
    }

    const requests = await InventoryRequest.find(filter)
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/requests — any logged-in user
router.post('/requests', protect, async (req, res) => {
  try {
    const { role, group } = req.user;
    const { requesterName, item, quantity, category } = req.body;

    // Enforce group for members
    let reqCategory = category;
    if (role !== 'inventory_manager' && role !== 'super_admin') {
      reqCategory = group || 'Santos';
    }

    const request = await InventoryRequest.create({
      requesterName, item, quantity,
      category: reqCategory,
      requestedBy: req.user.id
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/inventory/requests/:id — inventory_manager / super_admin
// When completing a request, update the corresponding inventory item stock
router.patch('/requests/:id', protect, requireRole('inventory_manager', 'super_admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const request = await InventoryRequest.findByIdAndUpdate(
      req.params.id,
      { status, handledBy: req.user.id },
      { new: true }
    );

    // When a request is marked Complete, add the quantity to inventory stock
    if (status === 'Complete' && request) {
      const existing = await InventoryItem.findOne({
        name: { $regex: new RegExp(`^${request.item}$`, 'i') },
        category: request.category
      });

      if (existing) {
        existing.quantity += Number(request.quantity) || 0;
        await existing.save();
      } else {
        // Create a new inventory item if it doesn't exist
        const count = await InventoryItem.countDocuments({ category: request.category });
        const prefix = request.category === 'AV/IT' ? 'AVIT' : request.category.toUpperCase();
        const itemId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
        await InventoryItem.create({
          itemId,
          name: request.item,
          quantity: Number(request.quantity) || 0,
          category: request.category,
          addedBy: req.user.id
        });
      }
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
