const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email, group: user.group },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email, group: user.group } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/create-user  (super_admin only)
router.post('/create-user', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, email, password, role, group } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'User already exists' });
    const user = await User.create({ name, email, password, role, group });
    res.json({ message: 'User created', user: { name: user.name, email: user.email, role: user.role, group: user.group } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users  (super_admin only)
router.get('/users', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
