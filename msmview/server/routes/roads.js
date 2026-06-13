const express       = require('express');
const router        = express.Router();
const RoadIncident  = require('../models/RoadIncident');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/roads
router.get('/', protect, async (req, res) => {
  try {
    const incidents = await RoadIncident.find({ active: true })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roads  — super_admin only (no road_admin role now)
router.post('/', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const incident = await RoadIncident.create({ ...req.body, postedBy: req.user.id });
    res.status(201).json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/roads/:id/close
router.patch('/:id/close', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const incident = await RoadIncident.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
