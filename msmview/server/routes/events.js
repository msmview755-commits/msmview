const express = require('express');
const router  = express.Router();
const Event   = require('../models/Event');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/events
router.get('/', protect, async (req, res) => {
  try {
    const events = await Event.find()
      .populate('postedBy', 'name')
      .sort({ startTime: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events  — super_admin only
router.post('/', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, postedBy: req.user.id });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/events/:id
router.patch('/:id', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', protect, requireRole('super_admin'), async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
